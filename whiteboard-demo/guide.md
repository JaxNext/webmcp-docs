# WebMCP Workshop — Turning a Whiteboard into an Agent Tool

A hands-on lab for GDG DevFest. You take a plain, client-only whiteboard and,
in six small steps, expose it to AI agents with **WebMCP** — without ever
touching the drawing engine. The rule that makes this demo work:

> **`app.js` never changes.** Everything WebMCP lives in a new `tools.js` file
> plus a few HTML/CSS annotations. That is the "progressive enhancement" story:
> your app keeps working for humans, and gains an agent surface on top.

## Prerequisites

- Chrome with the WebMCP flag on: open `chrome://flags/#enable-webmcp-testing`,
  set **Enabled**, then **Relaunch**.
- An agent extension (for the full experience), **or** just the DevTools console
  (for quick checks — see below). The console path is enough for this lab.

## Checkpoint folders

Each folder is a runnable snapshot. Open a folder's `index.html` any time to
jump to a known-good state:

| Folder | State |
| --- | --- |
| `before/` | Step 0 — plain whiteboard, no WebMCP |
| `step-1/` | + one read-only tool |
| `step-2/` | + two write tools |
| `step-3/` | + safety annotations |
| `step-4/` | + a declarative form tool |
| `after/` | Step 5 — full answer key, incl. the optional record panel |

## How to test each step (console)

Open the page's DevTools **Console** and run:

```js
const tools = await document.modelContext.getTools();
console.log(tools.map(t => t.name));
```

To call a tool yourself (a handy stand-in for an agent):

```js
const draw = tools.find(t => t.name === 'draw_shape');
await document.modelContext.executeTool(draw,
  { type: 'ellipse', x: 400, y: 300, width: 160, height: 100, color: '#1e88e5' });
```

---

## Step 0 — the "why" (`before/`)

**Goal:** see that a normal client-only app is invisible to an agent.

Open `before/index.html`, then run the console check above. `document.modelContext`
exists, but `getTools()` returns `[]` — the page exposes nothing. Ask an agent to
"draw a circle" and it has no way to reach the `<canvas>`: no DOM element the
agent can click, no API to call.

**Concept:** WebMCP is the bridge. Your page *opts in* by registering tools.

---

## Step 1 — a read-only tool (`step-1/`)

**Concept:** `registerTool()` + `outputSchema` + `readOnlyHint`. A tool that
*reads* state so an agent can answer "what's on the board?"

**Do:**

1. Create `tools.js`:

```js
// tools.js — WebMCP layer. Step 1: a single read-only tool.

document.modelContext.addEventListener('toolactivated', ({ toolName }) => {
  document.querySelector('#status').textContent = `Agent activated: ${toolName}`;
});

async function init() {
  await document.modelContext.registerTool({
    name: 'get_canvas_state',
    description: 'List what is currently drawn on the whiteboard.',
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      properties: {
        shapeCount: { type: 'number' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              kind: { type: 'string' },
              type: { type: 'string' },
              text: { type: 'string' },
              x: { type: 'number' },
              y: { type: 'number' },
              color: { type: 'string' },
              pointCount: { type: 'number' },
            },
          },
        },
      },
      required: ['shapeCount'],
    },
    annotations: { readOnlyHint: true },
    execute: async () => getCanvasState(),
  });
}

init();
```

2. Load it in `index.html`, after `app.js`:

```html
  <script src="app.js"></script>
  <script src="tools.js"></script>
```

**Check your work:** `getTools()` now returns `['get_canvas_state']`. Run:

```js
await document.modelContext.executeTool(tools[0], {});
// → { shapeCount: 0, items: [] }
```

**Why it matters:**
- `inputSchema` / `outputSchema` are JSON Schema — the agent reads them to know
  how to call the tool and what it gets back.
- `annotations.readOnlyHint: true` tells the agent "this is safe, no side effects".

---

## Step 2 — write tools (`step-2/`)

**Concept:** `inputSchema` + an `execute` that *mutates* the app. The agent can
now actually draw.

**Do:** add two more tools inside `init()`, before the closing brace:

```js
  await document.modelContext.registerTool({
    name: 'draw_shape',
    description: 'Draw a rectangle, ellipse, or line on the whiteboard.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['rect', 'ellipse', 'line'], description: 'Shape to draw.' },
        x: { type: 'number', description: 'Left edge in canvas pixels.' },
        y: { type: 'number', description: 'Top edge in canvas pixels.' },
        width: { type: 'number', description: 'Width in pixels (line length for lines).' },
        height: { type: 'number', description: 'Height in pixels (line drop for lines).' },
        color: { type: 'string', description: 'Stroke or fill color, e.g. "#e53935".' },
      },
      required: ['type'],
    },
    execute: async (args) => {
      drawShape(args);
      return `Drew a ${args.type} on the whiteboard.`;
    },
  });

  await document.modelContext.registerTool({
    name: 'add_text',
    description: 'Add a text label to the whiteboard at the given position.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to render.' },
        x: { type: 'number' },
        y: { type: 'number' },
        color: { type: 'string' },
      },
      required: ['text', 'x', 'y'],
    },
    execute: async ({ text, x, y, color }) => {
      addText(text, x, y, color);
      return `Added text "${text}".`;
    },
  });
```

**Check your work:** `getTools()` → `['get_canvas_state', 'draw_shape', 'add_text']`.
Run the `draw_shape` snippet from "How to test" — a circle appears on the canvas.
Then ask an agent to "draw a red rectangle".

**Why it matters:** `drawShape` / `addText` are ordinary functions in `app.js`.
`execute` is the *only* glue between the agent and your existing code — you
reuse your app's own functions, you don't reimplement them.

---

## Step 3 — safety annotations (`step-3/`)

**Concept:** `consequentialHint` for tools with real-world side effects.

**Do:** add three more tools:

```js
  await document.modelContext.registerTool({
    name: 'undo',
    description: 'Undo the most recent drawing action.',
    inputSchema: { type: 'object', properties: {} },
    execute: async () => {
      undo();
      return 'Undid the last action.';
    },
  });

  await document.modelContext.registerTool({
    name: 'clear_canvas',
    description: 'Erase everything on the whiteboard.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { consequentialHint: true },
    execute: async () => {
      clearCanvas();
      return 'Cleared the whiteboard.';
    },
  });

  await document.modelContext.registerTool({
    name: 'export_png',
    description: 'Download the whiteboard as a PNG image.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { consequentialHint: true },
    execute: async () => {
      exportPng();
      return 'Exported the whiteboard as PNG.';
    },
  });
```

**Check your work:** `getTools()` → six tools. `clear_canvas` and `export_png`
carry `consequentialHint`, which makes a well-behaved agent pause and confirm
before erasing or downloading.

**Why it matters:**
- `readOnlyHint` (Step 1) = "safe to call freely".
- `consequentialHint` = "this changes something real — confirm with the user".
- `undo` has neither: it's a normal, safe state change.

---

## Step 4 — the declarative API (`step-4/`)

**Concept:** you don't always need `registerTool`. Annotate an *existing form*
and the browser turns it into a tool for you.

**Do:**

1. In `index.html`, change the palette wrapper `<div id="palette">` into a form
   with three attributes, and add `toolparamdescription` to each field:

```html
  <form id="brush-palette"
        toolname="configure_brush"
        tooldescription="Set the brush color, stroke width, and active drawing tool on the whiteboard."
        toolautosubmit>
    <label for="brush-color">Brush color
      <input id="brush-color" name="color" type="color" value="#1e88e5"
             toolparamdescription="Brush color as a hex value.">
    </label>

    <label for="brush-width">Stroke width
      <input id="brush-width" name="width" type="range" min="1" max="40" value="4"
             toolparamdescription="Stroke width in pixels.">
    </label>

    <label for="brush-tool">Tool
      <select id="brush-tool" name="tool"
              toolparamdescription="Drawing tool to activate.">
        <option value="brush">Brush</option>
        <option value="rect">Rectangle</option>
        <option value="ellipse">Ellipse</option>
        <option value="line">Line</option>
        <option value="text">Text</option>
      </select>
    </label>

    <label for="brush-fill">
      <input id="brush-fill" name="fill" type="checkbox"
             toolparamdescription="Whether to fill shapes.">
      Fill shapes
    </label>
  </form>
```

   (Don't forget the closing `</form>` — it was `</div>`.)

2. In `styles.css`, rename the two `#palette` rules to `#brush-palette`, and add
   focus cues so attendees can *see* the agent driving the form:

```css
#brush-palette { /* …same rules as before… */ }
#brush-palette label { /* …same rules as before… */ }

/* WebMCP declarative focus cues */
form:tool-form-active {
  outline: 2px dashed #1e88e5;
  outline-offset: -2px;
}
input:tool-submit-active {
  outline: 2px dashed #e53935;
}
```

3. In `tools.js`, add a `submit` handler that responds to agent invocations:

```js
document.querySelector('#brush-palette').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const brush = {
    color: data.get('color'),
    width: Number(data.get('width')),
    tool: data.get('tool'),
    fill: data.get('fill') === 'on',
  };
  setBrush(brush);
  const result = `Brush set to ${brush.color}, width ${brush.width}, tool ${brush.tool}.`;
  if (e.agentInvoked) {
    e.respondWith(Promise.resolve(result));
  }
});
```

**Check your work:** `getTools()` now returns seven tools — `configure_brush`
appeared with **no `registerTool` call**. Ask an agent to "switch to a blue
brush" and watch the color input highlight and the palette update.

**Why it matters:**
- `toolname` / `tooldescription` / `toolparamdescription` describe the tool.
- `toolautosubmit` means the agent fills the fields and the form applies.
- `SubmitEvent.agentInvoked` distinguishes an agent call from a human one;
  `respondWith()` is how you send the result string back to the agent.
- This is the same surface a human uses — declarative tools *are* your UI.

---

## Step 5 — observability (`after/`, optional)

**Concept:** watch the agent work — which tools, how long, how much context.

`after/` adds a "Tool call record" panel that logs each call (time offset + token
estimate) and totals the wall-clock elapsed time and token footprint. It works by
wrapping each `registerTool` in a `trackTool()` helper that times and logs
`execute`, and by reading the declarative form's schema from its HTML attributes.

This step is a bonus — the core WebMCP API is complete after Step 4. Open
`after/index.html` to see it in action, or diff `step-4/` against `after/` to
study the instrumentation.

---

## Concept cheat-sheet

| Idea | Imperative | Declarative |
| --- | --- | --- |
| Describe a tool | `registerTool({ name, description, … })` | `toolname` + `tooldescription` on a `<form>` |
| Describe params | `inputSchema` (JSON Schema) | `toolparamdescription` on each field |
| Describe result | `outputSchema` | — |
| Run it | `execute(args)` callback | form `submit` + `respondWith()` |
| Safety hints | `annotations: { readOnlyHint, consequentialHint }` | — |
| Detect the agent | — | `SubmitEvent.agentInvoked` |
| React to activity | `toolactivated` / `toolchange` / `toolcancel` events | `:tool-form-active`, `:tool-submit-active` |

## Key takeaways

1. WebMCP is **opt-in** — before Step 1 the page exposes nothing.
2. The agent surface **reuses your app's own functions and forms**; you never
   duplicate logic.
3. **Imperative** (`registerTool`) is for actions/state; **declarative** (form
   attributes) is for turning existing UI into tools with almost no JS.
4. `app.js` stayed untouched the entire time — WebMCP is a layer, not a rewrite.

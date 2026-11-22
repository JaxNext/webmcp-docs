# WebMCP Workshop — Drawing/Whiteboard Demo Spec

Date: 2026-11-22
Context: GDG DevFest workshop on applying WebMCP to an existing front-end app.
Primary demo: a canvas drawing / whiteboard app, chosen because its output has no
textual representation, so it is the purest "only WebMCP, not MCP" case.

## Goal

Start from a working, plain vanilla-JS whiteboard and add WebMCP as a **progressive
enhancement** — without touching the drawing logic. The same app then demonstrates
both APIs:

- **Imperative** (`document.modelContext.registerTool`) for drawing operations.
- **Declarative** (annotated `<form toolname=… tooldescription=…>`) for the brush/tool
  palette.

A live demo runs the same natural-language prompt twice: once against the plain
whiteboard (actuation fails), once with WebMCP (tools fire and the drawing appears).

## Prerequisites

- Chrome with the WebMCP testing flag enabled: `chrome://flags/#enable-webmcp-testing`
  → **Enabled** → relaunch. (See `chrome-blog/webmcp/get-started.md`.)
- No build step, no dependencies, no backend. Open `index.html` directly or via a local
  static server.

## File layout

```
whiteboard-demo/
├── index.html      # <canvas>, brush palette <form> (declarative attrs), undo/clear buttons
├── styles.css      # layout + :tool-form-active / :tool-submit-active focus styles
├── app.js          # whiteboard state + drawing logic (NO WebMCP knowledge)
└── tools.js        # WebMCP layer: imperative registerTool calls + palette submit handler
```

The split is deliberate: deleting `tools.js` leaves a fully working whiteboard. That is
the "progressive enhancement" talking point.

## The whiteboard (before WebMCP)

`app.js` owns all drawing state in memory. It exposes plain functions that `tools.js`
will call:

```js
// app.js — whiteboard state and drawing. No WebMCP here.

const canvas = document.querySelector('#board');
const ctx = canvas.getContext('2d');

const state = {
  tool: 'brush',        // brush | rect | ellipse | line | text
  color: '#1e88e5',
  width: 4,
  fill: false,
  items: [],            // drawn objects, oldest first
  undoStack: [],        // JSON snapshots for undo
};

// The stroke/shape currently being drawn by the human (null when idle).
let draft = null;

function setBrush({ tool, color, width, fill }) {
  Object.assign(state, { tool, color, width, fill });
}

function pushSnapshot() {
  state.undoStack.push(JSON.stringify(state.items));
}

function drawShape({ type, x = 0, y = 0, width = 80, height = 80, color = state.color }) {
  pushSnapshot();
  state.items.push({ kind: 'shape', type, x, y, width, height, color, fill: state.fill, strokeWidth: state.width });
  render();
}

function drawPath(points, { color = state.color, width = state.width } = {}) {
  pushSnapshot();
  state.items.push({ kind: 'path', points, color, width });
  render();
}

function addText(text, x = 0, y = 0, color = state.color) {
  pushSnapshot();
  state.items.push({ kind: 'text', text, x, y, color });
  render();
}

function undo() {
  const prev = state.undoStack.pop();
  if (prev != null) {
    state.items = JSON.parse(prev);
    render();
  }
}

function clearCanvas() {
  pushSnapshot();
  state.items = [];
  render();
}

function getCanvasState() {
  return {
    shapeCount: state.items.length,
    items: state.items.map(({ kind, type, text, x, y, color, points }) => ({
      kind,
      type,
      text,
      x,
      y,
      color,
      pointCount: points ? points.length : undefined,
    })),
  };
}

function exportPng() {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'whiteboard.png';
  a.click();
}

// --- Rendering -------------------------------------------------------------

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const item of state.items) drawItem(item);
  if (draft) drawItem(draft);   // show the in-progress stroke on top
}

function drawItem(item) {
  ctx.strokeStyle = item.color;
  ctx.fillStyle = item.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (item.kind === 'path') {
    ctx.lineWidth = item.width;
    if (item.points.length === 1) {
      const [p] = item.points;                 // single click → dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, item.width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(item.points[0].x, item.points[0].y);
    for (const p of item.points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  } else if (item.kind === 'shape') {
    ctx.lineWidth = item.strokeWidth;          // outline width captured at draw time
    ctx.beginPath();
    if (item.type === 'ellipse') {
      ctx.ellipse(item.x, item.y, Math.abs(item.width) / 2, Math.abs(item.height) / 2, 0, 0, Math.PI * 2);
    } else if (item.type === 'line') {
      ctx.moveTo(item.x, item.y);
      ctx.lineTo(item.x + item.width, item.y + item.height);
    } else { // rect
      ctx.rect(item.x, item.y, item.width, item.height);
    }
    if (item.type === 'line') ctx.stroke();
    else if (item.fill) ctx.fill();
    else ctx.stroke();
  } else if (item.kind === 'text') {
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(item.text, item.x, item.y);
  }
}

// --- Pointer handlers (human input) ----------------------------------------

function toLocal(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  const { x, y } = toLocal(e);

  if (state.tool === 'text') {
    const text = prompt('Text to add:');   // a nicer inline editor can replace this
    if (text) addText(text, x, y);
    return;
  }

  if (state.tool === 'brush') {
    draft = { kind: 'path', points: [{ x, y }], color: state.color, width: state.width };
  } else {
    draft = { kind: 'shape', type: state.tool, x, y, width: 0, height: 0, color: state.color, fill: state.fill, strokeWidth: state.width };
  }
  render();
});

canvas.addEventListener('pointermove', (e) => {
  if (!draft) return;
  const { x, y } = toLocal(e);
  if (draft.kind === 'path') {
    draft.points.push({ x, y });
  } else {
    draft.width = x - draft.x;
    draft.height = y - draft.y;
  }
  render();
});

canvas.addEventListener('pointerup', () => {
  if (!draft) return;
  if (draft.kind === 'path') {
    drawPath(draft.points, { color: draft.color, width: draft.width });
  } else {
    drawShape({ type: draft.type, x: draft.x, y: draft.y, width: draft.width, height: draft.height, color: draft.color });
  }
  draft = null;
});

canvas.addEventListener('pointercancel', () => {
  draft = null;
  render();
});
```

## Imperative tools (`tools.js`)

Each tool maps to an `app.js` function. Schemas are kept small and use `enum` where a
field has a fixed set of values, mirroring the examples in
`chrome-blog/webmcp/imperative-api.md`.

```js
// tools.js — WebMCP layer.

async function registerWhiteboardTools() {
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
            },
          },
        },
      },
      required: ['shapeCount'],
    },
    annotations: { readOnlyHint: true },
    execute: async () => getCanvasState(),
  });

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
}

registerWhiteboardTools();
```

### Annotation summary

| Tool | readOnlyHint | consequentialHint | Why |
| --- | --- | --- | --- |
| `get_canvas_state` | true | false | pure read; safe for agents to call speculatively |
| `draw_shape`, `add_text`, `undo` | false | false | mutate the page but are easily reversible |
| `clear_canvas`, `export_png` | false | true | destructive / triggers a download → force confirmation |

## Declarative tool: the brush palette

In the "before" app the palette is a set of bare inputs. In the "after" app they are
wrapped in one `<form>` with two attributes (`toolname`, `tooldescription`) plus
`toolautosubmit` so the agent's choice applies immediately. Field-level
`toolparamdescription` improves parameter mapping, per
`chrome-blog/webmcp/declarative-api.md`.

```html
<!-- index.html — the palette form (declarative WebMCP tool) -->
<form id="brush-palette"
      toolname="configure_brush"
      tooldescription="Set the brush color, stroke width, and active drawing tool on the whiteboard."
      toolautosubmit>

  <label for="brush-color">Brush color</label>
  <input id="brush-color" name="color" type="color" value="#1e88e5"
         toolparamdescription="Brush color as a hex value.">

  <label for="brush-width">Stroke width</label>
  <input id="brush-width" name="width" type="range" min="1" max="40" value="4"
         toolparamdescription="Stroke width in pixels.">

  <label for="brush-tool">Tool</label>
  <select id="brush-tool" name="tool" toolparamdescription="Drawing tool to activate.">
    <option value="brush">Brush</option>
    <option value="rect">Rectangle</option>
    <option value="ellipse">Ellipse</option>
    <option value="line">Line</option>
    <option value="text">Text</option>
  </select>

  <label for="brush-fill">
    <input id="brush-fill" name="fill" type="checkbox"
           toolparamdescription="Whether to fill shapes.">
    Fill shapes
  </label>
</form>
```

The submit handler applies the values and reports back to the agent via
`SubmitEvent.respondWith()`. `agentInvoked` distinguishes agent-driven submits from any
human-driven ones.

```js
// tools.js — palette submit handler (declarative tool wiring)
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
  if (e.agentInvoked) {
    e.respondWith(Promise.resolve(
      `Brush set to ${brush.color}, width ${brush.width}, tool ${brush.tool}.`
    ));
  }
});

document.modelContext.addEventListener('toolactivated', ({ toolName }) => {
  document.querySelector('#status').textContent = `Agent activated: ${toolName}`;
});
```

Focus styles in `styles.css` use the browser's declarative pseudo-classes so attendees
see the agent's target light up:

```css
/* Prevent scroll/zoom while drawing on touch screens. */
#board { touch-action: none; }

form:tool-form-active {
  outline: 2px dashed #1e88e5;
  outline-offset: -2px;
}
input:tool-submit-active {
  outline: 2px dashed #e53935;
}
```

## Before/after narrative (the live demo)

1. **Before (actuation fails).** Load the plain whiteboard (no `tools.js`). Ask the
   agent: "Draw a red circle." The agent scrapes the DOM, finds no clickable elements
   on the `<canvas>`, and either declines or mis-clicks. The canvas stays blank.
   *Message:* actuation cannot drive a canvas — there is nothing semantic to grab.

2. **After (WebMCP works).** Add `tools.js` and annotate the palette. Reload and repeat
   the same prompt. The agent discovers `draw_shape` and `configure_brush`, sets the
   color, and the ellipse appears visibly on the user's canvas. Then: "export it as a
   PNG" → the `consequentialHint` confirmation fires → file downloads.

3. **The declarative beat.** Ask: "Switch to a blue brush." The palette form focuses
   with the `:tool-form-active` outline, fields pre-fill, and `toolautosubmit` applies
   the new brush — no JavaScript registration was involved, just two HTML attributes.

## "Only WebMCP" moments to hit

1. A drawing has **no textual form** — no chat message can reproduce it, so MCP cannot
   deliver this task at all.
2. Agents **can't click canvas pixels** — actuation has nothing to grab; WebMCP tools
   are the only reliable route.
3. The **palette is the declarative API** — annotating real `<input>`/`<select>` elements
   makes the brush controls agent-callable.
4. The human and the agent **share one code path** (`drawShape`/`addText`), so tool
   calls are visibly the same actions the user performs.

## Verification

- Flag enabled: `chrome://flags/#enable-webmcp-testing`.
- Inspect tools: Chrome DevTools → Application → WebMCP (validates JSON Schema parsing).
- Exercise with an agent: the [Model Context Tool Inspector
  Extension](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd)
  or the [Example Agentic Chrome Extension](https://github.com/GoogleChromeLabs/webmcp-extension/).
- Programmatic smoke test: `await document.modelContext.getTools()` should list the six
  imperative tools plus `configure_brush`.

## Reference material in this repo

- `chrome-blog/webmcp/imperative-api.md` — `registerTool`, `inputSchema`/`outputSchema`,
  `annotations`, `getTools`, `toolchange`.
- `chrome-blog/webmcp/declarative-api.md` — `toolname`/`tooldescription`/
  `toolautosubmit`/`toolparamdescription`, `SubmitEvent.agentInvoked`/`respondWith`,
  `toolactivated`/`toolcancel`, `:tool-form-active`/`:tool-submit-active`.
- `chrome-blog/webmcp/get-started.md` — origin trial flag, demo list, agent extensions.
- `webmcp-spec.md` — normative text.

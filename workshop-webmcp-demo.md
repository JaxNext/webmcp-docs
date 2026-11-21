# WebMCP Workshop Demo — Recommendation Notes

Date: 2026-11-21
Context: GDG DevFest workshop (next month) on applying WebMCP to an existing web app.
Constraint: demo must be a pure front-end app, with features that only WebMCP (not MCP)
can expose to an AI agent.

## Question

The workshop needs a demo web app to modify. Which kind of pure front-end demo best
suits the goal, and has features that only WebMCP — not MCP — can adapt to an agent?

## Core principle: the "chatbox test"

The decisive test is not "does the state live in the tab" — it is "can the agent's answer
be delivered as text?"

- If the result can be fully expressed as text in a chat — a plan, a list, a booking, a
  budget — then MCP (or no protocol at all) is *more* convenient. The user does not need
  a page open to receive text.
- If the result is something the user must **see** and then **operate on** in the page —
  a drawing, a filtered photo, a diagram's layout, a calendar with overlaps, a map with
  pins — then WebMCP wins. That visual output has no faithful textual form, and the user
  continues to act on it in-session.

This is the same "call-center vs in-store expert" split from
`chrome-blog/webmcp/compare-mcp.md`, applied to the *output modality* rather than the
*execution location*:

- MCP is a call center: text in, text out, always available, no shared visual context.
- WebMCP is an in-store expert: the deliverable is the live page the user is looking at,
  and the agent acts on it in the user's own session.

Screening question for any candidate demo: *"Can I give the user the full result as a
chat message?"* If yes, MCP wins and the demo is wrong. If the result has to be seen on
screen to be understood or used, it is a WebMCP demo.

## Rejected: trip/event planner

A trip planner fails the chatbox test. Its deliverable — an itinerary, a filtered list, a
running total — is pure text. An agent in a chat can produce that without the user ever
opening the site, so MCP is the *more* convenient choice, not the less convenient one.
Forcing the user to keep a page open adds friction without adding value.

## Recommended demo: canvas drawing / whiteboard

A freeform drawing app is the primary demo because its output has **no textual
representation at all** — there is no text the agent could return that equals a drawing.
It is the purest instance of the chatbox test, and therefore the most unassailable
"only WebMCP, not MCP" argument.

Why it fits:

- Pure front end, zero backend; all state (shapes, colors, undo stack) lives in the page's
  JavaScript, so a backend MCP has nothing to call.
- The user must see the canvas to understand the result, and continues to operate on it
  (recolor, move, delete) in-session.
- DOM-scraping actuation cannot meaningfully drive a `<canvas>` — there are no clickable
  elements for an agent to find, so WebMCP tools are the *only* reliable path.

### It supports both APIs (correcting an earlier assumption)

A canvas app is **not** imperative-only. Its tool palette is made of real form elements:

- `<input type="color">` for brush/fill color
- `<input type="range">` for stroke width
- `<select>` for shape / tool selection
- `<input type="checkbox">` for fill vs stroke

Annotate that palette as a `<form toolname=… tooldescription=… toolautosubmit>` and it
becomes a first-class declarative WebMCP tool. So the same app teaches the declarative
API (the palette) and the imperative API (drawing operations) cleanly.

### Tool surface

Imperative (JavaScript) — the drawing operations:

- `draw_shape(type, x, y, w, h, color)` — rect, ellipse, line, freehand
- `add_text(text, x, y)`
- `set_tool(tool)` / `set_color(color)` / `set_stroke_width(px)` — or expose these
  declaratively via the palette
- `select_shape(id)`, `delete_shape(id)`
- `undo()`, `clear()`
- `export_png()` — requires user confirmation, demonstrating a sensitive action

Declarative (annotated HTML form) — the brush/tool palette:

```html
<form toolname="configure_brush"
  tooldescription="Set the brush color, stroke width, and drawing tool."
  toolautosubmit>
  <label for="color">Brush color</label>
  <input id="color" name="color" type="color" toolparamdescription="Brush color.">

  <label for="width">Stroke width</label>
  <input id="width" name="width" type="range" min="1" max="40"
    toolparamdescription="Stroke width in pixels.">

  <label for="tool">Tool</label>
  <select id="tool" name="tool" toolparamdescription="Drawing tool to activate.">
    <option value="brush">Brush</option>
    <option value="rect">Rectangle</option>
    <option value="ellipse">Ellipse</option>
  </select>
</form>
```

### What to show before and after

Before: an ordinary whiteboard — a `<canvas>`, a tool palette, an undo button, a clear
button. No network calls.

After: the same app with the drawing operations registered as imperative tools and the
palette form annotated as a declarative tool. The live talk runs the same natural-language
prompt twice — once against the un-instrumented canvas (actuation fails / guesses) and
once with WebMCP (the agent calls tools and the drawing visibly appears).

### "Only WebMCP" moments to hit during the talk

1. **A drawing has no text form** — no chat message can reproduce it, so MCP cannot deliver
   this task at all.
2. **Agents can't click canvas pixels** — actuation has nothing to grab; WebMCP tools are
   the only reliable route.
3. **The palette is the declarative API** — annotating real `<input>`/`<select>` elements
   is all it takes to make the brush controls agent-callable.
4. **Visible actuation builds trust** — tool calls visibly mutate the user's canvas, which
   the `export_png()` confirmation is there to demonstrate.

## Alternatives considered

1. **Diagram / flowchart builder** — richest agent tasks and very dev-relatable ("sketch me
   the auth flow"). Slightly weaker on the chatbox test because flowcharts have a textual
   fallback (Mermaid); the talk would need a prepared rebuttal ("Mermaid renders a static
   diagram; WebMCP operates the user's live, interactive canvas").
2. **Photo filter editor** — "must see the filtered result" is visceral, and sliders/dropdowns
   are a natural declarative demo. Good runner-up.
3. **Calendar / scheduling board** — strong "must see the overlaps" story, but models more
   state than a canvas app.
4. **Trip planner / shopping list** — rejected: text-in/text-out, so MCP is more convenient.

## Decisions made

- **Primary demo:** canvas drawing / whiteboard.
- **API coverage:** both imperative (drawing operations) and declarative (tool palette form).
- **Stack:** vanilla JavaScript, so the WebMCP API is the focus rather than framework setup.

## Reference material in this repo

- `chrome-blog/webmcp/compare-mcp.md` — MCP vs WebMCP comparison table (call center vs
  in-store expert).
- `chrome-blog/webmcp-user-journeys/use-cases.md` — shopping, forms, filtering journeys
  (used to stress-test and reject the trip planner).
- `chrome-blog/webmcp/get-started.md` — origin trial flag, demo list, agent extensions.
- `chrome-blog/webmcp/imperative-api.md`, `declarative-api.md` — API details.
- `webmcp-spec.md` — normative text.

## Next step

Draft the drawing/whiteboard demo spec: file layout, imperative tool definitions with
JSON schemas, the palette declarative form, and a before/after narrative for the workshop.

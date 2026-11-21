# WebMCP Workshop Demo — Recommendation Notes

Date: 2026-11-21
Context: GDG DevFest workshop (next month) on applying WebMCP to an existing web app.
Constraint: demo must be a pure front-end app, with features that only WebMCP (not MCP)
can expose to an AI agent.

## Question

The workshop needs a demo web app to modify. Which kind of pure front-end demo best
suits the goal, and has features that only WebMCP — not MCP — can adapt to an agent?

## Core principle: what makes it "only WebMCP, not MCP"

From `chrome-blog/webmcp/compare-mcp.md`, the decisive rows are *where the code runs*
and *whose login it uses*:

- MCP is a call center: runs on a **server**, uses its **own credentials**, always available.
- WebMCP is an in-store expert: runs in the **page's JS runtime**, uses the **user's current
  session**, and is **ephemeral** (gone when the tab closes).

So the demo must keep its "brains" entirely in the client — state in memory,
`localStorage`, or IndexedDB, rendered client-side — and the target action must be
in-context and in-session. A backend MCP cannot reach that state: there is no server
and no API to call.

Screening question for any candidate demo: *"If I removed all the HTML and gave the app
to an MCP server, could the agent still do the task?"* If yes, it is the wrong demo. If no —
the state exists only in the open tab — it is the right demo.

## Recommended demo: client-state trip/event planner

Chosen as the primary demo because it satisfies "both APIs" naturally.

Why it fits:

- Pure front end, zero backend.
- Rich client-side state (search results, filters, plan items, running total) that a
  server cannot reach.
- A natural multi-step flow — search → filter → add → refine → finalize — matching the
  shopping and travel examples in `chrome-blog/webmcp-user-journeys/use-cases.md`.
- Splits cleanly into imperative tools plus one declarative form.

### Tool surface

Imperative (JavaScript):

- `search_destinations(query, filters)`
- `add_activity(item, qty)`
- `remove_activity(item_id)`
- `filter_by_budget(max)`
- `reorder_plan(items[])`
- `get_plan_total()`
- `finalize_plan()` — requires user confirmation, demonstrating a sensitive action.

Declarative (annotated HTML form), modeled on the timesheet/car-search examples:

```html
<form toolname="add_trip_item"
  tooldescription="Add an activity to the current trip plan."
  toolautosubmit>
  <!-- date / type / cost fields with toolparamdescription -->
</form>
```

### What to show before and after

Before: an ordinary SPA — search bar, activity list with filters, plan panel with a
running total, confirm dialog. No network calls.

After: the same app with imperative tools registered and one form annotated. Two
attributes are enough to make the form agent-callable.

### "Only WebMCP" moments to hit during the talk

1. **State lives in the tab** — an MCP server cannot read `localStorage` or the
   in-memory plan; only in-page tools can.
2. **User session, not server credentials** — there is no login or backend; WebMCP acts
   on the user's own open session.
3. **Visible actuation builds trust** — tool calls visibly mutate the user's page, which
   is what the `finalize_plan()` confirmation is there to demonstrate.

## Alternatives considered

1. **Canvas / creative app** (drawing or diagram editor) — the strongest "only WebMCP"
   contrast, because DOM-scraping actuation cannot meaningfully operate on canvas
   pixels. However, its tools are imperative-only (`draw_shape`, `set_color`, `undo`,
   `export_png`); there is no natural HTML form to annotate, so the declarative half of
   the workshop would feel forced. Best kept as a short stretch exercise.
2. **Shopping list / cart** — mirrors the "Jesse" shopping journey in the docs. Good, but
   narrower than the trip planner.
3. **Form-heavy tool** (timesheet, car search, warranty claim) — best for teaching the
   declarative API in isolation; the "only WebMCP" contrast is weaker unless submission
   is entirely client-side.

## Decisions made

- **Domain:** trip/event planner as the primary demo; canvas/creative tools as an
  optional stretch exercise.
- **API coverage:** both imperative and declarative.
- **Stack:** vanilla JavaScript, so the WebMCP API is the focus rather than framework
  setup.

## Suggested canvas stretch (15 minutes)

Take a small `<canvas>` doodle app and expose `set_color`, `draw_shape`, and `undo` as
imperative tools. Payoff line for the audience: an agent scraping the DOM cannot click
on canvas pixels at all; WebMCP is the only reliable way to drive this kind of app.

## Reference material in this repo

- `chrome-blog/webmcp/compare-mcp.md` — MCP vs WebMCP comparison table.
- `chrome-blog/webmcp-user-journeys/use-cases.md` — shopping, forms, filtering journeys.
- `chrome-blog/webmcp/get-started.md` — origin trial flag, demo list, agent extensions.
- `chrome-blog/webmcp/imperative-api.md`, `declarative-api.md` — API details.
- `webmcp-spec.md` — normative text.

## Next step

Draft the trip-planner demo spec: file layout, tool definitions with JSON schemas, the
declarative form, and a before/after narrative for the workshop.

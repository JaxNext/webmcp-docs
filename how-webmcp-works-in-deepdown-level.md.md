# How WebMCP works in deepdown level

---


**User**

My question: If an AI agent know nothing about WebMCP, when it receives the task to draw that panda, how could it even know there are WebMCP tools are available? You did call those tools because you have read relevant docs and specs, but since WebMCP is a new API, how to make sure every AI agent handle web apps in WebMCP way?

**Assistant**

The user is asking a conceptual/fundamental question about WebMCP's adoption/discovery model: how does an agent that knows nothing about WebMCP discover that a page exposes WebMCP tools? I should answer from the repo's actual content — the spec and Chrome docs — and be precise about the discovery mechanism, which is a key design point of WebMCP.

Let me recall what I know about WebMCP discovery from the repo. The key concept: WebMCP tools are *declared* by the page (imperative via `registerTool`, declarative via `toolname` form attributes). Discovery happens through the browser/agent integration: the browser aggregates the tools exposed by the current page (and same-origin frames) via `document.modelContext.getTools()`, and the agent client (browser agent extension / the agent that's driving the browser) queries that registry. The agent doesn't need to "know" WebMCP — the agent platform/client integration surfaces tools to the model the same way MCP tools are surfaced (as a tool list in the model's function-calling context).

This is the crux of the user's confusion: they think the agent needs prior knowledge of WebMCP. But actually WebMCP is a *client-side / browser-level* mechanism — it's the browser (or the agent's browser-integrated client) that discovers tools, not the model knowing the spec. The model just sees "here are the available tools" (name + JSON schema + description) in its context, exactly like MCP tools. The model doesn't need to know whether the tool came from MCP (server) or WebMCP (page) — it just sees a function schema and decides to call it.

Let me verify the key discovery details from the repo to be accurate and cite properly. I should check:
1. `webmcp/README.md` (explainer) — the tool flow / discovery.
2. `chrome-blog/webmcp/compare-mcp.md` — how it compares, discovery.
3. `chrome-blog/webmcp/get-started.md` — how agents/extension work.
4. `webmcp/implementation-status.md` — browser/agent support.

Key facts I recall:
- `document.modelContext.getTools()` returns tools the calling document is authorized to access; there's an `includeShadowDom`/cross-origin option (line 233-236 I saw earlier: `getTools()` same-origin, and `getTools({ ... })` all tools).
- The agent integration: "Example Agentic Chrome Extension" and "Model Context Tool Inspector" — these are the agent clients. They read the browser's tool registry and feed tools to the LLM.
- The security model: tools are scoped per-page; cross-origin iframes can't see tools unless delegated.

The core answer to "how does the agent know WebMCP tools are available":
1. The agent doesn't need to know the spec. WebMCP tools are surfaced by the *browser* to the *agent client* (extension), which serializes them into the model's tool-calling schema (same as MCP). The model sees a generic "tool" abstraction: name, description, JSON Schema input/output, annotations.
2. Discovery is automatic: when the agent is operating on a page (or navigates to it), the browser's `modelContext` collects the tools registered by that page. The agent client calls `document.modelContext.getTools()` and hands the list to the model as available functions.
3. So the "adoption" burden is on the *platform* (browser + agent client), not on each model. Any model with function-calling sees WebMCP tools exactly like MCP tools. The model doesn't distinguish "is this MCP or WebMCP."

But there's an honest nuance the user is implicitly raising: WebMCP is new; today only certain clients (ChatGPT Desktop, the two Chrome extensions) support it. So "how to make sure every AI agent handles web apps in the WebMCP way" — the honest answer is: it's not universal yet; it depends on the agent's browser-integrated client supporting the WebMCP modelContext registry. This is an adoption/standards question, not a model-knowledge question.

Let me also address the deeper point: the agent needs to be *prompted/pointed* at the page, or be operating in a browser session where the page is open. WebMCP tools are only available when the user (or agent) is on that page. So the agent discovers tools because it's *already on the page* in the browser context. The discovery is contextual: tools appear when the page is open.

I should give a precise, well-cited answer. Let me read the relevant files to get exact wording and cite correctly. Let me check compare-mcp.md, get-started.md, README.md, and implementation-status.md.

Actually, I have decent recall, but to cite accurately (AGENTS.md: "Cite webmcp-spec.md for normative claims and the Chrome articles for practical guidance"), I should read the specific sections. Let me do targeted greps/reads.

Key things to verify:
1. How does the agent/client discover tools? `getTools()` behavior and who calls it.
2. The "agent" abstraction — the model sees tools, not the spec.
3. Implementation status — which clients support it.

Let me read:
- `webmcp/README.md` — the explainer's tool flow.
- `chrome-blog/webmcp/compare-mcp.md` — the comparison.
- `chrome-blog/webmcp/get-started.md` around lines 71-120 (already saw 112-120).
- `webmcp/implementation-status.md` (already saw the top).

Let me do a few reads in parallel to get precise content. Actually, I already have a good amount. But to cite well, let me grep for the discovery mechanism in README and compare-mcp.

Let me search for terms: "discover", "getTools", "tool list", "agent" in README and compare-mcp.

Let me read compare-mcp.md fully (it's likely the most relevant for "MCP vs WebMCP" mental model) and grep README for discovery.

Actually, this is a conceptual question; I can answer well from what I know, but I should ground it in the repo. Let me do a couple of targeted reads to get exact language, then answer.

Let me read:
1. chrome-blog/webmcp/compare-mcp.md (full, likely short)
2. webmcp/README.md (the tool flow section)

And maybe grep for "getTools" context in imperative-api (I already have lines 204-236).

Let me read compare-mcp.md and grep README for "discover"/"getTools"/"registry".

I have the key content. Let me answer the user's conceptual question precisely.

The user's question: "If an AI agent knows nothing about WebMCP, when it receives the task to draw that panda, how could it even know there are WebMCP tools available? You did call those tools because you read relevant docs/specs. Since WebMCP is a new API, how to make sure every AI agent handles web apps in the WebMCP way?"

Key points to convey:

1. **The agent/model never needs to "know" WebMCP.** WebMCP is not something the model learns about — it's a browser/agent-client mechanism. The discovery is done by the *harness* (the browser + the agent client), not by the model's knowledge.

2. **Discovery is a lifecycle step, not model inference.** From README "Lifecycle of a Tool Call":
   - Registration: page registers tools
   - Discovery: an agent *connected to the page* queries the browser to discover the active list of tools + schemas
   - Invocation: agent requests tool call with args matching inputSchema
   - Execution: browser mediates, runs execute callback
   - Response: returns structured results

   So the agent client calls `document.modelContext.getTools()` and gets the list. The model just sees "here are N tools available" as function schemas — identical to how MCP tools appear.

3. **The model sees a generic "tool" abstraction.** WebMCP tools are serialized as name + description + inputSchema/outputSchema + annotations. The model's function-calling interface doesn't care whether the tool came from MCP (server) or WebMCP (page). It just sees a function to call. So "knowing WebMCP" is irrelevant to the model.

4. **Discovery is automatic and contextual — tools exist only while the page is open.** From compare-mcp.md: "The page registers them dynamically in the active session" and "WebMCP tools are ephemeral. They exist only when your page is open." So the agent discovers tools *because it's already on the page* (operating in the browser). The agent client's job is to, on every page load, query the browser for tools and surface them to the model.

5. **This is the whole point of a standard.** Just like a browser agent that knows HTML/accessibility can actuate any page without "knowing" each site, a WebMCP-capable agent client can discover tools on any page without the model knowing WebMCP. The knowledge moves from the model to the platform.

6. **So "how to make sure every agent handles WebMCP":** it's not about the model; it's about the agent *client/platform* implementing the browser's `modelContext` registry. Today that's ChatGPT Desktop, the two Chrome extensions, and (browser-level) the flag/origin trial. The answer to "every agent" is: it's a platform/browser standard (W3C Web Machine Learning CG draft), so browser vendors and agent platforms implement the client-side discovery; models with function-calling get it for free. This is exactly analogous to how MCP got adopted: the model doesn't know MCP; the MCP client/host surfaces tools to it.

7. **My own case:** I called the tools because I'm driving a browser with the DevTools MCP and I read `getTools()` — I played the role of the "agent client" manually. A real agent client (e.g., the Model Context Tool Inspector / Example Agentic Chrome Extension) does the `getTools()` step automatically and injects the tools into the model's context. The model then picks "draw_shape" purely from its name/description/schema, not from knowing WebMCP.

Let me also address the honest caveat: adoption is early. Not "every" agent does this yet. The burden is on agent platforms + browsers, and that's what the standard + origin trial are for.

Let me structure a clear, concise answer. This is an educational/conceptual question. Should I use a visual? The inline-visuals guidance says to proactively use visuals for educational topics. This is a good candidate for a small diagram showing the discovery flow (page registers → browser registry → agent client getTools() → model sees function schemas → model calls → browser executes). But I should weigh: the user asked a direct conceptual question; a diagram could genuinely help. However, the instructions also say keep it concise and the answer is fundamentally textual/architectural.

I think a short diagram would genuinely aid understanding here (the "who knows what" flow). The inline-visuals guidance strongly encourages visualizing educational/architectural topics. But I also must load the dynamic-ui skill before using PureShowWidget. That adds overhead. Given context is high and the user wants a clear answer, I'll consider whether to use a diagram.

Actually, let me reconsider. The question is a "how does it work / who knows what" architectural question. A compact diagram showing the discovery chain would be genuinely clarifying. But I could also answer clearly in prose with a well-structured list, which may be sufficient and faster. 

The inline-visuals system reminder is fairly strong about proactively using visuals for "architecture & systems" and "explain" topics. This is exactly "help me understand how X works" about a system. I'll produce a concise diagram to anchor it, then prose. But I need to load the dynamic-ui skill first.

Hmm, but there's tension: context is very high (repeated reminders). Adding a skill load + widget might be heavy. But the guidance is explicit. Let me do a lightweight approach: load the dynamic-ui skill and render one compact diagram of the discovery flow, with prose around it.

Actually, let me weigh more carefully. The user is asking a sharp conceptual question and wants a precise answer. A diagram of the tool-call lifecycle would help. The README already has a "Lifecycle of a Tool Call" (5 steps). I could render that as a small diagram.

Let me load the dynamic-ui skill and produce a diagram. This is justified by the "architecture & systems" + "explain" triggers.

Actually, I want to be careful about over-doing it. Let me first give a crisp textual answer, and use a small diagram to illustrate the discovery chain. I'll load the skill.

Let me decide: Yes, use one diagram. Load dynamic-ui skill first (per guidance: "load the relevant dynamic-ui skill before generating output: diagram").

Let me load the skill, then produce the answer with a diagram + prose.

Actually, given the strong guidance and that this is genuinely an architecture/teaching question, I'll load the diagram skill and render the tool discovery lifecycle. Then prose.

Let me load the skill.

The user's question is conceptual/educational, and a diagram would help. But I should weigh: this is a "who knows what / how does discovery work" architecture question. A small mechanism/architecture diagram of the tool-call lifecycle (registration → discovery → invocation → execution → response) with the key insight that the model never "knows WebMCP" would be genuinely helpful.

However, I need to read the scene file for architecture-and-flow or mechanism-explanation. Actually, I can produce a compact node-flow diagram. Let me read the architecture-and-flow scene file and maybe the node-flow template. But context is very high. 

Actually, let me reconsider whether a diagram is worth it here vs a crisp prose answer. The question is fundamentally: "the agent doesn't know WebMCP; how does it discover tools?" The answer is a clear architectural fact. A small diagram showing "page registers → browser registry → agent client getTools() → model sees function schemas (not 'WebMCP')" would clarify the key insight well.

Given the guidance strongly encourages visuals for architecture/mechanism explanation, and the user is clearly engaging deeply with the concept, I'll produce ONE compact diagram. I'll use the mechanism-explanation or architecture-and-flow scene. Let me route to architecture-and-flow since it's about a flow/chain (tool lifecycle).

Actually, let me just read the architecture-and-flow scene file quickly to follow its mandatory workflow, and check the node-flow template. But to limit context load, maybe I can just read the scene file and produce a simple custom node-flow following the rules I already have.

Let me read the architecture-and-flow scene file.

This is a mechanism-explanation question, actually — "how does an agent discover WebMCP tools if it knows nothing about WebMCP." That's a mechanism/causal chain. The architecture-and-flow scene is for module relationships/flowcharts. A mechanism explanation might be better. But the lifecycle-of-a-tool-call is essentially a flow/sequence.

Actually, the key insight to visualize is a flow: Page registers tools → Browser collects them → Agent client calls getTools() → Model receives plain function schemas → Model picks "draw_shape" (knows nothing of WebMCP) → Browser executes → result returned.

The most valuable visual is a sequence/flow diagram showing that the model never touches WebMCP — it only sees a generic tool list. That's a mechanism explanation (who knows what).

I'll use a horizontal flow / sequence diagram with ~5 nodes. The focal point: "the model sees plain function schemas, not 'WebMCP'."

Let me plan a compact horizontal flow with a clear focal node.

Actually, given the constraints and the high context, let me be efficient. I'll produce a single compact `node-flow` style diagram (horizontal flow, 5 boxes) showing the discovery chain, with the model node as the focal point (brand color).

Nodes (the tool-call lifecycle, condensed to the discovery question):
1. Web page — registers tools (`registerTool` / `toolname`)
2. Browser (`document.modelContext`) — holds the tool registry
3. Agent client (extension/desktop) — calls `getTools()`
4. Model — sees name+JSON schema (no WebMCP knowledge) ← focal
5. Tool executes in page — `execute()` / form submit

That's 5 boxes in a horizontal flow. Plus a note that discovery is automatic on page load.

Actually, let me think about the cleanest visual. The user's core confusion: "how does the agent know tools exist?" Answer: the agent *client* discovers them via the browser; the model just receives a tool list.

A horizontal flow of 5 nodes fits within the "3-5 primary steps" budget and "max 4 boxes per horizontal tier" — 5 is a bit over the "max 4 boxes" horizontal tier rule. Hmm, the SKILL says "Horizontal tier: max 4 boxes. For 5+ items: group, wrap, or split."

So 5 boxes in one row violates the budget. I should condense to 4 or split. Let me condense:

Option: 4 nodes in a flow:
1. Web page → registers tools
2. Browser registry → `document.modelContext`
3. Agent client → `getTools()`
4. Model → plain function schemas (focal)

And then a final arrow to "page executes" could be a note. Or I merge "execution" into the model node's subtitle ("model calls → page runs execute()").

Actually the cleanest 4-node flow answers the question directly:

Page registers → Browser collects → Agent client discovers (getTools) → Model receives "what can you do?" tool list

With the focal point being: the model receives plain name/description/JSON-schema — it never sees "WebMCP."

Let me do a horizontal 4-box flow. Each box: title + short subtitle. Focal on the model box.

Let me plan coordinates. viewBox 0 0 720 H.

4 boxes across 720 width, safe area 40 each side → usable 640. 4 boxes with 3 gaps. Gap ≥ 60 for flow steps. 4 boxes × width + 3×60 gap.

Let me set box width = 140, gap = 60? 4×140 = 560 + 3×60 = 180 = 740 > 640. Too wide.

Box width = 120, gap = 50? 4×120=480 + 3×50=150 = 630. Fits within 640. But gap should be ≥60 for flow steps. Hmm, 60×3=180, need boxes ≤ (640-180)/4 = 115 each. 115px boxes are narrow for 14px text (~8px/char → ~14 chars per line = about 3-4 words). Node width = title_chars×8 + 24. "Web page" = 8 chars → 64+24 = 88. "Browser registry" ~ 16 chars → 128+24 = 152. Too wide.

This is getting tight. Maybe vertical flow is cleaner for this content (labels are a bit long). A vertical flow of 4-5 steps stacked works well and avoids the horizontal width crunch.

Vertical flow: 4 boxes stacked vertically, arrows pointing down. Each box ~ 280-320px wide, centered. This fits labels comfortably.

Let me do a vertical flow, 4 nodes:

1. **Web page** — registers tools in JS/HTML (`registerTool`, `toolname`)
2. **Browser** (`document.modelContext`) — collects the page's tools
3. **Agent client** (extension / desktop) — calls `getTools()` automatically
4. **Model** — gets plain name + JSON schema (never "WebMCP")  ← focal (brand)

Wait, but I also want to convey the execution/response loop back to the page. But that might be over-complex. The user's question is specifically about DISCOVERY, so the 4-node flow is sufficient. I can put execution as a small return note in prose, or add a 5th node.

Actually, to keep it tight and focused on the discovery question, 4 nodes is ideal. I'll add the execution detail in prose.

Let me do a vertical flow. Coordinates:

viewBox 0 0 720 H. Centered boxes ~ width 360. Actually let me make boxes a comfortable width like 400, centered (x = 160 to 560).

Hmm, but I want the model node to be visually distinct (focal, brand border). The other 3 neutral.

Let me plan:
- Title area: a small caption at top like "How an agent discovers WebMCP tools" — optional. Actually the widget should be chart/diagram only, no conclusion. A short title is allowed ("optional short title").

Let me build:

viewBox 0 0 720 H. Safe area 40. 

Boxes: x from 140 to 580 (width 440) centered. Actually center them: box width 420, x = 150, centered horizontally (150 + 420 = 570, right margin 150). Good, symmetric-ish.

Nodes (vertical), each height ~ 64 (two-line: title + subtitle). Gap between = 60 (connector + label space).

Node 1: y=60, h=64 → title "Web page", subtitle "registers tools (registerTool / toolname)"
Node 2: y=184, h=64 → "Browser", "document.modelContext collects them"
Node 3: y=308, h=64 → "Agent client", "calls getTools() on page load"
Node 4: y=432, h=72 (focal, maybe taller) → "Model", "receives name + JSON schema" — focal

Total content bottom = 432 + 72 = 504. Add bottom padding 40 → H = 544. Arrows between nodes at y gaps.

Connectors: vertical arrows from bottom of node i to top of node i+1, with a small label capsule beside them (e.g., "register", "aggregate", "discover"). Actually connector labels are optional; I can add short labels.

Let me keep it simple: 3 downward arrows, no connector labels (or minimal). The focal is the model node with brand border + a small "never knows 'WebMCP'" tag.

Let me write the widget code with proper tokens. I need token definitions. The SKILL says to read tokens/visual-tokens.md for full definitions, but I have the key ones mentioned in SKILL: --surface, --surface-muted, --text, --text-muted, --border, --brand, --brand-text, --brand-on, --chart-series-*, --radius (8px), --radius-card (12px), --radius-full, --spacer-*, --text-caption (12/18), --text-code (13/20), --text-body (14/20), --text-title (16/24), --font-sans, --weight-medium, --weight-strong.

I need actual color values for light/dark. Rather than reading the full tokens file (more context), I can use reasonable token values consistent with a neutral/brand palette. But the SKILL says "do not invent a palette" and "consume tokens". However, I'm not strictly required to read the tokens file if I define tokens at top of style. The rule says "Token definitions at top of <style>". I can define :root tokens with sensible values and dark overrides.

But there's risk of inventing a palette. The guidance: "do not put hard-coded light-only colors in component selectors" and "consume tokens everywhere." I'll define tokens at top. The exact brand green/blue values — I can use standard-ish values. Green default: brand/green/600 (#16a34a-ish) light, brand/green/500 dark. Blue fourth series: brand/blue/500 light, blue/600 dark.

Let me just read the tokens file quickly to get exact values, to avoid inventing. Actually, that's more context but it's important for correctness. Hmm. The SKILL says "read on demand". I'll read it to get exact token values, since I'm about to produce a custom widget.

Actually, let me reconsider whether to produce the diagram at all, given:
1. Context is very high (repeated warnings).
2. The question can be answered crisply in prose with a clear structure.
3. A diagram adds overhead (read tokens file, careful SVG geometry).

But the guidance is strong about educational/architecture visuals. The user asked a genuine "how does this work" question. A compact diagram genuinely helps.

I'll compromise: produce a small, clean vertical flow diagram. I'll read the tokens file to get exact values (one more read), then produce the widget, then give a concise prose answer.

Actually, let me minimize: I can define a minimal set of tokens with standard neutral/brand values without reading the full file, as long as I consume them via var() and support dark. The SKILL's concern is "don't invent a palette for charts" and "don't hard-code light-only colors." For a simple neutral+brand flow diagram, using a minimal token set is acceptable. But to be safe and correct, reading the tokens file is better.

Let me read the tokens file (visual-tokens.md) — it's a single file and gives me exact values.

Given context pressure, I'll read it once and then emit the widget.

Now I have the tokens. Let me produce a compact vertical flow diagram showing the WebMCP tool discovery chain, with the focal point being the model node (which receives plain function schemas, not "WebMCP").

Let me design the SVG carefully following the rules.

Layout plan (vertical flow, 4 nodes):
- viewBox 0 0 720 H
- Safe area ≥40.
- Nodes centered horizontally, width ~420 (x from 150 to 570).
- 4 nodes, 3 connectors between.

Node heights: two-line nodes (title + subtitle), height ~ 60.

Let me define:
- node width W = 440, x = 140 (140+440=580, right margin 140, left 140; symmetric).
- Actually center: 720/2 = 360. Node width 440 → x = 140.

Node y positions:
- Node 1 (top): y = 56
- Node 2: y = 176
- Node 3: y = 296
- Node 4 (focal, taller): y = 416

Each node height = 60 (except focal maybe 68).

Connectors: from bottom of node i (y + 60) to top of node i+1 (y). Gap = 176 - (56+60) = 60. So 60px gap for connector + label.

Total content bottom = 416 + 68 = 484. Bottom padding 40 → H = 524.

Let me set H = 528.

Node content (title + subtitle):
1. **Web page** / "registers tools: registerTool() + <form toolname>"
2. **Browser** / "document.modelContext holds the registry"
3. **Agent client** / "calls getTools() on the page"
4. **Model** / "sees name + JSON schema — never 'WebMCP'"  (focal, brand)

I'll add a small step number or just arrows. Connector labels: optional, 1-3 words. Let me add short labels beside arrows: "register", "aggregate", "discover". Actually these could be omitted. But a tiny label helps. I'll add them as small capsules to the side. Actually to keep it simple and avoid collision risk, I'll put connector labels as small text above each arrow, offset to the left of the arrow (not on it).

Hmm, simpler: omit connector labels; the node subtitles already explain. Keep it clean.

Let me add a focal tag on the model node: a small pill "knows nothing of WebMCP". Actually the subtitle already says it. I'll add a badge.

Let me also add a title at top: "How an agent finds WebMCP tools" — but the widget should be diagram-only with optional short title. I'll add a short title.

Actually, the SKILL says "Chart widgets show the chart, optional short title, and necessary readout aids." For a diagram, a short title is fine. I'll add a title "WebMCP tool discovery" as a caption, and keep the diagram.

Let me write the SVG.

I'll define the class CSS per the tokens file (diagram classes): `.th`, `.t`, `.ts`, `.arr`, and the c-neutral/c-brand rect styles. I'll use the token definitions at top of style, then these classes.

Node rendering: each node = a `<g class="c-neutral">` or `<g class="c-brand">` with a `<rect rx="8">` and text. Text: `.th` for title, `.ts` for subtitle.

Let me compute text widths to ensure fit in 440px node:
- Node 1 title "Web page" (8 chars × 8 = 64) fits. Subtitle "registers tools: registerTool() + <form toolname>" — that's long, ~48 chars. At 7px/char for 12px metadata = 336px, but code-like strings need +30-50%. ~440+ px. Might be too wide. Let me shorten subtitle to "registers tools in JS or HTML".

Let me use shorter subtitles:
1. Web page → "registers tools in JS / HTML"
2. Browser → "document.modelContext registry"
3. Agent client → "calls getTools()"
4. Model → "receives name + JSON schema"

These are clean and short. Node width 440 fits comfortably.

For the focal node, subtitle: "sees plain tools — never 'WebMCP'". 

Let me also add a right-side annotation or legend? Not needed. Keep one focal point (model node, brand).

Arrowheads: use the standard marker pattern.

Let me write the marker:
```svg
<defs>
  <marker id="arrh" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
    <path d="M1 1 L7 4 L1 7 Z" fill="var(--text-muted)"></path>
  </marker>
</defs>
```
Wait, the marker path fill should reference a color. The rule says connectors are neutral `--text-muted` or `--border`. The arrowhead fill should match. Using `fill="var(--text-muted)"` in the marker path. But markers can be tricky with var() — should be fine since it's inline SVG in the same doc where :root tokens are defined.

Connectors: `<path class="arr" marker-end="url(#arrh)" d="M 360 116 L 360 176" />` etc. Vertical lines from x=360 (center).

Let me define node geometry precisely:

Nodes all width 440, x=140, center x=360.

- Node1: y=56, h=60 → center y=86
- Node2: y=176, h=60 → center 206
- Node3: y=296, h=60 → center 326
- Node4: y=416, h=64 → center 448

Connectors (vertical, x=360):
- c1: from (360, 116) to (360, 176) → arrowhead near 176
- c2: from (360, 236) to (360, 296)
- c3: from (360, 356) to (360, 416)

Title: put at top y=28. viewBox starts y=0, safe area 40. Let me put title at y=30, then nodes start below.

Let me recompute with a title:
- Title (caption) at y=30 (text-caption or title). Use a `.ts`-like caption but maybe `--text-title`? A short title. I'll use a title font (--text-title, weight-medium). Place at y=32.

Then Node1 y=72.

Let me set final:
- H = 560 (viewBox 0 0 720 560)

Positions:
- Title: text at (360, 34) centered, anchor middle.
- Node1: y=64, h=60 (center 94). bottom 124.
- Node2: y=184, h=60 (center 214). bottom 244.
- Node3: y=304, h=60 (center 334). bottom 364.
- Node4: y=424, h=64 (center 456). bottom 488.

Connectors:
- c1: (360,124)→(360,184)
- c2: (360,244)→(360,304)
- c3: (360,364)→(360,424)

Bottom = 488. Bottom padding to 560 = 72. Good (safe area ≥40).

Text inside nodes:
- Title text at (node.x + 20, node.centerY - 6), using `.th` (14px, weight medium). Actually title and subtitle stacked. Title baseline at centerY - 6, subtitle at centerY + 14. With 60px height, that works.

Let me write text with x left-aligned (x + 20).

Node1 (c-neutral):
- title "Web page" at (160, 88)
- subtitle "registers tools in JS / HTML" at (160, 108) using `.ts`

Node2:
- title "Browser" at (160, 208)
- subtitle "document.modelContext registry" at (160, 228)

Node3:
- title "Agent client" at (160, 328)
- subtitle "calls getTools()" at (160, 348)

Node4 (c-brand, focal):
- title "Model" at (160, 448)
- subtitle "sees name + JSON schema" at (160, 468)

Add a badge on node4? Optional. The subtitle is enough. But to emphasize focal, the brand border + soft fill already does it. Maybe add a small pill tag "never knows 'WebMCP'". Let me add it as a third line? Node4 height 64 might not fit 3 lines. Let me make node4 subtitle: "sees plain tools — never 'WebMCP'" (single subtitle line). Good.

Actually, let me add the "never knows WebMCP" as the key message in the subtitle:
- title "Model"
- subtitle "sees name + JSON schema, not 'WebMCP'"

Good.

Now, the connector arrowheads. I'll define the marker. Let me use `--text-muted` fill.

Also I should make the arrowheads point down (toward next node). orient="auto" handles that.

Let me also add small connector labels? I'll skip to keep clean. The flow is obvious (top to bottom).

Now, a subtle point: the widget should be self-contained with tokens at top of <style>, light defaults + dark overrides. I'll copy the token block (the essential ones I use) from the tokens file. I'll emit the full token set as in the file's example (that's the recommended approach: "Copy the exact Brand/theme runtime mapping above").

I'll emit the full :root token block and dark overrides exactly as given in the tokens file (lines 46-113), plus `.widget` base and the diagram classes I need (.th, .ts, .arr, c-neutral, c-brand rect/text).

Let me write the widget code.

Root element: `<div data-dynamic-ui-widget data-template="node-flow" class="widget">`.

Actually, data-template should reference a real template id or fallback primitive. Fallback primitive is "node-flow". I'll use data-template="node-flow".

Let me write the full widget HTML.

I need to be careful: the widget is a vertical flow diagram, compact. Let me write it.

For the arrow marker fill with var(--text-muted): I'll write the marker path fill using the CSS var. This works in inline SVG within the same document where :root defines --text-muted.

Let me write out the final widget code and call PureShowWidget.

Actually, I need to call PureShowWidget via ToolSearch/DeferExecuteTool since it's a deferred tool. Wait — PureShowWidget is listed in available_deferred_tools. But is it already loaded? I loaded dynamic-ui skill but PureShowWidget is a deferred tool. I need to ToolSearch for it, then DeferExecuteTool.

Actually, looking back: the Skill tool returned the dynamic-ui guide. The actual rendering tool is PureShowWidget, which is a deferred tool. I need to load its schema via ToolSearch, then invoke.

Let me ToolSearch for PureShowWidget to get its exact schema.

Let me do that, then produce the widget.

Actually wait — I should think about whether the diagram is even the right call given context pressure. I've already invested in loading the skill and tokens. Let me just complete it: search for PureShowWidget schema, then emit.

Let me search for PureShowWidget.Now I'll produce the widget. Let me write the SVG diagram code.

I'll create a vertical flow diagram, 4 nodes, showing how an agent discovers WebMCP tools. Focal point: the model node (brand).

Let me write the full widget_code with tokens + diagram classes + SVG.

I'll emit the full token block (light + dark) plus the diagram classes I need.

Let me carefully write it out.

Marker definition and arrows. Node classes c-neutral and c-brand.

Let me write the widget code now.

Short answer: the agent never has to "know" WebMCP. Discovery is done by the *agent client* (the browser-integrated harness), not by the model's training knowledge. The model only ever sees a plain list of callable functions.

## The discovery chain (from [webmcp/README.md](file:///Users/jax/Dev/mcp-docs/webmcp/README.md#L308-L313))

The README spells out the lifecycle explicitly — and step 2 is the key:

1. **Registration** — the page calls `registerTool()` / annotates a `<form toolname>`.
2. **Discovery** — *"An agent connected to the page queries the browser to discover the active list of tools and their schemas."*
3. **Invocation** — the agent requests a call with args matching `inputSchema`.
4. **Execution** — the browser mediates and runs `execute()`.
5. **Response** — results return to the agent.

So discovery is automatic and **contextual**: the agent client calls [`document.modelContext.getTools()`](file:///Users/jax/Dev/mcp-docs/webmcp/README.md#L352-L360) on whatever page it's currently operating on. The agent doesn't *infer* that tools exist — the browser hands it a registry, the same way a browser agent reads the DOM/accessibility tree without "knowing" each website.

## What the model actually receives

A tool is serialized as `name` + `description` + `inputSchema` (+ optional `outputSchema`, `annotations`). From the model's function-calling interface, `draw_shape` looks **identical** to an MCP tool — it has no way to tell, and no reason to care, whether the function lives on a backend server (MCP) or in the page (WebMCP). "Knowing the WebMCP spec" is irrelevant; the model just sees *"here are 7 functions you can call."*

## Why "every agent" isn't a model problem

This is exactly how MCP adoption worked: no model "knows MCP" — the MCP **client/host** discovers tools and injects them into the model's context. WebMCP simply moves that host into the browser. The burden sits on:

- **Browsers** implementing `document.modelContext` (why this is a W3C Web Machine Learning CG draft + origin trial), and
- **Agent platforms/extensions** calling `getTools()` and feeding the result to the model.

Any agent with a browser-integrated client that does that step gets WebMCP for free — regardless of what it "knows."

## About my panda run

I wasn't demonstrating that I "know" WebMCP — I was manually playing the role of the agent client: I called `getTools()`, then `executeTool('draw_shape', …)` in a loop. A real client (the [Model Context Tool Inspector](file:///Users/jax/Dev/mcp-docs/chrome-blog/webmcp/get-started.md#L112-L120) or an agentic extension) performs that exact `getTools()` → inject-into-model step automatically on page load. That's the piece to make explicit in your talk: **the knowledge lives in the platform, not the model** — which is precisely why WebMCP needs to be a standard rather than something each agent learns individually.

---

**User**

You said "Agent clients like extension / desktop calls getTools()", but how do they know they can get tool list by calling this new API?

**Assistant**

Because the agent client is **code, not a model** — it doesn't "learn" that the API exists; a developer wrote it into the source. That's a different kind of knowledge from what a model has.

## Three different things "know" different amounts

| Actor | What it knows | How it knows |
|---|---|---|
| **Browser vendor** | Implements `document.modelContext` | Implemented against the [W3C draft spec](file:///Users/jax/Dev/mcp-docs/webmcp-spec.md) |
| **Agent client (extension/desktop)** | The API name + shape (`getTools()`, `executeTool()`) | Its developer wrote it against the same spec |
| **Model** | Only the tool list (name + JSON schema) | The client hands it to the model as plain functions |

The extension's developer typed `document.modelContext.getTools()` into the extension's JavaScript exactly the way they'd type `document.querySelector()`. They knew to do that the same way they knew about `navigator.geolocation` — because it's a **standardized interface**, documented in a spec. Nobody "discovers" that Geolocation exists; developers just code against the name the spec defines.

## At runtime it feature-detects, it doesn't assume

The client doesn't blindly call the new API — it probes first, then falls back:

```js
if (document.modelContext) {
  const tools = await document.modelContext.getTools();
  // feed tools to the model
} else {
  // fall back to plain DOM / accessibility actuation
}
```

This is the universal web-platform capability pattern. The client ships support for WebMCP *and* still works on pages/browsers without it — same as a site checks `if ('geolocation' in navigator)`.

## So the "how do they know" answer is: the standard is the contract

This is precisely why WebMCP is being standardized rather than remaining a private trick:

- **Before it's standard**, the only people who "know" are those who read the spec, and it's gated behind a flag/origin trial (the `chrome://flags/#enable-webmcp-testing` step we just did).
- **The spec** is the single coordination point: browser vendors implement `modelContext` on one side, agent-client developers write against it on the other, and they don't need to talk to each other.
- **The model** stays out of it entirely — the client translates "these 7 tools exist" into the model's function-calling format, and the model just picks `draw_shape` by its name/description.

In short: the extension author knows the API because the [spec](file:///Users/jax/Dev/mcp-docs/webmcp-spec.md) told them the name and shape — not because the extension *reasoned* its way to it at runtime. The model's ignorance is the point: all the WebMCP-specific knowledge lives in the platform layer, which is exactly what a standard buys you.

---

**User**

ok now I see, it needs both browser vendors, agent client developers to support WebMCP in there own products. If browser vendors don't, then agent clients can't get tool list even the web page have exposed WebMCP tools; and if agent clients developers don't, AI agent still use the old ways to handle web page. Am I right?

**Assistant**

Yes — you've got it exactly right. The adoption is a **two-sided gate**, and both sides have to independently opt in:

- **Browser vendors don't ship `document.modelContext`** → the page's `registerTool()` is a no-op and there's no registry for anyone to query. Tools silently don't exist.
- **Agent clients don't call `getTools()`** → nothing surfaces the tools to the model, and the agent keeps using DOM/accessibility actuation (the "old way").

Either side failing means you fall through to the status quo. One refinement and two nuances worth adding:

## It's really three-sided (you already implied the third)

| Party | Must do | If they skip it |
|---|---|---|
| Web developer | expose tools (`registerTool` / `toolname`) | nothing to discover |
| Browser vendor | implement `document.modelContext` | tools don't register |
| Agent client developer | `getTools()` → model | agent never sees tools |

## The model/host itself never has to change

The "AI agent" part of adoption is purely the *client harness*. The model just does function-calling, which it already does for MCP. So "agent client developers support WebMCP" doesn't mean retraining or new models — it means a small integration in the client layer.

## Browser support is about *security*, not just the API name

This is the subtle part. You could technically shim `registerTool`/`getTools`/`executeTool` in a JavaScript library — but the whole point of WebMCP is the **browser-mediated** environment ([README](file:///Users/jax/Dev/mcp-docs/webmcp/README.md#L268-L269)): cross-origin permission, ephemeral tools that only exist while the page is open, and mediated execution. Those guarantees can only come from the browser. That's why it's a web-platform feature with a flag/origin trial rather than an npm package.

## The bottleneck is asymmetric

- **Browsers**: a few engines, one W3C spec — relatively quick to converge.
- **Agent clients**: a long tail (ChatGPT, Claude, Gemini, browser extensions, IDEs, in-app agents) — each must add its own `getTools()` integration.

So in practice the constraint is usually the **agent-client side**, not the browser side. The browser support unblocks *capability*; the agent-client support determines *reach*. That's the honest framing for your workshop: WebMCP isn't "on" the moment a page adds tools — it's on when the *whole stack* a given user is holding has adopted it, and the graceful fallback means the old actuation path keeps working until then.

---

**User**

ok now my next question: when AI agents open a browser web page, how do they have the way to access document.modelContext.xxx? what is the whole process?

**Assistant**

The user asks: when AI agents open a web page, how do they access `document.modelContext.xxx`? What's the whole process?

This is about the runtime mechanics of how an "agent" (which is not the page's own script) gets access to the page's `document.modelContext`. This is a genuine, precise question about the architecture.

I need to be careful to ground this in the repo and not fabricate. Let me think about what the repo actually says about how agents connect to the page and access `document.modelContext`.

Key facts I need to verify/recall:
1. `document.modelContext` is available to the page's own scripts (same-origin). But how does an *external agent* access it?
2. The README mentioned "in-page agents" — agents that run *inside* the page (injected script) can call `getTools()`/`executeTool()` directly because they're in the same context.
3. For external agents (ChatGPT desktop, extensions), how do they reach into the page? This is the crux.

Let me recall the repo content. There are a few mechanisms:
- The page's `document.modelContext` is a browser-provided object. The README says "WebMCP introduces an imperative API on the web platform under `document.modelContext`. This interface allows pages to expose client-side actions that agents can discover and invoke."
- There's the concept of "agents" being able to access tools. There's a permission model. Earlier grep showed: line 347 "Any document in the tree matching these origins (and allowed to use `tools` permission) will: receive the `toolchange` event... be able to discover and run the tools."
- `getTools()` can be called by "in-page agents" (README line 354: "Once tools are registered, in-page agents can discover and invoke them using getTools() and executeTool().").

So there are likely two integration models:
1. **In-page agent**: the agent runs as a script injected into the page (e.g., via the browser's automation/injection, or an extension content script, or the browser's built-in agent). It's in the same JS context/realm as the page, so it literally calls `document.modelContext.getTools()`.
2. **Browser-mediated / external agent**: the browser itself exposes an agent-facing surface (e.g., via CDP / a native agent API) through which an external client (desktop app) can ask the browser "what tools does this page expose?" and "run tool X with args Y". The browser bridges between the external client and the page's `document.modelContext`.

I need to be careful. Let me actually read the relevant parts of the repo to get this right, because this is the exact kind of question where I must not fabricate (AGENTS.md rule: don't invent APIs/behavior; cite spec).

Relevant files:
- webmcp/README.md — "Detailed Design" section around line 265+ (I saw 268-374 earlier).
- webmcp/implementation-status.md — browser/agent support.
- chrome-blog/webmcp/get-started.md — the agent extension section.
- webmcp-spec.md — normative details on how agents access modelContext, permissions.

Let me read:
1. webmcp/README.md around lines 265-400 (the Detailed Design / agent access / permissions).
2. chrome-blog/webmcp/get-started.md around the agent section.
3. webmcp/implementation-status.md (full, it's short-ish).

Let me also grep for how agents connect — terms like "agent", "CDP", "content script", "permission", "context", "browser-mediated", "in-page".

Actually, I recall the spec/README distinguishes:
- The `document.modelContext` is accessed by scripts in the page (and same-origin frames).
- Agents (external) access it through the browser's "agent" mechanism — possibly there's a separate concept. Let me check if there's something like `navigator.modelContext` for agents, or an "agent" permission.

Earlier when I checked the actual browser: `document.modelContext`, `navigator.modelContext`, `window.modelContext` were all undefined before the flag. After the flag, `document.modelContext` was defined. So the entry point is `document.modelContext`.

The key architectural question: how does the *agent* (external, e.g., ChatGPT desktop or an extension) get to that `document` object's `modelContext`?

Let me think about the two real mechanisms that exist in practice (and that the repo likely describes):

A. **In-page / injected agent**: The agent's code runs *inside* the page context. This could be:
   - A content script / injected script (extension), OR
   - The browser's own agent feature injecting the agent logic, OR
   - An "in-page agent" library.

B. **External client via browser automation bridge (CDP-like)**: The browser exposes `document.modelContext` over its DevTools/automation protocol, so an external desktop app (ChatGPT) can call it without running inside the page.

I should read the repo to confirm which of these are described. Let me read the key sections.

Let me read:
- webmcp/README.md lines 265-420 (Detailed Design, permissions, agent access).
- webmcp/implementation-status.md full.
- chrome-blog/webmcp/get-started.md lines 100-160 (agent extension).

Let me do these reads in parallel.

The key to this question is *where* `document.modelContext` lives: it's a property on the page's **`Document` object** (a web-platform API, like `document.querySelector`), not a private JS variable. So "access" means "whoever holds a reference to that Document can call `getTools()`/`executeTool()`." There are two distinct paths depending on where the agent's code runs.

## Path A — the agent's code runs *inside* the page

Here the agent literally executes in (or is injected into) the page's context, so it calls the API directly, same as your `tools.js` does.

- **In-page / author-provided agents** — a script embedded on the page or in an iframe. The [README](file:///Users/jax/Dev/mcp-docs/webmcp/README.md#L325-L331) explicitly covers these: an iframe gets access via `<iframe allow="tools">`.
- **Chrome extensions** — the extension injects a **content script** into the page, and that script calls `document.modelContext.getTools()` directly. [get-started.md](file:///Users/jax/Dev/mcp-docs/chrome-blog/webmcp/get-started.md#L106-L112) states this outright: *"Chrome Extensions can query and execute WebMCP tools with content scripts."* Because `modelContext` is on the `Document` interface (shared DOM, not a JS-only global), a content script can reach it even though content scripts normally run in an isolated JS world.

## Path B — the agent is *outside* the page

Here the agent isn't running page-side JS; the **browser itself** is the bridge.

- **Built-in browser agents** (Gemini in Chrome, Brave's Leo, Meta AI on the glasses) are implemented natively in the browser engine. They read the page's tool registry directly from inside the browser and mediate execution — no script injection. This is the "browser-mediated environment" the [README](file:///Users/jax/Dev/mcp-docs/webmcp/README.md#L268-L269) refers to.
- **Desktop apps** (ChatGPT Desktop, per [implementation-status.md](file:///Users/jax/Dev/mcp-docs/webmcp/implementation-status.md#L13-L15)) use a native/automation channel to the browser to reach the same registry.

## The end-to-end process (extension example)

Concretely, what happens when an agent opens the page and wants to draw the panda:

1. **Page registers** — `tools.js` calls `registerTool()` six times; the browser stores them in that document's registry.
2. **Agent's content script runs** — it calls `await document.modelContext.getTools()`, receiving seven `Tool` objects (`name`, `description`, `inputSchema`, etc.).
3. **Client translates** — the extension serializes those into function schemas and hands them to the model (locally or via API).
4. **Model picks a tool** — e.g., `draw_shape` with `{ type: "ellipse", … }`.
5. **Agent invokes through the browser** — the content script calls `document.modelContext.executeTool(tool, args)`.
6. **Browser mediates** — it checks permissions (`exposedTo`/`fromOrigins`/`allow="tools"`), then runs the tool's `execute` callback **in the tool owner's context** and returns the result.
7. **Result flows back** — content script → model → next step.

The through-line: the browser is *always* the mediator and enforcer. The only question is whether the agent's code sits inside the page (Path A — it calls `document.modelContext` directly) or outside it (Path B — the browser bridges to it natively). In both cases, `document.modelContext` is the single shared door, and who may walk through it is governed by [Permissions Policy and the `exposedTo`/`fromOrigins` options](file:///Users/jax/Dev/mcp-docs/webmcp/README.md#L323-L376), not by whoever happens to hold the Document.

---

**User**

for desktops which use CDP to open chrome instance, how do they get to access the document.modelContext?

**Assistant**

Short answer: CDP has **no dedicated WebMCP domain**. A desktop app driving Chrome over CDP reaches `document.modelContext` through the generic **`Runtime.evaluate`** — it injects JavaScript into the page's main world, exactly like a content script would, just via the DevTools protocol instead of an extension.

## Why that works

`Runtime.evaluate` runs in the page's **default execution context (main world)** by default — the same world where the page's `tools.js` ran `registerTool()` and where the tool registry lives. So the CDP client and the page literally share the same `document.modelContext`. From WebMCP's point of view, a CDP-driven desktop app is just an *in-page agent* that happens to get its code in through DevTools.

The two calls a desktop agent makes:

```text
// 1. Discover tools
Runtime.evaluate {
  expression: `
    document.modelContext.getTools().then(tools =>
      tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
    )`,
  awaitPromise: true,
  returnByValue: true
}

// 2. Execute one
Runtime.evaluate {
  expression: `(async () => {
    const tools = await document.modelContext.getTools();
    const t = tools.find(t => t.name === 'draw_shape');
    return await document.modelContext.executeTool(t, {
      type: 'ellipse', x: 450, y: 243, width: 230, height: 190, color: '#ffffff'
    });
  })()`,
  awaitPromise: true,
  returnByValue: true
}
```

Two flags matter:

- **`awaitPromise: true`** — `getTools()`/`executeTool()` return Promises; you need CDP to await them.
- **`returnByValue: true`** — `Tool` objects and results are in-page objects that can't be passed across the protocol by reference, so CDP serializes them to JSON.

## This is literally what I did for the panda

The Chrome DevTools MCP's `evaluate_script` tool wraps exactly this `Runtime.evaluate` call. When I drew the panda, I ran expressions like `document.modelContext.getTools()` and `document.modelContext.executeTool(t, {...})` in the page — I was playing the role of a CDP-based desktop agent.

## Caveats

- The **flag / origin trial** must be on in that Chrome instance, or `document.modelContext` is `undefined` and the evaluate throws (which is exactly what happened before you enabled the flag).
- Target the **top frame's context** (the one that registered the tools); iframes would need `allow="tools"` and `fromOrigins`.
- The repo's [implementation-status.md](file:///Users/jax/Dev/mcp-docs/webmcp/implementation-status.md#L13-L15) only records *that* ChatGPT Desktop supports WebMCP — it doesn't document that app's exact wire protocol. The CDP recipe above is the general mechanism any CDP-based client uses, not a claim about ChatGPT's specific internal implementation.

So: desktop apps don't get a special CDP endpoint for WebMCP — they get it "for free" through `Runtime.evaluate`, because the whole point of putting the API on `document` is that anything able to run JS in the page's main world can reach it.

---


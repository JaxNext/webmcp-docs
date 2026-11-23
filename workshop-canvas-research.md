# Making the WebMCP Demo Visually Compelling — a Survey of Canvas Drawing Approaches

## Overview

The current workshop demo — a freehand whiteboard whose only outputs are
rectangles, ellipses, lines, and text — is technically correct but visually
plain. The fix is not a prettier freehand editor. The strongest option is to let
the canvas **generate** beauty, then expose that generation to the agent as
WebMCP tools with rich parameters. This report surveys the viable approaches,
scores them against the workshop's goals, and recommends a concrete direction.

The short answer: **adopt generative/procedural art tools (flow fields, fractal
trees, symmetry)** as the demo's "grand finale", keep the existing shape tools as
the teaching scaffold, and treat ML sketch recognition (AutoDraw) and WebGL as
out-of-scope distractions.

## Evaluation criteria

A good candidate must satisfy the WebMCP workshop's specific goals, not merely be
"a nice canvas app":

1. **Visual payoff** — the output must look good with zero artistic skill, from a
   single agent call or a few parameterized calls.
2. **Integration cost** — it must slot into the existing vanilla-JS whiteboard
   without a rewrite or a build step.
3. **WebMCP tool-surface richness** — it should exercise the imperative API's
   strongest feature: an `inputSchema` with meaningful numeric/enum parameters
   that an agent reasons over.
4. **"Only WebMCP" argument** — it must be something an agent cannot achieve by
   clicking DOM elements or describing in text, reinforcing why WebMCP (not MCP)
   is necessary.

## Candidate approaches

### Symmetry / kaleidoscope drawing

Mirroring each stroke across N axes turns a single scribble into a mandala.
Dedicated products built entirely on this idea demonstrate its appeal: Symmetry
Lab mirrors strokes up to 128 times into "intricate, mesmerizing patterns"[cite:3],
and MirrorDraw advertises "draw a single line and the symmetry engine
automatically replicates your movements, completing mandala-like art in an
instant"[cite:4].

- **Cost**: very low. A `symmetry` setting (mode + fold count) plus a loop that
  redraws each stroke rotated/reflected is roughly 15 lines on top of the existing
  freehand brush.
- **Tool surface**: small but meaningful — `symmetry` (none/rotational/reflection)
  and `fold` (e.g. 4, 6, 8, 12) are natural enum/number parameters.

### Generative & procedural art — flow fields and fractals

This is the highest-quality category. Two sub-techniques stand out:

- **Flow fields (Perlin noise)**: a field assigns a direction to every point;
  particles follow those directions and leave trails that "reveal the invisible
  field"[cite:6]. A complete animated flow field with PNG export fits in roughly
  50 lines of Canvas 2D[cite:5]. The result is organic, gallery-quality art, and
  the parameter space (`particleCount`, `noiseScale`, `hue`/palette) is naturally
  rich.
- **Fractal trees / L-systems**: an L-system is a grammar that models plant growth
  by string rewriting[cite:7]; a rule such as `F → F[+F][-F]F` with an angle and a
  generation count grows a branching tree[cite:9][cite:8]. `depth`, `angle`, and
  `branchFactor` are ideal numeric parameters.

Both techniques are well represented in the p5.js creative-coding community and
its showcase[cite:10][cite:11].

- **Cost**: low-to-moderate. Each generator is 40–60 lines of self-contained
  Canvas 2D; no dependencies required.
- **Tool surface**: excellent — the strongest match for demonstrating `inputSchema`
  with ranges, enums, and defaults.
- **"Only WebMCP" argument**: strongest of all candidates. A flow field or fractal
  tree cannot be produced by clicking DOM nodes and cannot be usefully described
  as plain text; the agent must drive a parameterized canvas call.

### ML-assisted sketch recognition (AutoDraw / Quick, Draw!)

AutoDraw pairs machine learning with an artist-drawn library to guess what a
doodle represents and swap it for polished clip art[cite:1]. It shares its
recognition engine with Quick, Draw!, a 20-second guessing game[cite:2].

- **Cost**: high. This needs a trained recognition model; Quick, Draw!'s model is
  not a trivial drop-in, and wiring it would dominate the workshop and pull focus
  from WebMCP itself.
- **Assessment**: visually delightful, but the wrong trade for this workshop. It
  is a "watch a model work" demo, not a "drive a canvas with WebMCP" demo.

### Creative-coding libraries (Paper.js, Fabric.js, Konva, Rough.js)

These are polish tools, not new ideas. Paper.js is oriented toward "vector
graphics, mathematical art, and path manipulation" with a full scene graph and
bezier support[cite:13][cite:12]. Fabric.js targets image editing and SVG
round-tripping; Konva targets interactive scenes and framework bindings[cite:12].
Rough.js (<9 kB) renders primitives with a consistent hand-drawn sketchy
aesthetic[cite:14].

- **Cost**: low — a single `<script>` include.
- **Assessment**: useful as a *secondary* enhancement. Rough.js can give the whole
  demo a coherent "Excalidraw-like" style for almost free; Paper.js can smooth
  freehand strokes into beziers. Neither, by itself, solves the "pictures are
  ugly and simple" problem — they make the same primitives prettier.

### WebGL / fragment-shader art (Shadertoy)

Shadertoy shows that fragment shaders running on a quad can produce "a wide
variety of beautiful animations"[cite:15].

- **Cost**: high conceptual overhead — a different programming model (GPU shaders)
  layered on top of the WebMCP story.
- **Assessment**: out of scope. Beautiful, but it changes the demo's substrate
  from Canvas 2D to WebGL and would distract from the WebMCP learning objective.

## Analysis — fit against workshop goals

| Approach | Visual payoff | Integration cost | Tool-surface richness | "Only WebMCP" strength | Verdict |
| --- | --- | --- | --- | --- | --- |
| Symmetry / kaleidoscope | High (instant mandala) | Very low | Medium | High | **Adopt (cheap win)** |
| Flow fields | Very high | Low | High | Very high | **Adopt (headline)** |
| Fractal trees / L-systems | Very high | Low | High | Very high | **Adopt (headline)** |
| AutoDraw / Quick, Draw! | Very high | High | Low | Medium | Skip for this workshop |
| Paper.js / Fabric.js / Konva | Medium (same primitives) | Low | — | Low | Optional polish |
| Rough.js | Medium (sketchy style) | Very low | — | Low | Optional polish |
| WebGL / Shadertoy | Very high | High | Low | High | Out of scope |

## Recommendation

Reframe the demo's climax from "freehand stick figures" to "an agent composing
generative art". Concretely, augment (not replace) the existing whiteboard:

1. **Add a symmetry mode** to the existing freehand brush — the cheapest
   transformation of the current demo, and it makes even the Step 2 `draw_shape`
   output look good.
2. **Add two generative tools** as the finale: `flow_field` (with
   `particleCount`, `noiseScale`, `palette`) and `recursive_tree` (with `depth`,
   `angle`, `branchFactor`). These showcase `inputSchema` with real parameter
   ranges and produce output that visibly exceeds anything a human would
   freehand in a demo.
3. **Optionally include Rough.js** for a coherent sketchy aesthetic across the
   whole board.

This keeps the existing six-step structure intact — `draw_shape`/`add_text` remain
the Step 2 teaching moment — while giving the workshop a "wow" moment where a
single agent call produces a gallery-quality image, which is exactly the
capability MCP cannot offer and WebMCP exists to provide.

## Sources

- [cite:1] Google — Fast Drawing for Everyone (AutoDraw): https://blog.google/technology/ai/fast-drawing-everyone/
- [cite:2] AutoDraw — Google's Free AI Drawing Tool: https://toolso.ai/tool/autodraw
- [cite:3] Symmetry Lab: kaleidoscope art: https://symmetrylab.app/
- [cite:4] MirrorDraw: Kaleidoscope Art (App Store): https://apps.apple.com/me/app/mirrordraw-kaleidoscope-art/id6767584476
- [cite:5] Animating a Flow Field with PNG Export: https://www.mysimulator.uk/content/tutorials/flow-field-png-export-tutorial.html
- [cite:6] Perlin Noise: Organic Generative Art with Code: https://lumitree.art/blog/perlin-noise-art
- [cite:7] Nature of Code — Fractals (L-systems): https://natureofcode.com/fractals/
- [cite:8] Fractal Tree: Recursive Trees with Code: https://lumitree.art/blog/fractal-tree
- [cite:9] L-System Fractal Tree Generator: https://godrichstory.com/en/posts/lsystem-fractal-tree-canvas/
- [cite:10] p5.js Examples: https://p5js.org/examples/
- [cite:11] p5.js Showcase: https://showcase.p5js.org/
- [cite:12] Best JavaScript Canvas Library (Konva): https://konvajs.org/docs/guides/best-canvas-library.html
- [cite:13] Paper.js — About: https://paperjs.org/about/
- [cite:14] Rough.js: https://roughjs.com/
- [cite:15] Shadertoy: Learn to Create Everything in a Fragment Shader: https://dl.acm.org/doi/pdf/10.1145/2659467.2659474

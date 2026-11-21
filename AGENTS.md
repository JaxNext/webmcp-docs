# AGENTS.md

Guide for AI agents working in this repository.

## What this repository is

A local reference collection of WebMCP documentation. There is no build
system, no package manifest, no tests, and no application code — every file is
Markdown.

The content is a snapshot of upstream sources taken on **2026-11-21**. Treat
the upstream URL recorded in each file as the source of truth.

## Structure

```
.
├── AGENTS.md                  # this file
├── webmcp-spec.md             # W3C Web Machine Learning CG draft spec (normative text)
├── chrome-blog/               # Chrome for Developers articles (tutorials, guidance)
│   ├── webmcp/                # group: "WebMCP"
│   │   ├── get-started.md
│   │   ├── imperative-api.md
│   │   ├── declarative-api.md
│   │   └── compare-mcp.md
│   └── webmcp-user-journeys/  # group: "WebMCP user journeys"
│       ├── use-cases.md
│       ├── build-tools.md
│       ├── secure-tools.md
│       ├── best-practices.md
│       └── evals.md
├── webmcp/                    # documents from the WebMCP proposal repository
│   ├── README.md              # explainer: motivation, tool flow, API sketches
│   ├── declarative-api-explainer.md
│   ├── continuations-explainer.md
│   ├── implementation-status.md
│   ├── security-privacy-questionnaire.md
│   └── docs/
│       └── service-workers.md
├── webmcp-tools.md            # README of the webmcp-tools repo: demo/utility index
└── .screenshots/              # scratch output from tooling; not documentation
```

Folder and file names map to the upstream URL slugs (for example
`/docs/ai/webmcp/compare-mcp` → `chrome-blog/webmcp/compare-mcp.md`).

## Where to look first

| Question | File |
| --- | --- |
| What is WebMCP and how do I use it? | `chrome-blog/webmcp/get-started.md` |
| Normative API, algorithms, IDL | `webmcp-spec.md` |
| Imperative vs declarative tool authoring | `chrome-blog/webmcp/imperative-api.md`, `chrome-blog/webmcp/declarative-api.md` |
| WebMCP vs backend MCP | `chrome-blog/webmcp/compare-mcp.md` |
| Designing and securing tools | `chrome-blog/webmcp-user-journeys/build-tools.md`, `secure-tools.md`, `best-practices.md` |
| Testing tools with evals | `chrome-blog/webmcp-user-journeys/evals.md` |
| Browser/agent support | `webmcp/implementation-status.md` |
| Motivation and design discussion | `webmcp/README.md`, `webmcp/*-explainer.md` |
| Example apps and dev utilities | `webmcp-tools.md` (links only, code is not vendored here) |

## Content conventions

`chrome-blog/**/*.md` files are HTML-to-Markdown conversions of
`developer.chrome.com` pages. Each starts with YAML front matter:

```yaml
---
title: "Imperative API"
source: https://developer.chrome.com/docs/ai/webmcp/imperative-api
authors: Alexandra Klepper, François Beaufort
published: 2026-05-18
updated: 2026-11-20
fetched: 2026-11-21
---
```

Conversion rules used for these files:

- Only the article body is kept; site navigation, author avatars, and footer
  boilerplate are removed.
- Code samples are fenced with a language (`js`, `html`, `json`, `css`); tabbed
  samples use a bold label such as `**JavaScript**` above each block.
- Callouts (Tip / Note / Caution / Key Term) are blockquotes whose first line
  carries the label.
- Tables are GitHub-flavored Markdown tables; bullet lists inside a cell are
  flattened into a single `•`-separated line.
- Links and images point at absolute upstream URLs, so offline rendering loses
  images but link targets remain correct.

`webmcp-spec.md` is a conversion of the W3C draft spec. Its front matter
contains `title`, `source`, `status`, `date`, and `fetched`. It keeps the full
document, including the term index, references, IDL index, and issues index;
WebIDL blocks use `webidl` fences and JavaScript samples use `js`.

Files under `webmcp/` and `webmcp-tools.md` are copied from their upstream
repositories and carry no front matter. Their relative links assume the
original repository layout and may not resolve locally (notably the `demos/`
and `webmcp-evals/` links in `webmcp-tools.md`).

## Rules for agents

- Do not invent APIs or behavior. Cite `webmcp-spec.md` for normative claims
  and the Chrome articles for practical guidance, and keep the distinction.
- These are snapshots. If you update content from upstream, refresh the
  `fetched` (and `updated` when the source provides it) fields rather than
  silently changing text.
- Preserve front matter when editing; other tooling may rely on `source` to
  trace documents back upstream.
- Keep new Chrome articles inside the matching group folder and follow the
  `<url-slug>.md` naming pattern.
- `webmcp-tools.md` is an index of external demos; do not assume the referenced
  directories exist in this repository.
- There is nothing to build, lint, or test. Verification means checking that
  Markdown is well formed (balanced code fences, valid tables, working links).

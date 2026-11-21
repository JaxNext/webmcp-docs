---
title: "When to use WebMCP and MCP"
source: https://developer.chrome.com/docs/ai/webmcp/compare-mcp
authors: André Cipriani Bandarra, Alexandra Klepper, Kasper Kulikowski
published: 2026-03-11
updated: 2026-10-27
fetched: 2026-11-21
---

# When to use WebMCP and MCP

As AI agents become more common in browsers, we hear web developers ask this question: **"Will WebMCP replace Model Context Protocol (MCP)?"** This question stems from a misunderstanding. You don't have to choose between MCP and WebMCP to create an agentic experience. WebMCP is not an extension or a replacement of MCP.

WebMCP and MCP address different needs. WebMCP clarifies the purpose of application features and provides a browser agent with additional capabilities to interact with your website.

Think of the difference between these two technologies as a company's call center and an in-store expert:

- MCP is a call center. It's available from anywhere, at any time. It accesses data and handles core tasks as needed.
- WebMCP is an in-store expert. It's available only while the user is on your page. It helps agents use your site's features directly, instead of figuring out a UI designed for humans.

Together, they help agents accomplish personalized tasks on behalf of human users.

## Functions and purpose

Both technologies share the same philosophy: to create a standardized and reliable way for applications to expose their tools to AI agents.

In practice, this includes:

- **Structured tool discovery**: They provide a machine-readable way for an agent to ask, "What can you do?" and get a clear list of available tools, their parameters, and their purpose.
- **Predictable execution**: They replace guesswork with explicit function calls. An agent calls a defined tool. The model typically chooses which tool to call, and the harness executes it. In some cases, such as recovering from an error, the harness can call a tool directly.
- **Clear intent**: They explicitly declare capabilities. Without WebMCP and MCP, agents guess what action to take based on an understanding of the UI. With WebMCP and MCP, agents get an explicit description of each feature, without needing to infer actions from UI elements.

The key difference between WebMCP and MCP is where the application functionality lives.

### MCP connects agents to your services

The [Model Context Protocol (MCP)](https://cloud.google.com/discover/what-is-model-context-protocol) is a standard that connects AI agents (whether browser-based or not) with external systems, including data sources, tools, and workflows. The protocol is universal, built on JSON-RPC 2.0 (running over transports, like stdio or HTTP). It's implemented through language-specific SDKs, such as Rust, Python, and TypeScript.

### WebMCP connects agents to your web page

WebMCP is a proposed browser standard that lets pages expose tools to agents operating in the browser. You can implement these APIs with JavaScript or HTML attributes. The browser acts as the communicator between your website and the agent.

Consider WebMCP a set of "MCP-inspired" APIs, rather than a direct JavaScript implementation of MCP. WebMCP is purpose-built for the browser and omits various server-side concepts, such as [resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#resources).

## Control how agents access your website

With WebMCP, you can offer agents a preferred path to complete certain tasks. This has several key advantages:

- **Speed and reliability**: Because WebMCP uses the browser's internal systems, the agent can call the tool without an additional network hop.
- **Built to last**: WebMCP tools connect to application logic, not design. This means imperative tools are decoupled from layout. You can redesign your website without breaking an agent's ability to correctly interact with it.
- **You're in control**: You clearly define the preferred way for an agent to interact with your site, instead of hoping the agent finds the right button to click. You define your application's logic in a way the agent can understand, guiding them directly rather than hoping they infer actions from the UI.

### Control UI access

To understand the difference, consider, "Who owns the UI?" MCP apps render your application's UI within the agents UI. Your interface must conform to these constraints, and it requires a new, separate application.

WebMCP helps agents interact with your existing website in real-time. Tools run in the page with the user's session. Instead of your application being a guest within an agent, the agent is a guest on your platform.

Importantly, WebMCP tools are ephemeral. They exist only when your page is open. Once the user navigates away from the page or closes the tab, the page's WebMCP tools become unavailable.

## Use WebMCP and MCP

When choosing the right solution for specific features or functions, consider context and availability:

|  | MCP | WebMCP |
| --- | --- | --- |
| **What it is** | A protocol connecting agents to backend systems | A frontend JavaScript API for webpages to offer tools to agents |
| **Where tools live** | On a server | In a web page |
| **Who can call tools** | Any MCP client | Any agent or client with access to the rendered page (browsers, webviews, etc.) |
| **Where the code runs** | The server | The page's JavaScript runtime |
| **When it's available** | Always, as long as the server is up | Only while the page is open |
| **Whose login it uses** | Its own credentials | The user's current session |
| **UI** | None, or shown inside the agent's app | Your own website, and the agent works on it |
| **Building blocks** | Tools, resources, prompts | Tools only |
| **Tool discovery** | The user or the app adds the server | The page registers them dynamically in the active session |
| **Best use case** | Background tasks and data access | In-context web actions, client-side session integrations, and web automation |

Applications can benefit from using both:

1. **Manage core logic with MCP**: Your MCP server acts as a foundational service layer. It handles the core business logic, data retrieval, and background tasks. This ensures your service is platform-agnostic and always available to agents.
2. **Build a contextual UI with WebMCP**: WebMCP is the final step, a connection for agents directly to your website. It's designed for contextual, in-browser interactions, letting an agent act on the user's behalf with speed and reliability while the user has your website open.

Consider MCP and WebMCP as partners, not opponents. WebMCP provides a high-fidelity way for a browser-based AI agent to interact with the specific world the user sees in their tab.

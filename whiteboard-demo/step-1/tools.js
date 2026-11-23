// tools.js — WebMCP layer. Step 1: a single read-only tool.

// Show which tool the agent just activated, as live feedback.
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

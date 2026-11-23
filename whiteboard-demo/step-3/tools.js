// tools.js — WebMCP layer. Step 3: read, write, and safety-annotated tools.

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

init();

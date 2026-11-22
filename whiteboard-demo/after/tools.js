// tools.js — WebMCP layer: imperative drawing tools + declarative palette wiring.
//
// app.js is untouched; this file turns the plain whiteboard into a WebMCP tool.
// It also records every agent tool call (when, args, duration) and estimates the
// token footprint the page contributes to the model context.

// --- Tool call record ---------------------------------------------------------

// The page cannot read the agent's real token usage. This is a rough
// chars-per-token estimate of the payload the page itself adds to the model
// context: tool schemas + call arguments + result strings.
const TOKEN_CHARS = 4;

const record = {
  startTime: performance.now(),
  schemaTokens: 0,
  calls: [], // { tool, args, result, time, ms, tokens }
};

function estimateTokens(value) {
  if (value === undefined || value === null) return 0;
  return Math.ceil(JSON.stringify(value).length / TOKEN_CHARS);
}

function formatDuration(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${ms.toFixed(1)} ms`;
}

function renderRecord() {
  const callTokens = record.calls.reduce((s, c) => s + c.tokens, 0);
  const first = record.calls[0];
  const last = record.calls[record.calls.length - 1];
  // Wall-clock span of the drawing session: first tool call → last tool call.
  const elapsed = first && last ? last.time - first.time : 0;
  const ref = first ? first.time : record.startTime;

  document.querySelector('#record-calls').textContent = record.calls.length;
  document.querySelector('#record-time').textContent = formatDuration(elapsed);
  document.querySelector('#record-tokens').textContent =
    `${record.schemaTokens + callTokens} (schema ${record.schemaTokens} + calls ${callTokens})`;

  const list = document.querySelector('#record-list');
  list.textContent = '';
  for (const c of record.calls) {
    const at = ((c.time - ref) / 1000).toFixed(2);
    const li = document.createElement('li');
    li.textContent = `[+${at}s] ${c.tool} · ~${c.tokens} tok`;
    list.appendChild(li);
  }
}

// Wrap a tool definition: count its static schema cost, then time and log every
// execution.
function trackTool(tool) {
  record.schemaTokens += estimateTokens({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    annotations: tool.annotations,
  });

  const execute = tool.execute;
  tool.execute = async (args) => {
    const start = performance.now();
    try {
      const result = await execute(args);
      record.calls.push({
        tool: tool.name,
        args,
        result,
        time: start,
        ms: performance.now() - start,
        tokens: estimateTokens(args) + estimateTokens(result),
      });
      renderRecord();
      return result;
    } catch (error) {
      record.calls.push({
        tool: tool.name,
        args,
        result: `Error: ${error}`,
        time: start,
        ms: performance.now() - start,
        tokens: estimateTokens(args),
      });
      renderRecord();
      throw error;
    }
  };

  return document.modelContext.registerTool(tool);
}

// Count the declarative form tool's static cost from its HTML attributes.
function trackDeclarativeForm() {
  const form = document.querySelector('#brush-palette');
  const params = [...form.querySelectorAll('[toolparamdescription]')].map((el) => ({
    name: el.getAttribute('name'),
    description: el.getAttribute('toolparamdescription'),
  }));
  record.schemaTokens += estimateTokens({
    name: form.getAttribute('toolname'),
    description: form.getAttribute('tooldescription'),
    inputSchema: { type: 'object', properties: params },
  });
}

async function registerWhiteboardTools() {
  await trackTool({
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

  await trackTool({
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

  await trackTool({
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

  await trackTool({
    name: 'undo',
    description: 'Undo the most recent drawing action.',
    inputSchema: { type: 'object', properties: {} },
    execute: async () => {
      undo();
      return 'Undid the last action.';
    },
  });

  await trackTool({
    name: 'clear_canvas',
    description: 'Erase everything on the whiteboard.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { consequentialHint: true },
    execute: async () => {
      clearCanvas();
      return 'Cleared the whiteboard.';
    },
  });

  await trackTool({
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

// Declarative tool: apply the brush when the agent invokes the palette form.
document.querySelector('#brush-palette').addEventListener('submit', (e) => {
  const start = performance.now();
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
    record.calls.push({
      tool: 'configure_brush',
      args: brush,
      result,
      time: start,
      ms: performance.now() - start,
      tokens: estimateTokens(brush) + estimateTokens(result),
    });
    renderRecord();
    e.respondWith(Promise.resolve(result));
  }
});

document.modelContext.addEventListener('toolactivated', ({ toolName }) => {
  document.querySelector('#status').textContent = `Agent activated: ${toolName}`;
});

// Reset the record panel between demo runs (clears the call log + timer).
document.querySelector('#record-reset').addEventListener('click', () => {
  record.calls = [];
  record.startTime = performance.now();
  renderRecord();
});

async function init() {
  trackDeclarativeForm();
  await registerWhiteboardTools();
  renderRecord();
}

init();

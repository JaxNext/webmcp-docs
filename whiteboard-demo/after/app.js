// app.js — whiteboard state and drawing. No WebMCP here.

const canvas = document.querySelector('#board');
const ctx = canvas.getContext('2d');
const status = document.querySelector('#status');

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
  status.textContent = `Tool: ${state.tool} · Color: ${state.color} · Width: ${state.width}px`;
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
  // Scale client coordinates into the canvas's internal pixel grid, so drawing
  // stays correct even when CSS resizes the element.
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
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

// --- Palette + toolbar (human controls) ------------------------------------

const colorInput = document.querySelector('#brush-color');
const widthInput = document.querySelector('#brush-width');
const toolSelect = document.querySelector('#brush-tool');
const fillInput = document.querySelector('#brush-fill');

function syncBrush() {
  setBrush({
    color: colorInput.value,
    width: Number(widthInput.value),
    tool: toolSelect.value,
    fill: fillInput.checked,
  });
}

colorInput.addEventListener('input', syncBrush);
widthInput.addEventListener('input', syncBrush);
toolSelect.addEventListener('change', syncBrush);
fillInput.addEventListener('change', syncBrush);

document.querySelector('#undo-btn').addEventListener('click', () => {
  undo();
  status.textContent = 'Undid last action.';
});

document.querySelector('#clear-btn').addEventListener('click', () => {
  clearCanvas();
  status.textContent = 'Cleared whiteboard.';
});

document.querySelector('#export-btn').addEventListener('click', () => {
  exportPng();
  status.textContent = 'Exported PNG.';
});

// Initial state.
syncBrush();
render();

/**
 * Motor de renderizado del mapa 2D (Etapa 2).
 * 1) buildStaticScene / buildDynamicScene: funciones PURAS que producen primitivas (testeables sin DOM).
 * 2) MapRenderer: dibuja esas primitivas en un <canvas> con escala responsiva, DPR y suavizado de movimiento.
 */
export const STATE_COLORS = Object.freeze({
  comprando: '#16a34a', en_fila: '#f59e0b', pagando: '#2563eb', saliendo: '#94a3b8', abandono: '#ef4444',
});
export const LEGEND = Object.freeze([
  { state: 'comprando', label: 'Comprando', color: STATE_COLORS.comprando },
  { state: 'en_fila', label: 'En fila', color: STATE_COLORS.en_fila },
  { state: 'pagando', label: 'Pagando', color: STATE_COLORS.pagando },
]);
const CASHIER_COLORS = { libre: '#22c55e', atendiendo: '#2563eb', verificando: '#f97316', cerrada: '#94a3b8' };
const PALETTE = { floor: '#f8fafc', road: '#e2e8f0', shelf: '#f59e0b', text: '#334155', arrow: '#94a3b8' };

export function buildStaticScene(layout) {
  const shapes = [{ type: 'rect', x: 0, y: 0, w: layout.width, h: layout.height, fill: PALETTE.floor, stroke: '#cbd5e1' }];
  const drawn = new Set();
  for (const e of layout.edges.values()) {
    const rev = `${e.to}>${e.from}`;
    if (drawn.has(rev)) continue; drawn.add(e.key);
    const A = layout.nodes.get(e.from), B = layout.nodes.get(e.to);
    shapes.push({ type: 'line', x1: A.x, y1: A.y, x2: B.x, y2: B.y, width: e.hasReverse ? 1.5 : 1.0, color: PALETTE.road });
    if (!e.hasReverse && e.length > 3) { // flecha de sentido único
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      shapes.push({ type: 'arrow', x: mx, y: my, ux: e.ux, uy: e.uy, size: 0.7, color: PALETTE.arrow });
    }
  }
  for (const b of layout.shelfBlocks) shapes.push({ type: 'rect', ...b, fill: PALETTE.shelf, stroke: '#d97706', radius: 0.4 });
  shapes.push({ type: 'text', x: layout.entrance.x, y: 3.2, text: 'ENTRADA', size: 1.5, color: PALETTE.text, bold: true });
  shapes.push({ type: 'text', x: 30, y: 17, text: 'PASILLOS DE PRODUCTOS', size: 1.6, color: '#92400e', bold: true });
  shapes.push({ type: 'text', x: 30, y: layout.height - 0.8, text: 'ZONA DE CAJAS', size: 1.4, color: PALETTE.text, bold: true });
  shapes.push({ type: 'text', x: layout.exitPoint.x, y: layout.exitPoint.y - 1.4, text: 'SALIDA', size: 1.2, color: PALETTE.text, bold: true });
  return shapes;
}

export function buildDynamicScene(layout, snapshot, positions = null) {
  const shapes = [];
  for (const k of snapshot.cashiers) {
    shapes.push({ type: 'rect', x: k.x - 1.4, y: k.y - 1, w: 2.8, h: 1.8, fill: CASHIER_COLORS[k.status] ?? CASHIER_COLORS.libre, stroke: '#0f172a', radius: 0.3, opacity: k.closing ? 0.5 : 1 });
    shapes.push({ type: 'text', x: k.x, y: k.y - 1.5, text: String(k.id + 1), size: 1.1, color: PALETTE.text, bold: true });
  }
  for (const c of snapshot.customers) {
    const p = positions?.get(c.id) ?? c;
    shapes.push({ type: 'circle', x: p.x, y: p.y, r: 0.55, fill: STATE_COLORS[c.state] ?? '#64748b', stroke: '#ffffff' });
  }
  return shapes;
}

export function drawShapes(ctx, shapes) {
  for (const s of shapes) {
    ctx.save();
    if (s.opacity !== undefined) ctx.globalAlpha = s.opacity;
    switch (s.type) {
      case 'rect':
        ctx.beginPath();
        if (s.radius && ctx.roundRect) ctx.roundRect(s.x, s.y, s.w, s.h, s.radius); else ctx.rect(s.x, s.y, s.w, s.h);
        if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
        if (s.stroke) { ctx.strokeStyle = s.stroke; ctx.lineWidth = 0.12; ctx.stroke(); }
        break;
      case 'line':
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2);
        ctx.strokeStyle = s.color; ctx.lineWidth = s.width; ctx.lineCap = 'round'; ctx.stroke();
        break;
      case 'arrow':
        ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.uy, s.ux));
        ctx.beginPath(); ctx.moveTo(s.size, 0); ctx.lineTo(-s.size, s.size * 0.7); ctx.lineTo(-s.size, -s.size * 0.7); ctx.closePath();
        ctx.fillStyle = s.color; ctx.fill();
        break;
      case 'circle':
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.fill; ctx.fill();
        if (s.stroke) { ctx.strokeStyle = s.stroke; ctx.lineWidth = 0.15; ctx.stroke(); }
        break;
      case 'text':
        ctx.font = `${s.bold ? '600 ' : ''}${s.size}px system-ui, sans-serif`;
        ctx.fillStyle = s.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(s.text, s.x, s.y);
        break;
      default: break;
    }
    ctx.restore();
  }
}

export class MapRenderer {
  constructor(canvas, layout, { smoothing = 0.35 } = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.layout = layout;
    this.smoothing = smoothing; this.positions = new Map();
    this.staticScene = buildStaticScene(layout);
    this.resize();
  }

  /** Ajusta resolución al tamaño CSS del canvas (responsivo + pantallas retina). */
  resize() {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const w = this.canvas.clientWidth || 600;
    const h = (w * this.layout.height) / this.layout.width;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.canvas.style.height = `${h}px`;
    this.scale = (w * dpr) / this.layout.width;
  }

  _smooth(snapshot) {
    const seen = new Set();
    for (const c of snapshot.customers) {
      seen.add(c.id);
      const p = this.positions.get(c.id);
      if (!p) this.positions.set(c.id, { x: c.x, y: c.y });
      else { p.x += (c.x - p.x) * this.smoothing; p.y += (c.y - p.y) * this.smoothing; }
    }
    for (const id of this.positions.keys()) if (!seen.has(id)) this.positions.delete(id);
  }

  draw(snapshot) {
    if (!snapshot) return;
    this._smooth(snapshot);
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    drawShapes(ctx, this.staticScene);
    drawShapes(ctx, buildDynamicScene(this.layout, snapshot, this.positions));
  }
}

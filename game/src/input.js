// input.js — mouse + keyboard input, translated into canvas coordinates.
export class GameInput {
  constructor(canvas, onClick, onHover, onKey) {
    this.canvas = canvas;
    this.onClick = onClick;
    this.onHover = onHover;
    this.onKey = onKey;
    this.mouse = { x: -1, y: -1, inside: false };
    canvas.addEventListener('mousemove', (e) => {
      const p = this.toCanvas(e);
      this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.inside = true;
      if (this.onHover) this.onHover(p.x, p.y);
    });
    canvas.addEventListener('mouseleave', () => { this.mouse.inside = false; });
    canvas.addEventListener('click', (e) => {
      const p = this.toCanvas(e);
      if (this.onClick) this.onClick(p.x, p.y);
    });
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const p = this.toCanvas(e);
      if (this.onClick) this.onClick(p.x, p.y, true);
    });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (this.onKey) this.onKey(e.key.toLowerCase());
    });
  }

  toCanvas(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (this.canvas.width / r.width),
      y: (e.clientY - r.top) * (this.canvas.height / r.height),
    };
  }
}

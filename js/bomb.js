// Ekran-geneli patlama efekti — BOMB power-up toplandığında tetiklenir
class BombEffect {
  constructor(canvasW, canvasH, hudH) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.hudH    = hudH;
    this.timer   = 0;
    this.dur     = 0.7;
    this.active  = true;
  }

  update(dt) {
    this.timer += dt;
    if (this.timer >= this.dur) this.active = false;
  }

  draw(ctx) {
    const p     = this.timer / this.dur;          // 0 → 1
    const alpha = Math.max(0, 1 - p * 1.1);
    const cx    = this.canvasW / 2;
    const cy    = this.hudH + (this.canvasH - this.hudH) / 2;
    const maxR  = Math.max(this.canvasW, this.canvasH) * 0.8;
    const r     = maxR * Math.min(1, p * 1.8);

    ctx.save();

    // Outer shockwave ring
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = '#FF4757';
    ctx.lineWidth   = 12 * (1 - p);
    ctx.shadowColor = '#FF4757';
    ctx.shadowBlur  = 40;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

    // Mid ring
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = '#FFA502';
    ctx.lineWidth   = 8 * (1 - p);
    ctx.shadowColor = '#FFA502';
    ctx.shadowBlur  = 25;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.stroke();

    // Central flash (only early in animation)
    if (p < 0.35) {
      const flashAlpha = (1 - p / 0.35) * 0.55;
      ctx.globalAlpha = flashAlpha;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.3);
      grad.addColorStop(0,   'rgba(255,255,255,1)');
      grad.addColorStop(0.5, 'rgba(255,180,50,0.8)');
      grad.addColorStop(1,   'rgba(255,80,0,0)');
      ctx.fillStyle = grad;
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.fill();
    }

    // Screen red flash overlay
    if (p < 0.2) {
      ctx.globalAlpha = (1 - p / 0.2) * 0.25;
      ctx.fillStyle   = '#FF4757';
      ctx.shadowBlur  = 0;
      ctx.fillRect(0, this.hudH, this.canvasW, this.canvasH - this.hudH);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

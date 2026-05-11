class Rope {
  constructor(x, startY, hudH) {
    this.x       = x;
    this.bottomY = startY;
    this.topY    = startY;
    this.hudH    = hudH;
    this.speed   = 560;
    this.active  = true;
    this.extending = true;
    this.stayTimer = 0;
  }

  update(dt, fastMode) {
    if (!this.active) return;

    if (this.extending) {
      const spd = fastMode ? this.speed * 2.2 : this.speed;
      this.topY -= spd * dt;
      if (this.topY <= this.hudH + 4) {
        this.topY      = this.hudH + 4;
        this.extending = false;
        this.stayTimer = 1.8;
      }
    } else {
      this.stayTimer -= dt;
      if (this.stayTimer <= 0) {
        this.active = false;
      }
    }
  }

  consume() {
    this.active = false;
  }

  draw(ctx) {
    if (!this.active) return;

    const alpha = this.extending ? 1 : Math.min(1, this.stayTimer / 0.4);

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.strokeStyle = '#ddeeff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#88ccff';
    ctx.shadowBlur = 12;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(this.x, this.bottomY);
    ctx.lineTo(this.x, this.topY);
    ctx.stroke();

    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.topY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  getSegment() {
    return { x1: this.x, y1: this.topY, x2: this.x, y2: this.bottomY };
  }
}

const BUBBLE_COLORS = [
  '#FF4757', '#2ED573', '#1E90FF', '#FFA502',
  '#FF6B81', '#A29BFE', '#00CEC9', '#FDCB6E'
];

const BUBBLE_CONFIG = {
  LARGE:  { radius: 38, scoreValue: 50, next: 'MEDIUM', baseSpeed: 125, launchVY: -310 },
  MEDIUM: { radius: 24, scoreValue: 25, next: 'SMALL',  baseSpeed: 170, launchVY: -410 },
  SMALL:  { radius: 13, scoreValue: 10, next: null,     baseSpeed: 215, launchVY: -510 }
};

const GRAVITY = 310;

class Bubble {
  constructor(x, y, vx, vy, sizeKey, colorIndex, canvasW, groundY, hudH) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.sizeKey = sizeKey;
    this.colorIndex = (colorIndex !== undefined) ? colorIndex : randInt(0, BUBBLE_COLORS.length - 1);
    this.color = BUBBLE_COLORS[this.colorIndex];
    this.cfg = BUBBLE_CONFIG[sizeKey];
    this.radius = this.cfg.radius;
    this.canvasW = canvasW;
    this.groundY = groundY;
    this.hudH = hudH;
    this.squish = 1;
    this.squishV = 1;
    this.angle = 0;
    this.frozen = false;
  }

  update(dt, freezeMult) {
    const effDt = dt * (this.frozen ? freezeMult : 1.0);

    this.vy += GRAVITY * effDt;
    this.x  += this.vx * effDt;
    this.y  += this.vy * effDt;
    this.angle += (this.vx / this.radius) * dt * 0.4;

    const r = this.radius;

    if (this.x - r < 0) {
      this.x = r;
      this.vx = Math.abs(this.vx);
      this.squish = 0.65;
      this.squishV = 1.35;
    } else if (this.x + r > this.canvasW) {
      this.x = this.canvasW - r;
      this.vx = -Math.abs(this.vx);
      this.squish = 0.65;
      this.squishV = 1.35;
    }

    if (this.y + r > this.groundY) {
      this.y = this.groundY - r;
      if (Math.abs(this.vy) < 120) this.vy = -120;
      this.vy = -Math.abs(this.vy);
      this.squish = 0.55;
      this.squishV = 1.45;
    }

    if (this.y - r < this.hudH + 4) {
      this.y = this.hudH + 4 + r;
      this.vy = Math.abs(this.vy);
    }

    const squishTarget = 1;
    this.squish  = lerp(this.squish,  squishTarget, Math.min(1, dt * 10));
    this.squishV = lerp(this.squishV, squishTarget, Math.min(1, dt * 10));
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.squishV, this.squish);

    const r = this.radius;

    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.frozen ? 22 : 16;

    const grad = ctx.createRadialGradient(
      -r * 0.28, -r * 0.28, r * 0.08,
       0,         0,         r
    );
    grad.addColorStop(0,   'rgba(255,255,255,0.55)');
    grad.addColorStop(0.3, this.color + 'CC');
    grad.addColorStop(1,   this.color + '33');

    ctx.globalAlpha = this.frozen ? 0.65 : 1;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = this.frozen ? '#74b9ff' : this.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.globalAlpha = (this.frozen ? 0.65 : 1) * 0.55;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.32, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fill();

    ctx.restore();
  }

  split() {
    const nextKey = this.cfg.next;
    if (!nextKey) return [];
    const nextCfg = BUBBLE_CONFIG[nextKey];
    const spd = nextCfg.baseSpeed * (0.9 + Math.random() * 0.2);
    const lVY = nextCfg.launchVY;
    return [
      new Bubble(this.x, this.y, -spd, lVY, nextKey, this.colorIndex, this.canvasW, this.groundY, this.hudH),
      new Bubble(this.x, this.y,  spd, lVY, nextKey, this.colorIndex, this.canvasW, this.groundY, this.hudH)
    ];
  }
}

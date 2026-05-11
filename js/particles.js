class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = randBetween(60, 260);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - randBetween(0, 80);
    this.size = randBetween(3, 8);
    this.life = 0;
    this.maxLife = randBetween(0.35, 0.75);
    this.gravity = 280;
  }

  update(dt) {
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life += dt;
    return this.life < this.maxLife;
  }

  draw(ctx) {
    const alpha = Math.max(0, 1 - this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * (1 - this.life / this.maxLife * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, color, count = 14) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  emitStar(x, y) {
    const colors = ['#FFD700', '#FFA500', '#FFFFFF', '#87CEEB'];
    const c = colors[randInt(0, colors.length - 1)];
    for (let i = 0; i < 20; i++) {
      this.particles.push(new Particle(x, y, c));
    }
  }

  update(dt) {
    this.particles = this.particles.filter(p => p.update(dt));
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }
}

const PLAYER_SPEED = 315;
const PLAYER_W     = 28;
const PLAYER_H     = 46;

class Player {
  constructor(canvasW, groundY, charType = 'boy') {
    this.canvasW  = canvasW;
    this.groundY  = groundY;
    this.charType = charType;
    this.w        = PLAYER_W;
    this.h        = PLAYER_H;
    this.x        = canvasW / 2 - PLAYER_W / 2;
    this.y        = groundY - PLAYER_H;
    this.invincible  = false;
    this.invTimer    = 0;
    this.flashTimer  = 0;
    this.walkFrame   = 0;
    this.walkTimer   = 0;
    this.dir         = 1;
    this.moving      = false;
  }

  get cx()  { return this.x + this.w / 2; }
  get top() { return this.y; }

  update(dt, keys) {
    let dx = 0;
    if (keys['ArrowLeft']  || keys['a'] || keys['A']) { dx = -1; this.dir = -1; }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) { dx =  1; this.dir =  1; }

    this.moving = dx !== 0;
    this.x = clamp(this.x + dx * PLAYER_SPEED * dt, 0, this.canvasW - this.w);

    if (this.moving) {
      this.walkTimer += dt;
      if (this.walkTimer > 0.11) { this.walkTimer = 0; this.walkFrame ^= 1; }
    } else {
      this.walkFrame = 0;
      this.walkTimer = 0;
    }

    if (this.invincible) {
      this.invTimer   -= dt;
      this.flashTimer += dt;
      if (this.invTimer <= 0) { this.invincible = false; this.invTimer = 0; }
    }
  }

  hit() {
    if (this.invincible) return false;
    this.invincible = true;
    this.invTimer   = 2.2;
    this.flashTimer = 0;
    return true;
  }

  getBounds() {
    return { x: this.x + 4, y: this.y + 6, w: this.w - 8, h: this.h - 6 };
  }

  draw(ctx) {
    if (this.invincible && Math.floor(this.flashTimer * 9) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.cx, this.groundY);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, -1, 15, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.charType === 'girl') {
      this._drawGirl(ctx);
    } else {
      this._drawBoy(ctx);
    }
    ctx.restore();
  }

  _drawBoy(ctx) {
    const legSwing = this.walkFrame === 1 ? 6 : 0;
    ctx.fillStyle = '#1a2535';
    ctx.fillRect(-11, -22, 9, 22 + legSwing);
    ctx.fillRect(  2, -22, 9, 22 - legSwing);

    ctx.fillStyle = '#2980b9';
    ctx.shadowColor = '#3498db'; ctx.shadowBlur = 10;
    ctx.fillRect(-13, -44, 26, 24);

    ctx.fillStyle = '#ffeaa7';
    ctx.shadowColor = '#f9ca24'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0, -52, 12, 0, Math.PI * 2); ctx.fill();

    // Short hair
    ctx.shadowBlur = 0; ctx.fillStyle = '#a0522d';
    ctx.beginPath(); ctx.ellipse(0, -60, 12, 7, 0, Math.PI, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#2c3e50';
    const ex = this.dir * 3;
    ctx.beginPath();
    ctx.arc(ex - 3, -53, 2.2, 0, Math.PI * 2);
    ctx.arc(ex + 3, -53, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawGirl(ctx) {
    const legSwing = this.walkFrame === 1 ? 5 : 0;

    // 1. Legs
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffd6ec';
    ctx.fillRect(-9, -4, 7, 18 + legSwing);
    ctx.fillRect( 2, -4, 7, 18 - legSwing);

    // 2. Skirt
    ctx.fillStyle = '#e84393';
    ctx.shadowColor = '#e84393'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-14, -22); ctx.lineTo(14, -22);
    ctx.lineTo(18, 0);    ctx.lineTo(-18, 0);
    ctx.closePath(); ctx.fill();

    // 3. Body
    ctx.fillStyle = '#9b59b6';
    ctx.shadowColor = '#9b59b6'; ctx.shadowBlur = 10;
    ctx.fillRect(-12, -44, 24, 24);

    // 4. Ponytail behind head (drawn first so head covers the base)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e6b800';
    const pt = this.dir;
    ctx.beginPath();
    ctx.moveTo(pt * 9, -56);
    ctx.quadraticCurveTo(pt * 26, -52, pt * 24, -38);
    ctx.quadraticCurveTo(pt * 28, -28, pt * 20, -26);
    ctx.quadraticCurveTo(pt * 14, -32, pt * 18, -44);
    ctx.quadraticCurveTo(pt * 20, -52, pt * 11, -56);
    ctx.closePath(); ctx.fill();

    // 5. Head (draws over ponytail base — face stays clean)
    ctx.fillStyle = '#ffeaa7';
    ctx.shadowColor = '#f9ca24'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0, -52, 12, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // 6. Hair top (semicircle cap, sits on top of head)
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(0, -52, 12.5, Math.PI, Math.PI * 2);
    ctx.fill();

    // 7. Eyes (drawn after hair so they're on top)
    const ex = this.dir * 3;
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(ex - 3, -52, 2.2, 0, Math.PI * 2);
    ctx.arc(ex + 3, -52, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 8. Eyelashes — short strokes just above eyes, inside hair boundary
    ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(ex - 5, -54); ctx.lineTo(ex - 6, -57); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex - 3, -54); ctx.lineTo(ex - 3, -57); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex - 1, -54); ctx.lineTo(ex - 1, -57); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex + 1, -54); ctx.lineTo(ex + 1, -57); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex + 3, -54); ctx.lineTo(ex + 3, -57); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex + 5, -54); ctx.lineTo(ex + 6, -57); ctx.stroke();

    // 9. Rosy cheeks
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#e84393';
    ctx.beginPath(); ctx.ellipse(ex - 7, -49, 3.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex + 7, -49, 3.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

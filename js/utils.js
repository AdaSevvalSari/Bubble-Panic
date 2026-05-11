function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function randBetween(a, b) {
  return a + Math.random() * (b - a);
}

function randInt(a, b) {
  return Math.floor(randBetween(a, b + 1));
}

function pointToSegmentDistSq(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (px - x1) ** 2 + (py - y1) ** 2;
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  return (px - nx) ** 2 + (py - ny) ** 2;
}

function circleSegmentCollision(cx, cy, cr, x1, y1, x2, y2) {
  return pointToSegmentDistSq(cx, cy, x1, y1, x2, y2) <= cr * cr;
}

function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy <= cr * cr;
}

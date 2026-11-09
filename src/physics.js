// Eksen hizalı kutu (AABB) dünyası ve oyuncu kutusunun eksen eksen çözümü.
// Her kutu: { minX, minY, minZ, maxX, maxY, maxZ, solid, climbable, bouncy, kind, active, dx, dy, dz }

export class World {
  constructor() {
    this.boxes = [];
  }

  add(box) {
    box.dx = box.dy = box.dz = 0;
    if (box.active === undefined) box.active = true;
    if (box.solid === undefined) box.solid = true;
    this.boxes.push(box);
    return box;
  }

  clear() { this.boxes.length = 0; }

  // Bir AABB ile çakışan tüm aktif katı kutular
  *overlaps(minX, minY, minZ, maxX, maxY, maxZ, filter) {
    for (const b of this.boxes) {
      if (!b.active || !b.solid) continue;
      if (filter && !filter(b)) continue;
      if (minX < b.maxX && maxX > b.minX && minY < b.maxY && maxY > b.minY && minZ < b.maxZ && maxZ > b.minZ) yield b;
    }
  }

  // Işın – kutu kesişimi (kamera çarpışması ve gölge için). En yakın t (0..1) döner.
  raycast(ox, oy, oz, dx, dy, dz, pad = 0, filter) {
    let best = 1;
    for (const b of this.boxes) {
      if (!b.active || !b.solid) continue;
      if (filter && !filter(b)) continue;
      let tmin = 0, tmax = best;
      const o = [ox, oy, oz], d = [dx, dy, dz];
      const mn = [b.minX - pad, b.minY - pad, b.minZ - pad];
      const mx = [b.maxX + pad, b.maxY + pad, b.maxZ + pad];
      let hit = true;
      for (let i = 0; i < 3; i++) {
        if (Math.abs(d[i]) < 1e-9) {
          if (o[i] < mn[i] || o[i] > mx[i]) { hit = false; break; }
        } else {
          let t1 = (mn[i] - o[i]) / d[i];
          let t2 = (mx[i] - o[i]) / d[i];
          if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
          tmin = Math.max(tmin, t1);
          tmax = Math.min(tmax, t2);
          if (tmin > tmax) { hit = false; break; }
        }
      }
      if (hit && tmin < best && tmin > 0) best = tmin;
    }
    return best;
  }

  // (x,z) noktasında y'nin altındaki en yüksek zemin
  groundBelow(x, y, z, hw = 0) {
    let best = -Infinity, box = null;
    for (const b of this.boxes) {
      if (!b.active || !b.solid) continue;
      if (x + hw <= b.minX || x - hw >= b.maxX || z + hw <= b.minZ || z - hw >= b.maxZ) continue;
      if (b.maxY <= y + 0.01 && b.maxY > best) { best = b.maxY; box = b; }
    }
    return { y: best, box };
  }
}

const EPS = 0.0005;
const STEP_UP = 0.3;

// Gövde: { pos:{x,y,z}, vel, hw, h }. pos ayakların ortası.
// Bir ekseni hareket ettirir ve çakışmaları çözer. Temas bilgisini döner.
export function moveAxis(world, body, axis, delta, allowStep) {
  const p = body.pos;
  p[axis] += delta;
  let contact = null;
  for (let iter = 0; iter < 4; iter++) {
    let hitBox = null;
    for (const b of world.overlaps(p.x - body.hw, p.y, p.z - body.hw, p.x + body.hw, p.y + body.h, p.z + body.hw)) {
      hitBox = b;
      break;
    }
    if (!hitBox) break;
    const b = hitBox;
    if (axis === 'y') {
      if (delta > 0 || (delta === 0 && p.y + body.h / 2 < (b.minY + b.maxY) / 2)) {
        p.y = b.minY - body.h - EPS;
        contact = { box: b, normal: [0, -1, 0] };
      } else {
        p.y = b.maxY + EPS;
        contact = { box: b, normal: [0, 1, 0] };
      }
    } else {
      // Küçük basamaklara otomatik çık
      if (allowStep && b.maxY - p.y <= STEP_UP && b.maxY - p.y > 0) {
        const oldY = p.y;
        p.y = b.maxY + EPS;
        let blocked = false;
        for (const _ of world.overlaps(p.x - body.hw, p.y, p.z - body.hw, p.x + body.hw, p.y + body.h, p.z + body.hw)) { blocked = true; break; }
        if (!blocked) continue;
        p.y = oldY;
      }
      const min = axis === 'x' ? b.minX : b.minZ;
      const max = axis === 'x' ? b.maxX : b.maxZ;
      const center = p[axis];
      if (delta > 0 || (delta === 0 && center < (min + max) / 2)) {
        p[axis] = min - body.hw - EPS;
        contact = { box: b, normal: axis === 'x' ? [-1, 0, 0] : [0, 0, -1] };
      } else {
        p[axis] = max + body.hw + EPS;
        contact = { box: b, normal: axis === 'x' ? [1, 0, 0] : [0, 0, 1] };
      }
    }
  }
  return contact;
}

export function aabbOverlap(a, b) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

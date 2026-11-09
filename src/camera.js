// Takip kamerası: yumuşak takip, elle döndürme, hareket yönüne hafifçe dönme, duvar çakışmasında yaklaşma.
import * as THREE from 'three';

export class FollowCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.38;
    this.dist = 6.5;
    this.curDist = 6.5;
    this.target = new THREE.Vector3();
    this.look = new THREE.Vector3();
  }

  snap(p, yaw) {
    this.yaw = yaw;
    this.target.set(p.x, p.y + 0.8, p.z);
    this.look.copy(this.target);
    this.curDist = this.dist;
    this.apply(null);
  }

  update(dt, p, player, input, world) {
    this.yaw -= input.camDX;
    this.pitch = Math.max(0.05, Math.min(1.2, this.pitch + input.camDY));

    // Elle döndürülmediyse koşu yönüne hafifçe hizalan
    const hs = Math.hypot(player.vel.x, player.vel.z);
    if (input.sinceCamInput > 1.5 && hs > 2 && !player.climbing) {
      const moveYaw = Math.atan2(player.vel.x, player.vel.z);
      let diff = moveYaw - this.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      // Sadece yana doğru koşarken döner, geriye koşarken dönmez
      if (Math.abs(diff) < 2.2) this.yaw += diff * Math.min(1, dt * 0.9) * (hs / 6.5);
    }

    // Yükseklik takibi: yerdeyken daha sıkı, havadayken yumuşak
    // Üstte alçak tavan varsa (ör. koltuk altı) hedefi indir
    const up = world.raycast(p.x, p.y + 0.3, p.z, 0, 1.0, 0, 0, (b) => b.kind !== 'challenge');
    const ty = p.y + Math.min(0.8, 0.3 + up * 1.0 - 0.15);
    const ky = player.grounded || player.climbing ? 8 : 2.5;
    this.target.x += (p.x - this.target.x) * Math.min(1, dt * 12);
    this.target.z += (p.z - this.target.z) * Math.min(1, dt * 12);
    this.target.y += (ty - this.target.y) * Math.min(1, dt * ky);
    if (ty - this.target.y > 2.5) this.target.y = ty - 2.5;
    if (this.target.y - ty > 1.5) this.target.y = ty + 1.5;

    this.apply(world, dt);
  }

  apply(world, dt = 1) {
    const cp = Math.cos(this.pitch);
    const ox = -Math.sin(this.yaw) * cp, oy = Math.sin(this.pitch), oz = -Math.cos(this.yaw) * cp;
    let d = this.dist;
    if (world) {
      const t = world.raycast(this.target.x, this.target.y, this.target.z, ox * d, oy * d, oz * d, 0.25, (b) => b.kind !== 'challenge' && (b.maxX - b.minX) * (b.maxZ - b.minZ) > 0.2);
      d = Math.max(1.2, t * d - 0.2);
    }
    // Yaklaşma anında, uzaklaşma yumuşak
    if (d < this.curDist) this.curDist = d;
    else this.curDist += (d - this.curDist) * Math.min(1, dt * 3);
    this.camera.position.set(this.target.x + ox * this.curDist, this.target.y + oy * this.curDist, this.target.z + oz * this.curDist);
    this.look.lerp(this.target, 1);
    this.camera.lookAt(this.look);
  }
}

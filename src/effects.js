// Basit parçacık efektleri: "puf" bulutu, parıltı, su sıçraması.
import * as THREE from 'three';

const sphereGeo = new THREE.IcosahedronGeometry(1, 0);
const starGeo = new THREE.OctahedronGeometry(1, 0);

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.parts = [];
  }

  burst(pos, { color = 0xffffff, count = 10, speed = 3, size = 0.18, life = 0.6, gravity = 0, geo = sphereGeo, up = 1 } = {}) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true }));
      m.position.set(pos.x, pos.y, pos.z);
      const a = Math.random() * Math.PI * 2;
      const e = (Math.random() - 0.3) * up;
      const v = new THREE.Vector3(Math.cos(a), e, Math.sin(a)).normalize().multiplyScalar(speed * (0.6 + Math.random() * 0.6));
      const s = size * (0.6 + Math.random() * 0.8);
      m.scale.setScalar(s);
      this.scene.add(m);
      this.parts.push({ m, v, life, max: life, s, gravity });
    }
  }

  poof(pos) {
    this.burst(pos, { color: 0xffffff, count: 14, speed: 2.5, size: 0.28, life: 0.55 });
    this.burst(pos, { color: 0xfff1b8, count: 6, speed: 4, size: 0.1, life: 0.5, geo: starGeo });
  }
  sparkle(pos, color = 0xffd447) {
    this.burst(pos, { color, count: 8, speed: 2.2, size: 0.08, life: 0.45, geo: starGeo });
  }
  splash(pos) {
    this.burst(pos, { color: 0x8fd3ff, count: 16, speed: 3.5, size: 0.12, life: 0.7, gravity: 12, up: 3 });
  }
  dust(pos) {
    this.burst(pos, { color: 0xf3e3c8, count: 5, speed: 1.2, size: 0.1, life: 0.35, up: 0.3 });
  }

  // Banyo kabarcığı: yavaşça yükselen saydam top
  bubble(pos) {
    this.burst(pos, { color: 0xd6efff, count: 1, speed: 0.3, size: 0.07, life: 2.2, gravity: -0.9, up: 0.5 });
  }

  // Boss yenilince renkli konfeti
  confetti(pos) {
    for (const color of [0xff5fa2, 0xffd166, 0x5ab0e8, 0x7bc96f, 0xb56fd6]) {
      this.burst({ x: pos.x, y: pos.y + 0.5, z: pos.z }, { color, count: 8, speed: 6, size: 0.14, life: 1.4, gravity: 9, up: 4, geo: starGeo });
    }
  }

  // Pati savuruşu: kedinin önünde beliren hilal + pati izleri
  swipe(x, y, z, yaw) {
    const arc = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.8, 16, 1, -Math.PI * 0.95, Math.PI * 0.9),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
    );
    arc.rotation.order = 'YXZ';
    arc.rotation.y = yaw;
    arc.rotation.x = -Math.PI / 2;
    arc.position.set(x + Math.sin(yaw) * 0.3, y, z + Math.cos(yaw) * 0.3);
    arc.scale.setScalar(1);
    this.scene.add(arc);
    this.parts.push({ m: arc, v: new THREE.Vector3(Math.sin(yaw) * 2, 0, Math.cos(yaw) * 2), life: 0.25, max: 0.25, s: 1, gravity: 0, flat: true });
    const fx = x + Math.sin(yaw) * 0.8, fz = z + Math.cos(yaw) * 0.8;
    this.burst({ x: fx, y: y + 0.1, z: fz }, { color: 0xffe0ec, count: 3, speed: 1.2, size: 0.09, life: 0.3, geo: starGeo });
  }

  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.m);
        p.m.material.dispose();
        if (p.flat) p.m.geometry.dispose();
        this.parts.splice(i, 1);
        continue;
      }
      p.v.y -= p.gravity * dt;
      p.v.multiplyScalar(Math.exp(-dt * 2));
      p.m.position.addScaledVector(p.v, dt);
      const k = p.life / p.max;
      p.m.material.opacity = k;
      if (p.flat) {
        p.m.scale.setScalar(p.s * (1.4 - k * 0.4));
        continue;
      }
      p.m.scale.setScalar(p.s * (0.5 + k * 0.7));
      p.m.rotation.x += dt * 4;
      p.m.rotation.y += dt * 3;
    }
  }

  clear() {
    for (const p of this.parts) { this.scene.remove(p.m); p.m.material.dispose(); }
    this.parts.length = 0;
  }
}

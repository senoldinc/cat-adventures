// Checkpoint (mama kabı + bayrak), kedi kapısı ve Zor Parkur başlangıç halkası.
import * as THREE from 'three';
import { mat } from '../props.js';

export class Checkpoint {
  constructor(scene, pos) {
    this.pos = new THREE.Vector3(...pos);
    this.g = new THREE.Group();
    this.g.position.copy(this.pos);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.32, 0.25, 12), mat(0xe8574a));
    bowl.position.y = 0.125;
    this.g.add(bowl);
    const food = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xc98a3c));
    food.position.y = 0.2;
    food.scale.y = 0.4;
    this.g.add(food);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), mat(0xffffff));
    pole.position.set(0.6, 1.1, 0);
    this.g.add(pole);
    this.flagMat = mat(0xb0b0b0);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.7), this.flagMat);
    flag.position.set(0.6, 1.9, 0.36);
    this.flag = flag;
    this.g.add(flag);
    // Pati izi
    const paw = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    paw.position.set(0.62, 1.9, 0.36);
    paw.rotation.y = Math.PI / 2;
    this.g.add(paw);
    this.g.traverse((o) => (o.castShadow = true));
    scene.add(this.g);
    this.active = false;
  }

  activate() {
    this.active = true;
    this.flagMat.color.setHex(0x5cc96b);
  }

  update(t) {
    this.flag.rotation.y = Math.sin(t * 3) * (this.active ? 0.25 : 0.05);
  }

  near(x, z, r = 1.3) {
    return (x - this.pos.x) ** 2 + (z - this.pos.z) ** 2 < r * r;
  }
}

export class CatDoor {
  constructor(scene, spec) {
    const [x, y, z] = spec.p;
    const [w, h, d] = spec.s;
    const base = y - h / 2; // kapının alt kenarı (yerde değilse bir çıkıntının üstünde)
    this.g = new THREE.Group();
    this.g.position.set(x, base, z);
    // Çerçeve
    const frame = mat(0xffffff);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, h + 0.3, d + 0.1), frame);
      post.position.set((w / 2 + 0.1) * s, (h + 0.3) / 2, 0);
      this.g.add(post);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(w + 0.45, 0.3, d + 0.1), frame);
    lintel.position.set(0, h + 0.15, 0);
    this.g.add(lintel);
    // Arkadaki ışık (açılınca görünür)
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xfff1b8 }));
    this.glow.position.set(0, h / 2, d / 2 - 0.02);
    this.glow.rotation.y = Math.PI;
    this.g.add(this.glow);
    // Kapak — üstten menteşeli
    this.flapPivot = new THREE.Group();
    this.flapPivot.position.set(0, h, 0);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), mat(0x8fc1e3));
    flap.position.y = -h / 2;
    this.flapPivot.add(flap);
    const pawPrint = new THREE.Mesh(new THREE.CircleGeometry(0.3, 10), mat(0xffffff));
    pawPrint.position.set(0, -h / 2, -0.07);
    pawPrint.rotation.y = Math.PI;
    this.flapPivot.add(pawPrint);
    // Kilit
    this.lock = new THREE.Group();
    const lockMat = mat(0xffc23d, { metalness: 0.6, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.15), lockMat);
    this.lock.add(body);
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 10, Math.PI), lockMat);
    shackle.position.y = 0.2;
    this.lock.add(shackle);
    const bellIcon = new THREE.Mesh(new THREE.CircleGeometry(0.08, 8), mat(0x6b4226));
    bellIcon.position.z = -0.08;
    bellIcon.rotation.y = Math.PI;
    this.lock.add(bellIcon);
    this.lock.position.set(0, -h / 2 - 0.1, -0.15);
    this.flapPivot.add(this.lock);
    this.g.add(this.flapPivot);
    this.g.traverse((o) => (o.castShadow = true));
    scene.add(this.g);
    this.open = false;
    this.openT = 0;
    this.zone = { minX: x - w / 2, maxX: x + w / 2, minZ: z - 1.6, maxZ: z, minY: base - 0.5, maxY: base + h };
  }

  unlock() {
    this.open = true;
    this.lock.visible = false;
  }

  update(dt, t) {
    if (this.open) this.openT = Math.min(1, this.openT + dt * 1.5);
    this.flapPivot.rotation.x = this.openT * 1.3 + (this.open ? Math.sin(t * 3) * 0.05 : 0);
    if (!this.open) this.lock.rotation.z = Math.sin(t * 2) * 0.1;
  }

  inside(p) {
    const z = this.zone;
    return this.open && p.x > z.minX && p.x < z.maxX && p.z > z.minZ && p.z < z.maxZ && p.y < z.maxY && p.y > z.minY;
  }
}

export class ChallengePad {
  constructor(scene, pos) {
    this.pos = new THREE.Vector3(...pos);
    this.g = new THREE.Group();
    this.g.position.copy(this.pos);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 6, 20), mat(0xb56fd6, { emissive: 0x6b2c99, emissiveIntensity: 0.6 }));
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.1;
    this.g.add(this.ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.8, 20), new THREE.MeshBasicMaterial({ color: 0xe7c9ff, transparent: true, opacity: 0.7 }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.06;
    this.g.add(disc);
    // Kronometre simgesi
    const watch = new THREE.Group();
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 14), mat(0xffffff));
    face.rotation.x = Math.PI / 2;
    watch.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 5, 14), mat(0xb56fd6));
    watch.add(rim);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.15, 6), mat(0xb56fd6));
    knob.position.y = 0.45;
    watch.add(knob);
    this.hand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.03), mat(0x333333));
    this.hand.geometry.translate(0, 0.1, 0);
    this.hand.position.z = 0.06;
    watch.add(this.hand);
    watch.position.y = 1.4;
    this.watch = watch;
    this.g.add(watch);
    scene.add(this.g);
  }

  update(t, running) {
    this.watch.rotation.y = t;
    this.watch.position.y = 1.4 + Math.sin(t * 2) * 0.1;
    this.hand.rotation.z = -t * (running ? 6 : 1);
    this.watch.visible = !running;
    this.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
  }

  near(p) {
    return Math.abs(p.y - this.pos.y) < 0.5 && (p.x - this.pos.x) ** 2 + (p.z - this.pos.z) ** 2 < 0.8;
  }
}

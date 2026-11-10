// Mama taneleri (instanced), balık kemikleri ve altın çan.
import * as THREE from 'three';

const gold = new THREE.MeshStandardMaterial({ color: 0xffc23d, emissive: 0x8a5a00, emissiveIntensity: 0.45, metalness: 0.4, roughness: 0.35, flatShading: true });

export function expandKibble(specs) {
  const pts = [];
  for (const s of specs) {
    if (Array.isArray(s)) pts.push(s);
    else if (s.line) {
      const [a, b] = s.line;
      for (let i = 0; i < s.n; i++) {
        const t = s.n === 1 ? 0 : i / (s.n - 1);
        pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      }
    } else if (s.ring) {
      const [x, y, z] = s.ring;
      for (let i = 0; i < s.n; i++) {
        const a = (i / s.n) * Math.PI * 2;
        pts.push([x + Math.cos(a) * s.r, y, z + Math.sin(a) * s.r]);
      }
    } else if (s.arc) {
      const [a, b] = s.arc;
      for (let i = 0; i < s.n; i++) {
        const t = (i + 1) / (s.n + 1);
        pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * s.h, a[2] + (b[2] - a[2]) * t]);
      }
    }
  }
  return pts;
}

export class KibbleField {
  constructor(scene, points, color) {
    this.points = points.map((p, i) => ({ x: p[0], y: p[1], z: p[2], alive: true, phase: i * 0.4 }));
    const geo = new THREE.DodecahedronGeometry(color ? 0.24 : 0.16, 0);
    geo.scale(1, 0.6, 1);
    const material = color ? new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, metalness: 0.3, roughness: 0.35, flatShading: true }) : gold;
    this.mesh = new THREE.InstancedMesh(geo, material, Math.max(1, this.points.length));
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.dummy = new THREE.Object3D();
    scene.add(this.mesh);
    this.update(0);
  }

  get total() { return this.points.length; }

  update(t) {
    const d = this.dummy;
    this.points.forEach((p, i) => {
      d.position.set(p.x, p.y + Math.sin(t * 2.5 + p.phase) * 0.08, p.z);
      d.rotation.set(0.4, t * 2.5 + p.phase, 0);
      d.scale.setScalar(p.alive ? 1 : 0);
      d.updateMatrix();
      this.mesh.setMatrixAt(i, d.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  // Oyuncu merkezine yakın taneleri toplar, toplanan konumları döndürür
  collect(cx, cy, cz, r = 0.7) {
    const got = [];
    for (const p of this.points) {
      if (!p.alive) continue;
      const dx = p.x - cx, dy = p.y - cy, dz = p.z - cz;
      if (dx * dx + dy * dy + dz * dz < r * r) { p.alive = false; got.push(p); }
    }
    return got;
  }
}

export function buildFishBone(color = 0xfff8e7) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, emissive: 0xfff2c0, emissiveIntensity: 0.5, flatShading: true, roughness: 0.4 });
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 5), m);
  spine.rotation.z = Math.PI / 2;
  g.add(spine);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), m);
  head.scale.set(1.2, 1, 0.5);
  head.position.x = 0.52;
  g.add(head);
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 4, 8), new THREE.MeshBasicMaterial({ color: 0x4a3426 }));
  eye.position.set(0.56, 0.04, 0.09);
  g.add(eye);
  for (let i = 0; i < 4; i++) {
    for (const s of [-1, 1]) {
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.36 - i * 0.05, 4), m);
      rib.position.set(0.25 - i * 0.17, s * 0.14, 0);
      rib.rotation.z = s * 0.35;
      g.add(rib);
    }
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.25, 3), m);
  tail.position.x = -0.55;
  tail.rotation.z = Math.PI / 2;
  tail.scale.z = 0.4;
  g.add(tail);
  g.traverse((o) => (o.castShadow = true));
  return g;
}

export function buildBell() {
  const g = new THREE.Group();
  const bellMat = new THREE.MeshStandardMaterial({ color: 0xffcb3d, metalness: 0.7, roughness: 0.25, emissive: 0x7a5200, emissiveIntensity: 0.5, flatShading: true });
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const r = 0.12 + Math.pow(t, 2.2) * 0.32;
    pts.push(new THREE.Vector2(r, 0.55 - t * 0.55));
  }
  pts.push(new THREE.Vector2(0.46, 0));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 10), bellMat);
  body.material.side = THREE.DoubleSide;
  g.add(body);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), bellMat);
  top.position.y = 0.56;
  g.add(top);
  const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), bellMat);
  clapper.position.y = -0.03;
  g.add(clapper);
  const bow = new THREE.MeshStandardMaterial({ color: 0xe8443a, flatShading: true });
  for (const s of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 4), bow);
    loop.position.set(0.14 * s, 0.7, 0);
    loop.rotation.z = (Math.PI / 2) * s;
    g.add(loop);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), bow);
  knot.position.y = 0.7;
  g.add(knot);
  g.traverse((o) => (o.castShadow = true));
  const light = new THREE.PointLight(0xffd36b, 4, 6, 1.5);
  light.position.y = 0.3;
  g.add(light);
  return g;
}

// Toplanabilir tekil nesne (kemik/çan) — dönen, sallanan, ışık halkalı
export class Pickup {
  constructor(scene, kind, pos, index = 0, collected = false, hidden = false) {
    this.kind = kind;
    this.index = index;
    this.base = new THREE.Vector3(...pos);
    this.obj = kind === 'bell' ? buildBell() : buildFishBone(collected ? 0x9fd7ff : 0xfff8e7);
    if (collected) this.obj.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.5; } });
    this.alreadyFound = collected;
    this.obj.position.copy(this.base);
    this.obj.scale.setScalar(kind === 'bell' ? 1 : 0.8);
    scene.add(this.obj);
    // Parıltı halkası
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 20), new THREE.MeshBasicMaterial({ color: kind === 'bell' ? 0xffd447 : 0xbfe8ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.4;
    this.halo = halo;
    this.obj.add(halo);
    this.alive = !hidden;
    this.obj.visible = !hidden;
    this.scene = scene;
    this.riseT = 0;
  }

  // Gizli nesneyi (boss'un düşürdüğü çan) verilen noktadan hoplatarak ortaya çıkarır
  reveal(x, y, z) {
    this.base.set(x, y, z);
    this.obj.position.set(x, y - 1, z);
    this.obj.visible = true;
    this.alive = true;
    this.riseT = 0.8;
  }

  update(t, dt = 1 / 60) {
    if (!this.alive) return;
    this.riseT = Math.max(0, this.riseT - dt);
    this.obj.position.y = this.base.y + Math.sin(t * 2) * 0.12 + (this.riseT > 0 ? Math.sin((1 - this.riseT / 0.8) * Math.PI) * 1.5 - this.riseT * 1.2 : 0);
    this.obj.rotation.y = t * (this.kind === 'bell' ? 1.2 : 1.8);
    if (this.kind === 'bell') this.obj.rotation.z = Math.sin(t * 4) * 0.2;
    this.halo.scale.setScalar(1 + Math.sin(t * 3) * 0.15);
  }

  near(x, y, z, r = 0.9) {
    if (!this.alive || this.riseT > 0.2) return false;
    const p = this.obj.position;
    return (p.x - x) ** 2 + (p.y - y) ** 2 + (p.z - z) ** 2 < r * r;
  }

  take() {
    this.alive = false;
    this.scene.remove(this.obj);
  }
}

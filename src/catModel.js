// Koddan üretilen low-poly Minnoş + prosedürel animasyon + kıyafet yuvaları.
import * as THREE from 'three';

export const FURS = {
  fur_orange: { main: 0xf59a3c, accent: 0xfff3e0, stripe: 0xd9731f },
  fur_gray: { main: 0x9aa3ad, accent: 0xf4f4f4, stripe: 0x6f7883 },
  fur_black: { main: 0x2f2a2e, accent: 0xffffff, stripe: 0x1d1a1c },
  fur_cream: { main: 0xf6e3c2, accent: 0xffffff, stripe: 0xe2c696 },
  fur_lilac: { main: 0xc6a3e8, accent: 0xfff0ff, stripe: 0x9c78c8 },
};

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.75, ...extra });
const ico = (r, detail = 1) => new THREE.IcosahedronGeometry(r, detail);

function mesh(geo, material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  return m;
}

export class CatModel {
  constructor() {
    this.root = new THREE.Group(); // ayak hizası, yön için döner
    this.pivot = new THREE.Group(); // eğilme/tırmanma için
    this.root.add(this.pivot);

    this.furMat = mat(0xf59a3c);
    this.accentMat = mat(0xfff3e0);
    this.stripeMat = mat(0xd9731f);
    const black = mat(0x1a1a1a, { roughness: 0.3 });
    const white = mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 });
    const pink = mat(0xff8fab);

    // Gövde
    this.body = new THREE.Group();
    this.body.position.y = 0.3;
    this.pivot.add(this.body);
    this.body.add(mesh(ico(0.25), this.furMat, 0, 0, 0, 1, 0.82, 1.4));
    this.body.add(mesh(ico(0.2), this.accentMat, 0, -0.07, 0.08, 0.9, 0.6, 1.1));
    // Sırt çizgileri
    for (let i = 0; i < 3; i++) {
      this.body.add(mesh(new THREE.BoxGeometry(0.36, 0.04, 0.07), this.stripeMat, 0, 0.19, -0.15 + i * 0.13, 1 - i * 0.08, 1, 1));
    }

    // Kafa
    this.head = new THREE.Group();
    this.head.position.set(0, 0.24, 0.27);
    this.body.add(this.head);
    this.head.add(mesh(ico(0.23), this.furMat, 0, 0, 0, 1.08, 0.95, 0.95));
    this.head.add(mesh(ico(0.12), this.accentMat, 0, -0.07, 0.15, 1.15, 0.75, 0.8));
    this.head.add(mesh(ico(0.035, 0), pink, 0, -0.02, 0.24));
    this.mouth = mesh(ico(0.04, 0), mat(0x7a2f3a), 0, -0.1, 0.2, 1, 0.1, 0.6);
    this.head.add(this.mouth);
    // Kulaklar
    const earGeo = new THREE.ConeGeometry(0.085, 0.16, 4);
    const innerGeo = new THREE.ConeGeometry(0.05, 0.1, 4);
    this.ears = [];
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(0.12 * s, 0.17, -0.01);
      ear.rotation.z = -0.3 * s;
      ear.add(mesh(earGeo, this.furMat, 0, 0.06, 0));
      ear.add(mesh(innerGeo, pink, 0, 0.05, 0.025));
      this.head.add(ear);
      this.ears.push(ear);
    }
    // Gözler
    this.eyes = [];
    for (const s of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(0.09 * s, 0.03, 0.19);
      eye.add(mesh(ico(0.055), black, 0, 0, 0, 1, 1.15, 0.6));
      eye.add(mesh(ico(0.018, 0), white, 0.015, 0.025, 0.03));
      this.head.add(eye);
      this.eyes.push(eye);
    }
    // Bıyıklar
    const whiskerMat = new THREE.MeshBasicMaterial({ color: 0x5b4636 });
    for (const s of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.006, 0.006), whiskerMat);
        w.position.set(0.13 * s, -0.05 - k * 0.025, 0.17);
        w.rotation.z = (k ? -0.12 : 0.1) * s;
        this.head.add(w);
      }
    }

    // Bacaklar
    this.legs = [];
    const legGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.2, 6);
    const pawGeo = ico(0.062, 0);
    const legPos = [[-0.12, 0.2], [0.12, 0.2], [-0.12, -0.2], [0.12, -0.2]];
    for (const [x, z] of legPos) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.2, z);
      leg.add(mesh(legGeo, this.furMat, 0, -0.1, 0));
      leg.add(mesh(pawGeo, this.accentMat, 0, -0.19, 0.015, 1, 0.6, 1.2));
      this.pivot.add(leg);
      this.legs.push(leg);
    }

    // Kuyruk (iç içe eklemler)
    this.tail = [];
    let parent = this.body;
    const segGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.14, 6);
    for (let i = 0; i < 5; i++) {
      const j = new THREE.Group();
      if (i === 0) { j.position.set(0, 0.06, -0.32); j.rotation.x = -0.9; }
      else j.position.set(0, 0.13, 0);
      const seg = mesh(segGeo, i === 4 ? this.stripeMat : this.furMat, 0, 0.065, 0, 1 - i * 0.08, 1, 1 - i * 0.08);
      j.add(seg);
      parent.add(j);
      this.tail.push(j);
      parent = j;
    }

    // Kıyafet yuvaları
    this.slots = {
      hat: new THREE.Group(), glasses: new THREE.Group(), scarf: new THREE.Group(), special: new THREE.Group(),
    };
    this.slots.hat.position.set(0, 0.19, -0.02);
    this.head.add(this.slots.hat);
    this.slots.glasses.position.set(0, 0.03, 0.2);
    this.head.add(this.slots.glasses);
    this.slots.scarf.position.set(0, 0.14, 0.2);
    this.body.add(this.slots.scarf);
    this.slots.special.position.set(0, 0, 0);
    this.body.add(this.slots.special);

    this.t = 0;
    this.blinkT = 2;
    this.meowT = 0;
    this.pawT = 0;
    this.squash = 0;
    this.cape = null;
  }

  setFur(id) {
    const f = FURS[id] || FURS.fur_orange;
    this.furMat.color.setHex(f.main);
    this.accentMat.color.setHex(f.accent);
    this.stripeMat.color.setHex(f.stripe);
  }

  setEquipped(eq) {
    this.setFur(eq.fur);
    for (const slot of ['hat', 'glasses', 'scarf', 'special']) {
      const g = this.slots[slot];
      while (g.children.length) g.remove(g.children[0]);
      if (eq[slot]) {
        const acc = buildAccessory(eq[slot]);
        if (acc) g.add(acc);
      }
    }
    this.cape = this.slots.special.children[0] || null;
  }

  meow() { this.meowT = 0.5; }
  paw() { this.pawT = 0.3; }
  land(strength) { this.squash = Math.min(0.35, strength); }

  // s: { speed, grounded, vy, gliding, climbing, climbSpeed }
  update(dt, s) {
    this.t += dt;
    const t = this.t;
    const run = Math.min(1, s.speed / 6);
    const cycle = t * (8 + run * 8);

    // Bacaklar
    this.legs.forEach((leg, i) => {
      const phase = i === 0 || i === 3 ? 0 : Math.PI;
      let target = 0;
      if (s.climbing) target = Math.sin(t * 14 + phase) * 0.8 * Math.min(1, Math.abs(s.climbSpeed) + 0.2);
      else if (!s.grounded) target = s.gliding ? (i < 2 ? -1.1 : 1.1) : (i < 2 ? -0.6 : 0.7);
      else target = Math.sin(cycle + phase) * 0.9 * run;
      leg.rotation.x += (target - leg.rotation.x) * Math.min(1, dt * 20);
    });

    // Pati: ön sağ bacak hızla öne savrulur
    this.pawT = Math.max(0, this.pawT - dt);
    const pk = this.pawT > 0 ? Math.sin((1 - this.pawT / 0.3) * Math.PI) : 0;
    if (pk > 0) {
      this.legs[1].rotation.x = -2.2 * pk;
      this.legs[1].position.y = 0.2 + 0.15 * pk;
    } else {
      this.legs[1].position.y = 0.2;
    }

    // Gövde zıplaması ve ezilme
    this.squash *= Math.exp(-dt * 10);
    const bob = s.grounded ? Math.abs(Math.sin(cycle)) * 0.04 * run : 0;
    this.body.position.y = 0.3 + bob - this.squash * 0.15;
    const stretch = s.grounded ? 1 : 1 + Math.max(-0.1, Math.min(0.12, s.vy * 0.012));
    this.pivot.scale.set(1 + this.squash * 0.5, (1 - this.squash) * stretch, 1 + this.squash * 0.3);

    // Tırmanma / süzülme eğimi
    let pitch = 0;
    if (s.climbing) pitch = -1.2;
    else if (!s.grounded && !s.gliding) pitch = -Math.max(-0.4, Math.min(0.4, s.vy * 0.04));
    else if (s.gliding) pitch = 0.15;
    if (pk > 0) pitch -= 0.25 * pk;
    this.pivot.rotation.x += (pitch - this.pivot.rotation.x) * Math.min(1, dt * 12);
    this.pivot.position.z = s.climbing ? -0.15 : 0;
    this.pivot.position.y = s.climbing ? 0.2 : 0;

    // Kuyruk
    this.tail.forEach((j, i) => {
      if (i === 0) {
        if (s.gliding) {
          j.rotation.x = -1.6;
          j.rotation.y = 0;
          j.rotation.z = 0;
        } else {
          j.rotation.x = -0.9 + Math.sin(t * 2) * 0.1;
          j.rotation.z = Math.sin(t * 3) * 0.3 + Math.sin(cycle) * 0.2 * run;
        }
      } else if (s.gliding) {
        // Pervane gibi dönen kuyruk ucu
        j.rotation.x = i === 1 ? 0 : 0.2;
        j.rotation.y = 0;
        j.rotation.z = 0;
      } else {
        j.rotation.x = 0.25 + Math.sin(t * 3 - i * 0.6) * 0.15;
        j.rotation.z = Math.sin(t * 3 - i * 0.8) * 0.25;
      }
    });
    if (s.gliding) this.tail[1].rotation.y = t * 30;

    // Kulaklar
    this.ears.forEach((e, i) => {
      const s2 = i ? 1 : -1;
      e.rotation.z = -0.3 * s2 + Math.sin(t * 1.3 + i) * 0.05 + (s.gliding ? 0.5 * s2 : 0) - pk * 0.6 * s2;
    });

    // Göz kırpma
    this.blinkT -= dt;
    let eyeY = 1;
    if (this.blinkT < 0) { eyeY = 0.1; if (this.blinkT < -0.12) this.blinkT = 2 + Math.random() * 3; }

    // Miyav
    this.meowT = Math.max(0, this.meowT - dt);
    const m = this.meowT > 0 ? Math.sin((this.meowT / 0.5) * Math.PI) : 0;
    this.mouth.scale.y = 0.1 + m * 1.2;
    this.head.rotation.z = m * 0.2;
    this.head.rotation.x = -m * 0.35 + (s.climbing ? 0.9 : 0);
    if (m > 0) eyeY = 0.3;
    this.eyes.forEach((e) => (e.scale.y = eyeY));

    // Pelerin dalgalanması
    if (this.cape) {
      const target = (s.grounded ? 1.35 + run * 0.25 : 1.7) + Math.sin(t * 10) * 0.08 * (run + 0.4);
      this.cape.rotation.x += (target - this.cape.rotation.x) * Math.min(1, dt * 8);
    }
  }
}

// ---- Kıyafetler ----
export function buildAccessory(id) {
  const g = new THREE.Group();
  switch (id) {
    case 'hat_party': {
      g.add(mesh(new THREE.ConeGeometry(0.12, 0.3, 8), mat(0xff5fa2), 0, 0.15, 0));
      g.add(mesh(ico(0.045, 0), mat(0xfff06a), 0, 0.31, 0));
      for (let i = 0; i < 3; i++) {
        const ring = mesh(new THREE.TorusGeometry(0.1 - i * 0.03, 0.014, 4, 10), mat(0x6ad1ff), 0, 0.05 + i * 0.08, 0);
        ring.rotation.x = Math.PI / 2;
        g.add(ring);
      }
      g.rotation.z = 0.2;
      break;
    }
    case 'hat_top': {
      const black = mat(0x2a2a35);
      g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 12), black, 0, 0.02, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.24, 12), black, 0, 0.15, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.132, 0.132, 0.05, 12), mat(0xe8443a), 0, 0.07, 0));
      g.rotation.z = -0.15;
      break;
    }
    case 'hat_crown': {
      const gold = mat(0xffc23d, { metalness: 0.6, roughness: 0.3, emissive: 0x6b4500, emissiveIntensity: 0.3 });
      g.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 10, 1, true), gold, 0, 0.05, 0));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.add(mesh(new THREE.ConeGeometry(0.04, 0.09, 4), gold, Math.sin(a) * 0.12, 0.13, Math.cos(a) * 0.12));
        g.add(mesh(ico(0.022, 0), mat(i % 2 ? 0xff4d6d : 0x4dc3ff), Math.sin(a) * 0.13, 0.05, Math.cos(a) * 0.13));
      }
      break;
    }
    case 'hat_straw': {
      const straw = mat(0xe8c86a);
      g.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.025, 16), straw, 0, 0.02, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.13, 12), straw, 0, 0.09, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.04, 12), mat(0xff5fa2), 0, 0.05, 0));
      g.add(mesh(ico(0.04, 0), mat(0xffd166), 0.13, 0.07, 0.08));
      g.rotation.z = 0.1;
      break;
    }
    case 'hat_chef': {
      const white = mat(0xffffff);
      g.add(mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.14, 12), white, 0, 0.06, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.03, 12), mat(0xe8574a), 0, 0.02, 0));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.add(mesh(ico(0.09, 1), white, Math.sin(a) * 0.08, 0.2, Math.cos(a) * 0.08));
      }
      g.add(mesh(ico(0.11, 1), white, 0, 0.24, 0));
      g.rotation.z = 0.12;
      break;
    }
    case 'scarf_red':
    case 'scarf_blue': {
      const c = id === 'scarf_red' ? 0xe8443a : 0x3f8efc;
      const c2 = id === 'scarf_red' ? 0xffffff : 0xffe066;
      const ring = mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 12), mat(c), 0, 0, -0.04);
      ring.rotation.x = Math.PI / 2 - 0.4;
      g.add(ring);
      const tail = mesh(new THREE.BoxGeometry(0.08, 0.18, 0.03), mat(c), 0.08, -0.1, 0.1);
      tail.rotation.z = 0.3;
      g.add(tail);
      g.add(mesh(new THREE.BoxGeometry(0.081, 0.03, 0.031), mat(c2), 0.095, -0.15, 0.1));
      break;
    }
    case 'glasses_round': {
      const frame = mat(0x6b4226);
      for (const s of [-1, 1]) {
        const r = mesh(new THREE.TorusGeometry(0.065, 0.013, 5, 12), frame, 0.09 * s, 0, 0.02);
        g.add(r);
        g.add(mesh(new THREE.CircleGeometry(0.06, 12), new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.35 }), 0.09 * s, 0, 0.021));
      }
      g.add(mesh(new THREE.BoxGeometry(0.06, 0.012, 0.012), frame, 0, 0.01, 0.02));
      break;
    }
    case 'glasses_swim': {
      for (const s of [-1, 1]) {
        g.add(mesh(new THREE.TorusGeometry(0.06, 0.02, 5, 12), mat(0x3f8efc), 0.085 * s, 0, 0.025));
        g.add(mesh(new THREE.CircleGeometry(0.058, 12), new THREE.MeshStandardMaterial({ color: 0x6ad1ff, transparent: true, opacity: 0.6, roughness: 0.1 }), 0.085 * s, 0, 0.03));
      }
      const strap = mesh(new THREE.TorusGeometry(0.21, 0.018, 4, 20), mat(0x3f8efc), 0, 0, -0.17);
      strap.rotation.x = Math.PI / 2;
      g.add(strap);
      break;
    }
    case 'glasses_sun': {
      const dark = mat(0x111111, { roughness: 0.2, metalness: 0.3 });
      for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.12, 0.08, 0.02), dark, 0.085 * s, 0, 0.025));
      g.add(mesh(new THREE.BoxGeometry(0.3, 0.02, 0.02), dark, 0, 0.035, 0.025));
      break;
    }
    case 'cape_star': {
      const geo = new THREE.PlaneGeometry(0.42, 0.55, 1, 3);
      geo.translate(0, -0.275, 0);
      g.position.set(0, 0.1, 0.13);
      g.rotation.x = 1.35;
      const cloth = mesh(geo, new THREE.MeshStandardMaterial({ color: 0x23306b, side: THREE.DoubleSide, flatShading: true }));
      g.add(cloth);
      for (let i = 0; i < 5; i++) {
        const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), new THREE.MeshBasicMaterial({ color: 0xffd447 }));
        st.position.set(((i * 0.37) % 1 - 0.5) * 0.3, -0.08 - i * 0.09, 0.01);
        g.add(st);
      }
      g.add(mesh(ico(0.04, 0), mat(0xffd447), 0, 0.01, 0.03));
      break;
    }
    case 'cape_red': {
      // Boyundan sırta sarkan pelerin; CatModel.update içinde rotation.x ile dalgalanır
      const geo = new THREE.PlaneGeometry(0.42, 0.55, 1, 3);
      geo.translate(0, -0.275, 0);
      const capeMat = new THREE.MeshStandardMaterial({ color: 0xd62839, side: THREE.DoubleSide, flatShading: true });
      g.position.set(0, 0.1, 0.13);
      g.rotation.x = 1.35;
      g.add(mesh(geo, capeMat));
      g.add(mesh(ico(0.04, 0), mat(0xffc23d), 0, 0.01, 0.03));
      break;
    }
    default:
      return null;
  }
  return g;
}

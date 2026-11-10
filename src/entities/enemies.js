// Şirin, şiddetsiz düşmanlar: üstlerine zıplanınca "puf" diye kaybolurlar.
import * as THREE from 'three';
import { mat } from '../props.js';
import { moveAxis } from '../physics.js';

export function eye(g, x, y, z, angry = 0) {
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(0xffffff));
  white.position.set(x, y, z);
  g.add(white);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mat(0x111111));
  pupil.position.set(x, y, z + 0.07);
  g.add(pupil);
  if (angry) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.03), mat(0x222222));
    brow.position.set(x, y + 0.11, z + 0.06);
    brow.rotation.z = angry * 0.45;
    g.add(brow);
  }
}

export class Enemy {
  constructor(scene, spec) {
    this.spec = spec;
    this.scene = scene;
    this.g = new THREE.Group();
    this.model = new THREE.Group();
    this.g.add(this.model);
    scene.add(this.g);
    this.alive = true;
    this.pos = new THREE.Vector3();
    this.t = Math.random() * 10;
  }
  aabb() {
    const p = this.pos;
    return { minX: p.x - this.hw, maxX: p.x + this.hw, minY: p.y, maxY: p.y + this.h, minZ: p.z - this.hw, maxZ: p.z + this.hw };
  }
  kill() {
    this.alive = false;
    this.scene.remove(this.g);
  }
  // Kediye değince can yakar mı?
  get harmful() { return true; }
  // Pati isabet edince: 'kill' | 'stun' | null
  onPaw() { return 'kill'; }
  finish() {
    this.g.position.copy(this.pos);
    this.g.traverse((o) => (o.castShadow = true));
  }
}

// Kızgın robot süpürge — yol boyunca devriye gezer
class Vacuum extends Enemy {
  constructor(scene, spec) {
    super(scene, spec);
    this.hw = 0.6; this.h = 0.5;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.72, 0.35, 16), mat(0x7a7f8c));
    body.position.y = 0.22;
    this.model.add(body);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.08, 16), mat(0x3a3f4b));
    top.position.y = 0.43;
    this.model.add(top);
    const bumper = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 4, 16, Math.PI), mat(0xff6b6b));
    bumper.rotation.x = Math.PI / 2;
    bumper.position.y = 0.15;
    this.model.add(bumper);
    this.led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
    this.led.position.set(0, 0.48, -0.3);
    this.model.add(this.led);
    eye(this.model, -0.2, 0.35, 0.62, 1);
    eye(this.model, 0.2, 0.35, 0.62, -1);
    this.brush = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.04), mat(0x333333));
      b.rotation.y = (i / 3) * Math.PI * 2;
      b.position.set(Math.sin(b.rotation.y) * 0.15, 0, Math.cos(b.rotation.y) * 0.15);
      this.brush.add(b);
    }
    this.brush.position.set(0.5, 0.03, 0.45);
    this.model.add(this.brush);
    this.path = spec.path.map((p) => new THREE.Vector3(...p));
    this.pos.copy(this.path[0]);
    this.target = 1;
    this.stunT = 0;
    this.stars = dizzyStars();
    this.stars.position.y = 0.8;
    this.g.add(this.stars);
    this.finish();
  }
  get harmful() { return this.stunT <= 0; }
  onPaw() { this.stunT = 1.5; return 'stun'; }
  update(dt, speedK) {
    this.t += dt;
    if (this.stunT > 0) {
      this.stunT -= dt;
      this.stars.visible = this.stunT > 0;
      this.stars.rotation.y += dt * 6;
      this.model.rotation.z = Math.sin(this.t * 14) * 0.08;
      this.led.material.color.setHex(0x333333);
      return;
    }
    this.model.rotation.z = 0;
    const tgt = this.path[this.target];
    const d = tgt.clone().sub(this.pos);
    d.y = 0;
    const len = d.length();
    const step = this.spec.speed * speedK * dt;
    if (len <= step) {
      this.pos.x = tgt.x; this.pos.z = tgt.z;
      this.target = (this.target + 1) % this.path.length;
    } else {
      d.multiplyScalar(step / len);
      this.pos.add(d);
      const yaw = Math.atan2(d.x, d.z);
      let diff = yaw - this.g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.g.rotation.y += diff * Math.min(1, dt * 8);
    }
    this.g.position.copy(this.pos);
    this.model.position.y = Math.abs(Math.sin(this.t * 12)) * 0.03;
    this.brush.rotation.y += dt * 20;
    this.led.material.color.setHex(Math.sin(this.t * 6) > 0 ? 0xff3b3b : 0x7a1010);
  }
}

// Fare gövdesi (oyuncak fare ve gezen fare ortak kullanır). Kurma anahtarını döndürür.
export function buildMouse(model, color, angry) {
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), mat(color));
  body.scale.set(0.9, 0.75, 1.3);
  body.position.y = 0.22;
  model.add(body);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 10), mat(0xffb3c6));
    ear.rotation.x = Math.PI / 2;
    ear.position.set(0.14 * s, 0.45, 0.18);
    model.add(ear);
  }
  eye(model, -0.09, 0.32, 0.33, angry ? 1 : 0);
  eye(model, 0.09, 0.32, 0.33, angry ? -1 : 0);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mat(0xff6b9a));
  nose.position.set(0, 0.22, 0.42);
  model.add(nose);
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 4, 10, Math.PI * 1.3), mat(0xffb3c6));
  tail.position.set(0, 0.2, -0.45);
  tail.rotation.y = Math.PI / 2;
  model.add(tail);
  const key = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 5), mat(0xffc23d));
  shaft.position.y = 0.1;
  key.add(shaft);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 4, 8), mat(0xffc23d));
    w.position.set(0.08 * s, 0.22, 0);
    key.add(w);
  }
  key.position.set(0, 0.4, -0.1);
  model.add(key);
  return key;
}

// Ünlem balonu dokusu (gezen fare saldırmadan önce gösterir)
let alertTex = null;
export function alertSprite() {
  if (!alertTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#ff4d4d';
    x.beginPath(); x.arc(32, 32, 28, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 4; x.stroke();
    x.fillStyle = '#fff';
    x.font = 'bold 44px sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('!', 32, 34);
    alertTex = new THREE.CanvasTexture(c);
    alertTex.colorSpace = THREE.SRGBColorSpace;
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: alertTex, depthTest: false }));
  sp.scale.setScalar(0.5);
  sp.renderOrder = 5;
  return sp;
}

// Genel konuşma balonu (emoji/yazı). Aynı metin için doku paylaşılır.
const bubbleTex = new Map();
export function bubbleSprite(text, bg = '#ffffff', scale = 0.7) {
  const key = text + bg;
  if (!bubbleTex.has(key)) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 96;
    const x = c.getContext('2d');
    x.fillStyle = bg;
    x.beginPath(); x.ellipse(64, 42, 58, 38, 0, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.moveTo(52, 74); x.lineTo(64, 94); x.lineTo(72, 72); x.fill();
    x.strokeStyle = 'rgba(74,52,38,0.35)'; x.lineWidth = 3;
    x.beginPath(); x.ellipse(64, 42, 58, 38, 0, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#4a3426';
    x.font = 'bold 44px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 64, 44);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    bubbleTex.set(key, t);
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex.get(key), depthTest: false }));
  sp.scale.set(scale * 1.33, scale, 1);
  sp.renderOrder = 5;
  return sp;
}

// Sersemleme yıldızları
export function dizzyStars() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
    const a = (i / 3) * Math.PI * 2;
    st.position.set(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35);
    g.add(st);
  }
  g.visible = false;
  return g;
}

// Zıplayan kurmalı oyuncak fare — iki nokta arasında hoplar
class ToyMouse extends Enemy {
  constructor(scene, spec) {
    super(scene, spec);
    this.hw = 0.32; this.h = 0.45;
    this.key = buildMouse(this.model, 0xb9c0cc, false);
    this.a = new THREE.Vector3(...spec.path[0]);
    this.b = new THREE.Vector3(...spec.path[1]);
    this.base = this.a.y;
    this.pos.copy(this.a);
    this.finish();
  }
  update(dt, speedK) {
    this.t += dt * speedK;
    const u = (Math.sin(this.t * this.spec.speed) + 1) / 2;
    const prevX = this.pos.x, prevZ = this.pos.z;
    this.pos.lerpVectors(this.a, this.b, u);
    this.pos.y = this.base + Math.abs(Math.sin(this.t * 5)) * 0.5;
    const dx = this.pos.x - prevX, dz = this.pos.z - prevZ;
    if (Math.abs(dx) + Math.abs(dz) > 1e-5) this.g.rotation.y = Math.atan2(dx, dz);
    this.g.position.copy(this.pos);
    this.key.rotation.z = this.t * 6;
    this.model.rotation.z = Math.sin(this.t * 10) * 0.08;
  }
}

// Huysuz örümcek — tavandan iple iner çıkar
class Spider extends Enemy {
  constructor(scene, spec) {
    super(scene, spec);
    this.hw = 0.38; this.h = 0.55;
    const black = mat(0x3b2e4a);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), black);
    body.position.y = 0.3;
    this.model.add(body);
    eye(this.model, -0.11, 0.38, 0.26, -1);
    eye(this.model, 0.11, 0.38, 0.26, 1);
    this.legs = [];
    for (let i = 0; i < 4; i++) {
      for (const s of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 4), black);
        leg.geometry.translate(0, -0.22, 0);
        leg.position.set(0.22 * s, 0.32, -0.15 + i * 0.1);
        leg.rotation.z = s * 1.0;
        this.model.add(leg);
        this.legs.push({ leg, s, i });
      }
    }
    this.thread = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.g.add(this.thread);
    this.pos.set(spec.p[0], spec.maxY, spec.p[2]);
    this.ceiling = 12;
    this.finish();
  }
  update(dt, speedK) {
    this.t += dt * speedK;
    const u = (Math.sin(this.t * this.spec.speed) + 1) / 2;
    this.pos.y = this.spec.minY + (this.spec.maxY - this.spec.minY) * u;
    this.g.position.copy(this.pos);
    const len = this.ceiling - this.pos.y - 0.5;
    this.thread.scale.y = len;
    this.thread.position.y = 0.55 + len / 2;
    this.g.rotation.y = Math.sin(this.t * 0.7) * 0.6;
    for (const { leg, s, i } of this.legs) leg.rotation.z = s * (1.0 + Math.sin(this.t * 8 + i) * 0.2);
  }
}

// Yerde gezen, kediyi görünce kovalayan ve uyarıp atılan fare
class Roamer extends Enemy {
  constructor(scene, spec, world) {
    super(scene, spec);
    this.world = world;
    this.hw = 0.3; this.h = 0.45;
    this.key = buildMouse(this.model, 0x8a8f9c, true);
    this.alert = alertSprite();
    this.alert.position.y = 0.95;
    this.alert.visible = false;
    this.g.add(this.alert);
    const [x0, z0, x1, z1] = spec.area;
    this.area = { x0, z0, x1, z1 };
    this.pos.set((x0 + x1) / 2, spec.y || 0, (z0 + z1) / 2);
    this.state = 'wander';
    this.stateT = 0;
    this.goal = this.randomGoal();
    this.dir = new THREE.Vector3(0, 0, 1);
    this.finish();
  }
  get harmful() { return this.state === 'lunge'; }
  randomGoal() {
    const a = this.area;
    return new THREE.Vector3(a.x0 + Math.random() * (a.x1 - a.x0), this.pos.y, a.z0 + Math.random() * (a.z1 - a.z0));
  }
  // Kediye çarptıktan sonra geri çekil
  hitPlayer() { this.state = 'retreat'; this.stateT = 1; this.alert.visible = false; }
  step(dx, dz) {
    const a = this.area, m = 1.5;
    moveAxis(this.world, this, 'x', dx, false);
    moveAxis(this.world, this, 'z', dz, false);
    this.pos.x = Math.min(a.x1 + m, Math.max(a.x0 - m, this.pos.x));
    this.pos.z = Math.min(a.z1 + m, Math.max(a.z0 - m, this.pos.z));
    if (Math.abs(dx) + Math.abs(dz) > 1e-5) {
      const yaw = Math.atan2(dx, dz);
      let diff = Math.atan2(Math.sin(yaw - this.g.rotation.y), Math.cos(yaw - this.g.rotation.y));
      this.g.rotation.y += diff * Math.min(1, 0.25);
    }
  }
  update(dt, speedK, player) {
    this.t += dt;
    this.stateT -= dt;
    const p = player.pos;
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const sees = dist < 5 && Math.abs(p.y - this.pos.y) < 1 && !player.climbing;
    let speed = 0, mx = 0, mz = 0;

    switch (this.state) {
      case 'wander': {
        const gx = this.goal.x - this.pos.x, gz = this.goal.z - this.pos.z;
        const gl = Math.hypot(gx, gz);
        if (gl < 0.3 || this.stateT < -4) { this.goal = this.randomGoal(); this.stateT = 0; }
        else { mx = gx / gl; mz = gz / gl; speed = 1.2; }
        if (sees) { this.state = 'chase'; this.events?.squeak(); }
        break;
      }
      case 'chase':
        if (!sees) { this.state = 'wander'; this.stateT = 0; break; }
        if (dist < 1.3) {
          this.state = 'windup'; this.stateT = 0.5;
          this.dir.set(dx / dist, 0, dz / dist);
          this.alert.visible = true;
          this.events?.alert();
          break;
        }
        mx = dx / dist; mz = dz / dist; speed = 2.6 * speedK;
        break;
      case 'windup':
        // Şahlan: kediye dön, yerinde titre
        if (dist > 0.01) this.g.rotation.y = Math.atan2(dx, dz);
        this.model.rotation.x = -0.5;
        if (this.stateT <= 0) {
          if (dist > 0.01) this.dir.set(dx / dist, 0, dz / dist);
          this.state = 'lunge'; this.stateT = 0.3;
        }
        break;
      case 'lunge':
        mx = this.dir.x; mz = this.dir.z; speed = 7 * speedK;
        if (this.stateT <= 0) { this.state = 'retreat'; this.stateT = 1; this.alert.visible = false; }
        break;
      case 'retreat':
        if (dist > 0.01) { mx = -dx / dist; mz = -dz / dist; speed = 1.8; }
        if (this.stateT <= 0) { this.state = 'wander'; this.stateT = 0; this.alert.visible = false; }
        break;
    }
    if (this.state !== 'windup') this.model.rotation.x += (0 - this.model.rotation.x) * Math.min(1, dt * 10);
    if (speed > 0) this.step(mx * speed * dt, mz * speed * dt);
    this.g.position.copy(this.pos);
    const hop = this.state === 'windup' ? Math.abs(Math.sin(this.t * 30)) * 0.05 : Math.abs(Math.sin(this.t * (speed > 2 ? 18 : 10))) * 0.06 * Math.min(1, speed);
    this.model.position.y = hop;
    this.key.rotation.z = this.t * (speed > 2 ? 12 : 5);
    this.alert.position.y = 0.95 + Math.sin(this.t * 12) * 0.05;
  }
}

// Kayan sabun — köpüğün üstünde vınlayarak gidip gelir, arkasında kabarcık bırakır
class Soap extends Enemy {
  constructor(scene, spec) {
    super(scene, spec);
    this.hw = 0.4; this.h = 0.4;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 6), mat(spec.c || 0xff9db8));
    body.scale.set(1, 0.45, 0.7);
    body.position.y = 0.2;
    this.model.add(body);
    const label = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 4), mat(0xffffff));
    label.scale.set(1, 0.2, 0.6);
    label.position.y = 0.36;
    this.model.add(label);
    eye(this.model, -0.12, 0.3, 0.24, 1);
    eye(this.model, 0.12, 0.3, 0.24, -1);
    this.a = new THREE.Vector3(...spec.path[0]);
    this.b = new THREE.Vector3(...spec.path[1]);
    this.pos.copy(this.a);
    this.model.rotation.y = Math.PI / 2;
    this.finish();
  }
  update(dt, speedK) {
    this.t += dt * speedK;
    const u = (Math.sin(this.t * this.spec.speed) + 1) / 2;
    const prevX = this.pos.x, prevZ = this.pos.z;
    this.pos.lerpVectors(this.a, this.b, u);
    const dx = this.pos.x - prevX, dz = this.pos.z - prevZ;
    if (Math.abs(dx) + Math.abs(dz) > 1e-5) this.g.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
    this.g.position.copy(this.pos);
    this.model.rotation.z = Math.sin(this.t * 8) * 0.1;
  }
}

// Uyuyan köpek Boncuk: uyur (Zzz) → kıpırdar (❓) → bakar (👀). Bakarken bahçesinde koşan/zıplayan
// kediye havlar ve onu geri iter. Can yakmaz, yenilmez.
class Dog extends Enemy {
  constructor(scene, spec, world) {
    super(scene, spec);
    this.passive = true;
    this.hw = 1.2; this.h = 1.3;
    const fur = mat(0xe8c48a), dark = mat(0xa8723a), white = mat(0xfff3e0);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), fur);
    body.scale.set(0.8, 0.55, 1.35);
    body.position.y = 0.5;
    this.model.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 6), white);
    belly.scale.set(0.75, 0.4, 1.1);
    belly.position.set(0, 0.35, 0.1);
    this.model.add(belly);
    this.head = new THREE.Group();
    this.head.position.set(0, 0.55, 1.15);
    this.model.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), fur);
    this.head.add(skull);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 6), white);
    snout.scale.set(1, 0.75, 1);
    snout.position.set(0, -0.12, 0.45);
    this.head.add(snout);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(0x2b1d14));
    nose.position.set(0, -0.02, 0.72);
    this.head.add(nose);
    this.ears = [];
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(0.42 * s, 0.25, 0);
      const flap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), dark);
      flap.scale.set(0.45, 1.1, 0.8);
      flap.position.y = -0.25;
      ear.add(flap);
      ear.rotation.z = 0.3 * s;
      this.head.add(ear);
      this.ears.push(ear);
    }
    // Açık gözler ve kapalı göz çizgileri
    this.openEyes = new THREE.Group();
    this.closedEyes = new THREE.Group();
    for (const s of [-1, 1]) {
      eye(this.openEyes, 0.2 * s, 0.12, 0.42);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.03), mat(0x2b1d14));
      lid.position.set(0.2 * s, 0.1, 0.5);
      this.closedEyes.add(lid);
    }
    this.head.add(this.openEyes, this.closedEyes);
    for (const [x, z] of [[-0.45, 0.85], [0.45, 0.85], [-0.45, -0.8], [0.45, -0.8]]) {
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), white);
      paw.scale.set(1, 0.6, 1.4);
      paw.position.set(x, 0.1, z);
      this.model.add(paw);
    }
    this.tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.7, 6), fur);
    this.tail.geometry.translate(0, 0.35, 0);
    this.tail.position.set(0, 0.6, -1.15);
    this.tail.rotation.x = -1.1;
    this.model.add(this.tail);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 6, 14), mat(0xe8443a));
    collar.position.set(0, 0.5, 0.75);
    collar.rotation.x = 1.3;
    this.model.add(collar);

    this.bubbles = { sleep: bubbleSprite('💤'), stir: bubbleSprite('❓', '#fff6c8'), look: bubbleSprite('👀', '#ffe1ec') };
    for (const b of Object.values(this.bubbles)) { b.position.set(0.6, 2.0, 1.0); b.visible = false; this.g.add(b); }

    this.pos.set(...spec.p);
    this.g.rotation.y = spec.yaw || 0;
    const [x0, z0, x1, z1] = spec.area;
    this.area = { x0, z0, x1, z1 };
    this.state = 'sleep';
    this.stateT = spec.sleep || 4;
    this.box = world.add({ minX: this.pos.x - 0.8, maxX: this.pos.x + 0.8, minY: 0, maxY: 1.0, minZ: this.pos.z - 1.4, maxZ: this.pos.z + 1.6, kind: 'dog' });
    this.finish();
  }
  get harmful() { return false; }
  onPaw() { return null; }
  get watching() { return this.state === 'look' && this.lookT > 0.25; }
  inArea(p) { const a = this.area; return p.x > a.x0 && p.x < a.x1 && p.z > a.z0 && p.z < a.z1 && p.y < 2; }
  enter(s, t) { this.state = s; this.stateT = t; this.lookT = 0; }
  // Havladıktan sonra hemen uykuya döner (art arda havlamaz)
  barked() { this.enter('sleep', this.sleepTime); this.barkT = 0.6; }
  update(dt, speedK) {
    this.t += dt;
    this.stateT -= dt;
    this.lookT += dt;
    const helper = speedK < 1;
    this.sleepTime = helper ? 6 : (this.spec.sleep || 4);
    if (this.stateT <= 0) {
      if (this.state === 'sleep') { this.enter('stir', 0.8); this.events?.stir?.(); }
      else if (this.state === 'stir') this.enter('look', helper ? 1.0 : 1.6);
      else this.enter('sleep', this.sleepTime);
    }
    const awake = this.state !== 'sleep';
    this.openEyes.visible = this.state === 'look';
    this.closedEyes.visible = !this.openEyes.visible;
    for (const [k, b] of Object.entries(this.bubbles)) b.visible = k === this.state;
    this.bubbles.sleep.position.y = 2.0 + Math.sin(this.t * 2) * 0.1;
    const headUp = this.state === 'look' ? 0.4 : this.state === 'stir' ? 0.15 : -0.1;
    this.head.position.y += (0.55 + headUp - this.head.position.y) * Math.min(1, dt * 8);
    this.head.rotation.y = this.state === 'look' ? Math.sin(this.t * 1.5) * 0.4 : 0;
    this.ears[0].rotation.z = this.state === 'stir' ? -0.9 : -0.3;
    this.ears[1].rotation.z = this.state === 'look' ? 0.9 : 0.3;
    this.model.scale.y = 1 + (this.state === 'sleep' ? Math.sin(this.t * 2) * 0.03 : 0);
    this.barkT = Math.max(0, (this.barkT || 0) - dt);
    this.head.position.z = 1.15 + (this.barkT > 0 ? Math.sin(this.barkT * 30) * 0.1 : 0);
    this.tail.rotation.z = awake ? Math.sin(this.t * 12) * 0.5 : 0;
  }
}

// Baykuş — iki nokta arasında kanat çırparak süzülür (gece çatısı)
class Owl extends Enemy {
  constructor(scene, spec) {
    super(scene, spec);
    this.hw = 0.45; this.h = 0.7;
    const brown = mat(0x8a6a5a), cream = mat(0xf4e3c8);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), brown);
    body.scale.set(1, 1.15, 0.9);
    body.position.y = 0.4;
    this.model.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), cream);
    belly.position.set(0, 0.32, 0.2);
    belly.scale.set(1, 1.1, 0.6);
    this.model.add(belly);
    for (const s of [-1, 1]) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.15, 10), cream);
      disc.position.set(0.15 * s, 0.6, 0.36);
      this.model.add(disc);
      const ey = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd447 }));
      ey.position.set(0.15 * s, 0.6, 0.38);
      this.model.add(ey);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), mat(0x111111));
      pu.position.set(0.15 * s, 0.6, 0.45);
      this.model.add(pu);
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 4), brown);
      tuft.position.set(0.22 * s, 0.9, 0.05);
      tuft.rotation.z = -0.4 * s;
      this.model.add(tuft);
    }
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), mat(0xffa94d));
    beak.position.set(0, 0.5, 0.42);
    beak.rotation.x = Math.PI / 2 + 0.4;
    this.model.add(beak);
    this.wings = [-1, 1].map((s) => {
      const w = new THREE.Group();
      w.position.set(0.38 * s, 0.5, 0);
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), brown);
      f.scale.set(1.3, 0.25, 0.7);
      f.position.x = 0.3 * s;
      w.add(f);
      this.model.add(w);
      return { w, s };
    });
    this.a = new THREE.Vector3(...spec.path[0]);
    this.b = new THREE.Vector3(...spec.path[1]);
    this.pos.copy(this.a);
    this.finish();
  }
  update(dt, speedK) {
    this.t += dt * speedK;
    const u = (Math.sin(this.t * this.spec.speed) + 1) / 2;
    const px = this.pos.x, pz = this.pos.z;
    this.pos.lerpVectors(this.a, this.b, u);
    this.pos.y += Math.sin(u * Math.PI) * 0.8;
    const dx = this.pos.x - px, dz = this.pos.z - pz;
    if (Math.abs(dx) + Math.abs(dz) > 1e-5) this.g.rotation.y = Math.atan2(dx, dz);
    this.g.position.copy(this.pos);
    for (const { w, s } of this.wings) w.rotation.z = Math.sin(this.t * 12) * 0.7 * s;
  }
}

export function createEnemy(scene, spec, world) {
  if (spec.type === 'owl') return new Owl(scene, spec);
  if (spec.type === 'dog') return new Dog(scene, spec, world);
  if (spec.type === 'soap') return new Soap(scene, spec);
  if (spec.type === 'roamer') return new Roamer(scene, spec, world);
  if (spec.type === 'vacuum') return new Vacuum(scene, spec);
  if (spec.type === 'mouse') return new ToyMouse(scene, spec);
  if (spec.type === 'spider') return new Spider(scene, spec);
  return null;
}

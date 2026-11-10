// JSON'dan oda kurar: kutular (fizik + görsel), hareketli platformlar, su, dekor, toplanabilirler, düşmanlar.
import * as THREE from 'three';
import { World } from './physics.js';
import { boxMesh, decorateBox, buildProp, plankTexture, stripeTexture, checkerTexture, tileTexture, mat } from './props.js';
import { KibbleField, expandKibble, Pickup } from './entities/collectibles.js';
import { Checkpoint, CatDoor, ChallengePad } from './entities/checkpoint.js';
import { createEnemy } from './entities/enemies.js';
import { createBoss } from './entities/bosses.js';
import { Switch } from './entities/switches.js';

const HELPER_WIDEN = 1.3;

function makeBox(spec) {
  const [x, y, z] = spec.p;
  const [w, h, d] = spec.s;
  return {
    minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2,
    climbable: spec.t === 'climb',
    bouncy: spec.t === 'bouncy',
    kind: spec.t || 'solid',
    group: spec.g || null,
    widen: !!spec.w,
    cx: x, cz: z, w, d,
  };
}

export class Level {
  constructor(data, scene, saveData, helper) {
    this.data = data;
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.world = new World();
    this.widenables = [];
    this.movers = [];
    this.water = [];
    this.bobbers = [];
    this.groups = new Map();
    this.pops = [];
    this.t = 0;

    this.buildRoom();

    for (const spec of data.boxes) this.addBox(spec);

    for (const spec of data.movers || []) {
      const box = this.addBox({ ...spec, p: spec.from });
      this.movers.push({ box, from: new THREE.Vector3(...spec.from), to: new THREE.Vector3(...spec.to), speed: spec.speed, u: spec.u0 || 0, dir: 1, wait: spec.wait || 0, waitT: 0 });
    }

    for (const spec of data.water || []) {
      const b = makeBox(spec);
      b.solid = false;
      this.water.push(b);
      const m = new THREE.Mesh(new THREE.BoxGeometry(...spec.s), new THREE.MeshStandardMaterial({ color: 0x6fc3f2, transparent: true, opacity: 0.75, roughness: 0.1, metalness: 0.1 }));
      m.position.set(...spec.p);
      m.receiveShadow = true;
      this.waterMesh = m;
      this.root.add(m);
    }

    for (const spec of data.props || []) {
      const g = buildProp(spec);
      this.root.add(g);
      if (g.userData.bob) this.bobbers.push(g);
      if (g.userData.clockHand) this.clockHand = g.userData.clockHand;
    }

    this.kibble = new KibbleField(this.root, expandKibble(data.kibble || []));
    this.bones = data.bones.map((p, i) => new Pickup(this.root, 'bone', p, i, saveData.bones[i]));
    this.bell = new Pickup(this.root, 'bell', data.bell, 0, false, !!data.bellHidden);
    this.door = new CatDoor(this.root, data.door);
    this.checkpoints = data.checkpoints.map((p) => new Checkpoint(this.root, p));
    this.enemies = data.enemies.map((e) => createEnemy(this.root, e, this.world)).filter(Boolean);
    this.enemies.forEach((e) => { if (e.ceiling !== undefined) e.ceiling = data.room.height; });

    // Anahtarlar ve çok anahtarlı bulmacalar
    this.switches = (data.switches || []).map((sp) => new Switch(this.root, sp, this.world));
    this.puzzles = (data.puzzles || []).map((pz) => ({ ...pz, done: false }));

    // Oda patronu
    this.boss = data.boss ? createBoss(this.root, data.boss, this.world) : null;

    if (data.challenge) this.buildChallenge(data.challenge);

    this.setHelper(helper);
  }

  buildRoom() {
    const { room, theme } = this.data;
    const W = room.maxX - room.minX, D = room.maxZ - room.minZ, H = room.height;
    const cx = (room.minX + room.maxX) / 2, cz = (room.minZ + room.maxZ) / 2;
    const T = 1;

    const floorTex = theme.floorTex === 'checker' ? checkerTexture(theme.floor, theme.floorLine) : plankTexture(theme.floor, theme.floorLine);
    floorTex.repeat.set(W / 4, D / 4);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W + 2, T, D + 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 }));
    floor.position.set(cx, -T / 2, cz);
    floor.receiveShadow = true;
    this.root.add(floor);
    this.world.add({ minX: room.minX - 1, maxX: room.maxX + 1, minY: -T, maxY: 0, minZ: room.minZ - 1, maxZ: room.maxZ + 1, kind: 'floor' });

    const wallTex = theme.wallTex === 'tile' ? tileTexture : stripeTexture;
    const wallTexA = wallTex(theme.wall, theme.wallStripe);
    wallTexA.repeat.set(D / 3, theme.wallTex === 'tile' ? H / 3 : 1);
    const wallTexB = wallTex(theme.wall, theme.wallStripe);
    wallTexB.repeat.set(W / 3, theme.wallTex === 'tile' ? H / 3 : 1);
    const wallMatA = new THREE.MeshStandardMaterial({ map: wallTexA, roughness: 0.9 });
    const wallMatB = new THREE.MeshStandardMaterial({ map: wallTexB, roughness: 0.9 });
    const walls = [
      [room.minX - T / 2, H / 2, cz, T, H, D + 2 * T, wallMatA],
      [room.maxX + T / 2, H / 2, cz, T, H, D + 2 * T, wallMatA],
      [cx, H / 2, room.minZ - T / 2, W, H, T, wallMatB],
      [cx, H / 2, room.maxZ + T / 2, W, H, T, wallMatB],
    ];
    for (const [x, y, z, w, h, d, m] of walls) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      this.root.add(mesh);
      this.world.add({ minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2 - 1, maxY: y + h / 2 + 1, minZ: z - d / 2, maxZ: z + d / 2, kind: 'wall' });
      // Süpürgelik
      const bw = w === T ? 0.12 : w, bd = d === T ? 0.12 : d;
      const base = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.5, bd), mat(0xffffff));
      const inset = 0.5 + 0.06;
      base.position.set(
        w === T ? x + (x < cx ? inset : -inset) : x,
        0.25,
        d === T ? z + (z < cz ? inset : -inset) : z,
      );
      this.root.add(base);
    }
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(W + 2, T, D + 2), mat(theme.ceiling));
    ceil.position.set(cx, H + T / 2, cz);
    this.root.add(ceil);
    this.world.add({ minX: room.minX - 1, maxX: room.maxX + 1, minY: H, maxY: H + T, minZ: room.minZ - 1, maxZ: room.maxZ + 1, kind: 'ceiling' });
  }

  addBox(spec) {
    const box = this.world.add(makeBox(spec));
    const mesh = boxMesh(spec.s, spec.c || '#cccccc', spec.r || 0.05);
    mesh.position.set(...spec.p);
    if (spec.look) decorateBox(mesh, spec.look, spec.s, spec.c);
    if (box.climbable && !spec.look) {
      // Tırmanılabilir yüzeylere pati izi deseni
      const [w, h, d] = spec.s;
      const n = Math.floor(h / 1.2);
      for (let i = 0; i < n; i++) {
        const dot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
        dot.position.set(((i % 2) - 0.5) * 0.4, -h / 2 + 0.6 + i * 1.2, -d / 2 - 0.01);
        dot.rotation.y = Math.PI;
        mesh.add(dot);
      }
    }
    this.root.add(mesh);
    box.mesh = mesh;
    if (box.widen) this.widenables.push(box);
    if (spec.g) {
      if (!this.groups.has(spec.g)) this.groups.set(spec.g, { on: !spec.off, boxes: [] });
      this.groups.get(spec.g).boxes.push(box);
      if (spec.off) { box.active = false; mesh.visible = false; }
    }
    return box;
  }

  // Bir grubu aç/kapa (çekmeceler, tabak köprüsü, kapılar...). Beliren kutuların merkezlerini döndürür.
  setGroup(id, on) {
    const g = this.groups.get(id);
    if (!g || g.on === on) return [];
    g.on = on;
    const pts = [];
    g.boxes.forEach((b, i) => {
      b.active = on;
      if (on) {
        b.mesh.visible = true;
        b.mesh.scale.setScalar(0.01);
        this.pops.push({ mesh: b.mesh, t: -i * 0.12 });
        pts.push({ x: b.mesh.position.x, y: b.maxY, z: b.mesh.position.z });
      } else {
        b.mesh.visible = false;
      }
    });
    return pts;
  }

  groupOn(id) { return !!this.groups.get(id)?.on; }

  buildChallenge(ch) {
    this.challenge = { type: 'race', ...ch, boxes: [], running: false, time: 0, got: 0 };
    this.challengePad = new ChallengePad(this.root, ch.start);
    if (ch.items) {
      // "Mama Yağmuru": yalnızca parkur sürerken görünen mor mamalar
      this.challengeKibble = new KibbleField(this.root, expandKibble(ch.items), 0xc78bff);
      this.challengeKibble.mesh.visible = false;
    }
    const ghost = new THREE.MeshStandardMaterial({ color: 0xc78bff, emissive: 0x7a3fc4, emissiveIntensity: 0.6, transparent: true, opacity: 0.35, flatShading: true });
    for (const spec of ch.platforms || []) {
      const box = this.world.add({ ...makeBox(spec), kind: 'challenge' });
      box.active = false;
      const m = boxMesh(spec.s, '#c78bff', 0.08);
      m.material = ghost.clone();
      m.position.set(...spec.p);
      this.root.add(m);
      box.mesh = m;
      this.challenge.boxes.push(box);
    }
    if (!ch.goal) { this.setChallengeActive(false); return; }
    // Bitiş bayrağı
    const flag = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), mat(0xffffff));
    pole.position.y = 1;
    flag.add(pole);
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.6, 0.9), mat(0xb56fd6));
    cloth.position.set(0, 1.65, 0.45);
    flag.add(cloth);
    flag.position.set(ch.goal[0] + 0.8, ch.goal[1] - 0.15, ch.goal[2]);
    this.challengeFlag = flag;
    this.root.add(flag);
    this.setChallengeActive(false);
  }

  setChallengeActive(on) {
    const c = this.challenge;
    if (!c) return;
    c.running = on;
    for (const b of c.boxes) {
      b.active = on;
      b.mesh.material.opacity = on ? 0.85 : 0.18;
      b.mesh.castShadow = on;
    }
    if (this.challengeFlag) this.challengeFlag.visible = on;
    if (this.challengeKibble) {
      this.challengeKibble.mesh.visible = on;
      if (on) { c.got = 0; this.challengeKibble.points.forEach((p) => (p.alive = true)); }
    }
  }

  setHelper(on) {
    this.helper = on;
    for (const b of this.widenables) {
      const k = on ? HELPER_WIDEN : 1;
      b.mesh.scale.set(k, 1, k);
      const hw = (b.w * k) / 2, hd = (b.d * k) / 2;
      const cx = b.mesh.position.x, cz = b.mesh.position.z;
      b.minX = cx - hw; b.maxX = cx + hw; b.minZ = cz - hd; b.maxZ = cz + hd;
    }
  }

  // Hareketli platformları ilerletir; her kutuya bu karedeki yer değiştirmeyi yazar
  updateMovers(dt) {
    for (const m of this.movers) {
      if (!m.box.active) { m.box.dx = m.box.dy = m.box.dz = 0; continue; }
      const len = m.from.distanceTo(m.to);
      if (m.waitT > 0) m.waitT -= dt;
      else {
        m.u += (m.dir * m.speed * dt) / len;
        if (m.u >= 1) { m.u = 1; m.dir = -1; m.waitT = m.wait; }
        if (m.u <= 0) { m.u = 0; m.dir = 1; m.waitT = m.wait; }
      }
      const e = m.u * m.u * (3 - 2 * m.u);
      const x = m.from.x + (m.to.x - m.from.x) * e;
      const y = m.from.y + (m.to.y - m.from.y) * e;
      const z = m.from.z + (m.to.z - m.from.z) * e;
      const b = m.box;
      const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2, cz = (b.minZ + b.maxZ) / 2;
      b.dx = x - cx; b.dy = y - cy; b.dz = z - cz;
      b.minX += b.dx; b.maxX += b.dx; b.minY += b.dy; b.maxY += b.dy; b.minZ += b.dz; b.maxZ += b.dz;
      b.mesh.position.set(x, y, z);
    }
  }

  inWater(p, hw) {
    for (const w of this.water) {
      if (p.x + hw > w.minX && p.x - hw < w.maxX && p.z + hw > w.minZ && p.z - hw < w.maxZ && p.y < w.maxY - 0.02 && p.y > w.minY - 0.5) return true;
    }
    return false;
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    this.kibble.update(t);
    this.bones.forEach((b) => b.update(t));
    this.bell.update(t, dt);
    this.checkpoints.forEach((c) => c.update(t));
    this.door.update(dt, t);
    for (const b of this.bobbers) { b.position.y = 0.12 + Math.sin(t * 2 + b.position.x) * 0.05; b.rotation.y = Math.sin(t * 0.5 + b.position.z) * 0.6; }
    if (this.clockHand) this.clockHand.rotation.z = -t * 0.5;
    if (this.waterMesh) this.waterMesh.material.color.setHSL(0.56, 0.8, 0.68 + Math.sin(t * 1.5) * 0.03);
    if (this.challengePad) this.challengePad.update(t, this.challenge.running);
    if (this.challengeKibble?.mesh.visible) this.challengeKibble.update(t);
    for (const sw of this.switches) sw.update(dt, t);
    // Beliren kutular: lastik gibi büyür
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const pp = this.pops[i];
      pp.t += dt;
      const k = Math.max(0, Math.min(1, pp.t / 0.35));
      const s = k < 1 ? Math.max(0.01, k + Math.sin(k * Math.PI) * 0.35) : 1;
      pp.mesh.scale.set(s, s, s);
      if (k >= 1) this.pops.splice(i, 1);
    }
    if (this.challengeFlag) this.challengeFlag.children[1].rotation.y = Math.sin(t * 4) * 0.2;
  }

  dispose() {
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
  }
}

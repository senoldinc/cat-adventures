// JSON'dan oda kurar: kutular (fizik + görsel), hareketli platformlar, su, dekor, toplanabilirler, düşmanlar.
import * as THREE from 'three';
import { World } from './physics.js';
import { boxMesh, decorateBox, buildProp, plankTexture, stripeTexture, checkerTexture, tileTexture, grassTexture, fenceTexture, mat } from './props.js';
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

function orbitPos(o) {
  const c = Math.cos(o.a) * o.r, s = Math.sin(o.a) * o.r;
  if (o.plane === 'zy') return new THREE.Vector3(o.c.x, o.c.y + s, o.c.z + c);
  if (o.plane === 'xy') return new THREE.Vector3(o.c.x + c, o.c.y + s, o.c.z);
  return new THREE.Vector3(o.c.x + c, o.c.y, o.c.z + s);
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
    this.convs = [];
    this.floats = [];
    this.waterMeshes = [];
    this.spinners = [];
    this.flyers = [];
    this.t = 0;

    this.buildRoom();

    for (const spec of data.boxes) this.addBox(spec);

    for (const spec of data.movers || []) {
      if (spec.orbit) {
        // Dönme dolap gibi: platform daire üstünde döner ama hep yatay kalır
        const orbit = { c: new THREE.Vector3(...spec.orbit), r: spec.r, speed: spec.speed, a: spec.phase || 0, plane: spec.plane || 'xz' };
        const box = this.addBox({ ...spec, p: orbitPos(orbit).toArray() });
        this.movers.push({ box, orbit });
        continue;
      }
      const box = this.addBox({ ...spec, p: spec.from });
      this.movers.push({ box, from: new THREE.Vector3(...spec.from), to: new THREE.Vector3(...spec.to), speed: spec.speed, u: spec.u0 || 0, dir: 1, wait: spec.wait || 0, waitT: 0 });
    }

    for (const spec of data.water || []) {
      const b = makeBox(spec);
      b.solid = false;
      b.id = spec.id || null;
      // Vanayla dolan su: grup açılınca üst yüzey `rise` kadar yükselir
      if (spec.g) {
        b.g = spec.g;
        b.base = b.maxY;
        b.rise = spec.rise || 0;
        b.riseSpeed = (spec.rise || 0) / (spec.riseTime || 3);
        if (!this.groups.has(spec.g)) this.groups.set(spec.g, { on: false, boxes: [] });
      }
      this.water.push(b);
      const m = new THREE.Mesh(new THREE.BoxGeometry(spec.s[0], 1, spec.s[2]), new THREE.MeshStandardMaterial({ color: 0x6fc3f2, transparent: true, opacity: 0.75, roughness: 0.1, metalness: 0.1 }));
      m.receiveShadow = true;
      b.mesh = m;
      this.waterMeshes.push(m);
      this.root.add(m);
      this.fitWater(b);
    }

    for (const spec of data.props || []) {
      const g = buildProp(spec);
      this.root.add(g);
      if (g.userData.bob) this.bobbers.push(g);
      if (g.userData.clockHand) this.clockHand = g.userData.clockHand;
      if (g.userData.spin) this.spinners.push(g.userData.spin);
      if (g.userData.fly) this.flyers.push(g);
    }

    // Köstebek tünelleri: iki delik arasında ışınlanma
    this.tunnels = (data.tunnels || []).map((tn) => {
      const ends = [tn.a, tn.b].map((pt) => {
        const g = new THREE.Group();
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.25, 6, 16), mat(0x8a5a32));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.08;
        g.add(ring);
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.72, 16), new THREE.MeshBasicMaterial({ color: 0x1d130c }));
        hole.rotation.x = -Math.PI / 2;
        hole.position.y = 0.03;
        g.add(hole);
        g.position.set(...pt);
        this.root.add(g);
        return new THREE.Vector3(...pt);
      });
      return { a: ends[0], b: ends[1] };
    });

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

    // Bölgeler: musluk suyu gibi içindekini iten alanlar (aralıklı açılıp kapanabilir)
    this.zones = (data.zones || []).map((z) => {
      const box = makeBox(z);
      const zone = { ...z, box, on: true };
      if (z.vis === 'stream') {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, z.s[1], 10, 1, true), new THREE.MeshStandardMaterial({ color: 0x8fd3ff, transparent: true, opacity: 0.6, emissive: 0x2a7ab8, emissiveIntensity: 0.3, side: THREE.DoubleSide }));
        m.position.set(...z.p);
        this.root.add(m);
        zone.mesh = m;
      }
      return zone;
    });

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

    const floorTex = theme.floorTex === 'grass' ? grassTexture(theme.floor, theme.floorLine)
      : theme.floorTex === 'checker' ? checkerTexture(theme.floor, theme.floorLine)
      : theme.floorTex === 'tile' ? tileTexture(theme.floor, theme.floorLine)
        : plankTexture(theme.floor, theme.floorLine);
    floorTex.repeat.set(W / 4, D / 4);
    if (theme.floorTex === 'grass') floorTex.repeat.set(W / 6, D / 6);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W + 2, T, D + 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 }));
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
    if (theme.outdoor) {
      // Açık hava: görünen yalnızca alçak bir tahta çit; fizik duvarları yine tam yükseklikte (görünmez)
      const fh = theme.fenceH || 3.5;
      const fenceA = new THREE.MeshStandardMaterial({ map: fenceTexture(theme.wall, theme.wallStripe, D), roughness: 0.85, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
      const fenceB = new THREE.MeshStandardMaterial({ map: fenceTexture(theme.wall, theme.wallStripe, W), roughness: 0.85, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
      walls.forEach((wl, i) => { wl[4] = fh; wl[1] = fh / 2; wl[6] = i < 2 ? fenceA : fenceB; });
      this.buildOutdoor(theme, cx, cz, W, D);
    }
    for (const [x, y, z, w, h, d, m] of walls) {
      const mesh = new THREE.Mesh(theme.outdoor ? new THREE.PlaneGeometry(w === T ? d : w, h) : new THREE.BoxGeometry(w, h, d), m);
      if (theme.outdoor && w === T) mesh.rotation.y = Math.PI / 2;
      mesh.position.set(x + (theme.outdoor && w === T ? (x < cx ? T / 2 : -T / 2) : 0), y, z + (theme.outdoor && d === T ? (z < cz ? T / 2 : -T / 2) : 0));
      mesh.receiveShadow = true;
      mesh.castShadow = !!theme.outdoor;
      this.root.add(mesh);
      const top = theme.outdoor ? H + 1 : y + h / 2 + 1;
      this.world.add({ minX: x - w / 2, maxX: x + w / 2, minY: -1, maxY: top, minZ: z - d / 2, maxZ: z + d / 2, kind: 'wall' });
      if (theme.outdoor) continue;
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
    if (!theme.outdoor) {
      const ceil = new THREE.Mesh(new THREE.BoxGeometry(W + 2, T, D + 2), mat(theme.ceiling));
      ceil.position.set(cx, H + T / 2, cz);
      this.root.add(ceil);
    }
    this.world.add({ minX: room.minX - 1, maxX: room.maxX + 1, minY: H, maxY: H + T, minZ: room.minZ - 1, maxZ: room.maxZ + 1, kind: 'ceiling' });
  }

  // Çitin ötesi: geniş çim, uzak ağaçlar, bulutlar, güneş
  buildOutdoor(theme, cx, cz, W, D) {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), mat(theme.farGround || 0x8fd36b));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cx, -0.02, cz);
    ground.receiveShadow = true;
    this.root.add(ground);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const leaf = [0x4caf50, 0x66c26a, 0x3f9c4a];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 + rnd() * 0.2;
      const r = Math.max(W, D) * 0.5 + 8 + rnd() * 18;
      const x = cx + Math.cos(a) * r * (W / Math.max(W, D) + 0.3), z = cz + Math.sin(a) * r;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3, 6), mat(0x8a5a32));
      trunk.position.y = 1.5;
      tree.add(trunk);
      const top = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4 + rnd() * 1.5, 0), mat(leaf[i % 3]));
      top.position.y = 4.5;
      tree.add(top);
      tree.position.set(x, 0, z);
      tree.scale.setScalar(1 + rnd() * 0.8);
      this.root.add(tree);
    }
    if (theme.night) return;
    for (let i = 0; i < 9; i++) {
      const cloud = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + rnd(), 1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        puff.position.set(k * 1.8 - 2.7, rnd() * 0.8, rnd() * 1.2);
        cloud.add(puff);
      }
      cloud.position.set(cx + (rnd() - 0.5) * 120, 26 + rnd() * 10, cz + (rnd() - 0.5) * 140);
      cloud.userData.drift = 0.3 + rnd() * 0.4;
      this.root.add(cloud);
      this.flyers.push(cloud);
    }
    const sun = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 10), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }));
    sun.position.set(cx + 50, 60, cz - 60);
    this.root.add(sun);
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
    if (spec.grow) box.grow = true;
    if (spec.conv) {
      box.conv = spec.conv;
      this.convs.push(box);
    }
    if (spec.float) {
      this.floats.push({ box, water: spec.float, sink: spec.sink ?? 0.5, restY: spec.p[1], h: spec.s[1], phase: spec.p[0] + spec.p[2] });
    }
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
        this.pops.push({ mesh: b.mesh, t: -i * (b.grow ? 0.45 : 0.12), grow: b.grow ? { minY: b.minY, h: b.maxY - b.minY } : null });
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

  // Su kutusunun görselini fizik kutusuna uydurur (yükselen su için)
  fitWater(w) {
    const h = w.maxY - w.minY;
    w.mesh.scale.y = Math.max(0.001, h);
    w.mesh.position.set((w.minX + w.maxX) / 2, (w.minY + w.maxY) / 2, (w.minZ + w.maxZ) / 2);
    w.mesh.visible = h > 0.15;
  }

  // Hareketli platformları ilerletir; her kutuya bu karedeki yer değiştirmeyi yazar
  updateMovers(dt) {
    // Yükselen su
    for (const w of this.water) {
      if (!w.g) continue;
      const target = w.base + (this.groupOn(w.g) ? w.rise : 0);
      if (w.maxY !== target) {
        const step = w.riseSpeed * dt;
        w.maxY = Math.abs(target - w.maxY) <= step ? target : w.maxY + Math.sign(target - w.maxY) * step;
        this.fitWater(w);
      }
    }
    // Suda yüzen kutular (ördekler): su yükselince onlar da yükselir
    for (const f of this.floats) {
      const w = this.water.find((x) => x.id === f.water);
      const b = f.box;
      const floatY = w ? w.maxY - f.sink + f.h / 2 : -Infinity;
      const floating = floatY > f.restY;
      const y = floating ? floatY + Math.sin(this.t * 2 + f.phase) * 0.06 : f.restY;
      const cy = (b.minY + b.maxY) / 2;
      b.dy = y - cy;
      b.minY += b.dy; b.maxY += b.dy;
      b.mesh.position.y = y;
      b.mesh.rotation.z = floating ? Math.sin(this.t * 1.5 + f.phase) * 0.05 : 0;
    }
    // Taşıma bantları: kutu yerinde kalır, üstündekini taşır
    for (const b of this.convs) {
      b.dx = b.conv[0] * dt;
      b.dz = b.conv[1] * dt;
      const tex = b.mesh.userData.scrollTex;
      if (tex) tex.offset.y -= (Math.hypot(b.conv[0], b.conv[1]) * dt) / (b.mesh.userData.scrollLen || 4) * Math.sign(b.conv[0] + b.conv[1]);
    }
    for (const m of this.movers) {
      if (!m.box.active) { m.box.dx = m.box.dy = m.box.dz = 0; continue; }
      if (m.orbit) {
        m.orbit.a += m.orbit.speed * dt;
        const q = orbitPos(m.orbit);
        const b = m.box;
        const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2, cz = (b.minZ + b.maxZ) / 2;
        b.dx = q.x - cx; b.dy = q.y - cy; b.dz = q.z - cz;
        b.minX += b.dx; b.maxX += b.dx; b.minY += b.dy; b.maxY += b.dy; b.minZ += b.dz; b.maxZ += b.dz;
        b.mesh.position.copy(q);
        continue;
      }
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
    for (const m of this.waterMeshes) m.material.color.setHSL(0.56, 0.8, 0.68 + Math.sin(t * 1.5) * 0.03);
    for (const sp of this.spinners) sp.rotation.y += dt * 3;
    for (const f of this.flyers) {
      if (f.userData.drift) { f.position.x += f.userData.drift * dt; continue; }
      const u = f.userData.fly;
      const a = t * u.speed + u.phase;
      f.position.set(u.c[0] + Math.cos(a) * u.r, u.c[1] + Math.sin(a * 2.3) * 0.5, u.c[2] + Math.sin(a) * u.r);
      f.rotation.y = -a;
      f.children.forEach((w, i) => { if (i) w.rotation.z = Math.sin(t * 18) * 0.8 * (i === 1 ? 1 : -1); });
    }
    for (const z of this.zones) {
      if (z.sweep) {
        // Fıskiye: bölge iki nokta arasında gidip gelir
        const sw = z.sweep;
        const u = (Math.sin(t * sw.speed + (sw.phase || 0)) + 1) / 2;
        const zx = sw.from[0] + (sw.to[0] - sw.from[0]) * u, zz = sw.from[2] + (sw.to[2] - sw.from[2]) * u;
        const b = z.box;
        const hw = (b.maxX - b.minX) / 2, hd = (b.maxZ - b.minZ) / 2;
        b.minX = zx - hw; b.maxX = zx + hw; b.minZ = zz - hd; b.maxZ = zz + hd;
        if (z.head) z.head.rotation.y = Math.atan2(zx - z.head.parent.position.x, zz - z.head.parent.position.z);
      }
      z.on = !z.period || ((t + (z.phase || 0)) % (z.period[0] + z.period[1])) < z.period[0];
      if (z.mesh) {
        z.mesh.visible = z.on;
        z.mesh.scale.x = z.mesh.scale.z = 1 + Math.sin(t * 20) * 0.08;
      }
    }
    if (this.challengePad) this.challengePad.update(t, this.challenge.running);
    if (this.challengeKibble?.mesh.visible) this.challengeKibble.update(t);
    for (const sw of this.switches) sw.update(dt, t);
    // Beliren kutular: lastik gibi büyür
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const pp = this.pops[i];
      pp.t += dt;
      const k = Math.max(0, Math.min(1, pp.t / 0.35));
      if (pp.grow) {
        // Yerden büyüyerek çıkar (çiçek sapı gibi)
        const gk = Math.max(0, Math.min(1, pp.t / 1.0));
        const sy = Math.max(0.01, gk < 1 ? gk + Math.sin(gk * Math.PI) * 0.12 : 1);
        pp.mesh.scale.set(1, sy, 1);
        pp.mesh.position.y = pp.grow.minY + (pp.grow.h * sy) / 2;
        if (gk >= 1) this.pops.splice(i, 1);
        continue;
      }
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

// Oda patronları: 3 canlı, her saldırıdan önce uyarı veren, sersemleyince üstüne zıplanarak vurulan boss'lar.
import * as THREE from 'three';
import { mat } from '../props.js';
import { moveAxis } from '../physics.js';
import { Enemy, buildMouse, alertSprite, dizzyStars, eye, bubbleSprite } from './enemies.js';

export class Boss extends Enemy {
  constructor(scene, spec, world) {
    super(scene, spec);
    this.world = world;
    this.isBoss = true;
    this.name = spec.name || 'Patron';
    this.maxHp = 3;
    this.hp = 3;
    this.started = false;
    const [x0, z0, x1, z1] = spec.arena;
    this.arena = { x0, z0, x1, z1 };
    this.state = 'idle';
    this.stateT = 0;
    this.flashT = 0;
    this.events = {};
  }
  // Oyuncu arenada mı? (savaşı başlatmak için)
  inArena(p) {
    const a = this.arena;
    return p.x > a.x0 && p.x < a.x1 && p.z > a.z0 && p.z < a.z1 && p.y < this.pos.y + 3;
  }
  get stunned() { return this.state === 'stun'; }
  get harmful() { return false; }
  start() { this.started = true; }
  // Vuruş alındı; kalan canı döndürür
  takeHit() {
    this.hp--;
    this.flashT = 0.5;
    return this.hp;
  }
  setFlash(on) {
    this.model.traverse((o) => {
      if (o.material && o.material.emissive) {
        if (o.userData.baseEmissive === undefined) o.userData.baseEmissive = o.material.emissive.getHex();
        o.material.emissive.setHex(on ? 0xffffff : o.userData.baseEmissive);
        o.material.emissiveIntensity = on ? 0.8 : 1;
      }
    });
  }
  tickFlash(dt) {
    if (this.flashT > 0) {
      this.flashT -= dt;
      this.setFlash(this.flashT > 0 && Math.floor(this.flashT * 16) % 2 === 0);
    }
  }
}

// Kral Fare: nişan alır ("!"), düz bir çizgide koşar, duvara/tabureye toslayıp sersemler.
export class KingMouse extends Boss {
  constructor(scene, spec, world) {
    super(scene, spec, world);
    this.name = spec.name || 'Kral Fare';
    this.hw = 0.6; this.h = 0.8;
    this.key = buildMouse(this.model, 0xa7aebb, true);
    this.model.scale.setScalar(1.7);
    // Taç
    const gold = mat(0xffc23d, { metalness: 0.6, roughness: 0.3, emissive: 0x6b4500, emissiveIntensity: 1 });
    this.crown = new THREE.Group();
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.09, 10, 1, true), gold);
    band.material.side = THREE.DoubleSide;
    this.crown.add(band);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 4), gold);
      spike.position.set(Math.sin(a) * 0.15, 0.09, Math.cos(a) * 0.15);
      this.crown.add(spike);
      const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.025, 0), mat(i % 2 ? 0xff4d6d : 0x4dc3ff));
      gem.position.set(Math.sin(a) * 0.162, 0, Math.cos(a) * 0.162);
      this.crown.add(gem);
    }
    this.crown.position.set(0, 0.5, 0.12);
    this.crown.rotation.z = 0.15;
    this.model.add(this.crown);
    // Pelerin
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), mat(0xb5179e, { side: THREE.DoubleSide }));
    cape.geometry.translate(0, -0.2, 0);
    cape.position.set(0, 0.42, -0.05);
    cape.rotation.x = 2.3;
    this.cape = cape;
    this.model.add(cape);

    this.alert = alertSprite();
    this.alert.scale.setScalar(0.8);
    this.alert.position.y = 1.6;
    this.alert.visible = false;
    this.g.add(this.alert);
    this.stars = dizzyStars();
    this.stars.scale.setScalar(1.8);
    this.stars.position.y = 1.2;
    this.g.add(this.stars);

    this.pos.set(...spec.p);
    this.home = this.pos.clone();
    this.dir = new THREE.Vector3(0, 0, -1);
    this.goal = this.pos.clone();
    this.chargesLeft = 1;
    this.g.rotation.y = Math.PI;
    this.finish();
  }

  get harmful() { return this.state === 'charge'; }

  // Koşarken kediye çarptı: kısa sersemleme (çocuğa karşılık verme şansı)
  hitPlayer() { this.enter('stun', 1.4); }

  start() {
    super.start();
    this.enter('roar', 1.3);
    this.events.roar?.();
  }

  enter(state, t) {
    this.state = state;
    this.stateT = t;
    this.alert.visible = state === 'aim';
    this.stars.visible = state === 'stun';
  }

  takeHit() {
    const hp = super.takeHit();
    if (hp > 0) {
      this.enter('hurt', 1.0);
      if (hp === 2) this.events.spawn?.(2);
    }
    return hp;
  }

  randomGoal() {
    const a = this.arena, m = 2;
    return new THREE.Vector3(a.x0 + m + Math.random() * (a.x1 - a.x0 - 2 * m), this.pos.y, a.z0 + m + Math.random() * (a.z1 - a.z0 - 2 * m));
  }

  face(dx, dz, k = 0.25) {
    if (Math.abs(dx) + Math.abs(dz) < 1e-5) return;
    const yaw = Math.atan2(dx, dz);
    const diff = Math.atan2(Math.sin(yaw - this.g.rotation.y), Math.cos(yaw - this.g.rotation.y));
    this.g.rotation.y += diff * k;
  }

  // Bir adım ilerle; bir şeye çarptıysa true
  move(dx, dz) {
    const cx = moveAxis(this.world, this, 'x', dx, false);
    const cz = moveAxis(this.world, this, 'z', dz, false);
    const a = this.arena;
    let wall = !!(cx || cz);
    if (this.pos.x < a.x0) { this.pos.x = a.x0; wall = true; }
    if (this.pos.x > a.x1) { this.pos.x = a.x1; wall = true; }
    if (this.pos.z < a.z0) { this.pos.z = a.z0; wall = true; }
    if (this.pos.z > a.z1) { this.pos.z = a.z1; wall = true; }
    return wall;
  }

  update(dt, speedK, player) {
    this.t += dt;
    this.stateT -= dt;
    this.tickFlash(dt);
    const helper = speedK < 1;
    const p = player.pos;
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    let hop = 0, tilt = 0;

    switch (this.state) {
      case 'idle':
        // Tahtında oturuyor: kuyruk sallar
        hop = Math.abs(Math.sin(this.t * 2)) * 0.04;
        break;
      case 'roar':
        hop = Math.abs(Math.sin(this.t * 14)) * 0.25;
        this.face(dx, dz);
        if (this.stateT <= 0) this.enter('wander', 1.2);
        break;
      case 'wander': {
        const gx = this.goal.x - this.pos.x, gz = this.goal.z - this.pos.z;
        const gl = Math.hypot(gx, gz);
        if (gl < 0.4) this.goal = this.randomGoal();
        else {
          const sp = 2.2 * speedK * dt;
          this.move((gx / gl) * sp, (gz / gl) * sp);
          this.face(gx, gz);
        }
        hop = Math.abs(Math.sin(this.t * 10)) * 0.08;
        if (this.stateT <= 0) {
          this.chargesLeft = this.hp <= 1 ? 2 : 1;
          this.enter('aim', helper ? 1.2 : 0.9);
          this.events.alert?.();
        }
        break;
      }
      case 'aim':
        // Kediye dön, yerinde titre, ayağını yere vur
        this.face(dx, dz, 0.5);
        tilt = -0.35;
        hop = Math.abs(Math.sin(this.t * 30)) * 0.06;
        if (this.stateT <= 0) {
          this.dir.set(dx / dist, 0, dz / dist);
          this.g.rotation.y = Math.atan2(dx, dz);
          this.enter('charge', 3.5);
          this.events.charge?.();
        }
        break;
      case 'charge': {
        const sp = 8 * speedK * dt;
        const hit = this.move(this.dir.x * sp, this.dir.z * sp);
        hop = Math.abs(Math.sin(this.t * 22)) * 0.1;
        tilt = 0.25;
        if (hit || this.stateT <= 0) {
          this.events.bonk?.();
          this.chargesLeft--;
          if (this.chargesLeft > 0) this.enter('reaim', 0.35);
          else this.enter('stun', helper ? 3.8 : 2.6);
        }
        break;
      }
      case 'reaim':
        // İkinci koşu için kısa sendeleme
        tilt = Math.sin(this.t * 20) * 0.2;
        if (this.stateT <= 0) { this.enter('aim', helper ? 0.9 : 0.6); this.events.alert?.(); }
        break;
      case 'stun':
        this.stars.rotation.y += dt * 6;
        tilt = 0.5;
        this.model.rotation.z = Math.sin(this.t * 12) * 0.15;
        if (this.stateT <= 0) { this.model.rotation.z = 0; this.enter('wander', 1.5); }
        break;
      case 'hurt': {
        // Vurulunca kediden uzağa kaçar
        const sp = 3.2 * speedK * dt;
        this.move((-dx / dist) * sp, (-dz / dist) * sp);
        this.face(-dx, -dz, 0.3);
        hop = Math.abs(Math.sin(this.t * 16)) * 0.12;
        if (this.stateT <= 0) this.enter('wander', 1.0);
        break;
      }
    }

    this.model.rotation.x += (tilt - this.model.rotation.x) * Math.min(1, dt * 12);
    this.model.position.y = hop;
    this.g.position.copy(this.pos);
    this.key.rotation.z = this.t * (this.state === 'charge' ? 16 : 4);
    this.alert.position.y = 1.6 + Math.sin(this.t * 12) * 0.06;
    this.cape.rotation.x = (this.state === 'charge' ? 1.7 : 2.4) + Math.sin(this.t * 9) * 0.1;
    this.crown.rotation.z = 0.15 + (this.state === 'stun' ? Math.sin(this.t * 10) * 0.3 : 0);
  }

  // Yenilince tacı yerde kalır (hatıra)
  kill() {
    super.kill();
    const crown = this.crown;
    this.model.remove(crown);
    crown.scale.setScalar(1.7);
    crown.position.set(this.pos.x, this.pos.y + 0.15, this.pos.z);
    crown.rotation.set(0.4, 0, 0.3);
    this.scene.add(crown);
  }
}

// Yay çizerek uçan toprak topu; düşeceği yerde kırmızı halka uyarır.
class DirtBall {
  constructor(scene, from, to, flight) {
    this.scene = scene;
    this.from = from.clone();
    this.to = to.clone();
    this.flight = flight;
    this.t = 0;
    this.ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), mat(0x7a4a2a));
    this.ball.castShadow = true;
    scene.add(this.ball);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.85, 20), new THREE.MeshBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.set(to.x, 0.04, to.z);
    scene.add(this.ring);
    this.pos = this.from.clone();
  }
  // true: yere düştü
  update(dt) {
    this.t += dt;
    const u = Math.min(1, this.t / this.flight);
    this.pos.lerpVectors(this.from, this.to, u);
    this.pos.y += Math.sin(u * Math.PI) * 4;
    this.ball.position.copy(this.pos);
    this.ball.rotation.x += dt * 8;
    this.ring.scale.setScalar(1.2 - u * 0.4);
    this.ring.material.opacity = 0.4 + Math.sin(this.t * 20) * 0.3;
    return u >= 1;
  }
  remove() { this.scene.remove(this.ball); this.scene.remove(this.ring); }
}

// Dev Köstebek Topaç: tümseklerden birinde toprak titrer → çıkar (vurulabilir) → vurulmazsa toprak topu atar → dalar.
export class Mole extends Boss {
  constructor(scene, spec, world) {
    super(scene, spec, world);
    this.name = spec.name || 'Dev Köstebek';
    this.hw = 0.8; this.h = 1.4;
    const fur = mat(0x6b4a3a), pink = mat(0xff9db8);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), fur);
    body.scale.set(1, 1.1, 0.95);
    body.position.y = 0.8;
    this.model.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 6), mat(0xc79a7a));
    belly.position.set(0, 0.7, 0.45);
    belly.scale.set(1, 1.1, 0.6);
    this.model.add(belly);
    const nose = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), pink);
      n.position.set(Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0);
      nose.add(n);
    }
    nose.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), pink));
    nose.position.set(0, 1.25, 0.85);
    this.model.add(nose);
    // Yuvarlak gözlük
    for (const sgn of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 5, 12), mat(0x222222));
      rim.position.set(0.22 * sgn, 1.5, 0.72);
      this.model.add(rim);
      const eyeM = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mat(0x111111));
      eyeM.position.set(0.22 * sgn, 1.5, 0.74);
      this.model.add(eyeM);
    }
    this.claws = [];
    for (const sgn of [-1, 1]) {
      const claw = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), pink);
      claw.scale.set(1.2, 0.5, 0.8);
      claw.position.set(0.75 * sgn, 0.9, 0.55);
      this.model.add(claw);
      this.claws.push(claw);
    }
    // Baret
    const hat = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffc23d));
    hat.position.y = 1.62;
    this.model.add(hat);

    this.stars = dizzyStars();
    this.stars.scale.setScalar(1.6);
    this.stars.position.y = 2.2;
    this.g.add(this.stars);

    // Tümsekler
    this.holes = spec.holes.map((h) => new THREE.Vector3(...h));
    this.mounds = this.holes.map((h) => {
      const m = new THREE.Group();
      const dirt = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x8a5a32));
      dirt.scale.y = 0.45;
      m.add(dirt);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), new THREE.MeshBasicMaterial({ color: 0x2b1d14 }));
      hole.rotation.x = -Math.PI / 2;
      hole.position.y = 0.46;
      m.add(hole);
      m.position.copy(h);
      m.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
      scene.add(m);
      return m;
    });
    // Sahte tümsekten çıkan solucan
    this.worm = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.16 - i * 0.02, 8, 6), mat(0xff8fab));
      seg.position.y = i * 0.22;
      this.worm.add(seg);
    }
    const wEye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 4), mat(0x111111));
    wEye.position.set(0.06, 0.7, 0.1);
    this.worm.add(wEye);
    this.worm.visible = false;
    scene.add(this.worm);

    this.balls = [];
    this.hole = 2;
    this.pos.copy(this.holes[this.hole]);
    this.depth = -2.2; // yer altında
    this.state = 'idle';
    this.stateT = 0;
    this.finish();
  }

  // Yalnızca dışarıdayken vurulabilir/çarpışır
  get stunned() { return this.state === 'up'; }
  aabb() {
    if (this.state !== 'up' && this.state !== 'throw') return { minX: 1e6, maxX: 1e6 + 1, minY: 1e6, maxY: 1e6 + 1, minZ: 1e6, maxZ: 1e6 + 1 };
    return super.aabb();
  }
  hitPlayer() {}

  start() {
    super.start();
    this.enter('hidden', 1.0);
    this.events.roar?.();
  }

  enter(state, t) {
    this.state = state;
    this.stateT = t;
    this.stars.visible = false;
  }

  takeHit() {
    const hp = super.takeHit();
    this.stars.visible = true;
    this.state = 'dive';
    this.stateT = 0.6;
    return hp;
  }

  update(dt, speedK, player) {
    this.t += dt;
    this.stateT -= dt;
    this.tickFlash(dt);
    const helper = speedK < 1;
    let target = -2.2;

    switch (this.state) {
      case 'idle':
        // Savaş başlamadan ortadaki tümsekten arada bir bakar
        target = Math.sin(this.t * 0.8) > 0.6 ? -0.9 : -2.2;
        break;
      case 'hidden':
        if (this.stateT <= 0) {
          let next = this.hole;
          while (next === this.hole) next = Math.floor(Math.random() * this.holes.length);
          this.hole = next;
          this.pos.copy(this.holes[next]);
          this.fake = -1;
          if (this.hp === 1) {
            // Son canda iki tümsek titrer, biri sahte (solucan çıkar)
            let f = next;
            while (f === next) f = Math.floor(Math.random() * this.holes.length);
            this.fake = f;
          }
          this.enter('warn', helper ? 1.2 : 0.8);
        }
        break;
      case 'warn':
        // Titreyen tümsek + toprak parçacıkları
        for (const i of [this.hole, this.fake]) {
          if (i < 0) continue;
          const m = this.mounds[i];
          m.rotation.z = Math.sin(this.t * 40) * 0.08;
          m.scale.setScalar(1 + Math.abs(Math.sin(this.t * 20)) * 0.1);
          if (Math.random() < dt * 12) this.events.dirt?.(this.holes[i]);
        }
        if (this.stateT <= 0) {
          this.mounds.forEach((m) => { m.rotation.z = 0; m.scale.setScalar(1); });
          if (this.fake >= 0) { this.worm.visible = true; this.worm.position.copy(this.holes[this.fake]).setY(0.2); }
          this.enter('up', (this.hp >= 3 ? 2.2 : 1.6) * (helper ? 1.5 : 1));
          this.events.pop?.();
        }
        break;
      case 'up':
        target = 0;
        this.face(player);
        if (this.stateT <= 0) { this.enter('throw', 0.7); this.throwBalls(player, helper); }
        break;
      case 'throw':
        target = 0;
        this.claws.forEach((c, i) => { c.position.y = 0.9 + Math.sin(this.t * 20 + i) * 0.3; });
        if (this.stateT <= 0) this.enter('dive', 0.5);
        break;
      case 'dive':
        target = -2.2;
        if (this.stateT <= 0) { this.worm.visible = false; this.stars.visible = false; this.enter('hidden', helper ? 2.0 : 1.4); }
        break;
    }
    this.depth += (target - this.depth) * Math.min(1, dt * (target > this.depth ? 10 : 6));
    this.model.position.y = this.depth;
    this.model.visible = this.depth > -2.0;
    this.g.position.copy(this.pos);
    if (this.stars.visible) this.stars.rotation.y += dt * 6;
    if (this.worm.visible) this.worm.rotation.z = Math.sin(this.t * 6) * 0.3;

    // Toprak topları
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      const landed = b.update(dt);
      const p = player.pos;
      const near = (b.pos.x - p.x) ** 2 + (b.pos.z - p.z) ** 2 < 0.8 && b.pos.y < p.y + 1 && b.pos.y > p.y - 0.4;
      if (near && player.hurtT <= 0) { this.events.hurtPlayer?.(b.pos.x, b.pos.z); b.t = b.flight; }
      if (landed || near) {
        this.events.splat?.(b.pos);
        b.remove();
        this.balls.splice(i, 1);
      }
    }
  }

  face(player) {
    const dx = player.pos.x - this.pos.x, dz = player.pos.z - this.pos.z;
    this.g.rotation.y = Math.atan2(dx, dz);
  }

  throwBalls(player, helper) {
    const p = player.pos;
    const from = new THREE.Vector3(this.pos.x, 1.6, this.pos.z);
    const targets = [new THREE.Vector3(p.x, 0, p.z)];
    if (!helper) targets.push(new THREE.Vector3(p.x + player.vel.x * 0.9 + (Math.random() - 0.5) * 2, 0, p.z + player.vel.z * 0.9 + (Math.random() - 0.5) * 2));
    for (const t of targets) this.balls.push(new DirtBall(this.scene, from, t, 1.2));
    this.events.throw?.();
  }

  kill() {
    super.kill();
    for (const b of this.balls) b.remove();
    this.balls.length = 0;
    this.worm.visible = false;
  }
}

// Süpürge 3000 — final. Can 3: koşu → duvara tosla. Can 2: fırça fırıldağı (iter, fare çıkarır) → ısınır.
// Can 1: emme (kediyi çeker) → torba patlar. Her saldırı sonrası sersemler; üstüne zıplamak vurur (pati işlemez).
export class SuperVacuum extends Boss {
  constructor(scene, spec, world) {
    super(scene, spec, world);
    this.name = spec.name || 'Süpürge 3000';
    this.hw = 1.6; this.h = 1.1;
    this.pawImmune = true;
    const m = this.model;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.85, 0.8, 24), mat(0x6f7686, { metalness: 0.4, roughness: 0.4 }));
    body.position.y = 0.5;
    m.add(body);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.55, 0.25, 24), mat(0x2f3440));
    top.position.y = 1.0;
    m.add(top);
    const bumper = new THREE.Mesh(new THREE.TorusGeometry(1.86, 0.12, 6, 24, Math.PI), mat(0xff6b6b));
    bumper.rotation.x = Math.PI / 2;
    bumper.position.y = 0.35;
    m.add(bumper);
    this.led = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
    this.led.position.set(0, 1.15, 0.6);
    m.add(this.led);
    const face = new THREE.Group();
    face.position.set(0, 0.6, 1.45);
    face.scale.setScalar(2.4);
    eye(face, -0.2, 0.05, 0.1, 1);
    eye(face, 0.2, 0.05, 0.1, -1);
    m.add(face);
    // Toz torbası (emme evresinde şişer)
    this.bag = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), mat(0xc2a878));
    this.bag.position.set(0, 1.35, -0.7);
    m.add(this.bag);
    // Dönen fırçalar
    this.brushes = [-1, 1].map((sx) => {
      const br = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const bristle = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.1), mat(0x333333));
        bristle.rotation.y = (i / 4) * Math.PI;
        br.add(bristle);
      }
      br.position.set(1.2 * sx, 0.08, 1.2);
      m.add(br);
      return br;
    });
    this.alert = alertSprite();
    this.alert.scale.setScalar(1);
    this.alert.position.y = 2.4;
    this.alert.visible = false;
    this.g.add(this.alert);
    this.suckBubble = bubbleSprite('💨', '#e8f6ff', 1.1);
    this.suckBubble.position.y = 2.5;
    this.suckBubble.visible = false;
    this.g.add(this.suckBubble);
    this.stars = dizzyStars();
    this.stars.scale.setScalar(3);
    this.stars.position.y = 1.8;
    this.g.add(this.stars);

    this.pos.set(...spec.p);
    this.dir = new THREE.Vector3(0, 0, -1);
    this.goal = this.pos.clone();
    this.g.rotation.y = Math.PI;
    this.finish();
  }

  get stunned() { return this.state === 'stun'; }
  get harmful() { return this.state === 'charge' || this.state === 'spin' || this.state === 'suck'; }

  enter(state, t) {
    this.state = state;
    this.stateT = t;
    this.alert.visible = state === 'aim';
    this.suckBubble.visible = state === 'suck';
    this.stars.visible = state === 'stun';
  }

  start() { super.start(); this.enter('roar', 1.4); this.events.roar?.(); }

  // Kediye çarptı: emiyorsa tükürür ve torba patlar; koşuyorsa kısa sersemler
  hitPlayer() {
    if (this.state === 'suck') { this.events.pop?.(this.pos); this.enter('stun', this.stunTime(3)); }
    else if (this.state === 'charge') this.enter('stun', this.stunTime(1.6));
  }

  stunTime(t) { return t + (this.helper ? 1.5 : 0); }

  takeHit() {
    const hp = super.takeHit();
    if (hp > 0) this.enter('hurt', 1.0);
    return hp;
  }

  randomGoal() {
    const a = this.arena, mg = 3;
    return new THREE.Vector3(a.x0 + mg + Math.random() * (a.x1 - a.x0 - 2 * mg), this.pos.y, a.z0 + mg + Math.random() * (a.z1 - a.z0 - 2 * mg));
  }

  move(dx, dz) {
    const cx = moveAxis(this.world, this, 'x', dx, false);
    const cz = moveAxis(this.world, this, 'z', dz, false);
    const a = this.arena;
    let wall = !!(cx || cz);
    if (this.pos.x < a.x0) { this.pos.x = a.x0; wall = true; }
    if (this.pos.x > a.x1) { this.pos.x = a.x1; wall = true; }
    if (this.pos.z < a.z0) { this.pos.z = a.z0; wall = true; }
    if (this.pos.z > a.z1) { this.pos.z = a.z1; wall = true; }
    return wall;
  }

  face(dx, dz, k = 0.2) {
    if (Math.abs(dx) + Math.abs(dz) < 1e-5) return;
    const yaw = Math.atan2(dx, dz);
    this.g.rotation.y += Math.atan2(Math.sin(yaw - this.g.rotation.y), Math.cos(yaw - this.g.rotation.y)) * k;
  }

  // Kediyi it (+) ya da çek (−)
  shove(player, dx, dz, amount, dt) {
    const d = Math.hypot(dx, dz) || 1;
    moveAxis(this.world, player, 'x', (dx / d) * amount * dt, false);
    moveAxis(this.world, player, 'z', (dz / d) * amount * dt, false);
  }

  update(dt, speedK, player) {
    this.t += dt;
    this.stateT -= dt;
    this.tickFlash(dt);
    this.helper = speedK < 1;
    const p = player.pos;
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    let spin = 0, ledOn = Math.sin(this.t * 3) > 0, bob = 0;

    switch (this.state) {
      case 'idle':
        ledOn = Math.sin(this.t * 1.5) > 0.6;
        break;
      case 'roar':
        bob = Math.abs(Math.sin(this.t * 16)) * 0.15;
        spin = 10;
        this.face(dx, dz);
        if (this.stateT <= 0) this.enter('wander', 1.2);
        break;
      case 'wander': {
        const gx = this.goal.x - this.pos.x, gz = this.goal.z - this.pos.z, gl = Math.hypot(gx, gz);
        if (gl < 0.5) this.goal = this.randomGoal();
        else { const sp = 2.4 * speedK * dt; this.move((gx / gl) * sp, (gz / gl) * sp); this.face(gx, gz); }
        spin = 8;
        if (this.stateT <= 0) { this.enter('aim', this.helper ? 1.3 : 0.9); this.events.alert?.(); }
        break;
      }
      case 'aim':
        // Bip bip: LED hızlı yanıp söner, kediye döner
        ledOn = Math.sin(this.t * 30) > 0;
        this.face(dx, dz, 0.4);
        bob = Math.abs(Math.sin(this.t * 25)) * 0.05;
        if (this.stateT <= 0) {
          if (this.hp >= 3) {
            this.dir.set(dx / dist, 0, dz / dist);
            this.g.rotation.y = Math.atan2(dx, dz);
            this.enter('charge', 4);
            this.events.charge?.();
          } else if (this.hp === 2) {
            this.enter('spin', 2.2);
            this.events.spin?.();
          } else {
            this.enter('suck', 2.6);
            this.events.suck?.();
          }
        }
        break;
      case 'charge': {
        const sp = 9 * speedK * dt;
        spin = 30;
        if (this.move(this.dir.x * sp, this.dir.z * sp) || this.stateT <= 0) {
          this.events.bonk?.(this.pos);
          this.enter('stun', this.stunTime(2.8));
        }
        break;
      }
      case 'spin':
        // Fırça fırıldağı: yakındaki kediyi dışarı iter
        this.g.rotation.y += dt * 12;
        spin = 40;
        if (dist < 4.2) this.shove(player, dx, dz, 5 * speedK, dt);
        if (this.stateT <= 0) { this.events.steam?.(this.pos); this.enter('stun', this.stunTime(2.5)); this.overheat = true; }
        break;
      case 'suck': {
        // Emme: kediyi kendine doğru çeker, torba şişer
        if (dist < 7.5) this.shove(player, -dx, -dz, (this.helper ? 2 : 3.5), dt);
        this.face(dx, dz, 0.3);
        this.bag.scale.setScalar(1 + (1 - this.stateT / 2.6) * 0.8);
        this.events.suckFx?.(p, this.pos);
        if (this.stateT <= 0) { this.events.pop?.(this.pos); this.enter('stun', this.stunTime(3)); }
        break;
      }
      case 'stun':
        ledOn = false;
        this.stars.rotation.y += dt * 5;
        this.model.rotation.z = Math.sin(this.t * 10) * 0.06;
        if (this.overheat && Math.random() < dt * 8) this.events.steam?.(this.pos);
        if (this.stateT <= 0) { this.model.rotation.z = 0; this.overheat = false; this.bag.scale.setScalar(1); this.enter('wander', 1.4); }
        break;
      case 'hurt': {
        const sp = 3.5 * speedK * dt;
        this.move((-dx / dist) * sp, (-dz / dist) * sp);
        this.face(-dx, -dz, 0.3);
        spin = 20;
        if (this.stateT <= 0) this.enter('wander', 1.0);
        break;
      }
    }
    if (this.state !== 'suck' && this.state !== 'stun') this.bag.scale.setScalar(1);
    this.brushes.forEach((br, i) => (br.rotation.y += dt * spin * (i ? 1 : -1)));
    this.led.material.color.setHex(ledOn ? 0xff3b3b : 0x5a1010);
    this.model.position.y = bob;
    this.g.position.copy(this.pos);
    this.alert.position.y = 2.4 + Math.sin(this.t * 12) * 0.08;
  }
}

export function createBoss(scene, spec, world) {
  if (spec.type === 'supervacuum') return new SuperVacuum(scene, spec, world);
  if (spec.type === 'kingmouse') return new KingMouse(scene, spec, world);
  if (spec.type === 'mole') return new Mole(scene, spec, world);
  return null;
}

// Oda patronları: 3 canlı, her saldırıdan önce uyarı veren, sersemleyince üstüne zıplanarak vurulan boss'lar.
import * as THREE from 'three';
import { mat } from '../props.js';
import { moveAxis } from '../physics.js';
import { Enemy, buildMouse, alertSprite, dizzyStars } from './enemies.js';

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

export function createBoss(scene, spec, world) {
  if (spec.type === 'kingmouse') return new KingMouse(scene, spec, world);
  return null;
}

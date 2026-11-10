// Oyun durumu: menü / oyun / mola / seviye sonu. Fizik sabit 60 Hz adımda çalışır.
import * as THREE from 'three';
import { Level } from './level.js';
import { Player } from './player.js';
import { FollowCamera } from './camera.js';
import { Effects } from './effects.js';
import { Hud } from './ui/hud.js';
import { Menus } from './ui/menus.js';
import { pollInput, showTouchControls, clearInput, isTouch, touchUiEnabled } from './input.js';
import { sfx, setMusic } from './audio.js';
import { createEnemy } from './entities/enemies.js';
import { save, persist, levelSave } from './save.js';
import { grant, itemById } from './shop.js';
import { LEVELS } from './levels/index.js';
import { aabbOverlap, moveAxis } from './physics.js';

const STEP = 1 / 60;

function sphereHitsBox(s, b) {
  const cx = Math.max(b.minX, Math.min(s.x, b.maxX));
  const cy = Math.max(b.minY, Math.min(s.y, b.maxY));
  const cz = Math.max(b.minZ, Math.min(s.z, b.maxZ));
  return (cx - s.x) ** 2 + (cy - s.y) ** 2 + (cz - s.z) ** 2 < s.r * s.r;
}
const MAX_HEARTS = 3;

export class Game {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    this.cam = new FollowCamera(this.camera);
    this.effects = new Effects(this.scene);
    this.hud = new Hud();
    this.player = new Player(this.scene);
    this.player.model.setEquipped(save.equipped);
    this.wirePlayerEvents();

    this.setupLights();

    // Kedinin altındaki yuvarlak gölge (platform hizalamayı kolaylaştırır)
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.renderOrder = 1;
    this.scene.add(this.blob);

    this.menus = new Menus({
      play: (id) => this.startLevel(id),
      resume: () => this.resume(),
      restart: () => this.startLevel(this.levelId),
      quit: () => this.toMenu(),
      settingsChanged: () => {
        if (this.level) this.level.setHelper(save.settings.helper);
        showTouchControls(this.state === 'play');
      },
      equipChanged: () => this.player.model.setEquipped(save.equipped),
    });

    this.state = 'menu';
    this.acc = 0;
    this.last = performance.now();
    this.now = 0;

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        persist();
        if (this.state === 'play') this.pause();
      }
    });
    this.resize();

    this.loadLevel('salon');
    this.toMenu();
    requestAnimationFrame((t) => this.frame(t));
  }

  setupLights() {
    this.hemi = new THREE.HemisphereLight(0xfff4e0, 0xb07a4a, 2.0);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
    const c = sun.shadow.camera;
    c.left = -36; c.right = 36; c.top = 36; c.bottom = -36; c.near = 1; c.far = 90;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    this.sun = sun;
    this.scene.add(sun);
    this.scene.add(sun.target);
  }

  wirePlayerEvents() {
    const p = this.player;
    const at = () => ({ x: p.pos.x, y: p.pos.y + 0.05, z: p.pos.z });
    p.events = {
      jump: () => sfx.jump(),
      doubleJump: () => { sfx.doubleJump(); this.effects.sparkle(at(), 0xffffff); },
      land: (v) => { if (v > 4) { sfx.land(); this.effects.dust(at()); p.model.land(Math.min(0.35, v * 0.025)); } },
      bounce: () => { sfx.bounce(); p.model.land(0.3); },
      launch: () => { sfx.launch(); p.model.land(0.35); this.effects.burst(at(), { color: 0xe0a35a, count: 8, speed: 3, size: 0.12, life: 0.5, up: 2 }); },
      glide: () => sfx.glide(),
      climbStart: () => sfx.climb(),
      climb: () => sfx.climb(),
      ledge: () => sfx.jump(),
    };
  }

  loadLevel(id) {
    if (this.level) this.level.dispose();
    this.effects.clear();
    const data = LEVELS.find((l) => l.id === id);
    this.levelId = id;
    this.levelData = data;
    this.lsave = levelSave(id);
    this.level = new Level(data, this.scene, this.lsave, save.settings.helper);
    this.scene.background = new THREE.Color(data.theme.sky);
    const r = data.room;
    const cx = (r.minX + r.maxX) / 2, cz = (r.minZ + r.maxZ) / 2;
    this.sun.position.set(cx + 14, r.height + 22, cz - 10);
    this.sun.target.position.set(cx, 0, cz);

    for (const e of this.level.enemies) e.events = { squeak: () => sfx.squeak(), alert: () => sfx.alert(), stir: () => sfx.sniff() };
    const boss = this.level.boss;
    if (boss) {
      boss.events = {
        roar: () => sfx.bossRoar(),
        alert: () => sfx.alert(),
        charge: () => sfx.charge(),
        bonk: () => { sfx.bonk(); this.effects.burst({ x: boss.pos.x, y: boss.pos.y + 0.8, z: boss.pos.z }, { color: 0xffe066, count: 8, speed: 3, size: 0.12, life: 0.5 }); },
        spawn: (n) => this.spawnMinions(n),
        dirt: (pt) => this.effects.burst({ x: pt.x, y: 0.4, z: pt.z }, { color: 0x8a5a32, count: 2, speed: 2.5, size: 0.12, life: 0.5, gravity: 10, up: 3 }),
        pop: () => { sfx.pop(); this.effects.burst({ x: boss.pos.x, y: 0.5, z: boss.pos.z }, { color: 0x8a5a32, count: 12, speed: 4, size: 0.16, life: 0.6, gravity: 12, up: 3 }); },
        throw: () => sfx.throw(),
        splat: (pt) => { sfx.splat(); this.effects.burst({ x: pt.x, y: 0.2, z: pt.z }, { color: 0x7a4a2a, count: 10, speed: 3, size: 0.14, life: 0.5, gravity: 10, up: 2 }); },
        hurtPlayer: (x, z) => this.hurt(x, z),
      };
    }
    setMusic(data.theme.music || 'salon');

    const [sx, sy, sz] = data.spawn;
    this.spawn = { x: sx, y: sy, z: sz };
    this.player.reset(this.spawn, data.spawnYaw || 0);
    this.cam.snap(this.player.pos, data.spawnYaw || 0);
  }

  startLevel(id) {
    this.loadLevel(id);
    this.run = {
      hearts: MAX_HEARTS,
      kibble: 0,
      bones: [...this.lsave.bones],
      newBones: 0,
      bell: false,
      checkpoint: { ...this.spawn },
      time: 0,
    };
    this.hud.reset();
    this.hud.show(true);
    showTouchControls(true);
    this.menus.hide();
    clearInput();
    this.state = 'play';
    this.hud.toast(`${this.levelData.emoji} ${this.levelData.name}`, 1.6);
  }

  toMenu() {
    persist();
    this.menus.hide();
    if (this.state !== 'menu' || !this.level) this.loadLevel(this.levelId || 'salon');
    this.state = 'menu';
    this.hud.show(false);
    showTouchControls(false);
    this.menus.main();
  }

  pause() {
    if (this.state !== 'play') return;
    this.state = 'pause';
    persist();
    showTouchControls(false);
    this.menus.pause();
  }

  resume() {
    this.state = 'play';
    clearInput();
    showTouchControls(true);
    this.last = performance.now();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 70 : 55;
    this.camera.updateProjectionMatrix();
    const rot = document.getElementById('rotate-hint');
    rot.classList.toggle('hidden', !(isTouch && h > w * 1.15 && this.state === 'play'));
  }

  frame(t) {
    requestAnimationFrame((tt) => this.frame(tt));
    let dt = (t - this.last) / 1000;
    this.last = t;
    if (dt > 0.25) dt = 0.25;

    if (this.state === 'play') {
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n < 6) {
        this.now += STEP;
        this.step(STEP);
        this.acc -= STEP;
        n++;
      }
      if (n === 6) this.acc = 0;
    } else if (this.state === 'menu') {
      this.now += dt;
      this.level.update(dt);
      this.level.updateMovers(dt);
      this.player.update(dt, { moveX: 0, moveY: 0, jumpHeld: false, jumpPressed: false }, this.cam.yaw, this.level.world, false);
      this.cam.yaw += dt * 0.12;
      this.cam.pitch = 0.3;
      this.cam.apply(this.level.world, dt);
    } else if (this.state === 'pause' || this.state === 'complete') {
      const input = pollInput(this.now);
      if (input.pausePressed && this.state === 'pause') { this.menus.hide(); this.resume(); }
    }

    this.effects.update(dt);
    this.hud.update(dt);
    this.updateBlob();
    this.renderer.render(this.scene, this.camera);
  }

  updateBlob() {
    const p = this.player.pos;
    const g = this.level.world.groundBelow(p.x, p.y + 0.05, p.z, 0.05);
    if (g.y === -Infinity) { this.blob.visible = false; return; }
    const h = p.y - g.y;
    this.blob.visible = !this.player.climbing && h < 12;
    this.blob.position.set(p.x, g.y + 0.02, p.z);
    const s = Math.max(0.4, 1 - h * 0.08);
    this.blob.scale.setScalar(s);
    this.blob.material.opacity = 0.35 * s;
  }

  // Test kancası: girdiyi elle vererek n kare ilerletir (tarayıcı konsolundan kullanılabilir)
  simulate(n, input = {}) {
    for (let i = 0; i < n && this.state === 'play'; i++) {
      this.now += STEP;
      this.step(STEP, { moveX: 0, moveY: 0, jumpHeld: false, jumpPressed: false, meowPressed: false, pawPressed: false, pausePressed: false, camDX: 0, camDY: 0, sinceCamInput: 0, ...input });
      if (input.jumpPressed || input.pawPressed) input = { ...input, jumpPressed: false, pawPressed: false };
    }
  }

  step(dt, forced) {
    const input = forced || pollInput(this.now);
    if (input.pausePressed) { this.pause(); return; }

    const run = this.run;
    const level = this.level;
    const player = this.player;
    const helper = save.settings.helper;
    run.time += dt;

    if (input.meowPressed) {
      sfx.meow();
      player.model.meow();
      this.effects.burst({ x: player.pos.x, y: player.pos.y + 0.9, z: player.pos.z }, { color: 0xff8fab, count: 4, speed: 1.2, size: 0.1, life: 0.6, up: 2 });
    }

    if (input.pawPressed && player.paw()) {
      sfx.paw();
      this.effects.swipe(player.pos.x, player.pos.y + 0.5, player.pos.z, player.yaw);
    }

    level.updateMovers(dt);
    player.update(dt, input, this.cam.yaw, level.world, helper);
    level.update(dt);
    this.cam.update(dt, player.pos, player, input, level.world);

    const p = player.pos;
    this.updateZones(dt);
    const cx = p.x, cy = p.y + 0.3, cz = p.z;
    const paw = player.pawActive ? player.pawHitbox() : null;
    this.updateSwitches(paw);

    // Mama
    const got = level.kibble.collect(cx, cy, cz, 0.75);
    for (const k of got) {
      run.kibble++;
      save.kibble++;
      sfx.kibble();
      this.effects.sparkle(k);
    }

    // Balık kemikleri
    for (const b of level.bones) {
      if (b.near(cx, cy, cz)) {
        b.take();
        sfx.bone();
        this.effects.sparkle(b.obj.position, 0xbfe8ff);
        this.effects.sparkle(b.obj.position, 0xffffff);
        if (!run.bones[b.index]) {
          run.bones[b.index] = true;
          run.newBones++;
          this.lsave.bones[b.index] = true;
          persist();
        }
        const n = run.bones.filter(Boolean).length;
        this.hud.toast(`🦴 Balık kemiği! ${n}/3`);
      }
    }

    // Altın çan
    if (level.bell.near(cx, cy, cz, 1.0)) {
      level.bell.take();
      run.bell = true;
      level.door.unlock();
      sfx.bell();
      this.effects.sparkle(level.bell.obj.position);
      this.hud.toast('🔔 Altın çan! Kapı açıldı!', 2.5);
    }

    // Checkpoint
    for (const c of level.checkpoints) {
      if (!c.active && Math.abs(p.y - c.pos.y) < 1.5 && c.near(p.x, p.z)) {
        c.activate();
        run.checkpoint = { x: c.pos.x, y: c.pos.y, z: c.pos.z };
        run.hearts = MAX_HEARTS;
        sfx.checkpoint();
        this.effects.sparkle({ x: c.pos.x + 0.6, y: c.pos.y + 2, z: c.pos.z }, 0x5cc96b);
        this.hud.toast('🚩 Kayıt noktası!', 1.4);
        persist();
      }
    }

    // Düşmanlar
    const pBox = { minX: p.x - player.hw, maxX: p.x + player.hw, minY: p.y, maxY: p.y + player.h, minZ: p.z - player.hw, maxZ: p.z + player.hw };
    const speedK = helper ? 0.6 : 1;
    for (const e of level.enemies) {
      if (!e.alive) continue;
      e.update(dt, speedK, player);
      if (e.passive) {
        // Uyuyan köpek: bakarken bahçesinde koşan/zıplayan kediye havlar
        const moving = Math.hypot(player.vel.x, player.vel.z) > 1.2 || !player.grounded;
        if (e.watching && e.inArea(p) && moving) this.bark(e);
        continue;
      }
      const box = e.aabb();

      // Pati isabeti (her savuruşta bir düşmana bir kez)
      if (paw && !player.pawHits.has(e) && sphereHitsBox(paw, box)) {
        player.pawHits.add(e);
        const r = e.onPaw();
        if (r === 'kill') {
          this.defeat(e, '🐾 Pati! +3');
          continue;
        } else if (r === 'stun') {
          sfx.bonk();
          this.effects.sparkle({ x: e.pos.x, y: e.pos.y + 0.8, z: e.pos.z }, 0xffe066);
          this.hud.toast('😵 Sersemledi! Üstüne zıpla!', 1.4);
        }
      }

      if (!aabbOverlap(pBox, box)) continue;
      const fromAbove = p.y >= e.pos.y + e.h * 0.4 && player.vel.y <= 1;
      if (fromAbove) {
        this.defeat(e, '💨 Puf! +3');
        player.bounceOffEnemy();
        if (input.jumpHeld) player.vel.y = 12;
      } else if (e.harmful && player.hurtT <= 0) {
        this.hurt(e.pos.x, e.pos.z);
        if (e.hitPlayer) e.hitPlayer();
      }
    }

    if (level.boss?.alive) this.updateBoss(dt, speedK, paw, pBox, input);
    this.updateTunnels();

    // Su ve boşluğa düşme
    if (level.inWater(p, player.hw * 0.6)) {
      sfx.splash();
      this.effects.splash({ x: p.x, y: 0.2, z: p.z });
      if (!helper) run.hearts--;
      this.hud.toast(helper ? '💧 Hop, kuru yere!' : '💧 Brr, ıslandın!', 1.3);
      this.respawn();
    } else if (p.y < this.levelData.killY) {
      if (!helper) run.hearts--;
      this.respawn();
    }

    if (run.hearts <= 0) {
      run.hearts = MAX_HEARTS;
      this.hud.toast('💪 Tekrar dene!', 1.5);
      this.respawn();
    }

    this.updateChallenge(dt);

    // Kapı
    if (level.door.inside(p)) this.complete();

    // İpuçları ve görev
    this.hud.setHint(this.nearestHint(p));
    this.hud.setTask(this.taskText());
    this.hud.set({ hearts: run.hearts, maxHearts: MAX_HEARTS, kibble: save.kibble, bones: run.bones, bell: run.bell });
  }

  defeat(e, text) {
    e.kill();
    sfx.poof();
    this.effects.poof({ x: e.pos.x, y: e.pos.y + 0.3, z: e.pos.z });
    this.run.kibble += 3;
    save.kibble += 3;
    this.hud.toast(text, 1);
  }

  hurt(fx, fz) {
    const run = this.run;
    const helper = save.settings.helper;
    run.hearts--;
    this.player.hurtT = helper ? 2.2 : 1.5;
    this.player.knockback(fx, fz);
    sfx.hurt();
  }

  respawn() {
    const c = this.run.checkpoint;
    this.player.reset(c, this.levelData.spawnYaw || 0);
    this.player.hurtT = 1.2;
    this.cam.snap(this.player.pos, this.cam.yaw);
    if (this.level.challenge?.running) this.endChallenge(false);
  }

  updateChallenge(dt) {
    const level = this.level;
    const ch = level.challenge;
    if (!ch) return;
    const p = this.player.pos;
    if (!ch.running) {
      if (this.player.grounded && level.challengePad.near(p)) {
        level.setChallengeActive(true);
        ch.time = 0;
        sfx.checkpoint();
        this.hud.toast(ch.type === 'collect' ? '💜 Hadi! Mor mamaları topla!' : ch.type === 'nofloor' ? '🚫 Yere basma! Mor bayrağa zıpla!' : '⏱️ Hadi! Mor bayrağa koş!', 1.8);
      }
      this.hud.setTimer(null);
      return;
    }
    const prev = ch.time;
    ch.time += dt;
    const left = ch.timeLimit - ch.time;
    if (left < 5 && Math.ceil(left) !== Math.ceil(ch.timeLimit - prev)) sfx.tick();
    this.hud.setTimer(ch.time, ch.timeLimit);
    let won = false;
    if (ch.type === 'collect') {
      const got = level.challengeKibble.collect(p.x, p.y + 0.3, p.z, 0.95);
      for (const k of got) {
        ch.got++;
        sfx.kibble();
        this.effects.sparkle(k, 0xc78bff);
      }
      won = ch.got >= level.challengeKibble.total;
    } else {
      const goalBox = ch.boxes[ch.boxes.length - 1];
      won = this.player.grounded && this.player.groundBox === goalBox;
      // "Yere Basma!": yere değen kaybeder
      if (!won && ch.type === 'nofloor' && this.player.grounded && this.player.groundBox?.kind === 'floor') {
        this.level.setChallengeActive(false);
        this.hud.setTimer(null);
        sfx.error();
        this.hud.toast('🦶 Yere bastın! Tekrar dene 💪', 2);
        return;
      }
    }
    if (won) {
      this.endChallenge(true);
    } else if (ch.time >= ch.timeLimit) {
      this.endChallenge(false);
    }
  }

  endChallenge(success) {
    const ch = this.level.challenge;
    const time = ch.time;
    this.level.setChallengeActive(false);
    this.hud.setTimer(null);
    if (success) {
      sfx.win();
      this.effects.sparkle({ x: this.player.pos.x, y: this.player.pos.y + 1, z: this.player.pos.z }, 0xc78bff);
      const best = this.lsave.challengeBest;
      if (best === null || time < best) this.lsave.challengeBest = time;
      const it = itemById(ch.reward);
      if (grant(ch.reward)) {
        this.player.model.setEquipped(save.equipped);
        this.hud.toast(`🏆 ${time.toFixed(1)} sn! Ödül: ${it.name}!`, 3.5);
      } else {
        this.hud.toast(`🏆 ${time.toFixed(1)} sn! Süper!`, 2.5);
      }
      persist();
    } else {
      this.hud.toast('⏱️ Süre bitti! Tekrar dene 💪', 2);
    }
  }

  bark(dog) {
    const player = this.player;
    dog.barked();
    sfx.bark();
    // Bahçenin girişine doğru savrulur (can gitmez)
    const a = dog.area;
    const back = dog.spec.pushZ ?? -1;
    player.vel.x = 0;
    player.vel.z = back * 10;
    player.vel.y = 7;
    player.grounded = false;
    player.climbing = false;
    player.hurtT = 0.8;
    this.effects.burst({ x: dog.pos.x, y: 1.8, z: dog.pos.z + 1 }, { color: 0xffffff, count: 6, speed: 3, size: 0.12, life: 0.4 });
    this.hud.toast(dog.spec.toast || '🐶 Hav! Köpek uyurken geç!', 1.8);
    void a;
  }

  // Köstebek tünelleri: deliğe basınca öbür uçtan çık
  updateTunnels() {
    const player = this.player, p = player.pos;
    if (this.tunnelLock) {
      if ((p.x - this.tunnelLock.x) ** 2 + (p.z - this.tunnelLock.z) ** 2 > 1.6) this.tunnelLock = null;
      return;
    }
    for (const tn of this.level.tunnels) {
      for (const [from, to] of [[tn.a, tn.b], [tn.b, tn.a]]) {
        if (Math.abs(p.y - from.y) < 0.4 && (p.x - from.x) ** 2 + (p.z - from.z) ** 2 < 0.45) {
          this.effects.poof({ x: p.x, y: p.y + 0.2, z: p.z });
          p.x = to.x; p.y = to.y + 0.01; p.z = to.z;
          player.vel.x = player.vel.z = 0;
          this.effects.poof({ x: to.x, y: to.y + 0.3, z: to.z });
          sfx.teleport();
          this.tunnelLock = to;
          this.cam.snap(p, this.cam.yaw);
          return;
        }
      }
    }
  }

  // İtme bölgeleri (musluk suyu) ve ortam kabarcıkları
  updateZones(dt) {
    const level = this.level, player = this.player, p = player.pos;
    this.fxT = (this.fxT || 0) + dt;
    const tick = this.fxT > 0.08;
    if (tick) this.fxT = 0;
    for (const z of level.zones) {
      if (!z.on) continue;
      const b = z.box;
      if (z.type === 'push' && p.x + player.hw > b.minX && p.x - player.hw < b.maxX && p.z + player.hw > b.minZ && p.z - player.hw < b.maxZ && p.y < b.maxY && p.y + player.h > b.minY) {
        if (z.f[0]) moveAxis(level.world, player, 'x', z.f[0] * dt, false);
        if (z.f[2]) moveAxis(level.world, player, 'z', z.f[2] * dt, false);
        if (!this.pushT || this.now - this.pushT > 0.6) { sfx.splash(); this.pushT = this.now; if (z.toast) this.hud.toast(z.toast, 1.3); }
      }
      if (tick && z.vis === 'spray') {
        for (let k = 0; k < 3; k++) this.effects.burst({ x: b.minX + Math.random() * (b.maxX - b.minX), y: b.maxY - 0.3, z: b.minZ + Math.random() * (b.maxZ - b.minZ) }, { color: 0x8fd3ff, count: 1, speed: 1, size: 0.09, life: 0.5, gravity: 8, up: 0.5 });
      }
      if (tick && z.vis === 'stream') this.effects.burst({ x: (b.minX + b.maxX) / 2, y: b.minY + 0.1, z: (b.minZ + b.maxZ) / 2 }, { color: 0x8fd3ff, count: 2, speed: 2, size: 0.08, life: 0.4, gravity: 10, up: 2 });
    }
    if (this.levelData.theme.bubbles && tick && Math.random() < 0.35) {
      const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 5;
      this.effects.bubble({ x: p.x + Math.cos(a) * r, y: p.y + Math.random() * 2, z: p.z + Math.sin(a) * r });
    }
  }

  // Plakalar (üstüne bas) ve düğmeler (pati ya da üstüne zıpla)
  updateSwitches(paw) {
    const player = this.player;
    for (const sw of this.level.switches) {
      if (sw.type === 'plate') {
        const on = sw.standing(player);
        if (on && !sw.on) this.pressSwitch(sw, true);
        else if (!on && sw.on && sw.spec.hold) this.pressSwitch(sw, false);
      } else if (!sw.on) {
        const stomp = player.grounded && player.groundBox === sw.box;
        let hit = false;
        if (paw && !player.pawHits.has(sw) && sphereHitsBox(paw, sw.aabb())) { player.pawHits.add(sw); hit = true; }
        if (stomp || hit) this.pressSwitch(sw, true);
      }
    }
  }

  pressSwitch(sw, on) {
    if (!sw.set(on)) return;
    const level = this.level;
    if (sw.type === 'plate') sfx.plate(); else sfx.button();
    if (on) {
      this.effects.sparkle({ x: sw.pos.x, y: sw.pos.y + 0.6, z: sw.pos.z }, sw.color.getHex());
      if (sw.bulb) this.effects.sparkle(sw.bulb.position, sw.color.getHex());
    }
    for (const [gid, val] of sw.spec.targets || []) this.setGroup(gid, on ? val : !val);
    if (on && sw.spec.toast) this.hud.toast(sw.spec.toast, 2.2);
    for (const pz of level.puzzles) {
      if (pz.done || !pz.need.includes(sw.id)) continue;
      const n = this.puzzleCount(pz);
      if (n === pz.need.length) {
        pz.done = true;
        for (const [gid, val] of pz.targets) this.setGroup(gid, val);
        if (pz.toast) this.hud.toast(pz.toast, 2.6);
      } else if (on) {
        this.hud.toast(`${pz.task} ${n}/${pz.need.length}`, 1.4);
      }
    }
  }

  puzzleCount(pz) {
    return pz.need.filter((id) => this.level.switches.find((s) => s.id === id)?.on).length;
  }

  setGroup(id, on) {
    const pts = this.level.setGroup(id, on);
    pts.forEach((pt, i) => setTimeout(() => this.effects.sparkle(pt, 0xfff1b8), i * 120));
    if (pts.length) sfx.appear();
  }

  // ---- Oda patronu ----
  updateBoss(dt, speedK, paw, pBox, input) {
    const boss = this.level.boss;
    const player = this.player;
    const p = player.pos;
    if (!boss.started && boss.inArena(p) && player.grounded) this.startBoss();
    boss.update(dt, speedK, player);
    if (!boss.started) return;
    const box = boss.aabb();
    const busy = boss.state === 'hurt';

    if (paw && !player.pawHits.has(boss) && sphereHitsBox(paw, box)) {
      player.pawHits.add(boss);
      if (boss.stunned) this.bossHit();
      else if (!busy) { sfx.bonk(); this.hud.toast(boss.spec.tip || '🛡️ Önce sersemlet!', 1.6); }
    }
    if (!boss.alive || !aabbOverlap(pBox, box)) return;
    const fromAbove = p.y >= boss.pos.y + boss.h * 0.4 && player.vel.y <= 1;
    if (fromAbove) {
      player.bounceOffEnemy();
      if (input.jumpHeld) player.vel.y = 12;
      if (boss.stunned) this.bossHit();
      else if (!busy) { sfx.bonk(); this.hud.toast(boss.spec.tip || '🛡️ Önce sersemlet!', 1.6); }
    } else if (boss.harmful && player.hurtT <= 0) {
      this.hurt(boss.pos.x, boss.pos.z);
      boss.hitPlayer();
    }
  }

  startBoss() {
    const boss = this.level.boss;
    boss.start();
    setMusic('boss');
    this.hud.setBoss(boss.name, boss.hp, boss.maxHp);
    if (boss.spec.intro) this.hud.toast(boss.spec.intro, 3.2);
    // Arena kapısı kapanırsa dışarıda doğmamak için kayıt noktası arenaya taşınır
    if (boss.spec.respawn) { const [x, y, z] = boss.spec.respawn; this.run.checkpoint = { x, y, z }; }
    this.setGroup('gate', true);
  }

  bossHit() {
    const boss = this.level.boss;
    const hp = boss.takeHit();
    sfx.bossHit();
    this.effects.burst({ x: boss.pos.x, y: boss.pos.y + 1, z: boss.pos.z }, { color: 0xffffff, count: 12, speed: 4, size: 0.16, life: 0.5 });
    this.hud.setBoss(boss.name, Math.max(0, hp), boss.maxHp);
    if (hp <= 0) this.bossDefeated();
    else this.hud.toast(hp === 2 ? '💥 Bam! Bir daha!' : '💥 Süper! Son bir vuruş!', 1.6);
  }

  bossDefeated() {
    const boss = this.level.boss;
    const at = { x: boss.pos.x, y: boss.pos.y + 0.6, z: boss.pos.z };
    boss.kill();
    sfx.poof();
    sfx.victory();
    this.effects.poof(at);
    this.effects.confetti(at);
    this.run.kibble += 15;
    save.kibble += 15;
    this.level.bell.reveal(at.x, 1.3, at.z);
    this.hud.setBoss(null);
    this.hud.toast(boss.spec.outro || '🎉 Yendin! Çanı al!', 3);
    setMusic(this.levelData.theme.music || 'salon');
    this.setGroup('gate', false);
    // Kalan küçük yardımcılar da kaçar
    for (const e of this.level.enemies) if (e.minion && e.alive) { this.effects.poof(e.pos); e.kill(); }
  }

  spawnMinions(n) {
    const level = this.level, boss = level.boss;
    const a = boss.arena;
    for (let i = 0; i < n; i++) {
      const e = createEnemy(level.root, { type: 'roamer', area: [a.x0 + 2, a.z0 + 2, a.x1 - 2, a.z1 - 2] }, level.world);
      e.minion = true;
      e.pos.set(boss.pos.x + (i ? 1.5 : -1.5), boss.pos.y, boss.pos.z + 1);
      e.g.position.copy(e.pos);
      e.events = { squeak: () => sfx.squeak(), alert: () => sfx.alert() };
      level.enemies.push(e);
      this.effects.poof({ x: e.pos.x, y: e.pos.y + 0.3, z: e.pos.z });
    }
    sfx.squeak();
    this.hud.toast('🐭 Yardımcı fareler! Pati at!', 1.8);
  }

  taskText() {
    const level = this.level, run = this.run, data = this.levelData;
    const ch = level.challenge;
    if (ch?.running) return ch.type === 'collect' ? `💜 Mor mamalar ${ch.got}/${level.challengeKibble.total}` : ch.type === 'nofloor' ? '🚫 Yere basmadan bayrağa ulaş!' : '⏱️ Mor bayrağa ulaş!';
    const boss = level.boss;
    if (boss?.alive && boss.started) return boss.spec.task || '👑 Patronu yen!';
    if (run.bell) return '🚪 Kedi kapısına git!';
    for (const st of data.steps || []) if (!level.groupOn(st.until)) return st.text;
    for (const pz of level.puzzles) {
      if (pz.done) continue;
      const n = this.puzzleCount(pz);
      if (n > 0 || (pz.showWhen && level.groupOn(pz.showWhen))) return `${pz.task} ${n}/${pz.need.length}`;
    }
    return data.task || '🔔 Altın çanı bul!';
  }

  nearestHint(p) {
    let best = null, bd = 2.6 * 2.6;
    for (const h of this.levelData.hints || []) {
      const dx = h.p[0] - p.x, dz = h.p[2] - p.z, dy = h.p[1] - p.y;
      const d = dx * dx + dz * dz;
      if (d < bd && Math.abs(dy) < 2.5) { bd = d; best = h; }
    }
    if (!best) return null;
    return { icon: best.icon, text: touchUiEnabled() && best.touch ? best.touch : best.text };
  }

  complete() {
    if (this.state !== 'play') return;
    const run = this.run;
    this.state = 'complete';
    sfx.win();
    sfx.meow();
    const ls = this.lsave;
    const newBest = ls.bestTime === null || run.time < ls.bestTime;
    if (newBest) ls.bestTime = run.time;
    ls.done = true;
    persist();
    this.hud.show(false);
    showTouchControls(false);
    this.menus.complete({
      name: this.levelData.name,
      kibble: run.kibble,
      totalKibble: this.level.kibble.total,
      bones: run.bones,
      time: run.time,
      newBest: newBest && run.time > 0,
    });
  }
}

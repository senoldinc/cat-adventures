// Minnoş'un hareketi: koş, zıpla, çift zıpla, kuyrukla süzül, tırman, minderde zıpla.
import { moveAxis } from './physics.js';
import { CatModel } from './catModel.js';

const RUN = 6.5;
const ACC_GROUND = 50;
const ACC_AIR = 24;
const ACC_SOAP = 7;
const GRAVITY = 26;
const JUMP = 9.5;
const DOUBLE_JUMP = 8.4;
const MAX_FALL = 16;
const CLIMB = 3.6;
const BOUNCE = 13.5;
const LAUNCH = 17; // tost makinesi: ~5.5 birim yükseltir
const COYOTE = 0.1;
const BUFFER = 0.13;

export class Player {
  constructor(scene) {
    this.model = new CatModel();
    scene.add(this.model.root);
    this.pos = { x: 0, y: 0, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.hw = 0.28;
    this.h = 0.6;
    this.yaw = 0;
    this.events = {};
    this.reset({ x: 0, y: 0, z: 0 }, 0);
  }

  reset(p, yaw = 0) {
    this.pos.x = p.x; this.pos.y = p.y + 0.01; this.pos.z = p.z;
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.yaw = yaw;
    this.grounded = false;
    this.groundBox = null;
    this.coyote = 0;
    this.buffer = 0;
    this.airJumps = 1;
    this.gliding = false;
    this.glideT = 0;
    this.climbing = false;
    this.climbNormal = null;
    this.climbBox = null;
    this.climbCooldown = 0;
    this.jumpCut = true;
    this.hurtT = 0;
    this.climbSoundT = 0;
    this.attackT = 0;
    this.pawCooldown = 0;
    this.pawHits = new Set();
    this.model.root.position.set(this.pos.x, this.pos.y, this.pos.z);
  }

  emit(name, arg) {
    const f = this.events[name];
    if (f) f(arg);
  }

  knockback(fromX, fromZ) {
    let dx = this.pos.x - fromX, dz = this.pos.z - fromZ;
    const l = Math.hypot(dx, dz) || 1;
    this.vel.x = (dx / l) * 7;
    this.vel.z = (dz / l) * 7;
    this.vel.y = 6;
    this.grounded = false;
    this.climbing = false;
    this.climbCooldown = 0.3;
  }

  // Pati at: tırmanırken yapılamaz. Başarılıysa true döner.
  paw() {
    if (this.pawCooldown > 0 || this.climbing) return false;
    this.attackT = 0.3;
    this.pawCooldown = 0.35;
    this.pawHits = new Set();
    this.model.paw();
    return true;
  }

  // Vuruş yalnızca saldırının ilk 0.15 saniyesinde etkilidir
  get pawActive() { return this.attackT > 0.15; }

  // Kedinin önündeki vuruş alanı (küre merkezi + yarıçap)
  pawHitbox() {
    return {
      x: this.pos.x + Math.sin(this.yaw) * 0.7,
      y: this.pos.y + 0.4,
      z: this.pos.z + Math.cos(this.yaw) * 0.7,
      r: 0.85,
    };
  }

  bounceOffEnemy() {
    this.vel.y = 10;
    this.grounded = false;
    this.airJumps = 1;
    this.glideT = 0;
    this.jumpCut = true;
  }

  update(dt, input, camYaw, world, helper) {
    const p = this.pos, v = this.vel;

    // Hareketli platform taşıması
    if (this.grounded && this.groundBox && (this.groundBox.dx || this.groundBox.dy || this.groundBox.dz)) {
      p.x += this.groundBox.dx; p.y += this.groundBox.dy; p.z += this.groundBox.dz;
    }

    // Yükselen/kayan bir platform ayakların altına girdiyse üstüne çık (yandan itilip düşme)
    for (const b of world.overlaps(p.x - this.hw, p.y, p.z - this.hw, p.x + this.hw, p.y + this.h, p.z + this.hw)) {
      if ((b.dx || b.dy || b.dz) && b.maxY - p.y <= 0.45) {
        p.y = b.maxY + 0.0005;
        if (v.y < 0) v.y = 0;
        this.grounded = true;
        this.groundBox = b;
      }
    }

    // Kameraya göre istek yönü
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    const rx = -Math.cos(camYaw), rz = Math.sin(camYaw);
    const wx = fx * input.moveY + rx * input.moveX;
    const wz = fz * input.moveY + rz * input.moveX;

    this.climbCooldown = Math.max(0, this.climbCooldown - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.attackT = Math.max(0, this.attackT - dt);
    this.pawCooldown = Math.max(0, this.pawCooldown - dt);
    if (input.jumpPressed) this.buffer = BUFFER;
    else this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = this.grounded ? COYOTE : Math.max(0, this.coyote - dt);

    if (this.climbing) {
      this.updateClimb(dt, input, wx, wz, world);
    } else {
      this.updateNormal(dt, input, wx, wz, world, helper);
    }

    this.model.root.position.set(p.x, p.y, p.z);
    this.model.root.rotation.y = this.yaw;
    this.model.root.visible = this.hurtT <= 0 || Math.floor(this.hurtT * 12) % 2 === 0;
    this.model.update(dt, {
      speed: Math.hypot(v.x, v.z),
      grounded: this.grounded,
      vy: v.y,
      gliding: this.gliding,
      climbing: this.climbing,
      climbSpeed: this.climbing ? v.y / CLIMB : 0,
    });
  }

  updateNormal(dt, input, wx, wz, world, helper) {
    const p = this.pos, v = this.vel;

    // Yatay ivme
    // Sabun köpüğünde kayar: ivme çok düşük, kedi yön değiştirmekte zorlanır
    const slippery = this.grounded && this.groundBox?.kind === 'soap';
    const acc = this.grounded ? (slippery ? ACC_SOAP : ACC_GROUND) : ACC_AIR;
    const speed = this.gliding ? RUN * 1.1 : RUN;
    const tx = wx * speed, tz = wz * speed;
    const dvx = tx - v.x, dvz = tz - v.z;
    const dl = Math.hypot(dvx, dvz);
    const maxDv = acc * dt;
    if (dl > maxDv) { v.x += (dvx / dl) * maxDv; v.z += (dvz / dl) * maxDv; }
    else { v.x = tx; v.z = tz; }

    // Zıplama
    if (this.buffer > 0 && (this.grounded || this.coyote > 0)) {
      v.y = JUMP;
      this.grounded = false;
      this.coyote = 0;
      this.buffer = 0;
      this.jumpCut = false;
      this.emit('jump');
    } else if (input.jumpPressed && !this.grounded && this.airJumps > 0) {
      v.y = DOUBLE_JUMP;
      this.airJumps--;
      this.buffer = 0;
      this.jumpCut = false;
      this.glideT = Math.max(0, this.glideT - 0.4);
      this.emit('doubleJump');
    }

    // Değişken zıplama yüksekliği
    if (!this.jumpCut && !input.jumpHeld && v.y > 0) {
      v.y *= 0.5;
      this.jumpCut = true;
    }

    // Süzülme
    const glideMax = helper ? 4 : 1.8;
    const glideFall = helper ? 1.0 : 1.8;
    const wasGliding = this.gliding;
    // Baca hava akımında (updraft) yükselirken de süzülme duruşu sürer
    this.gliding = !this.grounded && input.jumpHeld && (v.y <= 0 || this.updraft) && this.glideT < glideMax;
    if (this.gliding && !wasGliding) this.emit('glide');

    // Yerçekimi
    v.y -= GRAVITY * dt;
    if (this.gliding) {
      this.glideT += dt;
      v.y = Math.max(v.y, -glideFall);
    }
    v.y = Math.max(v.y, -MAX_FALL);

    // Eksen eksen hareket
    const wasGrounded = this.grounded;
    const fallSpeed = -v.y;
    let wall = null;
    const cx = moveAxis(world, this, 'x', v.x * dt, wasGrounded);
    if (cx) { if (cx.box.climbable) wall = cx; v.x = 0; }
    const cz = moveAxis(world, this, 'z', v.z * dt, wasGrounded);
    if (cz) { if (cz.box.climbable) wall = cz; v.z = 0; }

    this.grounded = false;
    const cy = moveAxis(world, this, 'y', v.y * dt, false);
    if (cy) {
      if (cy.normal[1] > 0) {
        this.grounded = true;
        this.groundBox = cy.box;
        v.y = 0;
      } else {
        v.y = Math.min(v.y, 0);
        this.jumpCut = true;
      }
    }

    if (this.grounded) {
      this.airJumps = 1;
      this.glideT = 0;
      this.gliding = false;
      if (!wasGrounded) this.emit('land', fallSpeed);
      if (this.groundBox.bouncy || this.groundBox.kind === 'launch') {
        const launch = this.groundBox.kind === 'launch';
        v.y = launch ? LAUNCH : BOUNCE;
        this.grounded = false;
        this.jumpCut = true;
        this.emit(launch ? 'launch' : 'bounce');
      }
    }

    // Tırmanmaya başla: tırmanılabilir yüzeye doğru ilerlerken
    if (wall && this.climbCooldown <= 0) {
      const n = wall.normal;
      const into = -(wx * n[0] + wz * n[2]);
      if (into > 0.5) {
        this.climbing = true;
        this.climbNormal = n;
        this.climbBox = wall.box;
        this.gliding = false;
        v.x = v.z = 0;
        v.y = 0;
        this.airJumps = 1;
        this.glideT = 0;
        this.emit('climbStart');
      }
    }

    // Yön
    const hs = Math.hypot(v.x, v.z);
    if (hs > 0.4) {
      const target = Math.atan2(v.x, v.z);
      let diff = target - this.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.yaw += diff * Math.min(1, dt * 14);
    }
  }

  updateClimb(dt, input, wx, wz, world) {
    const p = this.pos, v = this.vel;
    const n = this.climbNormal;
    const into = -(wx * n[0] + wz * n[2]);
    const tx = -n[2], tz = n[0];
    const lat = wx * tx + wz * tz;

    this.yaw = Math.atan2(-n[0], -n[2]);
    this.gliding = false;

    if (input.jumpPressed) {
      // Duvardan geri zıpla
      this.climbing = false;
      this.climbCooldown = 0.35;
      v.x = n[0] * 5; v.z = n[2] * 5; v.y = JUMP * 0.95;
      this.jumpCut = false;
      this.yaw = Math.atan2(n[0], n[2]);
      this.emit('jump');
      return;
    }

    v.y = into * CLIMB;
    v.x = tx * lat * CLIMB * 0.7 - n[0] * 0.5;
    v.z = tz * lat * CLIMB * 0.7 - n[2] * 0.5;

    moveAxis(world, this, 'x', v.x * dt, false);
    moveAxis(world, this, 'z', v.z * dt, false);
    const cy = moveAxis(world, this, 'y', v.y * dt, false);
    if (cy && cy.normal[1] > 0 && into < -0.3) {
      this.climbing = false;
      this.grounded = true;
      this.groundBox = cy.box;
      this.climbCooldown = 0.4;
      return;
    }
    if (Math.abs(v.y) > 0.5) {
      this.climbSoundT -= dt;
      if (this.climbSoundT <= 0) { this.emit('climb'); this.climbSoundT = 0.18; }
    }

    // Hâlâ yüzeye değiyor mu?
    const b = this.climbBox;
    const px = p.x - n[0] * 0.08, pz = p.z - n[2] * 0.08;
    const touching = px - this.hw < b.maxX && px + this.hw > b.minX && pz - this.hw < b.maxZ && pz + this.hw > b.minZ && p.y < b.maxY && p.y + this.h > b.minY;
    if (!touching) {
      this.climbing = false;
      this.climbCooldown = 0.3;
      if (p.y >= b.maxY - 0.35 && into > 0) {
        // Kenardan yukarı çık
        v.y = 6.5;
        v.x = -n[0] * 3.5;
        v.z = -n[2] * 3.5;
        this.jumpCut = true;
        this.emit('ledge');
      } else {
        v.x = n[0] * 1.5;
        v.z = n[2] * 1.5;
        v.y = 0;
      }
    }
  }
}

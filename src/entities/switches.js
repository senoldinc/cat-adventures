// Anahtarlar: basınç plakası (üstüne bas) ve büyük düğme (pati at ya da üstüne zıpla).
// Basılınca hedef grupları açar/kapatır; isteğe bağlı bir ampul aynı renkte yanar.
import * as THREE from 'three';
import { mat } from '../props.js';

export class Switch {
  constructor(scene, spec, world) {
    this.spec = spec;
    this.id = spec.id;
    this.type = spec.type || 'button';
    this.color = new THREE.Color(spec.c || '#ff4d4d');
    this.pos = new THREE.Vector3(...spec.p);
    this.on = false;
    this.pressT = 0;
    this.g = new THREE.Group();
    this.g.position.copy(this.pos);
    scene.add(this.g);

    if (this.type === 'plate') {
      // Yere gömülü yuvarlak plaka
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.08, 20), mat(0xf4ead5));
      rim.position.y = 0.04;
      rim.receiveShadow = true;
      this.g.add(rim);
      this.top = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 0.12, 20), mat(this.color, { emissive: this.color, emissiveIntensity: 0.15 }));
      this.top.position.y = 0.1;
      this.g.add(this.top);
      const paw = new THREE.Mesh(new THREE.CircleGeometry(0.22, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      paw.rotation.x = -Math.PI / 2;
      paw.position.y = 0.165;
      this.top.add(paw);
      this.paw = paw;
      this.r = 0.85;
    } else if (this.type === 'valve') {
      // Vana: kaide + boru + üstte kırmızı çark. Pati ya da üstüne zıplama çevirir.
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.5, 12), mat(0xc7ccd6, { metalness: 0.5, roughness: 0.35 }));
      base.position.y = 0.25;
      this.g.add(base);
      this.wheel = new THREE.Group();
      this.wheel.position.y = 0.62;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 6, 16), mat(this.color));
      rim.rotation.x = Math.PI / 2;
      this.wheel.add(rim);
      for (let i = 0; i < 3; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 0.08), mat(this.color));
        spoke.rotation.y = (i / 3) * Math.PI;
        this.wheel.add(spoke);
      }
      this.top = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 8), mat(0xffd166, { emissive: 0xffd166, emissiveIntensity: 0.1 }));
      this.wheel.add(this.top);
      this.g.add(this.wheel);
      this.spinT = 0;
      this.box = world.add({
        minX: this.pos.x - 0.5, maxX: this.pos.x + 0.5, minY: this.pos.y, maxY: this.pos.y + 0.5,
        minZ: this.pos.z - 0.5, maxZ: this.pos.z + 0.5, kind: 'switch',
      });
    } else {
      // Kaide + kubbe düğme. Kaide katıdır; üstüne zıplamak da düğmeye basar.
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.5, 14), mat(0xf4ead5));
      base.position.y = 0.25;
      this.g.add(base);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 6, 16), mat(0x8a8f9c));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.5;
      this.g.add(ring);
      this.top = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(this.color, { emissive: this.color, emissiveIntensity: 0.1 }));
      this.top.position.y = 0.5;
      this.top.scale.y = 0.7;
      this.g.add(this.top);
      this.box = world.add({
        minX: this.pos.x - 0.5, maxX: this.pos.x + 0.5, minY: this.pos.y, maxY: this.pos.y + 0.5,
        minZ: this.pos.z - 0.5, maxZ: this.pos.z + 0.5, kind: 'switch',
      });
    }
    this.g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    // Hedefin yanında yanan ampul
    if (spec.bulb) {
      this.bulb = new THREE.Group();
      this.bulb.position.set(...spec.bulb);
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.25, 8), mat(0x777777));
      sock.position.y = 0.38;
      this.bulb.add(sock);
      this.bulbMat = new THREE.MeshStandardMaterial({ color: this.color.clone().multiplyScalar(0.35), emissive: this.color, emissiveIntensity: 0, roughness: 0.3 });
      const glass = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), this.bulbMat);
      this.bulb.add(glass);
      scene.add(this.bulb);
    }
  }

  // Pati vuruş alanı için kutu
  aabb() {
    const p = this.pos;
    return { minX: p.x - 0.55, maxX: p.x + 0.55, minY: p.y, maxY: p.y + 0.9, minZ: p.z - 0.55, maxZ: p.z + 0.55 };
  }

  // Oyuncu plakanın üstünde duruyor mu?
  standing(player) {
    const p = player.pos;
    return player.grounded && Math.abs(p.y - this.pos.y) < 0.35 && (p.x - this.pos.x) ** 2 + (p.z - this.pos.z) ** 2 < this.r * this.r;
  }

  set(on) {
    if (this.on === on) return false;
    this.on = on;
    this.pressT = on ? 0.25 : 0;
    if (on) this.spinT = 2.5;
    this.top.material.emissiveIntensity = on ? 0.9 : 0.12;
    if (this.bulbMat) {
      this.bulbMat.emissiveIntensity = on ? 1.6 : 0;
      this.bulbMat.color.copy(on ? this.color : this.color.clone().multiplyScalar(0.35));
    }
    return true;
  }

  update(dt, t) {
    this.pressT = Math.max(0, this.pressT - dt);
    if (this.type === 'plate') {
      this.top.position.y = this.on ? 0.05 : 0.1;
    } else if (this.type === 'valve') {
      if (this.spinT > 0) { this.spinT -= dt; this.wheel.rotation.y += dt * 6; }
      if (!this.on) this.top.material.emissiveIntensity = 0.12 + (Math.sin(t * 4) + 1) * 0.25;
    } else {
      const squish = this.on ? 0.3 : 0.7;
      this.top.scale.y += (squish - this.top.scale.y) * Math.min(1, dt * 18);
      // Basılmamışken hafifçe nabız gibi parlar: "bana bas!"
      if (!this.on) this.top.material.emissiveIntensity = 0.12 + (Math.sin(t * 4) + 1) * 0.12;
    }
    if (this.bulb) this.bulb.rotation.y = Math.sin(t * 2) * 0.1;
  }
}

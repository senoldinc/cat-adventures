// Görsel dekor ve kutulara "görünüm" ekleyen yardımcılar. Çarpışma yok.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, ...extra });

export function boxMesh(size, color, radius = 0) {
  const [w, h, d] = size;
  const r = Math.min(radius, w / 2.01, h / 2.01, d / 2.01);
  const geo = r > 0.01 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat(color));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function add(g, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

const BOOK_COLORS = [0xe8574a, 0x5ab0e8, 0xffd166, 0x7bc96f, 0xb56fd6, 0xff9f6b, 0x3fb7a8];

// Kutunun üstüne/yanına detay ekler (yerel koordinatta, kutu merkezli)
export function decorateBox(mesh, look, size, color) {
  const [w, h, d] = size;
  if (look === 'books') {
    // Yığın: farklı renkli kitap katmanları
    const layers = Math.max(1, Math.round(h / 0.25));
    mesh.material.visible = false;
    mesh.castShadow = false;
    for (let i = 0; i < layers; i++) {
      const lh = h / layers;
      const off = (i % 2 ? 0.06 : -0.05) * w;
      const b = add(mesh, new THREE.BoxGeometry(w * 0.96, lh * 0.94, d * 0.96), mat(BOOK_COLORS[(i * 3 + Math.floor(w * 10)) % BOOK_COLORS.length]), off * 0.3, -h / 2 + lh * (i + 0.5), off * 0.2);
      add(b, new THREE.BoxGeometry(w * 0.9, lh * 0.7, 0.02), mat(0xfffbef), 0, 0, d * 0.48 + 0.005);
    }
  } else if (look === 'curtain') {
    mesh.material.visible = false;
    mesh.castShadow = false;
    const folds = 5;
    for (let i = 0; i < folds; i++) {
      add(mesh, new THREE.CylinderGeometry(d / folds / 1.6, d / folds / 1.3, h, 6), mat(i % 2 ? color : 0xff85a8), -w * 0.2, 0, -d / 2 + (d / folds) * (i + 0.5));
    }
    const rod = add(mesh, new THREE.CylinderGeometry(0.08, 0.08, d + 1.2, 8), mat(0xc79a3a, { metalness: 0.5 }), -w * 0.2, h / 2 + 0.1, 0);
    rod.rotation.x = Math.PI / 2;
  } else if (look === 'toybox') {
    add(mesh, new THREE.BoxGeometry(w * 1.04, 0.2, d * 1.04), mat(0xffd166), 0, h / 2 - 0.1, 0);
    add(mesh, new THREE.BoxGeometry(0.02, h * 0.4, d * 0.4), mat(0xffffff), w / 2 + 0.01, 0, 0).material.color.set(0xff5fa2);
    add(mesh, new THREE.SphereGeometry(0.25, 8, 6), mat(0xffd166), w / 2 + 0.05, 0, 0);
  } else if (look === 'block') {
    for (const sx of [-1, 1]) add(mesh, new THREE.BoxGeometry(0.02, h * 0.5, h * 0.5), mat(0xffffff), (w / 2 + 0.01) * sx, 0, 0);
    add(mesh, new THREE.BoxGeometry(h * 0.5, h * 0.5, 0.02), mat(0x5ab0e8), 0, 0, -d / 2 - 0.01);
  } else if (look === 'tray') {
    for (const s of [-1, 1]) {
      add(mesh, new THREE.BoxGeometry(w, 0.15, 0.08), mat(0xbcbcbc), 0, 0.15, (d / 2) * s);
      add(mesh, new THREE.BoxGeometry(0.08, 0.15, d), mat(0xbcbcbc), (w / 2) * s, 0.15, 0);
    }
  } else if (look === 'cabinet') {
    for (const s of [-1, 1]) {
      add(mesh, new THREE.BoxGeometry(w * 0.45, h * 0.75, 0.04), mat(0xb57e52), (w / 4) * s, 0, -d / 2 - 0.02);
      add(mesh, new THREE.SphereGeometry(0.08, 6, 4), mat(0xffd166), 0.25 * s, 0, -d / 2 - 0.08);
    }
  } else if (look === 'tv') {
    const scr = add(mesh, new THREE.BoxGeometry(w * 0.9, h * 0.85, 0.02), new THREE.MeshBasicMaterial({ color: 0x3a6ea5 }), 0, 0, -d / 2 - 0.01);
    // Ekranda bir balık resmi
    add(scr, new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffa94d }), 0, 0, -0.02).scale.set(1.4, 0.8, 0.1);
    add(scr, new THREE.ConeGeometry(0.3, 0.4, 3), new THREE.MeshBasicMaterial({ color: 0xffa94d }), 0.7, 0, -0.02).rotation.z = Math.PI / 2;
  } else if (look === 'wallshelf') {
    for (const s of [-1, 1]) {
      const br = add(mesh, new THREE.BoxGeometry(0.15, 0.8, 0.8), mat(0x8a5a32), (w / 3) * s, -0.5, d / 2 - 0.4);
      br.rotation.x = 0;
    }
  }
}

export function buildProp(spec) {
  const g = new THREE.Group();
  const [x, y, z] = spec.p;
  g.position.set(x, y, z);
  if (spec.rot) g.rotation.y = (spec.rot * Math.PI) / 180;
  switch (spec.type) {
    case 'rug': {
      const [w, d] = spec.s;
      const rug = add(g, new THREE.BoxGeometry(w, 0.04, d), mat(spec.c), 0, 0.02, 0);
      rug.castShadow = false;
      add(g, new THREE.BoxGeometry(w * 0.8, 0.045, d * 0.75), mat(0xfff3e0), 0, 0.022, 0).castShadow = false;
      add(g, new THREE.BoxGeometry(w * 0.6, 0.05, d * 0.5), mat(spec.c), 0, 0.024, 0).castShadow = false;
      break;
    }
    case 'window': {
      const frame = mat(0xffffff);
      add(g, new THREE.BoxGeometry(3.6, 3.6, 0.1), frame, 0, 0, 0);
      const glass = add(g, new THREE.BoxGeometry(3.2, 3.2, 0.12), new THREE.MeshBasicMaterial({ color: 0xbfe6ff }), 0, 0, 0);
      glass.castShadow = false;
      add(g, new THREE.BoxGeometry(0.12, 3.2, 0.14), frame, 0, 0, 0);
      add(g, new THREE.BoxGeometry(3.2, 0.12, 0.14), frame, 0, 0, 0);
      add(g, new THREE.BoxGeometry(4, 0.2, 0.4), frame, 0, -1.9, 0.15);
      // Bulut
      add(g, new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), -0.7, 0.8, 0.07).scale.set(1.6, 0.8, 0.1);
      break;
    }
    case 'frame': {
      add(g, new THREE.BoxGeometry(2.4, 1.8, 0.1), mat(0xc79a3a), 0, 0, 0);
      add(g, new THREE.BoxGeometry(2.1, 1.5, 0.12), mat(0xfff7e8), 0, 0, 0);
      add(g, new THREE.SphereGeometry(0.4, 8, 6), mat(spec.c), 0, -0.1, 0.06).scale.set(1, 1, 0.1);
      add(g, new THREE.ConeGeometry(0.2, 0.3, 3), mat(spec.c), -0.25, 0.35, 0.06);
      add(g, new THREE.ConeGeometry(0.2, 0.3, 3), mat(spec.c), 0.25, 0.35, 0.06);
      break;
    }
    case 'lamp': {
      add(g, new THREE.CylinderGeometry(0.6, 0.7, 0.15, 10), mat(0x6b4226), 0, 0.075, 0);
      add(g, new THREE.CylinderGeometry(0.08, 0.08, 5, 6), mat(0xc79a3a), 0, 2.5, 0);
      add(g, new THREE.CylinderGeometry(0.7, 1.2, 1.3, 10, 1, true), mat(0xfff0b3, { side: THREE.DoubleSide, emissive: 0xffd36b, emissiveIntensity: 0.5 }), 0, 5.2, 0);
      const light = new THREE.PointLight(0xffd59a, 6, 10, 1.5);
      light.position.set(0, 4.8, 0);
      g.add(light);
      break;
    }
    case 'plant': {
      add(g, new THREE.CylinderGeometry(0.6, 0.45, 1.1, 8), mat(0xd9734a), 0, 0.55, 0);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const leaf = add(g, new THREE.ConeGeometry(0.25, 1.8, 4), mat(i % 2 ? 0x4caf50 : 0x66c26a), Math.cos(a) * 0.3, 1.9, Math.sin(a) * 0.3);
        leaf.rotation.z = Math.cos(a) * -0.5;
        leaf.rotation.x = Math.sin(a) * 0.5;
      }
      break;
    }
    case 'duck': {
      const yellow = mat(0xffd84d);
      add(g, new THREE.SphereGeometry(0.35, 8, 6), yellow, 0, 0.2, 0).scale.set(1.2, 0.8, 1);
      add(g, new THREE.SphereGeometry(0.22, 8, 6), yellow, 0.25, 0.55, 0);
      add(g, new THREE.ConeGeometry(0.08, 0.2, 4), mat(0xff8a3d), 0.5, 0.53, 0).rotation.z = -Math.PI / 2;
      add(g, new THREE.SphereGeometry(0.04, 4, 4), mat(0x111111), 0.38, 0.62, 0.12);
      g.userData.bob = true;
      break;
    }
    case 'bookrows': {
      // Kitaplık rafları üzerinde arka sıradaki kitaplar (dekor)
      const shelves = [[1.65, 44.2, 47.8], [3.25, 48, 51.2], [4.85, 51.4, 54.6], [6.45, 54.7, 56.9], [0, 44.1, 57]];
      g.position.set(0, 0, 0);
      shelves.forEach(([sy, z0, z1], si) => {
        let zz = z0 + 0.1;
        let k = si;
        while (zz < z1 - 0.3) {
          const bw = 0.18 + ((k * 37) % 5) * 0.04;
          const bh = 0.8 + ((k * 13) % 4) * 0.12;
          const lean = (k * 7) % 9 === 0 ? 0.25 : 0;
          const b = add(g, new THREE.BoxGeometry(0.55, bh, bw), mat(BOOK_COLORS[k % BOOK_COLORS.length]), -11.65, sy + bh / 2, zz + bw / 2);
          b.rotation.x = lean;
          zz += bw + 0.02 + (lean ? 0.2 : 0);
          k++;
        }
      });
      break;
    }
    case 'clock': {
      add(g, new THREE.CylinderGeometry(0.9, 0.9, 0.12, 16), mat(0xffffff), 0, 0, 0).rotation.x = Math.PI / 2;
      add(g, new THREE.TorusGeometry(0.9, 0.08, 6, 16), mat(0xe8574a), 0, 0, 0.02);
      const h1 = add(g, new THREE.BoxGeometry(0.06, 0.5, 0.04), mat(0x333333), 0, 0.2, 0.08);
      const h2 = add(g, new THREE.BoxGeometry(0.06, 0.7, 0.04), mat(0x333333), 0, 0, 0.09);
      h2.geometry.translate(0, 0.3, 0);
      g.userData.clockHand = h2;
      h1.rotation.z = 0;
      break;
    }
  }
  return g;
}

// Ahşap zemin ve duvar kâğıdı için canvas dokuları
export function plankTexture(base, line) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = base;
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = line;
  x.lineWidth = 4;
  for (let i = 0; i <= 4; i++) {
    x.beginPath(); x.moveTo(0, i * 64); x.lineTo(256, i * 64); x.stroke();
    const off = (i % 2) * 128;
    x.beginPath(); x.moveTo(off + 64, i * 64); x.lineTo(off + 64, i * 64 + 64); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function stripeTexture(base, stripe) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = base;
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = stripe;
  x.fillRect(0, 0, 32, 128);
  x.fillRect(64, 0, 6, 128);
  x.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(96, 16 + i * 32, 4, 0, Math.PI * 2); x.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

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
  } else if (look === 'chair') {
    // Oturak + arkalık (arkalık yalnızca görsel, -x tarafında)
    mesh.material.visible = false;
    mesh.castShadow = false;
    const wood = mat(color);
    add(mesh, new THREE.BoxGeometry(w, 0.25, d), wood, 0, h / 2 - 0.125, 0);
    add(mesh, new THREE.BoxGeometry(w * 0.9, 0.08, d * 0.9), mat(0xffd166), 0, h / 2 + 0.03, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(mesh, new THREE.BoxGeometry(0.22, h - 0.25, 0.22), wood, (w / 2 - 0.15) * sx, -0.125, (d / 2 - 0.15) * sz);
    add(mesh, new THREE.BoxGeometry(0.22, h * 1.2, d), wood, -w / 2 + 0.11, h / 2 + h * 0.6, 0);
    add(mesh, new THREE.BoxGeometry(0.24, 0.3, d * 0.8), mat(0xffd166), -w / 2 + 0.11, h / 2 + h * 0.9, 0);
  } else if (look === 'table') {
    add(mesh, new THREE.BoxGeometry(w + 0.1, 0.06, d + 0.1), mat(0xffffff), 0, h / 2 + 0.01, 0).castShadow = false;
    // Kırmızı kareli örtü şeritleri
    for (let i = 0; i < 4; i++) add(mesh, new THREE.BoxGeometry(w + 0.12, 0.065, 0.5), mat(0xe8574a), 0, h / 2 + 0.012, -d / 2 + 0.6 + i * ((d - 1.2) / 3)).castShadow = false;
  } else if (look === 'cloth') {
    mesh.material.visible = false;
    mesh.castShadow = false;
    const n = 6;
    for (let i = 0; i < n; i++) add(mesh, new THREE.BoxGeometry(w * 0.6, h, d / n), mat(i % 2 ? 0xe8574a : 0xffffff), 0, 0, -d / 2 + (d / n) * (i + 0.5));
    for (let i = 0; i < n; i += 2) add(mesh, new THREE.ConeGeometry(0.1, 0.18, 4), mat(0xe8574a), 0, -h / 2 - 0.08, -d / 2 + (d / n) * (i + 0.5)).rotation.x = Math.PI;
  } else if (look === 'highchair') {
    mesh.material.visible = false;
    mesh.castShadow = false;
    const c = mat(color);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = add(mesh, new THREE.CylinderGeometry(0.1, 0.14, h - 0.4, 6), c, (w / 2 - 0.25) * sx, -0.2, (d / 2 - 0.25) * sz);
      leg.rotation.z = sx * 0.05;
    }
    add(mesh, new THREE.BoxGeometry(w, 0.4, d), c, 0, h / 2 - 0.2, 0);
    add(mesh, new THREE.BoxGeometry(w * 0.85, 0.06, d * 0.85), mat(0xfff3e0), 0, h / 2 + 0.02, 0);
    add(mesh, new THREE.BoxGeometry(w, 0.15, 0.15), c, 0, -h / 2 + 1.2, d / 2 - 0.25);
    add(mesh, new THREE.BoxGeometry(w, 0.15, 0.15), c, 0, -h / 2 + 1.2, -d / 2 + 0.25);
  } else if (look === 'counter') {
    // Tezgâh: kapaklar, çekmece çizgileri ve mermer üst
    add(mesh, new THREE.BoxGeometry(w + 0.2, 0.25, d + 0.04), mat(0xf2f2f2, { roughness: 0.4 }), 0.1, h / 2 + 0.12, 0);
    const doors = Math.max(1, Math.round(d / 1.8));
    for (let i = 0; i < doors; i++) {
      const z = -d / 2 + (d / doors) * (i + 0.5);
      add(mesh, new THREE.BoxGeometry(0.05, h * 0.55, d / doors - 0.25), mat(0xfff8e7), w / 2 + 0.02, -h * 0.15, z);
      add(mesh, new THREE.BoxGeometry(0.05, h * 0.18, d / doors - 0.25), mat(0xfff8e7), w / 2 + 0.02, h * 0.3, z);
      add(mesh, new THREE.BoxGeometry(0.1, 0.1, 0.5), mat(0xc79a3a, { metalness: 0.5 }), w / 2 + 0.07, h * 0.3, z);
    }
  } else if (look === 'sponge') {
    add(mesh, new THREE.BoxGeometry(w * 1.01, h * 0.35, d * 1.01), mat(0x5cc96b), 0, -h * 0.33, 0);
    for (let i = 0; i < 4; i++) add(mesh, new THREE.SphereGeometry(0.07, 5, 4), mat(0xfff5a8), (i - 1.5) * w * 0.22, h / 2, ((i % 2) - 0.5) * d * 0.3);
  } else if (look === 'pot') {
    mesh.material.visible = false;
    mesh.castShadow = false;
    const steel = mat(0xc7ccd6, { metalness: 0.6, roughness: 0.35 });
    add(mesh, new THREE.CylinderGeometry(w / 2, w / 2 * 0.95, h, 16), steel, 0, 0, 0);
    add(mesh, new THREE.CylinderGeometry(w / 2 * 0.9, w / 2 * 0.9, 0.05, 16), mat(0xff9f6b), 0, h / 2 - 0.05, 0);
    for (const s of [-1, 1]) add(mesh, new THREE.BoxGeometry(0.35, 0.1, 0.18), mat(0x333333), (w / 2 + 0.12) * s, h * 0.3, 0);
  } else if (look === 'lid') {
    mesh.material.visible = false;
    mesh.castShadow = false;
    const steel = mat(0xdfe3ea, { metalness: 0.6, roughness: 0.3 });
    add(mesh, new THREE.CylinderGeometry(w / 2, w / 2, h, 16), steel, 0, 0, 0);
    add(mesh, new THREE.SphereGeometry(0.18, 8, 6), mat(0x333333), 0, h / 2 + 0.05, 0).scale.y = 0.6;
  } else if (look === 'toaster') {
    const body = mat(color, { metalness: 0.4, roughness: 0.3 });
    mesh.material = body;
    for (const s of [-1, 1]) add(mesh, new THREE.BoxGeometry(w * 0.3, 0.04, d * 0.6), mat(0x222222), (w * 0.2) * s, h / 2 + 0.01, 0);
    // Fırlamaya hazır iki ekmek
    for (const s of [-1, 1]) add(mesh, new THREE.BoxGeometry(w * 0.26, 0.3, d * 0.5), mat(0xe0a35a), (w * 0.2) * s, h / 2 + 0.05, 0);
    add(mesh, new THREE.BoxGeometry(0.12, 0.3, 0.15), mat(0x333333), w / 2 + 0.06, 0, 0);
  } else if (look === 'plate') {
    mesh.material.visible = false;
    mesh.castShadow = false;
    add(mesh, new THREE.CylinderGeometry(w / 2, w / 2 * 0.8, h, 20), mat(0xffffff, { roughness: 0.3 }), 0, 0, 0);
    add(mesh, new THREE.TorusGeometry(w / 2 * 0.8, 0.05, 4, 20), mat(color || 0x5ab0e8), 0, h / 2 + 0.01, 0).rotation.x = Math.PI / 2;
  } else if (look === 'drawer') {
    // Dışarı kaymış çekmece: kırmızı kulp
    add(mesh, new THREE.BoxGeometry(w * 1.02, h * 0.3, 0.06), mat(0xfff8e7), 0, h * 0.2, d / 2 + 0.02);
    add(mesh, new THREE.BoxGeometry(0.6, 0.12, 0.12), mat(0xe8443a), 0, h * 0.2, d / 2 + 0.1);
  } else if (look === 'oven') {
    add(mesh, new THREE.BoxGeometry(w + 0.1, 0.2, d + 0.1), mat(0x333840), 0, h / 2 + 0.1, 0);
    for (const [bx, bz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const ring = add(mesh, new THREE.TorusGeometry(0.55, 0.06, 4, 14), mat(0x111111), bx * w * 0.24, h / 2 + 0.22, bz * d * 0.24);
      ring.rotation.x = Math.PI / 2;
    }
    const glass = add(mesh, new THREE.BoxGeometry(0.05, h * 0.4, d * 0.6), new THREE.MeshStandardMaterial({ color: 0x2b2b2b, emissive: 0xff7a1a, emissiveIntensity: 0.25 }), -w / 2 - 0.02, -h * 0.1, 0);
    glass.castShadow = false;
    add(mesh, new THREE.BoxGeometry(0.15, 0.12, d * 0.6), mat(0xc0c0c0, { metalness: 0.6 }), -w / 2 - 0.08, h * 0.18, 0);
    for (let i = 0; i < 4; i++) add(mesh, new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8), mat(0xffffff), -w / 2 - 0.05, h * 0.36, -d * 0.3 + i * d * 0.2).rotation.z = Math.PI / 2;
  } else if (look === 'fridge') {
    add(mesh, new THREE.BoxGeometry(0.04, 0.06, d * 0.98), mat(0xc9d6df), w / 2 + 0.01, h * 0.12, 0);
    for (const y of [h * 0.3, -h * 0.05]) add(mesh, new THREE.BoxGeometry(0.15, h * 0.18, 0.15), mat(0xc0c0c0, { metalness: 0.6 }), w / 2 + 0.1, y, -d / 2 + 0.5);
    // Mıknatıslar
    const mags = [0xff5fa2, 0xffd166, 0x5ab0e8, 0x7bc96f];
    mags.forEach((c, i) => add(mesh, new THREE.CylinderGeometry(0.18, 0.18, 0.06, 8), mat(c), w / 2 + 0.03, h * 0.35 - i * 0.6, ((i % 2) - 0.5) * 1.2).rotation.z = Math.PI / 2);
    const note = add(mesh, new THREE.BoxGeometry(0.02, 0.9, 0.7), mat(0xfffbef), w / 2 + 0.02, -h * 0.25, 0.4);
    note.rotation.x = 0.1;
  } else if (look === 'cabinet_up') {
    for (const s of [-1, 1]) {
      add(mesh, new THREE.BoxGeometry(0.05, h * 0.85, d * 0.44), mat(0xfff8e7), w / 2 + 0.02, 0, (d / 4) * s);
      add(mesh, new THREE.BoxGeometry(0.1, 0.4, 0.1), mat(0xc79a3a, { metalness: 0.5 }), w / 2 + 0.07, -h * 0.25, 0.15 * s);
    }
  } else if (look === 'spiceshelf') {
    const jars = [0xe8574a, 0xffd166, 0x7bc96f, 0xb56fd6];
    jars.forEach((c, i) => {
      add(mesh, new THREE.CylinderGeometry(0.16, 0.16, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.6 }), -w * 0.35, h / 2 + 0.2, -d / 2 + 0.3 + i * 0.22).castShadow = false;
      add(mesh, new THREE.CylinderGeometry(0.17, 0.17, 0.08, 8), mat(c), -w * 0.35, h / 2 + 0.43, -d / 2 + 0.3 + i * 0.22);
    });
  } else if (look === 'divider') {
    // Tavana kadar dolap sırası
    const n = Math.max(1, Math.round(w / 2));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (w / n) * (i + 0.5);
      add(mesh, new THREE.BoxGeometry(w / n - 0.2, h * 0.36, 0.05), mat(0xfff8e7), x, -h * 0.22, -d / 2 - 0.02);
      add(mesh, new THREE.BoxGeometry(w / n - 0.2, h * 0.24, 0.05), mat(0xfff8e7), x, h * 0.25, -d / 2 - 0.02);
      add(mesh, new THREE.BoxGeometry(0.1, 0.4, 0.1), mat(0xc79a3a, { metalness: 0.5 }), x + (i % 2 ? -0.5 : 0.5), -h * 0.12, -d / 2 - 0.07);
    }
    add(mesh, new THREE.BoxGeometry(w, 0.3, 0.3), mat(0xf2f2f2), 0, -h / 2 + 6.65, -d / 2 - 0.15);
  } else if (look === 'stool') {
    mesh.material.visible = false;
    mesh.castShadow = false;
    add(mesh, new THREE.CylinderGeometry(w / 2, w / 2, 0.25, 14), mat(color), 0, h / 2 - 0.125, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      add(mesh, new THREE.CylinderGeometry(0.07, 0.09, h - 0.25, 5), mat(0x8a5a32), Math.cos(a) * w * 0.3, -0.125, Math.sin(a) * w * 0.3);
    }
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
    case 'fruitbowl': {
      add(g, new THREE.SphereGeometry(0.6, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x5ab0e8, { side: THREE.DoubleSide }), 0, 0.6, 0);
      const fruits = [[0xe8443a, 0.2, 0.1], [0xffd166, -0.2, 0.05], [0xff9f3d, 0, -0.22], [0x7bc96f, 0.05, 0.25]];
      for (const [c, fx, fz] of fruits) add(g, new THREE.IcosahedronGeometry(0.22, 1), mat(c), fx, 0.62, fz);
      break;
    }
    case 'hood': {
      add(g, new THREE.BoxGeometry(3, 0.6, 3.5), mat(0xc7ccd6, { metalness: 0.5, roughness: 0.4 }), 0, 0, 0);
      add(g, new THREE.BoxGeometry(1.2, 4, 1.2), mat(0xc7ccd6, { metalness: 0.5, roughness: 0.4 }), 0.6, 2.2, 0);
      const lamp = add(g, new THREE.BoxGeometry(1.4, 0.05, 0.8), new THREE.MeshBasicMaterial({ color: 0xfff1b8 }), -0.4, -0.31, 0);
      lamp.castShadow = false;
      break;
    }
    case 'utensils': {
      add(g, new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), mat(0xc0c0c0, { metalness: 0.6 }), 0, 0, 0).rotation.x = Math.PI / 2;
      const tools = [0xe8574a, 0x5ab0e8, 0xffd166, 0x7bc96f];
      tools.forEach((c, i) => {
        const z = -1.2 + i * 0.8;
        add(g, new THREE.CylinderGeometry(0.04, 0.04, 1, 5), mat(0x8a5a32), 0, -0.55, z);
        add(g, new THREE.SphereGeometry(0.18, 8, 6), mat(c), 0, -1.1, z).scale.set(0.4, 1, 1);
      });
      break;
    }
    case 'jar': {
      add(g, new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12), new THREE.MeshStandardMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.45, roughness: 0.1 }), 0, 0.6, 0).castShadow = false;
      add(g, new THREE.CylinderGeometry(0.46, 0.46, 0.5, 12), mat(0xffc23d, { emissive: 0x8a5a00, emissiveIntensity: 0.3 }), 0, 0.3, 0);
      add(g, new THREE.CylinderGeometry(0.55, 0.55, 0.18, 12), mat(0xe8574a), 0, 1.25, 0);
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

// Damalı zemin (mutfak)
export function checkerTexture(a, b) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? b : a; x.fillRect(i * 64, j * 64, 64, 64); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Fayans duvar
export function tileTexture(base, grout) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = grout;
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = base;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) x.fillRect(i * 32 + 2, j * 32 + 2, 28, 28);
  x.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) x.fillRect(i * 32 + 4, j * 32 + 4, 8, 3);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

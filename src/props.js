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
  } else if (look === 'foam') {
    // Sabun köpüğü: üstünde kabarcık topları
    mesh.material = mat(0xffffff, { roughness: 0.3 });
    for (let i = 0; i < Math.round(w * d * 0.8); i++) {
      const r = 0.12 + ((i * 37) % 10) * 0.025;
      const b = add(mesh, new THREE.SphereGeometry(r, 8, 6), new THREE.MeshStandardMaterial({ color: i % 3 ? 0xffffff : 0xe3f4ff, roughness: 0.2, transparent: true, opacity: 0.9 }), ((i * 0.618) % 1 - 0.5) * w * 0.9, h / 2, ((i * 0.381 + 0.13) % 1 - 0.5) * d * 0.9);
      b.castShadow = false;
    }
  } else if (look === 'toilet') {
    mesh.material.visible = false;
    mesh.castShadow = false;
    const white = mat(0xffffff, { roughness: 0.35 });
    add(mesh, new THREE.CylinderGeometry(w * 0.32, w * 0.24, h * 0.8, 12), white, 0, -h * 0.1, 0);
    const bowl = add(mesh, new THREE.CylinderGeometry(w * 0.48, w * 0.38, h * 0.3, 14), white, w * 0.05, h * 0.3, 0);
    bowl.scale.z = d / w;
    const seat = add(mesh, new THREE.TorusGeometry(w * 0.4, 0.12, 6, 16), mat(0x9fd8f0), w * 0.05, h / 2 - 0.05, 0);
    seat.rotation.x = Math.PI / 2;
    seat.scale.y = d / w;
  } else if (look === 'tank') {
    mesh.material = mat(0xffffff, { roughness: 0.35 });
    add(mesh, new THREE.BoxGeometry(w + 0.15, 0.2, d + 0.15), mat(0xffffff), 0, h / 2 + 0.05, 0);
    add(mesh, new THREE.CylinderGeometry(0.2, 0.2, 0.12, 10), mat(0xc0c0c0, { metalness: 0.6 }), 0, h / 2 + 0.2, 0);
  } else if (look === 'towel') {
    mesh.material.visible = false;
    mesh.castShadow = false;
    const n = 5;
    for (let i = 0; i < n; i++) add(mesh, new THREE.BoxGeometry(w, h / n, d), mat(i % 2 ? 0xffb3c6 : 0xfff0f5), 0, -h / 2 + (h / n) * (i + 0.5), 0);
    for (let i = 0; i < 4; i++) add(mesh, new THREE.BoxGeometry(0.06, 0.2, 0.06), mat(0xffb3c6), 0, -h / 2 - 0.1, -d / 2 + 0.25 + i * (d - 0.5) / 3);
  } else if (look === 'towelshelf') {
    mesh.material = mat(0xdfe3ea, { metalness: 0.5, roughness: 0.3 });
    for (let i = 0; i < 3; i++) add(mesh, new THREE.CylinderGeometry(0.15, 0.15, 0.5, 8), mat([0x7bc96f, 0x5ab0e8, 0xff9db8][i]), -w * 0.25, h / 2 + 0.25, -d / 2 + 0.5 + i * 0.6);
  } else if (look === 'tproll') {
    // Tuvalet kâğıdı bandı: kayan dokulu şerit + iki ucunda rulo
    const c = document.createElement('canvas');
    c.width = 32; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 32, 64);
    x.fillStyle = '#d6e9ff'; for (let i = 0; i < 4; i++) x.fillRect(0, i * 16, 32, 2);
    x.fillStyle = '#ff9db8'; x.beginPath(); x.arc(16, 8, 4, 0, Math.PI * 2); x.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const alongZ = d >= w;
    tex.repeat.set(1, (alongZ ? d : w) / 1.2);
    if (!alongZ) tex.rotation = Math.PI / 2;
    mesh.material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
    mesh.userData.scrollTex = tex;
    mesh.userData.scrollLen = 1.2;
    const len = alongZ ? d : w;
    for (const sgn of [-1, 1]) {
      const roll = add(mesh, new THREE.CylinderGeometry(0.45, 0.45, alongZ ? w + 0.1 : d + 0.1, 14), mat(0xffffff), alongZ ? 0 : (len / 2) * sgn, -0.25, alongZ ? (len / 2) * sgn : 0);
      roll.rotation.z = alongZ ? Math.PI / 2 : 0;
      roll.rotation.x = alongZ ? 0 : Math.PI / 2;
    }
  } else if (look === 'tubrim') {
    mesh.material = mat(0xffffff, { roughness: 0.25 });
    add(mesh, new THREE.BoxGeometry(w + 0.1, 0.15, d + 0.1), mat(0xe3f4ff, { roughness: 0.2 }), 0, h / 2 + 0.05, 0).castShadow = false;
  } else if (look === 'duckbig') {
    // Kocaman lastik ördek (kutu boyutuna göre)
    mesh.material.visible = false;
    mesh.castShadow = false;
    const yellow = mat(0xffd84d, { roughness: 0.4 });
    const body = add(mesh, new THREE.SphereGeometry(w / 2, 12, 8), yellow, 0, -h * 0.05, 0);
    body.scale.set(1, (h * 0.75) / w, d / w);
    add(mesh, new THREE.SphereGeometry(w * 0.27, 10, 8), yellow, w * 0.22, h * 0.32, 0);
    add(mesh, new THREE.ConeGeometry(w * 0.09, w * 0.22, 6), mat(0xff8a3d), w * 0.5, h * 0.3, 0).rotation.z = -Math.PI / 2;
    for (const sz of [-1, 1]) add(mesh, new THREE.SphereGeometry(w * 0.045, 6, 4), mat(0x222222), w * 0.38, h * 0.4, sz * w * 0.12);
    add(mesh, new THREE.ConeGeometry(w * 0.15, w * 0.3, 4), yellow, -w * 0.45, h * 0.15, 0).rotation.z = Math.PI / 2.5;
  } else if (look === 'sinkcab') {
    add(mesh, new THREE.BoxGeometry(w + 0.1, 0.2, d + 0.1), mat(0xffffff, { roughness: 0.3 }), 0, h / 2 + 0.1, 0);
    const basin = add(mesh, new THREE.CylinderGeometry(w * 0.3, w * 0.25, 0.1, 14), mat(0xdfeefa), 0, h / 2 + 0.21, 0);
    basin.castShadow = false;
    add(mesh, new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), mat(0xc0c0c0, { metalness: 0.6 }), w * 0.38, h / 2 + 0.5, 0);
    for (const sz of [-1, 1]) add(mesh, new THREE.BoxGeometry(0.05, h * 0.7, d * 0.42), mat(0xfff8e7), -w / 2 - 0.02, -h * 0.05, sz * d * 0.23);
  } else if (look === 'washer') {
    mesh.material = mat(0xffffff, { roughness: 0.35 });
    const door = add(mesh, new THREE.TorusGeometry(Math.min(h, d) * 0.3, 0.18, 8, 24), mat(0xc0c8d4, { metalness: 0.5 }), -w / 2 - 0.05, -h * 0.05, 0);
    door.rotation.y = Math.PI / 2;
    const glass = add(mesh, new THREE.CircleGeometry(Math.min(h, d) * 0.29, 24), new THREE.MeshStandardMaterial({ color: 0x8fd3ff, transparent: true, opacity: 0.7, emissive: 0x2a7ab8, emissiveIntensity: 0.2 }), -w / 2 - 0.04, -h * 0.05, 0);
    glass.rotation.y = -Math.PI / 2;
    glass.castShadow = false;
    add(mesh, new THREE.BoxGeometry(0.05, h * 0.14, d * 0.9), mat(0xe8f0f8), -w / 2 - 0.02, h * 0.4, 0);
    for (let i = 0; i < 3; i++) add(mesh, new THREE.CylinderGeometry(0.18, 0.18, 0.1, 10), mat([0xff6b6b, 0xffd166, 0x5ab0e8][i]), -w / 2 - 0.06, h * 0.4, -d * 0.3 + i * 0.5).rotation.z = Math.PI / 2;
  } else if (look === 'paddle') {
    mesh.material = mat(0x5ab0e8, { roughness: 0.4 });
    for (const sx of [-1, 1]) add(mesh, new THREE.BoxGeometry(0.12, 0.35, d), mat(0x3f8efc), (w / 2 - 0.06) * sx, 0.12, 0);
  } else if (look === 'basket') {
    mesh.material = mat(0xd9a066);
    for (let i = 0; i < 4; i++) add(mesh, new THREE.BoxGeometry(w + 0.04, 0.08, d + 0.04), mat(0xb5814a), 0, -h / 2 + 0.25 + i * (h - 0.4) / 3, 0);
    const clothes = [0xff9db8, 0x5ab0e8, 0xffd166];
    clothes.forEach((c, i) => add(mesh, new THREE.SphereGeometry(w * 0.28, 8, 6), mat(c), (i - 1) * w * 0.25, h / 2 + 0.05, ((i % 2) - 0.5) * d * 0.3).scale.y = 0.5);
  } else if (look === 'scale') {
    mesh.material = mat(0xf2f2f2);
    add(mesh, new THREE.BoxGeometry(w * 0.6, 0.04, d * 0.25), mat(0x2b2b2b), 0, h / 2 + 0.01, -d * 0.2);
  } else if (look === 'hedge') {
    mesh.material = mat(0x4caf50, { roughness: 1 });
    const n = Math.max(2, Math.round(w / 1.4));
    for (let i = 0; i < n; i++) {
      const b = add(mesh, new THREE.IcosahedronGeometry(Math.min(h, d) * 0.55, 0), mat(i % 2 ? 0x5cbf5f : 0x3f9c4a), -w / 2 + (w / n) * (i + 0.5), h / 2 - 0.1, ((i % 3) - 1) * 0.15);
      b.scale.set(1.3, 0.8, 1);
    }
    for (let i = 0; i < n; i += 2) add(mesh, new THREE.SphereGeometry(0.12, 6, 4), mat([0xff5fa2, 0xffd166, 0xffffff][i % 3]), -w / 2 + (w / n) * (i + 0.7), h * 0.2, d / 2 + 0.05);
  } else if (look === 'sunflower') {
    // Sap + büyük çiçek başı (üstüne basılır)
    mesh.material.visible = false;
    mesh.castShadow = false;
    add(mesh, new THREE.CylinderGeometry(0.14, 0.18, h, 6), mat(0x4caf50), 0, 0, 0);
    for (const sgn of [-1, 1]) {
      const lf = add(mesh, new THREE.SphereGeometry(0.4, 6, 4), mat(0x66c26a), 0.35 * sgn, -h * 0.15 * sgn, 0);
      lf.scale.set(1, 0.25, 0.6);
    }
    const head = new THREE.Group();
    head.position.y = h / 2 - 0.05;
    mesh.add(head);
    const petals = 12;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      const pt = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 4), mat(0xffd23d));
      pt.scale.set(1, 0.25, 0.5);
      pt.position.set(Math.cos(a) * w * 0.42, 0, Math.sin(a) * w * 0.42);
      pt.rotation.y = -a;
      head.add(pt);
    }
    add(head, new THREE.CylinderGeometry(w * 0.32, w * 0.32, 0.12, 14), mat(0x7a4a2a), 0, 0.03, 0);
  } else if (look === 'birdbath') {
    mesh.material.visible = false;
    mesh.castShadow = false;
    const stone = mat(0xd9d2c5);
    add(mesh, new THREE.CylinderGeometry(w * 0.2, w * 0.3, h - 0.4, 8), stone, 0, -0.2, 0);
    add(mesh, new THREE.CylinderGeometry(w / 2, w * 0.35, 0.4, 14), stone, 0, h / 2 - 0.2, 0);
    add(mesh, new THREE.CylinderGeometry(w * 0.42, w * 0.42, 0.05, 14), new THREE.MeshStandardMaterial({ color: 0x8fd3ff, roughness: 0.1 }), 0, h / 2 + 0.01, 0).castShadow = false;
  } else if (look === 'kennel') {
    mesh.material = mat(0xe8574a);
    const roof = add(mesh, new THREE.ConeGeometry(Math.max(w, d) * 0.78, 1.2, 4), mat(0x8a5a32), 0, h / 2 + 0.55, 0);
    roof.rotation.y = Math.PI / 4;
    const door = add(mesh, new THREE.CircleGeometry(h * 0.3, 12), new THREE.MeshBasicMaterial({ color: 0x2b1d14 }), 0, -h * 0.15, d / 2 + 0.01);
    door.castShadow = false;
    add(mesh, new THREE.BoxGeometry(w * 0.5, 0.3, 0.05), mat(0xfff3e0), 0, h * 0.32, d / 2 + 0.02);
  } else if (look === 'trunk') {
    mesh.material = mat(0x8a5a32);
    for (let i = 0; i < 5; i++) {
      const top = add(mesh, new THREE.IcosahedronGeometry(2.2 + (i % 2) * 0.6, 0), mat(i % 2 ? 0x5cbf5f : 0x4caf50), Math.cos(i * 1.3) * 2, h / 2 + 2.4 + (i % 3) * 0.8, Math.sin(i * 1.3) * 2);
      top.castShadow = true;
    }
    for (let i = 0; i < 4; i++) add(mesh, new THREE.SphereGeometry(0.22, 6, 4), mat(0xe8443a), Math.cos(i * 1.7) * 2.6, h / 2 + 1.6 + (i % 2), Math.sin(i * 1.7) * 2.6);
  } else if (look === 'treehouse') {
    mesh.material = mat(0xc98a55);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(mesh, new THREE.BoxGeometry(0.15, 1.1, 0.15), mat(0x8a5a32), (w / 2 - 0.1) * sx, 0.7, (d / 2 - 0.1) * sz);
    add(mesh, new THREE.BoxGeometry(w, 0.12, 0.12), mat(0x8a5a32), 0, 1.2, -d / 2 + 0.1);
    add(mesh, new THREE.BoxGeometry(0.12, 0.12, d), mat(0x8a5a32), w / 2 - 0.1, 1.2, 0);
    const flag = add(mesh, new THREE.ConeGeometry(0.35, 0.8, 3), mat(0xff5fa2), w / 2 - 0.1, 1.9, -d / 2 + 0.1);
    flag.rotation.z = -Math.PI / 2;
  } else if (look === 'beam') {
    mesh.material = mat(0xc98a55);
    const n = Math.max(1, Math.floor(d / 1.2));
    for (let i = 0; i <= n; i++) add(mesh, new THREE.BoxGeometry(0.22, 3.2, 0.22), mat(0xb5814a), 0, -1.75, -d / 2 + (d / n) * i).castShadow = true;
  } else if (look === 'gardenfence' || look === 'gate') {
    mesh.material.visible = false;
    mesh.castShadow = false;
    const wood = mat(look === 'gate' ? 0x7bc96f : 0xf4ead5);
    const n = Math.max(2, Math.round(w / 0.6));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (w / n) * (i + 0.5);
      add(mesh, new THREE.BoxGeometry(w / n - 0.12, h - 0.3, 0.14), wood, x, -0.15, 0);
      add(mesh, new THREE.ConeGeometry((w / n) * 0.42, 0.4, 4), wood, x, h / 2 - 0.1, 0).rotation.y = Math.PI / 4;
    }
    for (const y of [-h * 0.25, h * 0.2]) add(mesh, new THREE.BoxGeometry(w, 0.18, 0.18), wood, 0, y, 0.12);
  } else if (look === 'stone') {
    mesh.material = mat(0xcfc6b8);
    for (let i = 0; i < 6; i++) add(mesh, new THREE.BoxGeometry(w / 3 - 0.08, 0.04, d / 2 - 0.08), mat(i % 2 ? 0xd9d2c5 : 0xc2b8a8), -w / 3 + (i % 3) * (w / 3), h / 2 + 0.01, (Math.floor(i / 3) - 0.5) * (d / 2)).castShadow = false;
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
    case 'faucet': {
      // Yerden yükselen boru, küvetin üstüne uzanan ağız
      const chrome = mat(0xdfe3ea, { metalness: 0.6, roughness: 0.25 });
      const H = spec.h || 7.4, L = spec.len || 1.5;
      add(g, new THREE.CylinderGeometry(0.18, 0.22, H, 10), chrome, 0, H / 2, 0);
      add(g, new THREE.BoxGeometry(L + 0.2, 0.35, 0.35), chrome, -L / 2, H, 0);
      add(g, new THREE.CylinderGeometry(0.2, 0.15, 0.4, 10), chrome, -L, H - 0.3, 0);
      for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(0.2, 8, 6), mat(s < 0 ? 0x5ab0e8 : 0xff6b6b), 0, H - 0.6, 0.35 * s);
      break;
    }
    case 'mirror': {
      add(g, new THREE.BoxGeometry(3.4, 2.6, 0.1), mat(0xffffff), 0, 0, 0);
      const glass = add(g, new THREE.BoxGeometry(3.1, 2.3, 0.12), new THREE.MeshStandardMaterial({ color: 0xcfeaff, metalness: 0.6, roughness: 0.05 }), 0, 0, 0.01);
      glass.castShadow = false;
      add(g, new THREE.BoxGeometry(0.5, 2.3, 0.13), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 }), -0.6, 0, 0.02).rotation.z = 0.4;
      break;
    }
    case 'wheelring': {
      // Çamaşır tamburu: kürekler bu halkanın üstünde döner (yalnızca görsel)
      const r = spec.r || 3;
      const ring = add(g, new THREE.TorusGeometry(r + 0.2, 0.18, 8, 32), mat(0xc0c8d4, { metalness: 0.5 }), 0, 0, 0);
      ring.rotation.y = Math.PI / 2;
      ring.castShadow = false;
      const hub = add(g, new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12), mat(0x5ab0e8), 0, 0, 0);
      hub.rotation.z = Math.PI / 2;
      g.userData.spin = hub;
      break;
    }
    case 'bottles': {
      const cols = [0x7bc96f, 0xff9db8, 0x5ab0e8, 0xffd166];
      cols.forEach((c, i) => {
        add(g, new THREE.CylinderGeometry(0.22, 0.25, 0.8, 8), mat(c), 0, 0.4, -0.75 + i * 0.5);
        add(g, new THREE.CylinderGeometry(0.08, 0.08, 0.2, 6), mat(0xffffff), 0, 0.9, -0.75 + i * 0.5);
      });
      break;
    }
    case 'butterfly': {
      // Daire çizerek uçan kelebek (Level.flyers ile hareket eder)
      add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.25, 4), mat(0x333333), 0, 0, 0).rotation.x = Math.PI / 2;
      for (const sgn of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.CircleGeometry(0.2, 8), new THREE.MeshStandardMaterial({ color: spec.c || 0xff9db8, side: THREE.DoubleSide }));
        wing.geometry.translate(0.18 * sgn, 0, 0);
        wing.rotation.x = -Math.PI / 2;
        const holder = new THREE.Group();
        holder.add(wing);
        g.add(holder);
      }
      g.userData.fly = { c: spec.p, r: spec.r || 2, speed: spec.speed || 0.8, phase: spec.phase || 0 };
      break;
    }
    case 'sprinkler': {
      add(g, new THREE.CylinderGeometry(0.3, 0.4, 0.3, 8), mat(0x5ab0e8), 0, 0.15, 0);
      add(g, new THREE.CylinderGeometry(0.06, 0.06, 1, 6), mat(0xc0c0c0, { metalness: 0.6 }), 0, 0.8, 0);
      const head = new THREE.Group();
      head.position.y = 1.3;
      add(head, new THREE.BoxGeometry(0.9, 0.1, 0.1), mat(0xffd166), 0, 0, 0);
      add(head, new THREE.SphereGeometry(0.12, 6, 4), mat(0xff6b6b), 0, 0.05, 0);
      g.add(head);
      g.userData.spin = head;
      break;
    }
    case 'wateringcan': {
      const green = mat(0x5cc96b, { metalness: 0.3, roughness: 0.4 });
      add(g, new THREE.CylinderGeometry(0.45, 0.5, 0.8, 12), green, 0, 0.4, 0);
      const spout = add(g, new THREE.CylinderGeometry(0.06, 0.1, 1, 6), green, 0.55, 0.75, 0);
      spout.rotation.z = -0.9;
      add(g, new THREE.TorusGeometry(0.3, 0.06, 5, 10, Math.PI), green, -0.1, 0.85, 0);
      break;
    }
    case 'flowers': {
      const cols = [0xff5fa2, 0xffd166, 0xb56fd6, 0xffffff, 0xff9f3d];
      for (let i = 0; i < (spec.n || 7); i++) {
        const x = ((i * 0.618) % 1 - 0.5) * (spec.w || 3), z = ((i * 0.37 + 0.2) % 1 - 0.5) * (spec.d || 1.5);
        add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.6, 4), mat(0x4caf50), x, 0.3, z);
        add(g, new THREE.SphereGeometry(0.14, 6, 4), mat(cols[i % cols.length]), x, 0.62, z);
      }
      break;
    }
    case 'veggies': {
      for (let i = 0; i < (spec.n || 6); i++) {
        const x = (i - (spec.n || 6) / 2) * 1.1;
        if (i % 2) {
          add(g, new THREE.SphereGeometry(0.4, 8, 6), mat(0x8fd36b), x, 0.3, 0).scale.y = 0.8;
        } else {
          const c = add(g, new THREE.ConeGeometry(0.15, 0.5, 6), mat(0xff8a3d), x, 0.15, 0);
          c.rotation.x = Math.PI;
          add(g, new THREE.ConeGeometry(0.12, 0.35, 4), mat(0x4caf50), x, 0.55, 0);
        }
      }
      break;
    }
    case 'scarecrow': {
      add(g, new THREE.CylinderGeometry(0.08, 0.08, 3, 6), mat(0x8a5a32), 0, 1.5, 0);
      add(g, new THREE.BoxGeometry(2, 0.12, 0.12), mat(0x8a5a32), 0, 2.2, 0);
      add(g, new THREE.BoxGeometry(1, 1, 0.5), mat(0x5ab0e8), 0, 2, 0);
      add(g, new THREE.SphereGeometry(0.38, 8, 6), mat(0xf4dca0), 0, 2.85, 0);
      add(g, new THREE.ConeGeometry(0.6, 0.5, 10), mat(0xe8c048), 0, 3.25, 0);
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

// Çim (açık hava zemini)
export function grassTexture(base, blade) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = base;
  x.fillRect(0, 0, 128, 128);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  x.strokeStyle = blade;
  x.lineWidth = 2;
  for (let i = 0; i < 90; i++) {
    const px = rnd() * 128, py = rnd() * 128;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rnd() - 0.5) * 4, py - 5 - rnd() * 4); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Sivri uçlu tahta çit (aralıklar saydam)
export function fenceTexture(wood, line, length) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 64, 128);
  x.fillStyle = wood;
  x.beginPath(); x.moveTo(8, 128); x.lineTo(8, 20); x.lineTo(28, 2); x.lineTo(48, 20); x.lineTo(48, 128); x.fill();
  x.fillRect(0, 50, 64, 12);
  x.fillRect(0, 98, 64, 12);
  x.strokeStyle = line; x.lineWidth = 2;
  x.strokeRect(9, 21, 38, 106);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(length / 1.1, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

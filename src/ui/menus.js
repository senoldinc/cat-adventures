// Menü ekranları: ana menü, oda seçimi, duraklat, ayarlar, mağaza, seviye sonu.
import * as THREE from 'three';
import { save, persist, levelSave } from '../save.js';
import { sfx, applySettings, unlockAudio } from '../audio.js';
import { CATEGORIES, ITEMS, owns, buy, toggleEquip } from '../shop.js';
import { CatModel } from '../catModel.js';
import { LEVELS } from '../levels/index.js';
import { FISHBONE_SVG } from './hud.js';

const root = () => document.getElementById('screens');
const TOUCH_LABEL = { auto: 'Otomatik', on: 'Açık', off: 'Kapalı' };
const kibbleIcon = '<span class="kibble-icon"></span>';

function render(html, dim = true) {
  root().innerHTML = `<div class="screen ${dim ? 'dim' : ''}">${html}</div>`;
  return root().firstElementChild;
}

function on(el, sel, fn) {
  el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', (e) => { unlockAudio(); sfx.click(); fn(e, b); }));
}

export class Menus {
  constructor(actions) {
    this.a = actions; // { play(id), resume(), restart(), quit(), settingsChanged(), equipChanged() }
    this.preview = null;
  }

  hide() {
    this.stopPreview();
    root().innerHTML = '';
  }

  main() {
    this.stopPreview();
    const el = render(`
      <div class="menu-col">
        <h1 class="title">Minnoş</h1>
        <div class="subtitle">Büyük Ev Macerası 🐾</div>
        <div class="panel">
          <button class="btn primary" data-a="play">▶️ Oyna</button>
          <button class="btn" data-a="shop">🛍️ Mağaza <span style="margin-left:auto;display:flex;align-items:center;gap:6px">${kibbleIcon}${save.kibble}</span></button>
          <button class="btn" data-a="settings">⚙️ Ayarlar</button>
        </div>
      </div>`, false);
    on(el, '[data-a=play]', () => this.levels());
    on(el, '[data-a=shop]', () => this.shop(() => this.main()));
    on(el, '[data-a=settings]', () => this.settings(() => this.main()));
  }

  levels() {
    const rooms = LEVELS.map((l) => {
      if (l.locked) return `<div class="room locked"><span class="emoji">${l.emoji}</span>${l.name}<span class="stars">🔒 Yakında</span></div>`;
      const ls = levelSave(l.id);
      const bones = ls.bones.filter(Boolean).length;
      return `<button class="room" data-id="${l.id}"><span class="emoji">${l.emoji}</span>${l.name}<span class="stars">🦴 ${bones}/3 ${ls.done ? '✅' : ''}</span></button>`;
    }).join('');
    const el = render(`
      <div class="panel wide">
        <h2>🏠 Hangi oda?</h2>
        <div class="rooms">${rooms}</div>
        <button class="btn small" data-a="back">⬅️ Geri</button>
      </div>`);
    on(el, '[data-id]', (e, b) => { this.hide(); this.a.play(b.dataset.id); });
    on(el, '[data-a=back]', () => this.main());
  }

  pause() {
    const el = render(`
      <div class="panel">
        <h2>⏸️ Mola</h2>
        <button class="btn primary" data-a="resume">▶️ Devam</button>
        <button class="btn" data-a="restart">🔄 Baştan Başla</button>
        <button class="btn" data-a="shop">🛍️ Mağaza</button>
        <button class="btn" data-a="settings">⚙️ Ayarlar</button>
        <button class="btn" data-a="quit">🏠 Ana Menü</button>
      </div>`);
    on(el, '[data-a=resume]', () => { this.hide(); this.a.resume(); });
    on(el, '[data-a=restart]', () => { this.hide(); this.a.restart(); });
    on(el, '[data-a=shop]', () => this.shop(() => this.pause()));
    on(el, '[data-a=settings]', () => this.settings(() => this.pause()));
    on(el, '[data-a=quit]', () => this.a.quit());
  }

  settings(back) {
    const s = save.settings;
    const row = (key, label, sub) => `
      <button class="toggle" data-k="${key}"><span>${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="switch ${s[key] ? 'on' : ''}"></span></button>`;
    const el = render(`
      <div class="panel">
        <h2>⚙️ Ayarlar</h2>
        ${row('helper', '🤝 Yardımcı Mod', 'Geniş platformlar, uzun süzülme, yavaş düşmanlar')}
        ${row('music', '🎵 Müzik')}
        ${row('sfx', '🔊 Sesler')}
        <button class="toggle" data-touch><span>📱 Ekran tuşları<small>Joystick ve A/B tuşları</small></span><span class="seg">${TOUCH_LABEL[s.touchUi || 'auto']}</span></button>
        <button class="btn small" data-a="back">⬅️ Geri</button>
      </div>`);
    on(el, '[data-touch]', (e, b) => {
      const order = ['auto', 'on', 'off'];
      s.touchUi = order[(order.indexOf(s.touchUi || 'auto') + 1) % 3];
      b.querySelector('.seg').textContent = TOUCH_LABEL[s.touchUi];
      persist();
      this.a.settingsChanged();
    });
    on(el, '[data-k]', (e, b) => {
      const k = b.dataset.k;
      s[k] = !s[k];
      b.querySelector('.switch').classList.toggle('on', s[k]);
      persist();
      applySettings();
      this.a.settingsChanged();
    });
    on(el, '[data-a=back]', back);
  }

  shop(back, tab = 'hat') {
    const items = ITEMS.filter((i) => i.slot === tab);
    const cards = items.map((it) => {
      const own = owns(it.id);
      const eq = save.equipped[it.slot] === it.id;
      const icon = it.color !== undefined
        ? `<span class="swatch" style="background:#${it.color.toString(16).padStart(6, '0')}"></span>`
        : `<span class="emoji">${it.icon}</span>`;
      let foot;
      if (own) foot = `<span class="tag">${eq ? '✅ Giyili' : 'Giy'}</span>`;
      else if (it.price === null) foot = `<span class="tag" style="color:#b56fd6">🏆 ${it.reward}</span>`;
      else foot = `<span class="price">${kibbleIcon}${it.price}</span>`;
      const locked = !own && (it.price === null || save.kibble < it.price);
      return `<button class="item ${eq ? 'equipped' : ''} ${locked ? 'locked' : ''}" data-id="${it.id}">${icon}<span>${it.name}</span>${foot}</button>`;
    }).join('');
    const tabs = CATEGORIES.map((c) => `<button class="tab ${c.id === tab ? 'active' : ''}" data-tab="${c.id}">${c.icon} ${c.name}</button>`).join('');

    const el = render(`
      <div class="panel wide">
        <h2>🛍️ Mağaza</h2>
        <div class="shop">
          <div>
            <div class="shop-preview"></div>
            <div class="wallet">${kibbleIcon}<span>${save.kibble}</span></div>
          </div>
          <div>
            <div class="tabs">${tabs}</div>
            <div class="items">${items.length ? cards : ''}</div>
          </div>
        </div>
        <button class="btn small" data-a="back">⬅️ Geri</button>
      </div>`);
    this.mountPreview(el.querySelector('.shop-preview'));

    on(el, '[data-tab]', (e, b) => this.shop(back, b.dataset.tab));
    on(el, '[data-a=back]', () => { this.stopPreview(); back(); });
    el.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => {
      unlockAudio();
      const id = b.dataset.id;
      const it = ITEMS.find((i) => i.id === id);
      if (owns(id)) { toggleEquip(id); sfx.click(); }
      else if (buy(id)) { sfx.buy(); this.preview?.cat.meow(); }
      else { sfx.error(); return; }
      this.a.equipChanged();
      this.shop(back, it.slot);
    }));
  }

  mountPreview(container) {
    if (!this.preview) {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0xffd6a0, 2));
      const dl = new THREE.DirectionalLight(0xffffff, 2);
      dl.position.set(2, 3, 3);
      scene.add(dl);
      const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
      cam.position.set(0, 0.75, 2.4);
      cam.lookAt(0, 0.38, 0);
      const cat = new CatModel();
      scene.add(cat.root);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.08, 24), new THREE.MeshStandardMaterial({ color: 0xffc23d }));
      plate.position.y = -0.04;
      scene.add(plate);
      this.preview = { renderer, scene, cam, cat, raf: 0, last: performance.now() };
    }
    const p = this.preview;
    p.cat.setEquipped(save.equipped);
    container.appendChild(p.renderer.domElement);
    const resize = () => {
      const w = container.clientWidth || 200, h = container.clientHeight || 200;
      p.renderer.setSize(w, h, false);
      p.cam.aspect = w / h;
      p.cam.updateProjectionMatrix();
    };
    resize();
    cancelAnimationFrame(p.raf);
    const loop = (now) => {
      const dt = Math.min(0.05, (now - p.last) / 1000);
      p.last = now;
      p.cat.root.rotation.y += dt * 0.8;
      p.cat.update(dt, { speed: 0, grounded: true, vy: 0, gliding: false, climbing: false, climbSpeed: 0 });
      p.renderer.render(p.scene, p.cam);
      p.raf = requestAnimationFrame(loop);
    };
    p.raf = requestAnimationFrame(loop);
  }

  stopPreview() {
    if (this.preview) cancelAnimationFrame(this.preview.raf);
  }

  complete(stats) {
    const bones = stats.bones.map((b) => FISHBONE_SVG.replace('class="bone-icon"', `class="bone-icon ${b ? '' : 'empty'}" style="width:44px;height:26px"`)).join('');
    const el = render(`
      <div class="panel">
        <h2>🎉 Harika, Minnoş!</h2>
        <div style="font-size:20px;font-weight:800">${stats.name} tamamlandı!</div>
        <div class="stats">
          <div class="pill">${kibbleIcon} ${stats.kibble}/${stats.totalKibble}</div>
          <div class="pill">${bones}</div>
          <div class="pill">⏱️ ${formatTime(stats.time)}</div>
        </div>
        ${stats.newBest ? '<div style="font-weight:900;color:#5cc96b;margin-bottom:8px">⭐ Yeni rekor!</div>' : ''}
        <button class="btn primary" data-a="again">🔄 Tekrar Oyna</button>
        <button class="btn" data-a="shop">🛍️ Mağaza</button>
        <button class="btn" data-a="home">🏠 Ana Menü</button>
      </div>`);
    on(el, '[data-a=again]', () => { this.hide(); this.a.restart(); });
    on(el, '[data-a=shop]', () => this.shop(() => this.complete(stats)));
    on(el, '[data-a=home]', () => this.a.quit());
  }
}

export function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

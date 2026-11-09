// Klavye, fare, dokunmatik ve gamepad girdilerini tek bir "intent" nesnesinde toplar.
import { unlockAudio } from './audio.js';
import { save } from './save.js';

const keys = new Set();
const state = {
  moveX: 0, moveY: 0,
  jumpHeld: false,
  jumpPressed: false,
  meowPressed: false,
  pawPressed: false,
  pausePressed: false,
  camDX: 0, camDY: 0,
  lastCamInput: -10,
};

let touchJump = false;
let stickX = 0, stickY = 0;
let prevPadJump = false, prevPadMeow = false, prevPadPause = false, prevPadPaw = false;
export let isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let touchWanted = false; // oyun ekranında mıyız
let touchInited = false;

// Ekran tuşları görünsün mü? Ayar: auto | on | off
export function touchUiEnabled() {
  const m = save.settings.touchUi || 'auto';
  return m === 'on' || (m === 'auto' && isTouch);
}

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    unlockAudio();
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'KeyK') state.jumpPressed = true;
    if (e.code === 'KeyM') state.meowPressed = true;
    if (e.code === 'KeyF' || e.code === 'KeyJ') state.pawPressed = true;
    if (e.code === 'Escape' || e.code === 'KeyP') state.pausePressed = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  // Fare ile sürükleyerek kamera döndürme
  let dragging = false;
  canvas.addEventListener('pointerdown', (e) => {
    unlockAudio();
    if (e.pointerType === 'mouse') { dragging = true; canvas.setPointerCapture(e.pointerId); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging && e.pointerType === 'mouse') {
      state.camDX += e.movementX * 0.006;
      state.camDY += e.movementY * 0.004;
    }
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });

  // Dokunmatik algılanmadıysa ilk dokunuşta tuşları aç
  window.addEventListener('touchstart', () => {
    if (!isTouch) { isTouch = true; showTouchControls(touchWanted); }
  }, { passive: true, once: true });
}

function initTouch() {
  if (touchInited) return;
  touchInited = true;
  const zone = document.getElementById('stick-zone');
  const stick = document.getElementById('stick');
  const knob = document.getElementById('stick-knob');
  let stickId = null;

  // Sabit joystick: merkez her zaman tabanın ortası
  const moveStick = (e) => {
    const r = stick.getBoundingClientRect();
    const R = r.width / 2;
    const max = R * 0.62;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
    const len = Math.hypot(dx, dy);
    if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    stickX = dx / max;
    stickY = -dy / max;
  };
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    unlockAudio();
    if (stickId !== null) return;
    stickId = e.pointerId;
    zone.setPointerCapture(e.pointerId);
    stick.classList.add('active');
    moveStick(e);
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  const endStick = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null; stickX = 0; stickY = 0;
    knob.style.transform = '';
    stick.classList.remove('active');
  };
  zone.addEventListener('pointerup', endStick);
  zone.addEventListener('pointercancel', endStick);

  // Ekranın geri kalanında sürüklemek kamerayı döndürür
  const canvas = document.getElementById('game');
  const camTouches = new Map();
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    camTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = camTouches.get(e.pointerId);
    if (!p) return;
    state.camDX += (e.clientX - p.x) * 0.008;
    state.camDY += (e.clientY - p.y) * 0.005;
    p.x = e.clientX; p.y = e.clientY;
  });
  const endCam = (e) => camTouches.delete(e.pointerId);
  canvas.addEventListener('pointerup', endCam);
  canvas.addEventListener('pointercancel', endCam);

  const bind = (id, down, up) => {
    const el = document.getElementById(id);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); unlockAudio(); el.classList.add('active'); el.setPointerCapture(e.pointerId); down(); });
    const release = () => { el.classList.remove('active'); up && up(); };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  };
  bind('btn-jump', () => { touchJump = true; state.jumpPressed = true; }, () => { touchJump = false; });
  bind('btn-paw', () => { state.pawPressed = true; });
  bind('btn-meow', () => { state.meowPressed = true; });
}

// Oyun ekranı açıkken çağrılır; ayara ve cihaza göre tuşları gösterir
export function showTouchControls(show) {
  touchWanted = show;
  const on = show && touchUiEnabled();
  if (on) initTouch();
  document.getElementById('touch').classList.toggle('hidden', !on);
  if (!on) { stickX = 0; stickY = 0; touchJump = false; }
}

function axis(neg, pos) {
  return (pos.some((k) => keys.has(k)) ? 1 : 0) - (neg.some((k) => keys.has(k)) ? 1 : 0);
}

const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);

// Her fizik karesinden önce bir kez çağrılır; kenar tetiklemeli girdileri tüketir.
export function pollInput(now) {
  let mx = axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']) + stickX;
  let my = axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']) + stickY;
  let cam = axis(['KeyQ'], ['KeyE']) * 0.045;
  let jumpHeld = keys.has('Space') || keys.has('KeyK') || touchJump;

  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad) continue;
    mx += dz(pad.axes[0] || 0);
    my -= dz(pad.axes[1] || 0);
    cam += dz(pad.axes[2] || 0) * 0.05;
    state.camDY += dz(pad.axes[3] || 0) * 0.03;
    const j = pad.buttons[0]?.pressed;
    const m = pad.buttons[2]?.pressed;
    const p = pad.buttons[9]?.pressed;
    const b = pad.buttons[1]?.pressed;
    if (b && !prevPadPaw) state.pawPressed = true;
    prevPadPaw = b;
    if (j && !prevPadJump) state.jumpPressed = true;
    if (m && !prevPadMeow) state.meowPressed = true;
    if (p && !prevPadPause) state.pausePressed = true;
    prevPadJump = j; prevPadMeow = m; prevPadPause = p;
    jumpHeld = jumpHeld || j;
    break;
  }

  state.camDX += cam;
  const len = Math.hypot(mx, my);
  if (len > 1) { mx /= len; my /= len; }

  const out = {
    moveX: mx, moveY: my,
    jumpHeld,
    jumpPressed: state.jumpPressed,
    meowPressed: state.meowPressed,
    pawPressed: state.pawPressed,
    pausePressed: state.pausePressed,
    camDX: state.camDX, camDY: state.camDY,
  };
  if (state.camDX || state.camDY) state.lastCamInput = now;
  out.sinceCamInput = now - state.lastCamInput;
  state.jumpPressed = false;
  state.meowPressed = false;
  state.pawPressed = false;
  state.pausePressed = false;
  state.camDX = 0; state.camDY = 0;
  return out;
}

export function clearInput() {
  keys.clear();
  touchJump = false;
  state.jumpPressed = state.meowPressed = state.pawPressed = state.pausePressed = false;
}

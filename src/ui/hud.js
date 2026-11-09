// Oyun içi gösterge: kalpler, mama, kemikler, çan, görev yazısı, ipucu, zamanlayıcı, bildirim.
const $ = (id) => document.getElementById(id);

export const FISHBONE_SVG = `<svg class="bone-icon" viewBox="0 0 60 36"><g fill="none" stroke="#4a3426" stroke-width="3" stroke-linecap="round">
<path d="M8 18 H44"/><path d="M14 8 L18 18 L14 28 M22 7 L26 18 L22 29 M30 8 L34 18 L30 28"/></g>
<path d="M44 18 Q50 6 58 18 Q50 30 44 18Z" fill="#fff" stroke="#4a3426" stroke-width="3"/>
<path d="M2 10 L9 18 L2 26Z" fill="#fff" stroke="#4a3426" stroke-width="3" stroke-linejoin="round"/>
<circle cx="52" cy="16" r="2" fill="#4a3426"/></svg>`;

export class Hud {
  constructor() {
    this.el = $('hud');
    this.hearts = $('hearts');
    this.kibble = $('kibble-count');
    this.bones = $('bones');
    this.bell = $('bell');
    this.task = $('task');
    this.hint = $('hint');
    this.timer = $('timer');
    this.toastEl = $('toast');
    this.toastT = 0;
    this.last = {};
  }

  show(on) { this.el.classList.toggle('hidden', !on); }

  pop(el) {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  set({ hearts, maxHearts, kibble, bones, bell }) {
    if (hearts !== this.last.hearts) {
      this.hearts.innerHTML = Array.from({ length: maxHearts }, (_, i) => `<span class="heart ${i < hearts ? '' : 'empty'}">❤️</span>`).join('');
      if (this.last.hearts !== undefined) this.pop(this.hearts);
    }
    if (kibble !== this.last.kibble) {
      this.kibble.textContent = kibble;
      if (this.last.kibble !== undefined && kibble > this.last.kibble) this.pop(this.kibble.parentElement);
    }
    const bk = bones.join(',');
    if (bk !== this.last.bones) {
      this.bones.innerHTML = bones.map((b) => FISHBONE_SVG.replace('class="bone-icon"', `class="bone-icon ${b ? '' : 'empty'}"`)).join('');
      if (this.last.bones !== undefined) this.pop(this.bones);
    }
    if (bell !== this.last.bell) {
      this.bell.classList.toggle('dim', !bell);
      if (bell) this.pop(this.bell);
    }
    this.last = { hearts, kibble, bones: bk, bell };
  }

  setTask(text) {
    if (this.task.textContent !== text) this.task.textContent = text;
  }

  setHint(h) {
    if (h === this.curHint) return;
    this.curHint = h;
    if (!h) { this.hint.classList.add('hidden'); return; }
    this.hint.querySelector('.hint-icon').textContent = h.icon;
    this.hint.querySelector('.hint-text').textContent = h.text;
    this.hint.classList.remove('hidden');
  }

  setTimer(sec, limit) {
    if (sec === null) { this.timer.classList.add('hidden'); return; }
    this.timer.classList.remove('hidden');
    const left = Math.max(0, limit - sec);
    this.timer.querySelector('span').textContent = left.toFixed(1);
    this.timer.classList.toggle('urgent', left < 5);
  }

  toast(text, dur = 2) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    this.toastEl.style.animation = 'none';
    void this.toastEl.offsetWidth;
    this.toastEl.style.animation = '';
    this.toastT = dur;
  }

  update(dt) {
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.toastEl.classList.add('hidden');
    }
  }

  reset() {
    this.last = {};
    this.curHint = undefined;
    this.setHint(null);
    this.setTimer(null);
    this.toastEl.classList.add('hidden');
    this.toastT = 0;
  }
}

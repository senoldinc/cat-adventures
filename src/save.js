// localStorage tabanlı kayıt. Tüm erişimler try/catch ile korunur; depolama yoksa bellekte çalışır.
const KEY = 'minnos-save-v1';

function defaults() {
  return {
    v: 1,
    kibble: 0,
    owned: ['fur_orange'],
    equipped: { hat: null, scarf: null, glasses: null, fur: 'fur_orange', special: null },
    levels: {},
    settings: { helper: false, music: true, sfx: true, touchUi: 'auto' },
  };
}

function load() {
  const base = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const data = JSON.parse(raw);
    return {
      ...base,
      ...data,
      equipped: { ...base.equipped, ...(data.equipped || {}) },
      settings: { ...base.settings, ...(data.settings || {}) },
      levels: data.levels || {},
      owned: Array.isArray(data.owned) ? data.owned : base.owned,
    };
  } catch {
    return base;
  }
}

export const save = load();

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* depolama kullanılamıyor — sessizce devam */
  }
}

export function levelSave(id) {
  if (!save.levels[id]) {
    save.levels[id] = { bones: [false, false, false], done: false, bestTime: null, challengeBest: null };
  }
  return save.levels[id];
}

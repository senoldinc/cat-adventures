// Mağaza kataloğu ve satın alma/giyme mantığı.
import { save, persist } from './save.js';
import { FURS } from './catModel.js';

export const CATEGORIES = [
  { id: 'hat', name: 'Şapka', icon: '🎩' },
  { id: 'scarf', name: 'Fular', icon: '🧣' },
  { id: 'glasses', name: 'Gözlük', icon: '👓' },
  { id: 'fur', name: 'Kürk', icon: '🎨' },
  { id: 'special', name: 'Özel', icon: '⭐' },
];

export const ITEMS = [
  { id: 'hat_party', slot: 'hat', name: 'Parti Şapkası', icon: '🥳', price: 40 },
  { id: 'hat_top', slot: 'hat', name: 'Silindir', icon: '🎩', price: 70 },
  { id: 'hat_crown', slot: 'hat', name: 'Taç', icon: '👑', price: 120 },
  { id: 'hat_straw', slot: 'hat', name: 'Hasır Şapka', icon: '👒', price: null, reward: 'Bahçe Zor Parkuru' },
  { id: 'hat_chef', slot: 'hat', name: 'Aşçı Şapkası', icon: '👨‍🍳', price: null, reward: 'Mutfak Zor Parkuru' },
  { id: 'scarf_red', slot: 'scarf', name: 'Kırmızı Fular', icon: '🧣', price: 30 },
  { id: 'scarf_blue', slot: 'scarf', name: 'Mavi Fular', icon: '💙', price: 30 },
  { id: 'glasses_round', slot: 'glasses', name: 'Yuvarlak Gözlük', icon: '👓', price: 45 },
  { id: 'glasses_swim', slot: 'glasses', name: 'Yüzücü Gözlüğü', icon: '🥽', price: null, reward: 'Banyo Zor Parkuru' },
  { id: 'glasses_sun', slot: 'glasses', name: 'Güneş Gözlüğü', icon: '🕶️', price: 60 },
  { id: 'fur_orange', slot: 'fur', name: 'Turuncu', price: 0, color: FURS.fur_orange.main },
  { id: 'fur_gray', slot: 'fur', name: 'Gri', price: 30, color: FURS.fur_gray.main },
  { id: 'fur_black', slot: 'fur', name: 'Kara', price: 40, color: FURS.fur_black.main },
  { id: 'fur_cream', slot: 'fur', name: 'Krem', price: 40, color: FURS.fur_cream.main },
  { id: 'fur_lilac', slot: 'fur', name: 'Lila', price: 80, color: FURS.fur_lilac.main },
  { id: 'cape_red', slot: 'special', name: 'Kırmızı Pelerin', icon: '🦸', price: null, reward: 'Salon Zor Parkuru' },
];

export const itemById = (id) => ITEMS.find((i) => i.id === id);
export const owns = (id) => save.owned.includes(id);

export function buy(id) {
  const it = itemById(id);
  if (!it || owns(id) || it.price === null || save.kibble < it.price) return false;
  save.kibble -= it.price;
  save.owned.push(id);
  save.equipped[it.slot] = id;
  persist();
  return true;
}

export function grant(id) {
  if (owns(id)) return false;
  save.owned.push(id);
  const it = itemById(id);
  if (it) save.equipped[it.slot] = id;
  persist();
  return true;
}

// Giy / çıkar (kürk her zaman bir tane giyili kalır)
export function toggleEquip(id) {
  const it = itemById(id);
  if (!it || !owns(id)) return;
  if (it.slot === 'fur') save.equipped.fur = id;
  else save.equipped[it.slot] = save.equipped[it.slot] === id ? null : id;
  persist();
}

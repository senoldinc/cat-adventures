// Yeni oda eklemek için: JSON dosyasını bu klasöre koy ve aşağıdaki listeye ekle.
// Tüm odalar baştan açıktır; "soon" olanlar henüz yapım aşamasında.
import salon from './salon.json';
import mutfak from './mutfak.json';
import banyo from './banyo.json';
import bahce from './bahce.json';

export const LEVELS = [
  salon,
  mutfak,
  banyo,
  bahce,
  { id: 'cati', name: 'Çatı', emoji: '🌙', soon: true },
  { id: 'bodrum', name: 'Bodrum', emoji: '🔦', soon: true },
];

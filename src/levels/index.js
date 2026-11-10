// Yeni oda eklemek için: JSON dosyasını bu klasöre koy ve aşağıdaki listeye ekle.
// Tüm odalar baştan açıktır. Bodrum finaldir (bitince oyun sonu ekranı).
import salon from './salon.json';
import mutfak from './mutfak.json';
import banyo from './banyo.json';
import bahce from './bahce.json';
import cati from './cati.json';
import bodrum from './bodrum.json';

export const LEVELS = [
  salon,
  mutfak,
  banyo,
  bahce,
  cati,
  bodrum,
];

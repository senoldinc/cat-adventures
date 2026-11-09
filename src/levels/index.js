// Yeni oda eklemek için: JSON dosyasını bu klasöre koy ve aşağıdaki listeye ekle.
import salon from './salon.json';

export const LEVELS = [
  salon,
  { id: 'mutfak', name: 'Mutfak', emoji: '🍳', locked: true },
  { id: 'banyo', name: 'Banyo', emoji: '🛁', locked: true },
  { id: 'bahce', name: 'Bahçe', emoji: '🌻', locked: true },
  { id: 'cati', name: 'Çatı', emoji: '🌙', locked: true },
  { id: 'bodrum', name: 'Bodrum', emoji: '🔦', locked: true },
];

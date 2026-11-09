# 🐱 Minnoş: Büyük Ev Macerası

Çocuklar için tarayıcıda (masaüstü + telefon) oynanan 3D platform oyunu. Three.js + Vite.

```bash
npm install
npm run dev          # http://localhost:5173 — aynı ağdaki telefondan da açılır
npm run build        # dist/ klasörüne statik çıktı
```

## Kontroller
| | Klavye | Dokunmatik | Gamepad |
|---|---|---|---|
| Yürü | WASD / oklar | Sol tarafta sürükle | Sol çubuk |
| Zıpla / çift zıpla | Boşluk | Sarı tuş | A |
| Süzül | Boşluğu basılı tut | Sarı tuşu basılı tut | A basılı |
| Kamera | Fareyle sürükle, Q/E | Sağ tarafta sürükle | Sağ çubuk |
| Miyav | M | 😺 | X |
| Mola | Esc / P | ⏸️ | Start |

Tırmanmak için perdeye/kitaplığın yanına doğru yürü.

## Yeni oda eklemek
1. `src/levels/salon.json` dosyasını örnek alıp `src/levels/<oda>.json` oluştur.
2. `src/levels/index.js` içindeki kilitli girdiyi bu JSON ile değiştir.

Kutular `p` (merkez) + `s` (boyut) ile tanımlanır; `t`: `climb` | `bouncy`, `w: 1` yardımcı modda genişler, `look` görünüm ekler.
Konsoldan test: `__game.simulate(60, { moveY: 1, jumpPressed: true })`.

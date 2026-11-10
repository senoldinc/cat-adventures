# 🐱 Minnoş: Büyük Ev Macerası

Çocuklar için tarayıcıda (masaüstü + telefon) oynanan 3D platform oyunu. Three.js + Vite.

▶️ **Oyna:** https://senoldinc.github.io/cat-adventures/

`main` dalına her push'ta GitHub Actions oyunu derleyip GitHub Pages'e yayınlar.

```bash
npm install
npm run dev          # http://localhost:5173 — aynı ağdaki telefondan da açılır
npm run build        # dist/ klasörüne statik çıktı
```

## Kontroller
| | Klavye | Ekran tuşları (tablet/telefon) | Gamepad |
|---|---|---|---|
| Yürü | WASD / oklar | Sol alttaki joystick | Sol çubuk |
| Zıpla / çift zıpla | Boşluk | **A** | A |
| Süzül | Boşluğu basılı tut | **A**'yı basılı tut | A basılı |
| Pati at | F / J | **B** | B |
| Kamera | Fareyle sürükle, Q/E | Ekranın boş yerinde sürükle | Sağ çubuk |
| Miyav | M | 😺 | X |
| Mola | Esc / P | ⏸️ | Start |

Tırmanmak için perdeye/kitaplığın yanına doğru yürü.
Pati fareleri ve örümceği yener; süpürgeyi sersemletir (süpürge için üstüne zıpla).
Ekran tuşları dokunmatik cihazlarda otomatik açılır; Ayarlar → "📱 Ekran tuşları" ile Açık/Kapalı yapılabilir.

## Odalar
| Oda | Öne çıkan | Zor Parkur ödülü |
|---|---|---|
| 🛋️ Salon | Eğitim: tırmanma, minder, kayan tepsi | Kırmızı Pelerin |
| 🍳 Mutfak | Kırmızı plaka → çekmeceler, tost makinesi, tencere kapağı asansörü, 3 düğme → tabak köprüsü, **boss: Kral Fare** | Aşçı Şapkası (Mama Yağmuru) |
| 🛁 Banyo · 🌻 Bahçe · 🌙 Çatı · 🔦 Bodrum | Yapım aşamasında | |

Kral Fare: "!" gösterip koşar; kenara kaç, duvara toslasın. Sersemleyince üstüne zıpla (ya da pati at). 3 vuruşta yenilir, çan ortaya çıkar.

## Yeni oda eklemek
1. `src/levels/mutfak.json` dosyasını örnek alıp `src/levels/<oda>.json` oluştur.
2. `src/levels/index.js` içindeki `soon` girdisini bu JSON ile değiştir.

Kutular `p` (merkez) + `s` (boyut) ile tanımlanır; `t`: `climb` | `bouncy` | `launch`, `w: 1` yardımcı modda genişler, `look` görünüm ekler.
Diğer alanlar:
- `"g": "grup", "off": true` → kutu bir gruba aittir ve kapalı başlar; anahtarlar grupları açar.
- `movers`: `from`/`to`/`speed`, `wait` (uçlarda bekleme), `u0` (başlangıç konumu 0..1).
- `switches`: `plate` (üstüne bas) ya da `button` (pati/üstüne zıpla); `targets: [["grup", true]]`, `bulb` ile yanan ampul.
- `puzzles`: `need` listesindeki tüm anahtarlar basılınca `targets` açılır; görev satırında sayaç gösterir.
- `steps`: `{ until: "grup", text }` — grup açılana kadar görev satırında gösterilir.
- `boss`: `{ type: "kingmouse", p, arena: [x0,z0,x1,z1], name, intro, tip, task, outro }` + `"bellHidden": true`.
- `challenge.type`: `race` (mor bayrağa ulaş) ya da `collect` (`items` listesindeki mor mamaları topla).
Konsoldan test: `__game.simulate(60, { moveY: 1, jumpPressed: true })` (pati için `pawPressed: true`).

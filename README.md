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
| 🛁 Banyo | Kaygan köpük, havlu tırmanışı, tuvalet kâğıdı bandı, aralıklı musluk, vana → küvet dolar ve ördekler yükselir, çamaşır tamburu, kapıya kaydırak | Yüzücü Gözlüğü (Yere Basma!) |
| 🌻 Bahçe | Çit üstünde denge, süpüren fıskiye, köstebek tüneli, ayçiçeği zıplatıcı, uyuyan köpek (💤 iken geç, 👀 iken dur), sulayınca büyüyen çiçekler → ağaç evi, **boss: Dev Köstebek** | Hasır Şapka (Çit Yarışı) |
| 🌙 Çatı | Gece; eğimli kiremitler, rüzgârlı kalas, bacanın dumanında yükselme, çöken kiremitler, baca içinde kemik, rüzgâr gülü, 3 yıldız → Ay Köprüsü | Yıldızlı Pelerin (Yıldız Yolu) |
| 🔦 Bodrum | Yapım aşamasında | |

Dev Köstebek: toprak titreyen tümseğe koş, çıkınca pati at ya da üstüne zıpla; kırmızı halkalara toprak topu düşer.
Kral Fare: "!" gösterip koşar; kenara kaç, duvara toslasın. Sersemleyince üstüne zıpla (ya da pati at). 3 vuruşta yenilir, çan ortaya çıkar.

## Yeni oda eklemek
1. `src/levels/mutfak.json` dosyasını örnek alıp `src/levels/<oda>.json` oluştur.
2. `src/levels/index.js` içindeki `soon` girdisini bu JSON ile değiştir.

Kutular `p` (merkez) + `s` (boyut) ile tanımlanır; `t`: `climb` | `bouncy` | `launch` | `soap` (kaygan) | `floor` ("Yere Basma!" için zemin sayılır), `w: 1` yardımcı modda genişler, `look` görünüm ekler.
Diğer alanlar:
- `"g": "grup", "off": true` → kutu bir gruba aittir ve kapalı başlar; anahtarlar grupları açar.
- `movers`: `from`/`to`/`speed`, `wait` (uçlarda bekleme), `u0` (başlangıç konumu 0..1); ya da `orbit: [x,y,z]`, `r`, `speed`, `phase`, `plane: "zy"|"xz"` ile dönme dolap gibi dönen platform.
- `"conv": [vx, vz]` → taşıma bandı; `"float": "suId", "sink"` → suyla yükselen kutu.
- `water`: `id`, `g` (grup açılınca yükselir), `rise`, `riseTime`.
- `zones`: `{ type: "push", p, s, f: [fx,fy,fz], period: [açık, kapalı], vis: "stream"|"spray", sweep: { from, to, speed } }` → içindekini iter (sweep ile gidip gelir).
- `tunnels`: `[{ a: [x,y,z], b: [x,y,z] }]` → iki delik arasında ışınlanma.
- `roofs`: `[{ z0, z1, ridge, gutter }]` → sırttan oluğa basamaklı eğimli çatı üretir; `"t": "crumble"` → basınca çöken kiremit.
- `zones` türleri: `push`, `wind` (aralıklı, `vis: "leaves"`), `updraft` (süzülürken yükseltir, `vis: "smoke"`).
- `switches` `type: "star"` → dokununca yanar; `theme.night` → gece ışığı, yıldızlar ve ay.
- `"grow": true` → gruptaki kutu açılınca yerden büyüyerek çıkar.
- `theme.outdoor` → tavan yok, alçak çit, uzak ağaçlar ve bulutlar; `floorTex: "grass"`.
- Düşmanlar: `vacuum`, `mouse`, `spider`, `roamer`, `soap`, `owl`, `dog` (`area`, `sleep`, `pushZ`). Boss: `kingmouse`, `mole` (`holes`, `respawn`).
- `switches`: `plate` (üstüne bas), `button` ya da `valve` (pati/üstüne zıpla); `targets: [["grup", true]]`, `bulb` ile yanan ampul.
- `puzzles`: `need` listesindeki tüm anahtarlar basılınca `targets` açılır; görev satırında sayaç gösterir.
- `steps`: `{ until: "grup", text }` — grup açılana kadar görev satırında gösterilir.
- `boss`: `{ type: "kingmouse", p, arena: [x0,z0,x1,z1], name, intro, tip, task, outro }` + `"bellHidden": true`.
- `challenge.type`: `race` (mor bayrağa ulaş), `collect` (`items` listesindeki mor mamaları topla) `nofloor` (yere basmadan bayrağa ulaş) ya da `sequence` (platformlar basıldıkça sırayla belirir).
- `door.p` yüksekse kapı o yükseklikte bir çıkıntıda durur.
Konsoldan test: `__game.simulate(60, { moveY: 1, jumpPressed: true })` (pati için `pawPressed: true`).

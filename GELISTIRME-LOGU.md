# Geliştirme Günlüğü

Projede alınan mimari kararların, bulunan kök nedenlerin ve doğrulama sonuçlarının
kronolojik kaydı. Yeni bir ders öğrenildiğinde bu dosyaya tarih damgasıyla ek yapılır.

---

## 2026-09-09 — Arena'nın kuruluşu

- İlk commit: TRON tarzı arena + IMPROVE döngüsü iskeleti (`ajanlar/`, `beyin/`, `server.py`, `index.html`).
- Ajanlar kendi `yonBul(durum)` fonksiyonlarını yazıyor; kaybeden tarafın kodu LLM analisti tarafından maç kaydına göre geliştiriliyor.
- İlk gözlem: iki ajan da sık sık **aynı tikte, ayrı ceplerde** bitirip berabere kalıyordu → beraberlik önleme kuralları (Voronoi toprak skoru, kafa-kafaya yasak hücre, `tuket()` tüketim yarışı) versiyonlara eklendi (ajanların kendi tur kayıtlarında v001–v006).

## 2026-09-10 (gündüz) — IMPROVE boru hattının olgunlaşması

- Tek seferlik `/api/ajan_tur` akışı terk edildi; yerine ZCode tarzı **parçalı konuşma döngüsü** (`improveTuru` + `/api/ajan_adim`) geldi: her istekte konuşmanın tamamı giden stateless `messages` dizisiyle taşınır, adım sayısına model karar verir.
- Tek aday yerine **3 farklı aday** (A: güvenli klon, B: orta risk, C: iddialı) üretilip hepsi kıyaslanır; kıyayı geçen en iyisi uygulanır.
- Doğrulama: 5/5 tur tamamlandı, final **SOL v1.013 / SAĞ v1.010**.

## 2026-09-10 (akşam) — "Ajanlar hep berabere kalıyor" şikâyeti: üç üst üste binmiş kök neden

### Kök neden 1 — SOL v1.014'ün pasifleşen av modu
- 12 adımlık patch döngüsünün "en iyi adım"ı `avAktif` koşuluna `&& alanRakip >= 100` eklemişti: rakibi küçük cepe hapiseden SOL avlamayı bırakıyordu → oyunlar kısa/berabere.
- **Çözüm:** doğrulanmış son iyi ikiliye dönüş — SOL `versiyonlar/v1.013.js` → `avci.js`, `ajan.json` sürümü 13'e çekildi, o tura ait hafıza satırı temizlendi. SAĞ zaten v1.010'daydı.

### Kök neden 2 — revert'in tutmaması: otomatik IMPROVE fırtınası
- Maç bitince kaybeden ajan 2 sn sonra **otomatik IMPROVE** başlatıyor (`improveTuru`) ve döngü bitince `/api/ajan_kayit` + `/api/ajan_uygula` `avci.js`'i yeni sürümle eziyor. Ayrı bir sekmede/oturumda çalışan SERIx10/EGITIMx100 sürücüleri de aynı şeyi yapar → revert sonrası sürüm yine eskiyordu.
- **Geçici kalkan:** `chmod -w ajanlar/*/avci.js` (sunucunun `yaz()` fonksiyonu doğrudan `open("w")` kullandığından Windows salt-okunur dosyada `PermissionError` fırlatır; Docker mount'unda da etkilidir). Doğrulama sırasında dış döngünün yayını bu kalkan sayesinde reddedildi (tur kaydı `PATCH DONGUSU: ADAY HAZIR` kaldı, kod ezilmedi).
- **Kalıcı çözüm:** aşağıdaki OTO-IMPROVE anahtarı + HEPSİNİ DURDUR düğmesi.

### Kök neden 3 — 17. tikteki kafa-kafaya ölümler: bayat yön protokolü
- Motor ajan Worker'ının **son** döndürdüğü yönü uygular (`p.dir = sonAIYon[taraf]`), cevap için el sıkışma yoktu. Pencere arka plana geçince (tarayıcı occlusion throttling) worker cevapları ana thread'e saniyeler gecikmeli düşüyor; botlar başlangıç yönüyle (R/L) düz koşup orta noktada çakışıyordu. Kıyas simülasyonu senkron olduğu için IMPROVE bu hatayı hiç göremiyordu.
- **Kalıcı çözüm (`index.html`):**
  - `ajanBekleyen` sayacı: durum gönderilince artar, `"yon"` cevabında azalır;
  - `dongu` ve hız bekçisi patlama döngüleri bekleyen cevap varken **tik atmaz** (1 sn'de cevap gelmezse bekçi sayacı düşürür = güvenlik vanası);
  - `startMac` her maçta `sonAIYon`'u açılış yönlerine sıfırlar, sayaçları temizler, worker'ları `ajanBaslat` ile tazeler.
- Sonuç: arka planda bile maçlar bayat yönle intihar etmez; ağır aksar ama **doğru** oynar.

## 2026-09-10 (gece) — OTO-IMPROVE anahtarı + HEPSİNİ DURDUR

### Yeni arayüz kontrolleri
- **🤖 OTO-IMPROVE: AÇIK/KAPALI** — maç sonu kaybeden otomatik IMPROVE'u açar/kapatır; seçim `localStorage`'da kalıcı. KAPALI iken kaybeden ajan merkeze hiç Danışmaz.
- **⏹ HEPSİNİ DURDUR** — maçı dondurur, SERI/EGITIM sürücülerini kapatır, `window.__hepsiniDurdur` bayrağıyla `improveTuru` adımlarını keser (döngü başında ve cevap döndükten sonra kontrol; uçuştaki adımın sonucu yok sayılır, aday uygulanmaz) ve sunucuya `/api/ajan_durdur` çağırır.
- **Sunucu (`server.py`)**: `AJAN_DURDUR` bayrağı; `/api/ajan_adim` durdurma aktifken isteği model çağrısına girmeden reddeder; `/api/ajan_stream` panelde "durduruldu (ISTEK YOK)" gösterir; `durdur:false` paneli `beklemede`'ye döndürür. BAŞLAT, durdurma bayraklarını temizleyip sunucuya `durdur:false` yollar → akış mevcut sürümlerden devam eder.

### Doğrulama
- **OTO-IMPROVE AÇIK — 5 maç (macNo 3-7):** her maç sonrası kaybeden ajan IMPROVE döngüsüne girdi ve sürüm attı:
  - mac3: SOL kaybetti → 3 adım → SOL v1.014 (tur_0078 "UYGULANDI")
  - mac4-7: SAĞ kaybetti → SAĞ v1.012, v1.013, v1.014, v1.015 (tur_0031-0034)
  - GLM konuşma kayıtları (wire) 170 → 184.
- **OTO-IMPROVE KAPALI — 5 maç (macNo 8-12):** beş maç da düz oynandı (176-589 tik); `improveKostu=false` ×5; **wire 184 → 184** (merkezle sıfır konuşma); tur sayıları ve sürümler (SOL v1.014 / SAĞ v1.015) değişmedi.
- **DURDUR testi:** SAĞ'ın ADIM 1'i düşünürken durdurma basıldı → döngü kapandı, sürüm korundu, BAŞLAT ile devam edildi.
- EĞİTİM 120x ile ayrıca 5/5 temiz maç doğrulandı (0 berabere, alan barı ~%50/50).

## Dersler / Tasarım Kuralları

1. **İki taraf da zorunlu `glm-5.3-flash`** — simetri şartı; testler EĞİTİM 120x butonuyla koşulur.
2. **Revert sonrası sürüm yine eskiyorsa** önce açık sekme/oturumdaki IMPROVE sürücülerini ara; otomatik IMPROVE her maç sonunu yeni bir sürüm fırsatına çevirir.
3. **Kıyas simülasyonu canlı davranışın tamamını temsil etmez** (senkron vs asenkron worker, tik sayacı farkları) — canlı maç izleri de analize katılmalı.
4. **API anahtarı yalnızca `ZAI_API_KEY` ortam değişkeniyle** verilir; depoda asla tutulmaz.
5. Arena gerçek zamanlı izlenecekse ZCode penceresinin ön planda olması tik hızını doğrudan etkiler; motor bu durumda bile doğruluğu korumak üzere tasarlandı.

# Ajan Arena — Kendi Kendini Geliştiren TRON Ajanları

İki bağımsız yapay zekâ ajanının (SOL ve SAĞ) klasik TRON/Işık Bisikletçileri oyununda
karşılaştığı, kaybeden ajanın kendi oyun kodunu LLM ile analiz edip geliştirdiği bir
"ajan arenası" deneyi. Ajanlar kendi `yonBul(durum)` fonksiyonlarını yazar; her maç
telemetriye dönüşür, analist ajan bu telemetriyi okuyup küçük kod yamaları üretir ve
hakem kıyasını geçen yama yayına girer.

## Özellikler

- **Canlı arena**: 45×30 canvas saha, AI-vs-AI veya insan-vs-AI maçlar
- **Kendi kendini geliştirme (IMPROVE)**: maç → telemetri → analist ajan → hakem kıyası → yeni sürüm
- **Parçalı konuşma döngüsü (patch döngüsü)**: her turda tek küçük değişiklik + anında 900 tıklık
  kıyas simülasyonu; model kaç adım süreceğine kendisi karar verir (`devam: true|false`),
  paneldeki "maks adım" yalnızca güvenlik tavanıdır
- **Çok adaylı motor**: tek turda 3 farklı aday kod üretilir, kıyayı geçen en iyisi uygulanır
- **Otomatik iyileştirme**: maç sonunda kaybeden ajan 2 sn sonra otomatik IMPROVE'a girer
- **🤖 OTO-IMPROVE anahtarı**: otomatik iyileştirmeyi açar/kapatır (kalıcı); kapalıyken kaybeden
  ajan merkeze hiç Danışmaz, sadece maç oynanır
- **⏹ HEPSİNİ DURDUR**: akan maçı, IMPROVE döngüsünü ve serileri anında durdurur; sunucu tarafında
  da yeni model istekleri reddedilir; ajanlar son çalışan sürümden BAŞLAT ile devam eder
- **Taze karar kapısı**: motor, ajanın o tik için üretilmiş taze kararı yoksa tik atmaz —
  arka planda/geri planda pencere olsa bile bayat yönle oynama yok
- **Yayın modu**: maç sonuçları alt yazı + büyük bildirimle duyurulur
- **Tempo seçenekleri**: yavaş / normal / hızlı / turbo / EĞİTİM 120x

## Çalıştırma

```bash
# Z.AI API anahtarını ortam değişkeni olarak verin (asla depoya yazılmaz)
export ZAI_API_KEY="..."        # Windows: set ZAI_API_KEY=...

python server.py                # http://127.0.0.1:8090
```

Docker ile:

```bash
# proje klasörü /www olarak mount edilir, 8090 yayınlanır
docker run --rm -p 8090:8090 -e ZAI_API_KEY="..." -v "$PWD":/www <imaj>
```

Model uçları [Z.AI](https://z.ai) `chat/completions` API'sini kullanır; her iki taraf da
`glm-5.3-flash` modeliyle konuşur (iki tarafa simetri kuralı).

## Dizin Yapısı

| Yol | İçerik |
|---|---|
| `server.py` | HTTP sunucu + GLM API köprüsü (analist/hakem uçları, canlı akış, durdurma ucu) |
| `index.html` | Arena arayüzü: oyun motoru, worker tabanlı ajan beyinleri, IMPROVE paneli |
| `ajanlar/sol`, `ajanlar/sag` | Her ajanın `avci.js` (güncel kod), `versiyonlar/` arşivi, `memory.md` ders defteri, `turlar/` tur kayıtları |
| `beyin/` | Maç izleri, paketler, LLM konuşma dökümleri (`wire/`) |
| `GELISTIRME-LOGU.md` | Geliştirme kararları ve kök neden analizlerinin kronolojisi |

## Güvenlik Notu

Hiçbir API anahtarı depoda tutulmaz. Sunucu anahtarı yalnızca `ZAI_API_KEY` ortam
değişkeninden okur; depodaki kod ve kayıtlar anahtar içermemelidir.

## İlgili Deneyler

- `llm-desenleri.html` — LLM çıktı desenlerine dair not sayfası

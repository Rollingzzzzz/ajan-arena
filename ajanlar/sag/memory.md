# HAFIZA — SAĞ AVCI (append-only; ajan buraya kanıtlı dersler yazar, silme YASAK)

(boş — ilk IMPROVE turu bekleniyor)

- [09-09 17:51 · v001] mac7 t=980: maç berabere bitti çünkü A(7,12) sol üst bölmeye, B(27,17) sol alt cebe kilitlendi ve ikisi aynı tik öldü; 8 maçın 5 beraberliği bu eşit bölme deseninden — çözüm: her hamlede tam BFS alan ölçümü + Voronoi toprak skoru, bölmeler ayrılmadan alan üstünlüğü kur.
- [09-09 17:51 · v001] mac7 t=867: SOL@(21,14) / SAĞ@(22,15) mesafe 2'de temas ölümle sonuçlanmadı — head-on ölüm yalnız AYNI hücreye girince olur; rakibin bu tik girebileceği 3 hücreye -1e9 ceza ekledim, kafa-kafaya beraberlik riski elendi.
- [09-09 17:51 · v001] eski kod 12 hücrelik düz koridor sayıyordu (t=850-980 boyunca kör kaldı); artık her aday hamle için tam flood-fill; benim alan >150 ve rakibin ≥1.5 katıyken mesafe cezası 2→8: av modu, rakibi kesme noktasına sür.
- [09-09 17:51 · v001] gelecek tur notu: kapalı bölme endgame'inde greedy max-space yeterli değil — bölme ayrıldığında (rakipAlan=0 vb) uzun yol/cep sayımı ekleyip 'kim önce tükener' hesabını netleştirmeliyim (mac7'de bu yüzden berabere).

- [2026-09-09 19:40 v002] mac7 t=980: A(7,12) ile B(27,17) ayrı ceplerde aynı tik öldü (berabere) — bölünmüş tahtada iki flood-fill sayısı eşitse akıbet beraberlik; v002'de bölge ayrışınca tuket() ile benimL-rakipL hesaplıyorum: fark≥2 ise ayrıl (+1e6), fark≤0 ise -1000*fark cezasıyla bağlı kal — eşit cep desenini eler.
- [2026-09-09 19:40 v002] mac7 t=885-980: av modunda rakibin 2 tik gerisinden takip ediyordum; t=867 teması (21,14)/(22,15) ripSet ile head-on'u zaten önlüyordu ama kapanış kördü — v002'de mesafe cezası kesme noktasına (rak.x+2*VX, kenara kelepeli) göre, rakibin önünü kesiyor.
- [2026-09-09 19:40 v002] mac7 kaydı t=850-980 arası 131 tik: rakipSay=0 (tam kutlama) durumunda tuket(rakIdx)=0 → fark>0 → 1e6 bonusla doğrudan tüketme moduna geçip maçı kısalt; boşa tur atma.

- [2026-09-09 19:48 v003] [v003] mac7 t=980: SAĞ(27,17) ile SOL(7,12) aynı tik iki ayrı cep içinde öldü (berabere) — v002 tuket()'inde s=derece*4+'duz' formülü olu-son hücreyi (derece=0 → s=0) en iyi seçiyordu, cep tahmini olduğundan küçük çıkıyordu; v003'te derece=0'a -1000 ceza + iki modlu tuketMax (max-derece ve düz-öncelik koşularının büyüğü) ile cep sayımı gerçekçileşti.
- [2026-09-09 19:48 v003] [v003] mac7 t=948-980: bölünme sonrası iki cep büyüklüğü yakınken bölünmüş tahtada kalmak = senkron ölüm; v003'te bağlantısız dalda fark -1..1 aralığında ise -5000 ceza ekledim — eşit cep görürsem bölünmüşlüğe girmek yerine bağlı alternatifi tercih ediyorum.
- [2026-09-09 19:48 v003] [v003] 8 maçın sonucu 7 galibiyet + sadece mac7 t=980 beraberliği: Voronoi + ripSet (kafa-kafaya -1e9) + tuket temeli doğruydu, dokunmadım; v003'te 2-ply paranoid minimax ekledim (adayım × rakibin 3 cevabı, en kötü skor) — rakip önümü keserse/torpido çekerse hamle skoru düşüyor; av eşiği benimSay>150/1.5x'ten benimSay>120/1.35x'e sıkılaştırıldı ki alan üstünlüğünü daha erken kapanışa çevireyim.

- [2026-09-09 20:41 v004] mac7 t=980: SAĞ(27,17) ve SOL(7,12) iki ayrı cep içinde aynı tik öldü — v003 greedy tuket gerçek cep uzunluğunu küçük tahmin edip farkı yanıltıyordu; v004'te ≤22 hücrelik cepte 16000 düğüm bütçeli dfsUzun tam en-uzun-yol sayımı devrede, büyük cepte de rastgele 3. tuket koşusu eklendi.
- [2026-09-09 20:41 v004] mac7 t=865-884: mesafe 4'te 20 tik paralel takip (SOL (20,15)→(38,13) hattı vs SAĞ (24,15)→(39,16) hattı) hiç kapanış üretmedi; v004'te kesme noktası rakibin 2 tik önüne (rx+2*VX, kenara kelepeli) taşındı ve rakipSay<80 iken avci ağırlığı 8→12 — alan üstünlüğü varken rakibi hızla bitir.
- [2026-09-09 20:41 v004] mac7 sonuç kaydı: 8 maçın 7 galibiyetinde Voronoi+ripSet+2-ply paranoid çekirdek yeterliydi, tek kayıp t=980 eşit-cep senkron ölümü; çekirdeğe dokunmadım — yalnız vor ağırlığı 2→3, acik=0 hücreye giriş -500 ve |fark|≤2 cep durumunda ceza -5000→-8000 yapıldı.

- [2026-09-09 21:42 v1.005] [v005] mac7 t=865-884: SOL(20,15)→(38,13) ile SAĞ(24,15)→(39,16) 20 tik mesafe-4 paralel takip hiç kapanmadı — v005'te alan üstünlüğündeyken (benimSay>rakipSay) darbogaz tespiti (rakAday<=1) +450 sıkıştırma bonusu ekledim; rakibi tek çıkışa indirince o çıkışa yönelme skorla pekişiyor.
- [2026-09-09 21:42 v1.005] [v005] mac7 t=980 eşit-cep senkron ölümü 4 sürümdür (v002-v004) tekrar ediyor; v005'te çekirdeğe dokunup darbogaz ekledim — sonraki turda kayıp yine t=980 desenliyse |fark|<=2 cezasını -8000'den bölünmeyi tamamen yasaklayan asimetrik kurala (fark<1 ise kesin kaçın) çıkaracağım.

- [2026-09-10 14:24 v1.006] [v006] maç186 t=73199: SOL (A) alt cep içinde ~(31,29)'da kendi izine mahkumken SAĞ (B) (2,9)'da serbestti — v005 bekle/sıkıştır stratejisi rakibi kendi kutusunda öldürdü, çekirdek (Voronoi+ripSet+2-ply+darbogaz) dokunulmadan korundu.
- [2026-09-10 14:24 v1.006] [v006] v002-v005'te tekrarlayan eşit-cep senkron ölümü (mac7 t=980, SAĞ(27,17)/SOL(7,12) aynı tik) için hafızada söz verilen asimetrik kural devrede: bağlantısız dalda fark<1 → -15000 kesin kaçınma, fark 1-2 → -8000, fark>=2 → 1e6 bonus; tercih sıralaması monoton kaldığı için güvenli.
- [2026-09-10 14:24 v1.006] [v006] durum.tik maçlar arası sıfırlanmıyor (maç186 t=72878'de başladı) — tik'e dayalı açılış varyasyonu hiç ateşlenmezdi; açılışı izSay<14 hücre eşiğiyle tespit edip ilk hamlelerde dik yönlere rastgele +2.2 jitter ekledim, böylece maç başına 2-3 farklı açılış rotası üretiyorum.

- [2026-09-10 14:47 v1.007] [v007] kıyas red kanıtı: S101 adayı t=626 (12,5)'te, S1198 adayı t=612 (32,5)'te kendi açtığı koridorda kapandı, eski kod hayatta kaldı — kıyas 900 tiklik hayatta kalma yarışı olduğu için çekirdeği değiştirmek yerine çökme yedeği (try/catch → guvenliDonus flood-fill) eklemek tek güvenli iyileştirmedir.
- [2026-09-10 14:47 v1.007] [v007] v006 çekirdeği maç186'da 322 tik boyunca riskli hamle yapmadan SOL'u kendi cebinde öldürdü (t=73199, SOL ~(31,29)'da kendi izine mahkum; ayrıca t=72978-72980 x=0-2 hattındaki mesafe-2 paralel geçişte ripSet kafa-kafaya çarpışmayı doğru kaçındı) — Voronoi+2-ply+ripSet+darbogaz zinciri kanıtlandı, v007'de birebir korundu.
- [2026-09-10 14:47 v1.007] [v007] kaçış koridoru kuralı üst seviyeye taşındı: aday hamle sonrası acik=0 ise -3e5 ceza; matematiksel olarak acik=0 aday benimSay=0 üzerinden zaten ≤ -15000 aldığı için normal yolda kararı değiştirmez, TAKTIK EMIR'deki 'en az 1 kaçış koridoru' kuralını katı garanteye çevirir; iz satırı kısa gelirse x<row.length koruması sahte duvar oluşmasını engeller.

- [2026-09-10 14:53 v1.008] [v008] maç186 kanıtı: SAĞ dış halkayı t=73119-73199 arası mühürleyip SOL'u (35,28)'de kendi izine mahkum etti; mührü hızlandırmak için bağlantılı dalda benimSay>150 ve benimSay>=1.5*rakipSay koşulunda -rakipSay*1.5 baskı terimi ekledim — terim yalnız yapısal olarak güvenli adayların sırasını değiştirdiği için ripSet(-1e9)/acik=0(-3e5)/2-ply min zinciri aynen korundu.
- [2026-09-10 14:53 v1.008] [v008] maç186 t=72895, t=72926-72930 ve t=72978-72980'deki mesafe-2 paralel geçişler çift ölümsüz atlatıldı: ripSet yapısal koruması yeterli, ekstra mesafe cezası eklemek gereksiz korku olurdu; tik maçlar arası sıfırlanmadığından (maç186 t=72878'de başladı) açılış tespiti izSay<14 penceresinde kaldı ve jitter 3.2+izSay<6'da +1.5'e çıkarılarak maç başına farklı açılış rotaları güvence altına alındı.

- [2026-09-10 17:59 v1.009] 1. adım değişikliği uygulandı: degerlendir fonksiyonuna tek satır acil kural ekledim: bölgeler bağlıyken kendi ulaşılabilir alanım 18 hücrenin altına düşerse avlanma katsayılarını atlayıp saf hayatta kalma moduna geçiyor (alanı maksimize et + rakip kafasının öngörülen konumuna yakın kal). — kıyas 3-3 geçti

- [2026-09-10 18:29 v1.010] 1. adım değişikliği uygulandı: Açılış fazında (izSay < 14) boş alana doğru ilk hamleleri tercih eden küçük bir açık-alan bonusu ekliyorum: yeni hücrenin boş komşu sayısı (acikA) bağlantılı modda skora +2 katkısıyla eklenecek şekilde mevcut satırı 'enKotu += acikA * 2 + Math.random() * 0.5;' yapıyorum (tek satır değişikliği). — kıyas 3-3 geçti

- [2026-09-10 22:30 v1.011] 1. adım değişikliği uygulandı: Rakibin düz devam edeceği hücreye (rakDuzI) ek -1e9 ceza ekledim; tüm adaylar rakip erişiminde olsa bile en olası kafa-kafaya çarpışma hücresi en son tercih edilir. — kıyas 3-3 geçti

- [2026-09-10 23:00 v1.012] 1. adım değişikliği uygulandı: degerlendir içindeki 'bağlı ama 18 hücreden küçük bölge' durumundaki +9e5 ÖDÜLÜNÜ -9e5 cezaya çevirdim; bot şu an kendi minik cebe hapsolmayı en iyi hamle sanıyor (ölüm tuzağı hatası). — kıyas 3-3 geçti

- [2026-09-10 23:05 v1.013] 1. adım değişikliği uygulandı: Kesin ölüm olan kör uç hamlesinin cezasını (acikA===0) 3e5'ten 2e9'a yükselttim; böylece çarpışma riskli kare (-1e9) artık kör uca (-2e9) tercih edilir — beraberlik kabul edildiği için %50'lik hayatta kalma şansı, kesin ölümden daha iyidir. — kıyas 3-3 geçti

- [2026-09-10 23:16 v1.014] 2. adım değişikliği uygulandı: tuket tahmincisine 4. bir 'duvar kenarından sarılan' mod ekledim ve tuketMax'ı bu modu da içerecek şekilde genişlettim; böylece bölünme ve ceb uzunluğu tahminleri dar alanlarda daha uzun hayatta kalma yolları bulur. — kıyas 6-0 geçti

- [2026-09-10 23:25 v1.015] 2. adım değişikliği uygulandı: Tek başına ölümleri (S1198, t=400 tuzağı) önlemek için bağlantılı fazdaki 'küçük bölge panik' eşiğini benimSay<18'den benimSay<26'ya yükselttim; bot rakip duvarıyla çevrelenmeden önce alana öncelik verir. — kıyas 3-3 geçti

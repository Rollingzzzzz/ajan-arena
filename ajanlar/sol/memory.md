# HAFIZA — SOL AVCI (append-only; ajan buraya kanıtlı dersler yazar, silme YASAK)

(boş — ilk IMPROVE turu bekleniyor)

- [2026-09-09 19:51 v001] mac7 t=980: (7,12) kafasıyla kendi kutumda öldüm; t=951–979 arası (7,10)-(9,14) bölgesinde 15 dönüşlü mini döngü — düz-koridor sayacı (max 12) gerçek boş alanı ölçemiyor; çözüm: her aday hamle için flood-fill alan sayımı.
- [2026-09-09 19:51 v001] mac7 t=867–884: mesafe 4 paralel yarış 20 tik sürdü, kimse kesmedi — alan üstünlüğünde rakip yönü×4 kesme noktasına koşan av modu eklendi (dist<=8, guven havuzu alan>=max*0.45).
- [2026-09-09 19:51 v001] v1.003 7 kayıp + 1 berabere: eşzamanlı tikte rakip kafasının 3 olası sonraki hücresi kafa-kafaya ölüm bölgesi; aday hücreler bu bölgeden filtrelenerek berabere/çift ölüm riski düşürüldü.

- [2026-09-09 20:02 v002] mac7 t=980 (7,12): flood-fill kendi eski kafa hücremi ve rakip kafasını boş saydığı için kutu alanı olduğundan büyük görünüyordu; tik sonrası iki kafanın da iz olacak şekilde bloklanması şart.
- [2026-09-09 20:02 v002] mac7 t=867–884: 20 tiklik paralel yarışta sabit kesme noktası (r.yon×4) hiç kesmedi; teritoryal fark (benAlan−oppAlan) skorlamak koridor kapatmayı hamle başına otomatik seçiyor.
- [2026-09-09 20:02 v002] v1.003 7 kayıp + 1 berabere: tek katlı max-alan seçimi baskıyı ölçmüyor; rakibin en iyi cevabını 2. kat BFS ile hesaba katan diff skoru ve ≤54 hücrede hug bonusu dar alanda dolanma süresini uzatmak için eklendi.

- [2026-09-09 20:08 v003] mac7 t=951-980: (7,10)→(9,14) spirali 29 tikte (7,12) kutusuna gömdü; tek hücrelik alan farklarında alan sayımı adayları eşit görüyordu — birincil skor en-kötü-durum Voronoi farkı (benim−rakip hücre ×2) olarak değiştirildi.
- [2026-09-09 20:08 v003] mac7 t=867-884: dist=4 paralel yarış 20 tik sürdü kimse kesmedi; rakibin 3 olası cevabının hepsine karşı Voronoi hesayıp en kötüsünü almak koridor kapama/kesme hamlelerini otomatik öne çıkarıyor.
- [2026-09-09 20:08 v003] mac7 t=865-868: (21,14)/(22,15)'te dist=2 kafa-kafaya temas — çift ölüm filtresi (aday ∩ rakipHamle = boş) korundu; rakibin yasal hamlesi kalmazsa Voronoi kaynağı olarak mevcut kafası kullanılıyor.

- [2026-09-09 21:26 v1.004] mac7 t=980: (7,12)'den (8,12)'ye girildi ve uc komsu ((8,11),(8,13),(9,12)) kendi izimdi — kutu; t=951-980 (7,10)-(14,14) mini spirali bu cepi 29 tikte sardi. Ders: alan farki sifirlanana kadar beklemek gec; derinlik-8 koridor sayaci <20 hucrede (20-koridor)x2 ceza ile cep olusumu baslarken kacin.
- [2026-09-09 21:26 v1.004] mac7 t=867-884: dist=4 paralel yaris 20 tik surdu, iki taraf da kesmedi (SOL (21,13)-(38,13), SAG (22,16)-(38,16) paralel hatlar). Ders: sabit mesafede dolasmak kesme getirmiyor; rakibin mevcut yonunde 2 hucre ongorulen kesme noktasi hedefi dist<=8 ve alan paritesinde x1.2 agirlikla kosuluyor.
- [2026-09-09 21:26 v1.004] mac7 t=865-868: (21,14)/(22,15) dist=2 kafa-kafaya temas — aday x rakipHamle filtresi korundu; ayrica tum temiz adaylar cakisma hucresiyse artik cakisma kabul edilerek cift olum=beraberlik kesin kayba tercih ediliyor (yedek zinciri: temiz -> cakisma -> iz -> mevcut yon).
- [2026-09-09 21:26 v1.004] mac7 t=948-980: SAG kendi alaninda spiralle oynadi, SOL ust koridorda dolastiktan sonra kendi kutusune gomuldu; kotuB >= 1.5xenIyiR durumunda enIyiRx0.3 ceza eklenerek rakibin en iyi kacis bolgesini kuculten koridor kapatma hamleleri otomatik odullendiriliyor (BASKI).

- [2026-09-09 21:40 v1.005] mac7 t=979-980: (7,12) kafasında U adayı (7,11) açıkken (x=0-6 şeridi, 150+ hücre) R ile (8,12) tek hücrelik çukura girilip öldü — kapalı bölgede Voronoi farkı tüm adaylarda aynı olduğundan seçim gürültüye kalıyor; bölgeler ayrışınca tam flood-alan (aJonx5) birincil skor modu eklendi.
- [2026-09-09 21:40 v1.005] mac7 t=951-980: (7,10)-(14,14) cebinde 29 tık örüldü; (5,14)'te x=0-4 şeridine L çıkışı varken U-R seçildi. Her adayda (alanBen-1-aJon) kesilen hücre sayısının x2.5 cezası ve aJon<=1'e -120 ile kendi bölgesini bölen ya da çukura giren hamle otomatik eleniyor.
- [2026-09-09 21:40 v1.005] mac7 t=867-884: dist=4 paralel yarışta (SOL y=13, SAĞ y=16) 20 tık kimse kesmedi; dist<=12'de rakipHamle komşuları (t+2 cephesi) için db>=2 en kısa varış süresine göre -(30-avMes)x0.6 av bonusu, alanBen>1.25xalanRakip'te enIyiRx0.5 baskı ile koridor kapatma/kesme zorlandı.

- [2026-09-09 22:21 v1.006] mac11 t=5028-5063: (16,27)'den U ile x=16 bacasına girildi; satır 22-27 arası 1 genişlik tek seçenek zinciri (16,22)→(0,22)→(0,29)→(18,29)→(18,20)→(1,20)'de ölümlü bitti, aJon flood sayımı baca ile açık alanı ayırt edemedi — ayrık modda birincil skor koridorSim (zorunlu adım+dal flood alanı, olümde -60) yapıldı.
- [2026-09-09 22:21 v1.006] mac11 t=4578-4594: x=22/x=24 sütunlarında 17 tik dist=2 paralel yarış yine kesimsiz kaldı; ortak modda koridorSim ≤4 adımda ölüme biten girişlere (5-uzunluk)×8+8 ceza ve vorBen<0.8×vorRakip iken kotuDif ağırlığını 2'den 3.5'e çıkaran agresif kesme modu eklendi.
- [2026-09-09 22:21 v1.006] mac11 t=5063 final tahtası: dolgu sonunda derinlik-8 koridor sayacı doğal olarak küçüldüğünden koridor<20 cezası ayrık modda uzunluk sıralamasını bozuyordu; ceza yalnız ortak moda kısıtlandı, ayrık modda cep tespitini koridorSim olum/uzunluk üzerine aldı.

- [2026-09-10 17:12 v1.007] kıyas kanıtı: eski v006 kodu kıyasın TÜM oyunlarında 900 tik hayatta kaldı; önceki turun adayları t=282 (9,0) ve t=235 (40,6) duvar/iz/kenar ölümleriyle reddedildi — ders: büyük yeniden yazım erken ölüm demek; bu yüzden üç aday da v006 çekirdeğini (flood-fill aJon + koridor sayacı + komsu + çakışma filtresi) harfiyen korudu, değişiklikler yalnız ölü konum yedeği ve güvenli gürültü düzeyinde.
- [2026-09-10 17:12 v1.007] mac186 t=73199 son tahtası: SOL kafası (32,29) kenar hücresindeydi; (31,29), (33,29) ve (32,28) komşularının üçü de kendi iziydi — alt bölgeyi 322 tikte 175 dönüşle doldurup cebinde bitti, SAĞ (2,9)'da dev üst bölgede hayattaydı. Ders: ayrık modda az dönüşlü düz doluş hayatta kalma süresini uzatır; C adayında ortak===0 moduna 0.6 ayni-yön bonusu eklendi.
- [2026-09-10 17:12 v1.007] mac186 t=72878-73199 ısı haritası: SAĞ dış çerçeveyi tur atıp tahtayı ikiye böldü, SOL küçük alt bölgeye hapsedildi; kıyas 900 tiklik hayatta kalma yarışı olduğundan av/baski terimlerine dokunulmadı, çeşitlilik yalnız güvenli havuzda uygulandı (B: skor gürültüsü 0.05, C: tik≤5 açılış gürültüsü 2.0 + kademeli cep cezası aJon≤2: -40 / ≤4: -12).

- [2026-09-10 17:24 v1.008] mac186 t=73199: (32,29) kafasının 3 komşusu da kendi iziydi; t=73092-73199 sag-alt spiralinde 322 tikte 175 dönüşle cebimde öldüm — aJon<=1 (-120) cezası tek hücre geç kalıyor; A adayı aJon<=2'ye -60 ve ayrık modda eşit-aJon bağlarında düz-gide 1.2 (ortak modda 0.3 aynen) ekliyor, ortak-mod blokları hiç değişmedi.
- [2026-09-10 17:24 v1.008] mac186 isı haritası t=72878-73199: SOL alt bölgede kesilen×2.5 cezası yüzünden koridor taahhüdünden kaçıp zikzak-cep üretti; B adayı ayrık modda yalnız aJon<80 iken kesilen ağırlığını 1.2'ye düşürüp son dolguda düz taahhüdü ödüllendiriyor (aJon>=80 ve ortak modda 2.5 aynen ki kiyas 900 tik davranışı korunuyor).
- [2026-09-10 17:24 v1.008] mac186 t=73119-73199 son tahtası: SAĞ üst mega-bölgede hayatta kalırken ben küçük bölgede kapandım; C adayının enCocuk terimi (çocuksuz aday -80, ×1.5) 'her hamlede en az 1 kaçış koridoru' emrini 2-adımlı aramaya taşıyor, (7,12)-(8,12) tipi mak7 çukur ölümlerinin aynısı aJon<=2 ek cezasıyla ikinci kez önlenmiş oluyor.

- [2026-09-10 17:47 v1.009] mac186 t=73199: kafa (32,29)'da, 3 komşusu (31,29)/(33,29)/(32,28) kendi iziydi; 322 tikte 175 dönüş zikzagı cep ölümü üretti — A adayı ayrık modda ayni-yön bonusunu 0.3'ten 1.2'ye çıkarıp eşit-aJon bağlarını düz gidişe kırıyor, dolgudaki dönüş sayısını düşürmeyi hedefliyor.
- [2026-09-10 17:47 v1.009] mac11 t=5063 son tahtası kanıtı: dolgu sonunda derinlik-8 koridor sayacı doğal olarak küçüldüğünden koridor<20 cezası (-40'a kadar) ayrık modda aJon*5 sıralamasını eziyordu; B ve C adayı cezayı ortak moda kısıtlıyor, kıyas 900-tik davranışının taşıdığı ortak mod aynen korunuyor.
- [2026-09-10 17:47 v1.009] mac186 t=73092-73199: flood-max alan seçimi bölgeyi dağınık bıraktı (son tahtada alt bölgede onlarca '.' kaldı) ve kafa kendi izine gömüldü; C adayı ayrık modda aJon<=200'de her adayı greedy-rollout ile kapanana kadar simüle edip rollov*8+aJon*0.5 ile gerçek ölüm-adımını birincil skora alıyor.
- [2026-09-10 17:47 v1.009] kıyas gerçekleri t=282 (9,0) ve t=235 (40,6) erken ölümleri: büyük yeniden yazım kenar/iz çarpması demek; üç aday da v008 çekirdeğini (aday filtresi + çakışma filtresi + güvenli dönüş yedekleri + bfsD) harfiyen korudu, farklar yalnız ayrık-mod skor terimlerinde.

- [2026-09-10 17:59 v1.010] 1. adım değişikliği uygulandı: Av modunu (avAktif) yalnızca erişilebilir alanımız rakibinkine eşit veya daha büyümüşken etkinleştirdim; gerideyken riskli kovalamaca yerine güvenli bölge oyununu tercih eder. — kıyas 4.5-2.5 geçti

- [2026-09-10 18:08 v1.011] 1. adım değişikliği uygulandı: Av modunu temkinli hale getirdim: kovalamaca yalnızca ulaşılan alanım rakipten en az %15 fazla olduğunda devreye giriyor, böylece dengeli konumlarda gereksiz riskli yakın temas azalır. — kıyas 3.5-2.5 geçti

- [2026-09-10 18:25 v1.012] 1. adım değişikliği uygulandı: Avcı modunu sıkılaştırdım: avAktif koşulunda mesafe eşiğini 12→9'a ve bölge üstünlüğü koşulunu 1.15→1.3'e çıkardım, böylece bot net önde ve yakınken değilse riskli av davranışına girmeyip hayatta kalmaya odaklanır. — kıyas 5-3 geçti

- [2026-09-10 18:30 v1.013] 2. adım değişikliği uygulandı: Av modu aktif değilken (alan avantajı yokken) hamle sonrası rakip kafasına Manhattan mesafesi ≤4 olan adaylara kademeli ceza ekledim — yakın temasta çift ölüm (0.5'lik beraberlik) riskini azaltıp kazanına çevirmeyi hedefler. — kıyas 4-2.5 geçti

- [2026-09-10 22:49 v1.014] 2. adım değişikliği uygulandı: 2. yedek (fallback) seçimini sıkladım: artık rakibin bir hamlede ulaşabildiği hücrelere (çift ölüm = kafa çarpışması) girmekten kaçınıyor, sadece hiç boş-çarpışmasız hücre kalmazsa en son çare olarak çarpışmayı kabul ediyor — S101'deki t=588 çift ölümü büyük olasılıkla bu fallback yolundan geldi; adım 1'in avAktif sıkılaştırması kazandırdığı için aynen korundu. — kıyas 4.5-1 geçti

- [2026-09-11 01:11 v1.015] 3. adım değişikliği uygulandı: Nötr kalan yedek-flood-fill geri alındı; yerine çift ölümlerin ana kaynağı olan erken agresif avlanma sıkılaştırıldı (avActive eşikleri: mesafe<=5 ve alan>1.8x). — kıyas 5-3 geçti

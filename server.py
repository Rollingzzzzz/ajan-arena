#!/usr/bin/env python3
# TRON arena sunucusu: statik dosyalar + analist (GLM) + beyin dosya deposu
# Kural: API anahtarı SADECE burada (env) — tarayıcıya asla inmez.
import json, os, re, time, glob, threading, urllib.request, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

KOK = os.path.dirname(os.path.abspath(__file__))
BEYIN = os.path.join(KOK, "beyin")
API = "https://api.z.ai/api/coding/paas/v4/chat/completions"
MODELLER = {"sag": ("glm-5.3-flash", "🧠 AGENT-1 (GLM-5.3-Flash)"),
            "sol": ("glm-5.3-flash", "🧠 AGENT-2 (GLM-5.3-Flash)")}   # KURAL: iki taraf da ZORUNLU glm-5.3-flash
# düşünme seviyeleri: min = düşünme kapalı · high/max = sınırsız düşünme (max_tokens YOK — model kendi azamine kadar serbest)
DUSUNME = {"min": False, "high": True, "max": True}
ALANLAR = {"bolgePayim", "rakipMesafe", "onAciklik", "sonDuzluk", "kafaRiski", "olumTehlikesi"}
OPLAR = {"<", "<=", ">", ">=", "=="}

def yaz(yol, metin):
    os.makedirs(os.path.dirname(yol), exist_ok=True)
    with open(yol, "w", encoding="utf-8") as f:
        f.write(metin)

def oku(yol):
    with open(yol, encoding="utf-8") as f:
        return f.read()

def pb_yolu(taraf): return os.path.join(BEYIN, "avci_" + taraf, "playbook.json")
def defter_yolu(taraf): return os.path.join(BEYIN, "avci_" + taraf, "defter.json")

def baslat():
    for taraf in ("sol", "sag"):
        p = pb_yolu(taraf)
        if not os.path.exists(p):
            yaz(p, json.dumps({"beyin": "avci", "taraf": taraf, "surum": "v1.000",
                "taban": "kovalama skoru: rakip rotasina yaklas + bolge dengesi (motor kodunda sabit)",
                "kurallar": [], "gecmis": []}, ensure_ascii=False, indent=2))
        d = defter_yolu(taraf)
        if not os.path.exists(d):
            yaz(d, "[]")

def son_mac_raporu(taraf):
    klasor = os.path.join(BEYIN, "avci_" + taraf, "maclar")
    if not os.path.isdir(klasor):
        return None
    ds = sorted(d for d in os.listdir(klasor) if re.match(r"mac_\d+\.json$", d))
    if not ds:
        return None
    return oku(os.path.join(klasor, ds[-1]))

def son_paket(taraf):
    klasor = os.path.join(BEYIN, "avci_" + taraf, "maclar")
    if not os.path.isdir(klasor):
        return None
    ds = sorted(d for d in os.listdir(klasor) if d.endswith("_paket.json"))
    if not ds:
        return None
    return oku(os.path.join(klasor, ds[-1]))

def siradaki_mac_no(taraf):
    klasor = os.path.join(BEYIN, "avci_" + taraf, "maclar")
    n = 0
    if os.path.isdir(klasor):
        for d in os.listdir(klasor):
            if re.match(r"mac_\d+\.json$", d):   # iz/paket dosyalarını sayma
                n += 1
    return n + 1

def tur_yolu(taraf, no):
    return os.path.join(BEYIN, "avci_" + taraf, "turlar", "tur_%04d.json" % no)

# ---------- İZ → PAKET: ham trajectory'yi LLM'in analiz edebileceği katmanlara dönüştürür ----------
GRID_W, GRID_H = 45, 30
KIM_U = {"s": "SOL", "g": "SAĞ"}

def paket_hikaye(ticks):
    satirlar = []
    onceki = {}
    for t in ticks:
        for kim in ("s", "g"):
            x, y, d = t[kim]
            p = onceki.get(kim)
            if p is None:
                satirlar.append("t=%d %s başlangıç @(%d,%d) yön %s" % (t["t"], KIM_U[kim], x, y, d))
            else:
                if p[2] != d:
                    satirlar.append("t=%d %s DÖNÜŞ %s→%s @(%d,%d)" % (t["t"], KIM_U[kim], p[2], d, x, y))
            r = t.get("r0" if kim == "s" else "r1")
            if r:
                satirlar.append("t=%d %s kural %s işledi @(%d,%d)" % (t["t"], KIM_U[kim], r, x, y))
            onceki[kim] = (x, y, d)
    donus = sum(1 for s in satirlar if "DÖNÜŞ" in s)
    satirlar.append("ÖZET: maç %d tik · %d dönüş olayı (düz gidişler dönüşler arası anlaşılır)" % (len(ticks), donus))
    return "\n".join(satirlar)

def paket_kare(ticks, keseim):
    g = [[" "] * GRID_W for _ in range(GRID_H)]
    for t in ticks[:keseim + 1]:
        x, y, _ = t["s"]; g[y][x] = "1"
        x, y, _ = t["g"]; g[y][x] = "2"
    if keseim < len(ticks):
        x, y, _ = ticks[keseim]["s"]; g[y][x] = "A"
        x, y, _ = ticks[keseim]["g"]; g[y][x] = "B"
    return "\n".join("".join(r) for r in g)

def paket_isi(ticks, kim):
    say = [[0] * GRID_W for _ in range(GRID_H)]
    for t in ticks:
        x, y, _ = t[kim]
        say[y][x] += 1
    maks = max(max(r) for r in say) or 1
    rampa = " .:*#@"
    return "\n".join("".join(rampa[min(5, say[y][x] * 6 // (maks + 1))] for x in range(GRID_W)) for y in range(GRID_H))

def paket_kur(mac_no, iz):
    ticks = iz.get("ticks", [])
    if not ticks:
        return None
    n = len(ticks)
    # tahta görüntüleri: açılış / çeyrek / orta / 3çeyrek / son
    kesitler = sorted(set([0, n // 4, n // 2, (3 * n) // 4, n - 1]))
    goruntuler = []
    for k in kesitler:
        goruntuler.append("--- t=%d anında tahta (1=SOL izi, 2=SAĞ izi, A/B=kafalar) ---\n%s" % (ticks[k]["t"], paket_kare(ticks, k)))
    # ölüm replay'i: son min(15, n) tiktik ayrı kare
    if iz.get("olum"):
        goruntuler.append("--- ÖLÜM DÖNEMİ: son %d tiktik tahtası ---\n%s" % (min(15, n), paket_kare(ticks, n - 1)))
    isitma_sol = paket_isi(ticks, "s")
    isitma_sag = paket_isi(ticks, "g")
    # mesafe çizgisi
    mesafeler = []
    for t in ticks:
        sx, sy, _ = t["s"]; gx, gy, _ = t["g"]
        mesafeler.append((abs(sx - gx) + abs(sy - gy), t["t"], sx, sy, gx, gy))
    ds = [m[0] for m in mesafeler]
    temassiz = sorted(m for m in mesafeler if m[0] <= 6)[:20]
    temas = "\n".join("t=%d: SOL@(%d,%d) SAĞ@(%d,%d) mesafe %d" % (m[1], m[2], m[3], m[4], m[5], m[0]) for m in temassiz) or "yok"
    return {
        "macNo": mac_no,
        "hikaye": paket_hikaye(ticks),
        "goruntuler": "\n".join(goruntuler),
        "isitma_sol": "SOL oyuncunun gezdiği hücreler (yoğunluk: boşluk→#)\n" + isitma_sol,
        "isitma_sag": "SAĞ oyuncunun gezdiği hücreler (yoğunluk: boşluk→#)\n" + isitma_sag,
        "mesafe": "mesafe min %d / max %d / ort %.1f\n6 hücre ve altı yakın temaslalar:\n%s" % (
            min(ds), max(ds), sum(ds) / len(ds), temas),
    }

def siradaki_tur_no(taraf):
    klasor = os.path.join(BEYIN, "avci_" + taraf, "turlar")
    return (len(os.listdir(klasor)) if os.path.isdir(klasor) else 0) + 1

def sema_kontrol(kurallar):
    hatalar = []
    if len(kurallar) > 2:
        hatalar.append("2 kuraldan fazla önerildi")
    for i, k in enumerate(kurallar[:2]):
        ks = k.get("kosul", {})
        if ks.get("alan") not in ALANLAR:
            hatalar.append("kural%d: geçersiz alan '%s'" % (i + 1, ks.get("alan")))
        if ks.get("op") not in OPLAR:
            hatalar.append("kural%d: geçersiz operatör '%s'" % (i + 1, ks.get("op")))
        if not isinstance(ks.get("deger"), (int, float)):
            hatalar.append("kural%d: değer sayı değil" % (i + 1))
        ve = ks.get("ve")
        if ve is not None:
            if ve.get("alan") not in ALANLAR or ve.get("op") not in OPLAR or not isinstance(ve.get("deger"), (int, float)):
                hatalar.append("kural%d: 've' koşulu geçersiz" % (i + 1))
        et = k.get("etki", {})
        if not isinstance(et.get("katsayi", {}), dict):
            hatalar.append("kural%d: katsayı obje olmalı" % (i + 1))
        md = et.get("modDegistir")
        if md not in (None, "kacis", "av", "genis"):
            hatalar.append("kural%d: geçersiz mod '%s'" % (i + 1, md))
        if not k.get("gerekce") or len(str(k.get("gerekce"))) < 10:
            hatalar.append("kural%d: gerekçe çok kısa" % (i + 1))
    return hatalar

def prompt_kur(taraf, pb_metin, paket_metin, defter_metin):
    _, agent_adi = MODELLER[taraf]
    return f"""[ROL] Sen TRON oyunundaki bir AVCI botunun koçusun. İşin: maçın AN VE AN kaydını okuyup
algoritmasına EKLENECEK koşul kuralları önermek. Sen oynamazsın, kod yazmazsın — kural yazarsın.
Kuralların botun motoru tarafından HER HAMLEDE okunur; ilk eşleşen kural o hamlenin skorlamasını yönetir.

[OYUN ÖZETİ] 45x30 ızgara, iki motosiklet iz bırakır; izine/duvara çarpan ölür.
AVCI = kovalayan beyin: rakibin rotasını kesmeye çalışır. Zayıf yanı: köşelerde sıkışmak.

[GÜNCEL PLAYBOOK]
{pb_metin}

[MAÇIN AN VE AN KAYDI — DÖNÜŞTÜRÜLMÜŞ ANALİZ VERİSİ]
{paket_metin}

[VERSİYON DEFTERİ — geçmiş kararlar]
{defter_metin or "[]"}

[KURAL ŞEMASI — tüm alanlar zorunlu]
{{"kosul": {{"alan": "bolgePayim|rakipMesafe|onAciklik|sonDuzluk|kafaRiski|olumTehlikesi",
          "op": "<|<=|>|>=|==", "deger": <sayı>,
          "ve": {{aynı şekilde, OPSİYONEL ikinci koşul}}}},
 "etki": {{"modDegistir": "kacis|av|genis|null",
          "katsayi": {{"mesafe": <sayı|null>, "bolge": <sayı|null>}}}},
 "gerekce": "<neden bu kural kaybı önler>"}}

ALAN SÖZLÜĞÜ: bolgePayim=nefes alanımın yüzdesi(0-100) · rakipMesafe=rakip kafasına manhattan hücre ·
onAciklik=önümdeki boş hücre · sonDuzluk=boş hücre<130 ise 1 · kafaRiski=kafam rakip kafasına bitişikse 1 ·
olumTehlikesi=üç yönümde de açık<2 ise 1
ETKİ SÖZLÜĞÜ: modDegistir=kural tutunca davranış modu ("kacis"=en açık yön, "av"=kovalamayı 2x güçlendir,
"genis"=bölge büyütmeye öncelik) · katsayi=taban skordaki ağırlıkları değiştirir (mesafe varsayılan 1.2, bölge 0.3)

[GÖREV]
1. "anlayis": maçın hikayesini EN FAZLA 4 cümlede yaz (Türkçe). Tahta görüntüleri ve
   zaman çizelgesindeki t=/koordinat verilerine DAYANMALI — uydurma yasak.
2. "kurallar": EN FAZLA 2 yeni kural. Şemaya birebir uyan JSON. HER kuralın gerekçesi
   kayıttaki somut bir kanıta gönderme yapmalı: "t=214 ölümlerinde..." veya "(22,0) köşesinde..."
   gibi en az bir t= ya da (x,y) referansı ZORUNLU.
3. "emekli": işe yaramayan eski kural id'leri (varsa, yoksa boş liste).

[YASAK] Şema dışı alan/operatör YOK. Serbest metin motoruna girmez. 2 kuraldan fazlası çöpe düşer.
Kayıtta olmayan bir olayı anlatan gerekçe = geçersiz.

[ÇIKTI] Yalnızca JSON — başka hiçbir metin:
{{"anlayis": "...", "kurallar": [...], "emekli": [...]}}"""

def kural_ozet(k):
    ks = k.get("kosul", {})
    metin = "%s %s %s" % (ks.get("alan"), ks.get("op"), ks.get("deger"))
    ve = ks.get("ve")
    if ve:
        metin += " VE %s %s %s" % (ve.get("alan"), ve.get("op"), ve.get("deger"))
    et = k.get("etki", {})
    parcalar = []
    if et.get("modDegistir"):
        parcalar.append("mod=" + str(et["modDegistir"]))
    kat = et.get("katsayi", {})
    if kat.get("mesafe") is not None:
        parcalar.append("mesafe=%s" % kat["mesafe"])
    if kat.get("bolge") is not None:
        parcalar.append("bolge=%s" % kat["bolge"])
    return "IF %s → %s" % (metin, " + ".join(parcalar) or "skor aynı")

def glm_cagir(model, prompt, dusunme, taraf):
    mesajlar = prompt if isinstance(prompt, list) else [{"role": "user", "content": prompt}]
    acik = DUSUNME.get(dusunme, True)
    govde = {"model": model,
             "messages": mesajlar,
             "temperature": 0.2,
             "thinking": {"type": "enabled" if acik else "disabled"}}   # max_tokens YOK = sınırsız
    istek = urllib.request.Request(API, data=json.dumps(govde).encode("utf-8"),
        headers={"Authorization": "Bearer " + os.environ.get("ZAI_API_KEY", ""),
                 "Content-Type": "application/json"})
    t0 = time.time()
    with urllib.request.urlopen(istek, timeout=900) as c:   # sınırsız düşünme = uzun sabır (15 dk)
        veri = json.loads(c.read().decode("utf-8"))
    msg = veri["choices"][0]["message"]
    icerik = msg.get("content") or ""
    dusunce = msg.get("reasoning_content") or ""
    sure = round(time.time() - t0, 1)
    # wire arşivi: ham prompt+cevap — denetlenebilirlik (anahtar asla yazılmaz)
    ts = time.strftime("%H%M%S")
    wire_yol = os.path.join(BEYIN, "wire", "agent_%s_%s.json" % (taraf, ts))
    yaz(wire_yol,
        json.dumps({"model": model, "dusunme": dusunme, "prompt": prompt,
                    "cevap": icerik, "dusunce_ilk2000": dusunce[:2000],
                    "sure_sn": sure,
                    "kullanim": veri.get("usage", {})}, ensure_ascii=False, indent=2))
    return icerik, dusunce, sure, wire_yol

def json_ayikla(metin):
    # fence'leri temizle + dengeli parantez tarayıcı: LLM çıktısından EN İYİ JSON adayını bul
    metin = re.sub(r"```(?:json)?", "", metin)
    baslangic = metin.find("{")
    while baslangic != -1:
        derinlik = 0
        for i in range(baslangic, len(metin)):
            if metin[i] == "{":
                derinlik += 1
            elif metin[i] == "}":
                derinlik -= 1
                if derinlik == 0:
                    aday = metin[baslangic:i + 1]
                    try:
                        return json.loads(aday)
                    except Exception:
                        break
        baslangic = metin.find("{", baslangic + 1)
    raise ValueError("cevapta geçerli JSON bulunamadı")

# ---------- AJAN ALTYAPISI: kod-evrimi ajanları (sol/sag) ----------
AJAN_KOK = os.path.join(KOK, "ajanlar")
AJAN_CALISIYOR = False          # TEK seferde bir IMPROVE (paralel yok)
AJAN_SONUC = {}   # (taraf, turNo) -> turun son durumu (canlı yoklama için)
CJK = re.compile(r"[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u3400-\u4dbf]")

def ajan_klasoru(taraf):
    return os.path.join(AJAN_KOK, taraf)

def ajan_meta_yolu(taraf):
    return os.path.join(ajan_klasoru(taraf), "ajan.json")

def ajan_meta(taraf):
    y = ajan_meta_yolu(taraf)
    if os.path.exists(y):
        return json.loads(oku(y))
    return {"surum": 0, "gecmis": []}

def ajan_tur_yolu(taraf, no):
    return os.path.join(ajan_klasoru(taraf), "turlar", "tur_%04d.json" % no)

def ajan_tur_no(taraf):
    klasor = os.path.join(ajan_klasoru(taraf), "turlar")
    return (len(os.listdir(klasor)) if os.path.isdir(klasor) else 0) + 1

def kod_gecerli(kod, eski_kod):
    if not kod or len(kod) < 50:
        return False, "kod çok kısa"
    if len(kod) > 20000:
        return False, "kod 20KB sınırını aştı"
    if "function yonBul" not in kod:
        return False, "yonBul fonksiyonu tanımlanmamış"
    if kod.strip() == eski_kod.strip():
        return False, "kod değişmedi — her turda somut gelişim zorunlu"
    for yasak in ("fetch(", "XMLHttpRequest", "import ", "require(", "postMessage", "self.", "eval(", "WebSocket", "Worker("):
        if yasak in kod:
            return False, "yasak ifade: " + yasak
    return True, ""

def not_temizle(memory_ek):
    temiz = []
    for s in (memory_ek or [])[:10]:
        s = str(s).strip()
        if len(s) < 12:
            continue
        if re.match(r"^\s*(iyi oynad|iyi maç|güzel|güzel maç|tamam|ok\b|süper|harika)", s, re.I):
            continue   # içersiz not — kanıtsız övgü
        temiz.append(s[:600])
    return temiz


def hafiza_kesit(memory_metni, taraf, max_ders=10, max_kr=4500):
    NL = chr(10)
    satirlar = [l for l in memory_metni.split(NL) if l.strip()]
    dersler = [l for l in satirlar if l.lstrip().startswith('- ')]
    diger = [l for l in satirlar if not l.lstrip().startswith('- ')]
    son = dersler[-max_ders:]
    eski_sayi = len(dersler) - len(son)
    bas = diger[:]
    if eski_sayi > 0:
        bas.append('...(en eski %d ders diskteki arsivde: ajanlar/%s/memory.md)' % (eski_sayi, taraf))
    metin = NL.join(bas + son)
    if len(metin) > max_kr:
        metin = metin[:max_kr] + NL + '...(uzunluk nedeniyle kesildi - tam hali dosyada)'
    return metin

def glm_json(model, prompt, dusunme, taraf):
    cevap, dusunce, sure, wire_yol = glm_cagir(model, prompt, dusunme, taraf)
    try:
        return json_ayikla(cevap), dusunce, cevap
    except Exception:
        if len(cevap.strip()) < 5:
            cevap2, _, _, _ = glm_cagir(model, prompt, "min", taraf)
        else:
            onarim = ("Aşağıdaki cevap bozuk JSON içeriyor. Onu GEÇERLİ, TAM JSON'a çevir. "
                      "Yalnızca JSON döndür:\n\n%s" % cevap[:3500])
            cevap2, _, _, _ = glm_cagir(model, onarim, "min", taraf)
        return json_ayikla(cevap2), dusunce, cevap2


# ---------- CANLI STREAM: GLM çağrısını akıt, anlık durumu sunucu hafızasında tut ----------
AJAN_CANLI = {}
AJAN_DURDUR = {"sol": False, "sag": False}   # durdurma butonu: true iken yeni ajan adımı reddedilir

def glm_canli_cagir(model, prompt, dusunme, taraf, canli):
    mesajlar = prompt if isinstance(prompt, list) else [{"role": "user", "content": prompt}]
    son_user = next((str(m.get("content", "")) for m in reversed(mesajlar) if isinstance(m, dict) and m.get("role") == "user"), "")
    canli["giden_son"] = son_user[-800:]
    acik = DUSUNME.get(dusunme, True)
    govde = {"model": model,
             "messages": mesajlar,
             "temperature": 0.2,
             "thinking": {"type": "enabled" if acik else "disabled"},
             "stream": True}
    istek = urllib.request.Request(API, data=json.dumps(govde).encode("utf-8"),
        headers={"Authorization": "Bearer " + os.environ.get("ZAI_API_KEY", ""),
                 "Content-Type": "application/json"})
    t0 = time.time()
    parcalar, dusunceler = [], []
    with urllib.request.urlopen(istek, timeout=1200) as cevap:
        for ham in cevap:
            satir = ham.decode("utf-8", "replace").strip()
            if not satir.startswith("data:"):
                continue
            veri = satir[5:].strip()
            if veri == "[DONE]":
                break
            try:
                j = json.loads(veri)
                secimler = j.get("choices") or [{}]
                sec = secimler[0].get("delta", {})
                c = sec.get("content")
                r = sec.get("reasoning_content")
                if c:
                    parcalar.append(c)
                if r:
                    dusunceler.append(r)
                canli.update({"faz": "cevap alınıyor" if c else "düşünüyor",
                              "cevap_kr": len("".join(parcalar)),
                              "dusunce_kr": len("".join(dusunceler)),
                              "cevap_son": ("".join(parcalar))[-1200:],
                              "dusunce_son": ("".join(dusunceler))[-1200:],
                              "sure": round(time.time() - t0, 1)})
            except Exception:
                continue
    icerik = "".join(parcalar)
    dusunce = "".join(dusunceler)
    sure = round(time.time() - t0, 1)
    ts = time.strftime("%H%M%S")
    wire_yol = os.path.join(BEYIN, "wire", "agent_%s_%s.json" % (taraf, ts))
    yaz(wire_yol, json.dumps({"model": model, "dusunme": dusunme, "prompt": prompt,
        "cevap": icerik, "dusunce_ilk2000": dusunce[:2000], "sure_sn": sure,
        "stream": True}, ensure_ascii=False, indent=2))
    canli.update({"faz": "bitti", "sure": sure})
    return icerik, dusunce, wire_yol

class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _json(self, kod, nesne):
        veri = json.dumps(nesne, ensure_ascii=False).encode("utf-8")
        self.send_response(kod)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(veri)))
        self.end_headers()
        self.wfile.write(veri)

    def _json_sessiz(self, kod, nesne):
        try:
            self._json(kod, nesne)
        except Exception:
            pass   # bağlantı kopmuş olabilir — tur zaten kaydedildi

    def do_GET(self):
        p = urllib.parse.urlparse(self.path)
        if p.path == "/api/ajan":
            taraf = urllib.parse.parse_qs(p.query).get("taraf", ["sag"])[0]
            kl = ajan_klasoru(taraf)
            kod_y = os.path.join(kl, "avci.js")
            if taraf not in ("sol", "sag") or not os.path.exists(kod_y):
                self._json(404, {"ok": False, "hata": "ajan kodu yok"}); return
            self._json(200, {"ok": True, "kod": oku(kod_y), "surum": ajan_meta(taraf).get("surum", 0),
                             "memory": oku(os.path.join(kl, "memory.md"))})
        elif p.path == "/api/playbook":
            taraf = urllib.parse.parse_qs(p.query).get("taraf", ["sag"])[0]
            try:
                pb = json.loads(oku(pb_yolu(taraf)))
                self._json(200, {"ok": True, "playbook": pb})
            except Exception as e:
                self._json(500, {"ok": False, "hata": str(e)})
        elif p.path == "/api/ajan_stream":
            taraf = urllib.parse.parse_qs(p.query).get("taraf", ["sag"])[0]
            canli = AJAN_CANLI.get(taraf)
            if not canli:
                faz = "durduruldu (ISTEK YOK)" if AJAN_DURDUR.get(taraf) else "beklemede"
                self._json(200, {"ok": True, "calisiyor": AJAN_CALISIYOR, "faz": faz})
            else:
                r = dict(canli)
                if AJAN_DURDUR.get(taraf):
                    r["faz"] = "durduruldu (ISTEK YOK)"
                r["ok"] = True
                r["calisiyor"] = AJAN_CALISIYOR
                self._json(200, r)
        elif p.path == "/api/ajan_tur_durum":
            q = urllib.parse.parse_qs(p.query)
            taraf = q.get("taraf", ["sag"])[0]
            try:
                tur_no = int(q.get("turNo", ["0"])[0])
            except ValueError:
                tur_no = 0
            rec = AJAN_SONUC.get((taraf, tur_no))
            hala = rec is None or rec.get("durum") == "calisiyor"
            if rec is None:
                self._json(200, {"ok": True, "calisiyor": True, "durum": "calisiyor"})
            else:
                r = dict(rec)
                r["ok"] = True
                r["calisiyor"] = hala
                self._json(200, r)
        elif p.path == "/api/dosyalar":
            liste = []
            for kok in (AJAN_KOK, BEYIN):
                for kok2, klasorler, dosyalar in os.walk(kok):
                    for k in klasorler:
                        yol = os.path.join(kok2, k)
                        liste.append({"yol": os.path.relpath(yol, KOK).replace("\\", "/"), "tip": "klasor"})
                    for d in dosyalar:
                        yol = os.path.join(kok2, d)
                        liste.append({"yol": os.path.relpath(yol, KOK).replace("\\", "/"),
                                      "boyut": os.path.getsize(yol), "tip": "dosya"})
            self._json(200, {"ok": True, "kok": "ajanlar/ + beyin/", "ogeler": liste})
        elif p.path == "/api/son_wire":
            taraf = urllib.parse.parse_qs(p.query).get("taraf", ["sag"])[0]
            klasor = os.path.join(BEYIN, "wire")
            ds = sorted(glob.glob(os.path.join(klasor, "agent_%s_*.json" % taraf)))
            if not ds:
                self._json(200, {"ok": False, "hata": "arşivde kayıt yok"})
                return
            son = ds[-1]
            veri = json.loads(oku(son))
            veri["dosya"] = os.path.relpath(son, KOK).replace("\\", "/")
            veri["zaman"] = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(son)))
            self._json(200, {"ok": True, "kayit": veri})
        elif p.path == "/api/dosya":
            q = urllib.parse.parse_qs(p.query)
            yol = q.get("yol", [""])[0]
            # istemci "beyin/..." önekiyle gönderir; KOK üzerinden çöz, BEYIN içinde mi doğrula
            temiz = yol.replace("\\", "/")
            if temiz.startswith("beyin/"):
                temiz = temiz[len("beyin/"):]
            gercek = os.path.realpath(os.path.join(BEYIN, temiz))
            if not gercek.startswith(os.path.realpath(BEYIN)) or not os.path.isfile(gercek):
                self._json(400, {"ok": False, "hata": "geçersiz yol"})
                return
            self._json(200, {"ok": True, "yol": yol, "icerik": oku(gercek)})
        else:
            # statik dosya
            yol = p.path
            if yol == "/":
                yol = "/index.html"
            gercek = os.path.realpath(os.path.join(KOK, yol.lstrip("/")))
            if not gercek.startswith(os.path.realpath(KOK)) or not os.path.isfile(gercek):
                self.send_response(404); self.end_headers(); return
            icerik = open(gercek, "rb").read()
            tipler = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
                      ".css": "text/css", ".json": "application/json", ".png": "image/png"}
            uz = os.path.splitext(gercek)[1]
            self.send_response(200)
            self.send_header("Content-Type", tipler.get(uz, "application/octet-stream"))
            self.send_header("Content-Length", str(len(icerik)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(icerik)

    def do_POST(self):
        global AJAN_CALISIYOR
        n = int(self.headers.get("Content-Length", 0))
        govde = json.loads(self.rfile.read(n).decode("utf-8")) if n else {}
        p = urllib.parse.urlparse(self.path)

        if p.path == "/api/mac_iz":
            # an-ve-an iz dosyası + LLM paketi üret (her iki tarafın klasörüne de koy)
            mac_no = govde.get("macNo", 0)
            iz = govde.get("iz", {})
            paket = paket_kur(mac_no, iz)
            for taraf in ("sol", "sag"):
                yaz(os.path.join(BEYIN, "avci_%s" % taraf, "maclar", "mac_%04d_iz.json" % mac_no),
                    json.dumps({"macNo": mac_no, "iz": iz}, ensure_ascii=False))
                if paket:
                    yaz(os.path.join(BEYIN, "avci_%s" % taraf, "maclar", "mac_%04d_paket.json" % mac_no),
                        json.dumps(paket, ensure_ascii=False, indent=2))
            self._json(200, {"ok": True, "paket": bool(paket), "tik": len(iz.get("ticks", []))})

        elif p.path == "/api/gelisim":
            taraf = govde.get("taraf") if isinstance(govde, dict) else None
            taraf = govde.get("taraf", "sag")
            try:
                pb = json.loads(oku(pb_yolu(taraf)))
                kural_say = {}
                for k in pb.get("kurallar", []):
                    kural_say[k.get("surum")] = kural_say.get(k.get("surum"), 0) + 1
                ist = {}
                klasor = os.path.join(BEYIN, "avci_" + taraf, "maclar")
                if os.path.isdir(klasor):
                    for d in sorted(os.listdir(klasor)):
                        if re.match(r"mac_\d+\.json$", d):
                            try:
                                m = json.loads(oku(os.path.join(klasor, d)))
                            except Exception:
                                continue
                            s = m.get("surum")
                            if not s:
                                continue
                            k = ist.setdefault(s, {"g": 0, "b": 0, "m": 0})
                            if m.get("sonuc") == "kazandi": k["g"] += 1
                            elif m.get("sonuc") == "berabere": k["b"] += 1
                            elif m.get("sonuc") == "kaybetti": k["m"] += 1
                # sürüm sırası: v1.000 + gecmis sırası
                sira = ["v1.000"]
                for g in pb.get("gecmis", []):
                    if g["surum"] not in sira:
                        sira.append(g["surum"])
                for s in list(kural_say.keys()) + list(ist.keys()):
                    if s not in sira:
                        sira.append(s)
                def kural_kumulatif(v):
                    n = int(re.match(r"v1\.(\d+)", v).group(1))
                    return sum(c for s2, c in kural_say.items()
                               if (int(re.match(r"v1\.(\d+)", s2).group(1)) if re.match(r"v1\.(\d+)", s2) else 0) <= n)
                satirlar = []
                for v in sira:
                    i = ist.get(v, {"g": 0, "b": 0, "m": 0})
                    toplam = i["g"] + i["b"] + i["m"]
                    oran = round(i["g"] * 100 / toplam) if toplam else None
                    satirlar.append({"surum": v, "kural": kural_kumulatif(v) if v != "v1.000" else 0,
                                     "g": i["g"], "b": i["b"], "m": i["m"], "mac": toplam, "winrate": oran})
                self._json(200, {"ok": True, "taraf": taraf, "surler": satirlar})
            except Exception as e:
                self._json(500, {"ok": False, "hata": str(e)})

        elif p.path == "/api/mac_raporu":
            taraf = govde.get("taraf", "sag")
            n = siradaki_mac_no(taraf)
            yaz(os.path.join(BEYIN, "avci_%s" % taraf, "maclar", "mac_%04d.json" % n),
                json.dumps(govde.get("rapor", {}), ensure_ascii=False, indent=2))
            self._json(200, {"ok": True, "mac": n})

        elif p.path == "/api/ajan_tur":
            taraf = govde.get("taraf", "sag")
            dusunme = govde.get("dusunme", "max")
            onceki_hata = govde.get("onceki_hata") or ""
            if taraf not in ("sol", "sag"):
                self._json(400, {"ok": False, "hata": "bilinmeyen taraf"}); return
            kl = ajan_klasoru(taraf)
            kod_y = os.path.join(kl, "avci.js")
            if not os.path.exists(kod_y):
                self._json(400, {"ok": False, "hata": "ajan dosyalari yok"}); return
            tur_no = ajan_tur_no(taraf)
            AJAN_CALISIYOR = True
            AJAN_SONUC[(taraf, tur_no)] = {"durum": "calisiyor"}
            self._json(200, {"ok": True, "turNo": tur_no, "durum": "basladi"})
            model = "glm-5.3-flash"   # KURAL: her iki taraf da ZORUNLU glm-5.3-flash kullanır
            agent_adi = "AGENT-SOL (GLM-5.3-Flash)" if taraf == "sol" else "AGENT-SAG (GLM-5.3-Flash)"
            eski_kod = oku(kod_y)
            memory = oku(os.path.join(kl, "memory.md"))
            hafiza_gorunum = hafiza_kesit(memory, taraf)
            manifesto = oku(os.path.join(kl, "system.md"))
            paket = son_paket(taraf)
            paket_metin = paket or "henuz iz verisi yok"
            ozet_mac = []
            mklasor = os.path.join(BEYIN, "avci_" + taraf, "maclar")
            if os.path.isdir(mklasor):
                for d in sorted(x for x in os.listdir(mklasor) if re.match(r"mac_\d+\.json$", x))[-8:]:
                    try:
                        m = json.loads(oku(os.path.join(mklasor, d)))
                        ozet_mac.append("surum %s -> %s" % (m.get("surum"), m.get("sonuc")))
                    except Exception:
                        pass
            meta = ajan_meta(taraf)
            geri_besleme = ("\n[ONCEKI DENEMEN REDDEDILDI — BU HATAYI TEKRARLAMA, DUZELT]\n%s\n" % onceki_hata) if onceki_hata else ""
            prompt = f"""[MANIFESTO — kurallarin burada, bunlara UY]
{manifesto}
{geri_besleme}
[MEVCUT KODUN — bunu gelistireceksin]
{eski_kod}

[HAFIZAN — son dersler; tam arsiv dosyada: ajanlar/{taraf}/memory.md]
{hafiza_gorunum}

[SON MACIN AN-VE-AN KAYDI — hikaye + tahta goruntuleri + isi haritalari + mesafe]
{paket_metin}

[SON MAC SONUCLARIN]
{chr(10).join(ozet_mac) or "yok"}

[SURUM] v{meta.get('surum', 0):03d} -> bu turdan sonra v{meta.get('surum', 0) + 1:03d} olacak

[TAKTIK EMIR] ONCE YASA, SONRA AVLA: kiyas 900 tiklik hayatta kalma yarisidir — 900 tik hayatta kalan 0.5 alir ve
beraberlik bile kiyasi gecer. Her hamlede en az 1 kacis koridorunu koru, kendi kendini kutuya kapama;
kesme/avlama girisimlerini yalnizca hayatta kalman garantiliyken dene. Rakip sana avlanma alani birakiyorsa cezalandir.
KIYAS GERCEGI: eski kod simülasyonun TAMAMINDA hayatta kaliyor — adaylarin cogu kendi kutusuna kapilip erken oldugu icin reddediliyor.
En guvenli yol: mevcut kodun hayatta kalma cekirdegini (flood-fill, koridor sayimi, guvenli donus) AYNEN koru ve yalnizca
1-2 satirlik kucuk, riskli olmayan bir iyilestirme yap. Buyuk yeniden yazim = yeni hata = erken olum = red demektir.

[DIL SOZLESMESI — IHLAL = OTOMATIK RED]
ozet ve memory_ek yalnizca TURKCE. Cin/Japon/Kore karakteri KESINLIKLE YASAK.
yeni_kod saf JavaScript — yorum istersen Turkce yaz. Ondalik ayirici NOKTA (0.5; 0,5 yasak).

[YASAK] yeni_kod icinde: fetch(, XMLHttpRequest, import, require(, postMessage, self., eval(, Worker(
memory_ek'te iceriksiz not ("iyi oynadim" tarzi) YASAK — her notta kanit (t=/koordinat/desen) sart
kod onceki surumle AYNI olamaz — her turda somut gelisim zorunlu

[CIKTI] Yalnizca JSON — TEK degil 3 FARKLI aday ayni anda uret (hepsi test edilir, kıyasi gecen uygulanir):
 A = neredeyse birebir klon: mevcut kodu koru, yalniz 1-2 satir guvenli iyilestirme (hayatta kalma garanti hedef)
 B = orta riskli iyilestirme (farkli bir guvenlik/tuzak duzeltmesi)
 C = daha iddiali farkli yaklasim
{{"ozet": "en fazla 3 cumle — kayittaki somut bulgun ve neyi degistirdigin",
 "adaylar": [
  {{"kod_adi": "A", "degisiklik": "tek cumle neyi degistirdin", "yeni_kod": "function yonBul(durum) {{...}} tam icerik"}},
  {{"kod_adi": "B", "degisiklik": "tek cumle", "yeni_kod": "function yonBul(durum) {{...}} tam icerik"}},
  {{"kod_adi": "C", "degisiklik": "tek cumle", "yeni_kod": "function yonBul(durum) {{...}} tam icerik"}}],
 "memory_ek": ["kanitli ders 1", "..."]}}
Her yeni_kod TAM ve calisir olmali — parcali/yarim kod yasak. Adaylar birbirinden belirgin farkli olmali."""
            AJAN_CANLI[taraf] = {"faz": "dusunuyor", "prompt_kr": len(prompt), "cevap_kr": 0, "dusunce_kr": 0, "cevap_son": "", "dusunce_son": "", "sure": 0}
            yaz(ajan_tur_yolu(taraf, tur_no), json.dumps({
                "turNo": tur_no, "taraf": taraf, "agent": agent_adi, "model": model,
                "dusunme": dusunme, "zaman": time.strftime("%Y-%m-%d %H:%M:%S"),
                "durum": "dusunuyor", "prompt": prompt}, ensure_ascii=False, indent=2))
            try:
                cevap_ham, _, _ = glm_canli_cagir(model, prompt, dusunme, taraf, AJAN_CANLI[taraf])
                if len(str(cevap_ham).strip()) < 5:
                    # boş cevap: min düşünme ile bir kez daha dene
                    cevap_ham, _, _ = glm_cagir(model, prompt, "min", taraf)
            except Exception as e:
                AJAN_CANLI[taraf]["faz"] = "hata: " + str(e)
                AJAN_SONUC[(taraf, tur_no)] = {"durum": "hata", "ok": False, "hata": "%s: %s" % (type(e).__name__, e)}
                AJAN_CALISIYOR = False
                yaz(ajan_tur_yolu(taraf, tur_no), json.dumps({
                    "turNo": tur_no, "taraf": taraf, "agent": agent_adi, "model": model,
                    "dusunme": dusunme, "zaman": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "durum": "HATA", "hata": "%s: %s" % (type(e).__name__, e),
                    "prompt": prompt}, ensure_ascii=False, indent=2))
                self._json_sessiz(500, {"ok": False, "hata": "%s: %s" % (type(e).__name__, e), "turNo": tur_no}); return
            try:
                cozumlenmis = json_ayikla(cevap_ham)
            except Exception:
                # tek onarım çağrısı: bozuk JSON'u min-düşünmeyle düzelttir
                onarim = ("Aşağıdaki cevap bozuk JSON içeriyor. GEÇERLİ, TAM JSON döndür:\n\n%s" % cevap_ham[:3500])
                cozumlenmis = json_ayikla(glm_cagir(model, onarim, "min", taraf)[0])
            def temizle_kod(k):
                k = str(k or "").strip()
                k = re.sub(r"^```[a-zA-Z]*\s*", "", k)
                return re.sub(r"```\s*$", "", k).strip()
            ozet = str(cozumlenmis.get("ozet", "")).strip()
            memory_ek = not_temizle(cozumlenmis.get("memory_ek"))
            adaylar_girdi = cozumlenmis.get("adaylar")
            if not isinstance(adaylar_girdi, list) or not adaylar_girdi:
                adaylar_girdi = [{"kod_adi": "A", "degisiklik": str(cozumlenmis.get("degisiklik", "")), "yeni_kod": cozumlenmis.get("yeni_kod", "")}]
            gecerli_adaylar, aday_hatalari = [], []
            for i, ad in enumerate(adaylar_girdi[:3]):
                if not isinstance(ad, dict):
                    continue
                kad = str(ad.get("kod_adi") or chr(65 + i)).strip()[:4]
                kkod = temizle_kod(ad.get("yeni_kod"))
                ok, sebp = kod_gecerli(kkod, eski_kod)
                if ok and CJK.search(kkod):
                    ok, sebp = False, "Cin/Asya karakteri algilandi — kodu TURKCE yorumlarla yeniden yaz"
                if ok:
                    gecerli_adaylar.append({"kod_adi": kad, "degisiklik": str(ad.get("degisiklik", ""))[:300], "kod": kkod})
                else:
                    aday_hatalari.append(kad + ": " + sebp)
            if not ozet:
                gecerli, sebep = False, "yanit semasi bozuk: ozet alani yok — semaya uy"
            elif not gecerli_adaylar:
                gecerli, sebep = False, "tum adaylar gecersiz: " + " | ".join(aday_hatalari)
            else:
                gecerli, sebep = True, None
            yeni_kod = gecerli_adaylar[0]["kod"] if gecerli else ""
            if gecerli:
                durum_s = "TEST BEKLENIYOR"
            else:
                durum_s = "REDDEDILDI"
            yaz(ajan_tur_yolu(taraf, tur_no), json.dumps({
                "turNo": tur_no, "taraf": taraf, "agent": agent_adi, "model": model,
                "dusunme": dusunme, "zaman": time.strftime("%Y-%m-%d %H:%M:%S"),
                "durum": durum_s, "sebep": None if gecerli else sebep, "ozet": ozet,
                "memory_ek": memory_ek, "prompt": prompt, "cevap": cevap_ham,
                "aday_kod": yeni_kod if gecerli else None,
                "adaylar": gecerli_adaylar if gecerli else None,
                "aday_hatalari": aday_hatalari or None,
                "eski_kod_uzunluk": len(eski_kod), "aday_sayisi": len(gecerli_adaylar)},
                ensure_ascii=False, indent=2))
            if gecerli:
                degisen = ["turlar/tur_%04d.json tur kaydi (%d aday TEST BEKLENIYOR — sandbox sonrasi en iyisi uygulanir)" % (tur_no, len(gecerli_adaylar))]
                AJAN_SONUC[(taraf, tur_no)] = {
                    "durum": "bitti", "ok": True, "test": True, "turNo": tur_no,
                    "surum": meta.get("surum", 0) + 1,
                    "ozet": ozet, "kod": yeni_kod, "adaylar": gecerli_adaylar, "memory_ek": memory_ek,
                    "prompt_ilk": prompt[:400], "prompt_uzunluk": len(prompt),
                    "cevap_ilk": cevap_ham[:400], "cevap_uzunluk": len(cevap_ham),
                    "degisen_dosyalar": degisen}
            else:
                AJAN_SONUC[(taraf, tur_no)] = {
                    "durum": "bitti", "ok": False, "sebep": sebep, "ozet": ozet,
                    "prompt_ilk": prompt[:400], "prompt_uzunluk": len(prompt),
                    "cevap_ilk": cevap_ham[:400], "cevap_uzunluk": len(cevap_ham),
                    "degisen_dosyalar": ["X " + sebep]}
            AJAN_CALISIYOR = False
            AJAN_CANLI[taraf]["faz"] = ("%d aday v1.%03d icin uretildi — sandbox/kıyas bekleniyor" % (len(gecerli_adaylar), meta.get("surum", 0) + 1)) if gecerli else "reddedildi"
            self._json_sessiz(200, {"ok": gecerli, "test": gecerli, "turNo": tur_no,
                                    "surum": AJAN_SONUC[(taraf, tur_no)].get("surum"),
                                    "kod": yeni_kod if gecerli else None,
                                    "adaylar": gecerli_adaylar if gecerli else None,
                                    "memory_ek": memory_ek if gecerli else [],
                                    "ozet": ozet, "sebep": None if gecerli else sebep,
                                    "degisen_dosyalar": [d for d in degisen if d]})


        elif p.path == "/api/ajan_durdur":
            # durdurma butonu: taraf icin yeni ajan konusmalarini ac/kapat
            taraf = govde.get("taraf", "sag")
            if taraf not in ("sol", "sag"):
                self._json(400, {"ok": False, "hata": "bilinmeyen taraf"}); return
            AJAN_DURDUR[taraf] = bool(govde.get("durdur", True))
            if AJAN_DURDUR[taraf]:
                AJAN_CANLI[taraf] = {"faz": "durduruldu (ISTEK YOK)", "prompt_kr": 0,
                                     "cevap_kr": 0, "dusunce_kr": 0, "cevap_son": "", "dusunce_son": "", "sure": 0}
            else:
                AJAN_CANLI.pop(taraf, None)   # panel tekrar 'beklemede'ye dönsün
            self._json(200, {"ok": True, "taraf": taraf, "durdur": AJAN_DURDUR[taraf]})

        elif p.path == "/api/ajan_adim":
            # ZCode tarzi patch dongusunun TEK adimi: frontend konusmayi tasiyor, sunucu sadece model cagiriyor
            taraf = govde.get("taraf", "sag")
            dusunme = govde.get("dusunme", "max")
            mesajlar = govde.get("mesajlar")
            if taraf not in ("sol", "sag") or not isinstance(mesajlar, list) or not mesajlar:
                self._json(400, {"ok": False, "hata": "eksik/yanlis parametre"}); return
            if AJAN_DURDUR.get(taraf):
                AJAN_CANLI[taraf] = {"faz": "durduruldu (ISTEK YOK)", "prompt_kr": 0,
                                     "cevap_kr": 0, "dusunce_kr": 0, "cevap_son": "", "dusunce_son": "", "sure": 0}
                self._json(200, {"ok": False, "hata": "durduruldu — durdurma butonu aktif, ajan konusmuyor"}); return
            toplam = sum(len(str(m.get("content", ""))) for m in mesajlar if isinstance(m, dict))
            if toplam > 400000:
                self._json(400, {"ok": False, "hata": "oturum cok buyuk"}); return
            AJAN_CANLI[taraf] = {"faz": "adim " + str(govde.get("adim", "?")) + " dusunuyor",
                                 "prompt_kr": toplam,
                                 "cevap_kr": 0, "dusunce_kr": 0, "cevap_son": "", "dusunce_son": "", "sure": 0}
            try:
                icerik, dusunce, wire_yol = glm_canli_cagir("glm-5.3-flash", mesajlar, dusunme, taraf, AJAN_CANLI[taraf])
            except Exception as e:
                AJAN_CANLI[taraf]["faz"] = "hata: " + str(e)
                self._json(200, {"ok": False, "hata": "%s: %s" % (type(e).__name__, e)}); return
            try:
                parsed = json_ayikla(icerik)
            except Exception:
                parsed = None
            AJAN_CANLI[taraf]["faz"] = "adim bitti"
            self._json(200, {"ok": True, "parsed": parsed, "ham": icerik, "sure": AJAN_CANLI[taraf].get("sure", 0)})

        elif p.path == "/api/ajan_kayit":
            # patch dongusu bitti: tum adimlarin kaydini tur dosyasi olarak yaz
            taraf = govde.get("taraf", "sag")
            if taraf not in ("sol", "sag"):
                self._json(400, {"ok": False, "hata": "bilinmeyen taraf"}); return
            kayit = govde.get("kayit") if isinstance(govde.get("kayit"), dict) else {}
            tur_no = ajan_tur_no(taraf)
            kayit.update({"turNo": tur_no, "taraf": taraf, "zaman": time.strftime("%Y-%m-%d %H:%M:%S")})
            yaz(ajan_tur_yolu(taraf, tur_no), json.dumps(kayit, ensure_ascii=False, indent=2))
            self._json(200, {"ok": True, "turNo": tur_no})

        elif p.path == "/api/ajan_uygula" or p.path == "/api/ajan_red":
            taraf = govde.get("taraf", "sag")
            tur_no = int(govde.get("turNo", 0))
            ty = ajan_tur_yolu(taraf, tur_no)
            kabul = p.path == "/api/ajan_uygula"
            if not os.path.exists(ty):
                self._json(400, {"ok": False, "hata": "tur kaydi yok"}); return
            tur = json.loads(oku(ty))
            kl = ajan_klasoru(taraf)
            kod_y = os.path.join(kl, "avci.js")
            eski_kod = oku(kod_y)
            memory = oku(os.path.join(kl, "memory.md"))
            meta = ajan_meta(taraf)
            simdi = time.strftime("%Y-%m-%d %H:%M")
            degisen = []
            if kabul:
                yeni_kod = tur.get("aday_kod") or ""
                secim = str(govde.get("secim") or "").strip()
                if secim and isinstance(tur.get("adaylar"), list):
                    for ad in tur["adaylar"]:
                        if str(ad.get("kod_adi")) == secim:
                            yeni_kod = ad.get("kod") or ""
                            tur["secilen_aday"] = secim
                            break
                memory_ek = tur.get("memory_ek", [])
                if not yeni_kod:
                    self._json(400, {"ok": False, "hata": "tur dosyasinda aday kod yok"}); return
                yeni_no = meta.get("surum", 0) + 1
                yeni_s = "v1.%03d" % yeni_no
                yaz(os.path.join(kl, "versiyonlar", yeni_s + ".js"), yeni_kod)
                yaz(kod_y, yeni_kod)
                if memory_ek:
                    NL = chr(10)
                    ek = NL + NL.join("- [%s v1.%03d] %s" % (simdi, yeni_no, x) for x in memory_ek)
                    yaz(os.path.join(kl, "memory.md"), memory.rstrip(NL) + NL + ek + NL)
                meta["surum"] = yeni_no
                meta.setdefault("gecmis", []).append({"no": yeni_no, "tarih": simdi, "ozet": tur.get("ozet", ""), "turNo": tur_no})
                yaz(ajan_meta_yolu(taraf), json.dumps(meta, ensure_ascii=False, indent=2))
                tur["durum"] = "UYGULANDI " + yeni_s
                tur["karar_zamani"] = simdi
                yaz(ty, json.dumps(tur, ensure_ascii=False, indent=2))
                degisen = [
                    "📝 ajanlar/" + taraf + "/avci.js GUNCELLENDI -> " + yeni_s,
                    "🗂️ ajanlar/" + taraf + "/versiyonlar/" + yeni_s + ".js arsive eklendi",
                    "🧠 ajanlar/" + taraf + "/memory.md +" + str(len(memory_ek)) + " kanitli ders",
                ]
                self._json(200, {"ok": True, "surum": yeni_s, "surum_no": yeni_no, "degisen_dosyalar": degisen})
            else:
                tur["durum"] = "REDDEDILDI"
                tur["sebep"] = govde.get("sebep", "")
                tur["karar_zamani"] = simdi
                yaz(ty, json.dumps(tur, ensure_ascii=False, indent=2))
                self._json(200, {"ok": True, "red": True, "degisen_dosyalar": ["red: " + tur["sebep"]]})

        elif p.path == "/api/improve":
            taraf = govde.get("taraf", "sag")
            dusunme = govde.get("dusunme", "max")
            if taraf not in MODELLER:
                self._json(400, {"ok": False, "hata": "bilinmeyen taraf"}); return
            model, agent_adi = MODELLER[taraf]
            try:
                pb = oku(pb_yolu(taraf))
                defter = oku(defter_yolu(taraf))
                paket = son_paket(taraf)
                prompt = prompt_kur(taraf, pb, paket, defter)
                cevap, dusunce, sure, wire_yol = glm_cagir(model, prompt, dusunme, taraf)
                onarim_yapildi = False
                try:
                    cozumlenmis = json_ayikla(cevap)
                except Exception:
                    if len(cevap.strip()) < 5:
                        # düşünme tüm bütçeyi yemiş, cevap gövdesi boş → orijinali düşük düşünmeyle bir kez daha dene
                        cevap, _, sure2, wire_yol2 = glm_cagir(model, prompt, "min", taraf)
                    else:
                        # bozuk JSON var → tek onarım çağrısı
                        onarim = ("Aşağıdaki cevap bozuk JSON içeriyor. Onu GEÇERLİ, TAM JSON'a çevir. "
                                  "Yalnızca JSON döndür — açıklama yok:\n\n%s" % cevap[:3500])
                        cevap, _, sure2, wire_yol2 = glm_cagir(model, onarim, "min", taraf)
                    cozumlenmis = json_ayikla(cevap)
                    onarim_yapildi = True
                kurallar = cozumlenmis.get("kurallar", [])[:2]
                hatalar = sema_kontrol(kurallar)
                # kalıcı tur dosyası: ai'nin yaptığı HER ŞEY tek dosyada, numaralı
                tur_no = siradaki_tur_no(taraf)
                yaz(tur_yolu(taraf, tur_no), json.dumps({
                    "turNo": tur_no, "taraf": taraf, "agent": agent_adi, "model": model,
                    "dusunme": dusunme, "zaman": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "surum_oncesi": json.loads(pb).get("surum"),
                    "anlayis": cozumlenmis.get("anlayis", ""),
                    "kurallar": kurallar, "emekli": cozumlenmis.get("emekli", []),
                    "hatalar": hatalar, "prompt": prompt, "cevap": cevap,
                    "dusunce_ilk2000": dusunce[:2000], "sure_sn": sure,
                    "durum": "hakem bekleniyor"}, ensure_ascii=False, indent=2))
                self._json(200, {"ok": True, "agent": agent_adi, "model": model,
                                 "anlayis": cozumlenmis.get("anlayis", ""),
                                 "kurallar": kurallar, "emekli": cozumlenmis.get("emekli", []),
                                 "hatalar": hatalar, "dusunce_ilk500": dusunce[:500],
                                 "prompt": prompt, "ham": cevap, "sure_sn": sure,
                                 "turNo": tur_no,
                                 "wire": os.path.relpath(wire_yol, KOK).replace("\\", "/")})
            except Exception as e:
                self._json(500, {"ok": False, "hata": "%s: %s" % (type(e).__name__, e)})

        elif p.path == "/api/karar":
            taraf = govde.get("taraf", "sag")
            kabul = bool(govde.get("kabul"))
            pb = json.loads(oku(pb_yolu(taraf)))
            defter = json.loads(oku(defter_yolu(taraf)))
            simdi = time.strftime("%Y-%m-%d %H:%M")
            ozet = govde.get("hakemOzet", "")
            if kabul:
                n = int(re.match(r"v1\.(\d+)", pb["surum"]).group(1)) + 1
                yeni = "v1.%03d" % n
                degisenler = []
                for k in govde.get("kurallar", []):
                    kid = "R%03d" % (len(pb["kurallar"]) + 1)
                    pb["kurallar"].append({"id": kid,
                                           "surum": yeni, "ekleyen": MODELLER[taraf][1],
                                           "kosul": k["kosul"], "etki": k.get("etki", {}),
                                           "gerekce": k.get("gerekce", ""), "durum": "aktif", "tarih": simdi})
                    degisenler.append("➕ %s eklendi: %s" % (kid, kural_ozet(k)))
                for eid in govde.get("emekli", []):
                    for k in pb["kurallar"]:
                        if k["id"] == eid:
                            k["durum"] = "emekli"
                            degisenler.append("➖ %s emekli edildi" % eid)
                pb["surum"] = yeni
                pb["gecmis"].append({"surum": yeni, "degisiklik": "%d yeni kural" % len(govde.get("kurallar", [])),
                                     "degisenler": degisenler, "hakem": ozet, "tarih": simdi})
                defter.append({"surum": yeni, "karar": "AKTİF", "ozet": ozet, "tarih": simdi})
            else:
                degisenler = []
                defter.append({"surum": pb["surum"], "karar": "REDDEDİLDİ", "ozet": ozet, "tarih": simdi})
                pb["gecmis"].append({"surum": pb["surum"], "degisiklik": "öneri reddedildi",
                                     "degisenler": degisenler + ["❌ öneri kabul edilmedi: " + ozet], "hakem": ozet, "tarih": simdi})
            yaz(pb_yolu(taraf), json.dumps(pb, ensure_ascii=False, indent=2))
            yaz(defter_yolu(taraf), json.dumps(defter, ensure_ascii=False, indent=2))
            # tur dosyasını nihai hakem kararıyla güncelle
            tur_no = govde.get("turNo")
            if tur_no:
                ty = tur_yolu(taraf, int(tur_no))
                if os.path.exists(ty):
                    tur = json.loads(oku(ty))
                    tur["durum"] = "AKTİF" if kabul else "REDDEDİLDİ"
                    tur["hakemOzet"] = ozet
                    tur["degisenler"] = degisenler
                    tur["surum_sonrasi"] = pb["surum"]
                    tur["karar_zamani"] = simdi
                    yaz(ty, json.dumps(tur, ensure_ascii=False, indent=2))
            self._json(200, {"ok": True, "surum": pb["surum"], "playbook": pb, "turNo": tur_no})
        else:
            self._json(404, {"ok": False, "hata": "bilinmeyen uç"})

if __name__ == "__main__":
    baslat()
    print("TRON arena sunucusu: http://127.0.0.1:8090 (statik + /api + beyin deposu)")
    ThreadingHTTPServer(("0.0.0.0", 8090), H).serve_forever()

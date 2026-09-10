function yonBul(durum) {
  var W = 45, H = 30;
  var V = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  var TERS = { U: 'D', D: 'U', L: 'R', R: 'L' };
  var YONLER = ['U', 'D', 'L', 'R'];
  var b = durum.ben, r = durum.rakip;
  var iz = durum.iz;
  function alanBul(sx, sy, yasak) {
    var gor = new Uint8Array(W * H);
    var q = [sx + sy * W];
    gor[sx + sy * W] = 1;
    var say = 0, bas = 0;
    while (bas < q.length) {
      var id = q[bas++]; say++;
      if (say > 1350) break;
      var x = id % W, y = (id - x) / W;
      if (x > 0) gir(x - 1, y);
      if (x < W - 1) gir(x + 1, y);
      if (y > 0) gir(x, y - 1);
      if (y < H - 1) gir(x, y + 1);
    }
    function gir(nx, ny) {
      var j = nx + ny * W;
      if (gor[j]) return;
      if (iz[ny].charAt(nx) !== '.') return;
      if (yasak && yasak[j]) return;
      gor[j] = 1; q.push(j);
    }
    return say;
  }
  var rakipSonraki = {}, i, d;
  for (i = 0; i < 4; i++) {
    d = YONLER[i];
    if (d === TERS[r.yon]) continue;
    var rx = r.x + V[d][0], ry = r.y + V[d][1];
    if (rx < 0 || ry < 0 || rx >= W || ry >= H) continue;
    rakipSonraki[rx + ry * W] = 1;
  }
  var oppAlan = alanBul(r.x, r.y, null);
  var adaylar = [];
  for (i = 0; i < 4; i++) {
    d = YONLER[i];
    if (d === TERS[b.yon]) continue;
    var nx = b.x + V[d][0], ny = b.y + V[d][1];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    if (iz[ny].charAt(nx) !== '.') continue;
    var carp = rakipSonraki[nx + ny * W] ? 1 : 0;
    var a = alanBul(nx, ny, rakipSonraki);
    adaylar.push({ d: d, nx: nx, ny: ny, a: a, carp: carp });
  }
  if (!adaylar.length) return b.yon;
  var temiz = [];
  for (i = 0; i < adaylar.length; i++) if (!adaylar[i].carp) temiz.push(adaylar[i]);
  if (temiz.length) adaylar = temiz;
  var maxA = 0;
  for (i = 0; i < adaylar.length; i++) if (adaylar[i].a > maxA) maxA = adaylar[i].a;
  var guven = [];
  for (i = 0; i < adaylar.length; i++) if (adaylar[i].a >= maxA * 0.45 || adaylar[i].a >= 18) guven.push(adaylar[i]);
  if (!guven.length) guven = adaylar;
  var dist = Math.abs(b.x - r.x) + Math.abs(b.y - r.y);
  if (maxA > oppAlan * 1.1 && dist <= 8) {
    var keseX = r.x + V[r.yon][0] * 4, keseY = r.y + V[r.yon][1] * 4;
    if (keseX < 0) keseX = 0;
    if (keseX > 44) keseX = 44;
    if (keseY < 0) keseY = 0;
    if (keseY > 29) keseY = 29;
    var enS = 1e9, secim = guven[0].d;
    for (i = 0; i < guven.length; i++) {
      var s = Math.abs(guven[i].nx - keseX) + Math.abs(guven[i].ny - keseY);
      if (guven[i].d === b.yon) s -= 0.5;
      if (s < enS) { enS = s; secim = guven[i].d; }
    }
    return secim;
  }
  var en = guven[0];
  for (i = 1; i < guven.length; i++) {
    var k = guven[i];
    if (k.a > en.a) { en = k; continue; }
    if (k.a < en.a) continue;
    var kDuz = k.d === b.yon ? 1 : 0, eDuz = en.d === b.yon ? 1 : 0;
    if (kDuz !== eDuz) { if (kDuz > eDuz) en = k; continue; }
    if (dist <= 6) {
      var kUz = Math.abs(k.nx - r.x) + Math.abs(k.ny - r.y);
      var eUz = Math.abs(en.nx - r.x) + Math.abs(en.ny - r.y);
      if (kUz > eUz) en = k;
    }
  }
  return en.d;
}
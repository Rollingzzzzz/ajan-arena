function yonBul(durum) {
  var W = 45, H = 30, W2 = W * H;
  var V = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  var TERS = { U: 'D', D: 'U', L: 'R', R: 'L' };
  var YONLER = ['U', 'D', 'L', 'R'];
  var b = durum.ben, r = durum.rakip, iz = durum.iz;

  var temel = new Uint8Array(W2);
  for (var y0 = 0; y0 < H; y0++) {
    var sat = iz[y0];
    for (var x0 = 0; x0 < W; x0++) if (sat.charAt(x0) !== '.') temel[x0 + y0 * W] = 1;
  }
  var benKafa = b.x + b.y * W;
  var rakipKafa = r.x + r.y * W;

  function alan(sx, sy, block, cap) {
    var gor = new Uint8Array(W2);
    var q = [sx + sy * W];
    gor[q[0]] = 1;
    var say = 0, bas = 0;
    while (bas < q.length) {
      var id = q[bas++];
      say++;
      if (say >= cap) break;
      var x = id % W, y = (id - x) / W;
      if (x > 0) koy(id - 1);
      if (x < W - 1) koy(id + 1);
      if (y > 0) koy(id - W);
      if (y < H - 1) koy(id + W);
    }
    function koy(j) {
      if (gor[j] || temel[j] || (block && block[j])) return;
      gor[j] = 1; q.push(j);
    }
    return say;
  }

  function bosKomsu(x, y, block) {
    var s = 0;
    if (x > 0 && !temel[x - 1 + y * W] && !(block && block[x - 1 + y * W])) s++;
    if (x < W - 1 && !temel[x + 1 + y * W] && !(block && block[x + 1 + y * W])) s++;
    if (y > 0 && !temel[x + (y - 1) * W] && !(block && block[x + (y - 1) * W])) s++;
    if (y < H - 1 && !temel[x + (y + 1) * W] && !(block && block[x + (y + 1) * W])) s++;
    return s;
  }

  // rakibin bu tikteki yasal hamleleri (eski kafalar tik sonrasi iz olur)
  var rakipHamle = [], rakipSet = {};
  for (var i = 0; i < 4; i++) {
    var d = YONLER[i];
    if (d === TERS[r.yon]) continue;
    var rx = r.x + V[d][0], ry = r.y + V[d][1];
    if (rx < 0 || ry < 0 || rx >= W || ry >= H) continue;
    var rj = rx + ry * W;
    if (temel[rj] || rj === benKafa) continue;
    rakipHamle.push(rj); rakipSet[rj] = 1;
  }

  // tik sonrasi engel tabani: iki eski kafa da iz olur
  var taban = new Uint8Array(temel);
  taban[benKafa] = 1; taban[rakipKafa] = 1;
  var blockBen = new Uint8Array(taban);
  for (i = 0; i < rakipHamle.length; i++) blockBen[rakipHamle[i]] = 1;

  var aday = [];
  for (i = 0; i < 4; i++) {
    var d2 = YONLER[i];
    if (d2 === TERS[b.yon]) continue;
    var nx = b.x + V[d2][0], ny = b.y + V[d2][1];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    var nj = nx + ny * W;
    if (temel[nj]) continue;
    aday.push({ d: d2, x: nx, y: ny, j: nj, kk: rakipSet[nj] ? 1 : 0 });
  }
  if (!aday.length) return b.yon;
  var havuz = [];
  for (i = 0; i < aday.length; i++) if (!aday[i].kk) havuz.push(aday[i]);
  if (!havuz.length) havuz = [aday[0]];

  var dist = Math.abs(b.x - r.x) + Math.abs(b.y - r.y);
  var en = null, enSkor = -1e9;
  for (i = 0; i < havuz.length; i++) {
    var c = havuz[i];
    var benAlan = alan(c.x, c.y, blockBen, 1350);
    var oppAlan = 0;
    if (rakipHamle.length) {
      var blockOpp = new Uint8Array(taban);
      blockOpp[c.j] = 1;
      for (var k = 0; k < rakipHamle.length; k++) {
        var oj = rakipHamle[k];
        var ox = oj % W, oy = (oj - ox) / W;
        var oa = alan(ox, oy, blockOpp, 900);
        if (oa > oppAlan) oppAlan = oa;
      }
    }
    var skor;
    if (benAlan <= 0) {
      skor = -100000 + bosKomsu(c.x, c.y, blockBen);
    } else if (benAlan < 55) {
      skor = benAlan * 3 + (4 - bosKomsu(c.x, c.y, blockBen)) * 6;
    } else if (benAlan > oppAlan * 1.15) {
      skor = benAlan * 2 + (benAlan - oppAlan) * 3;
    } else {
      skor = benAlan * 2 + (benAlan - oppAlan);
    }
    if (c.d === b.yon) skor += 1;
    if (benAlan > 0 && benAlan >= oppAlan && dist <= 10) {
      skor -= (Math.abs(c.x - r.x) + Math.abs(c.y - r.y)) * 2;
    }
    if (skor > enSkor) { enSkor = skor; en = c; }
  }
  return en.d;
}
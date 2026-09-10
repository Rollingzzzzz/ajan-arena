function yonBul(durum) {
  var W = 45, H = 30, N = W * H;
  var V = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  var TERS = { U: 'D', D: 'U', L: 'R', R: 'L' };
  var YONLER = ['U', 'D', 'L', 'R'];
  var b = durum.ben, r = durum.rakip, iz = durum.iz;
  var temel = new Uint8Array(N);
  for (var y = 0; y < H; y++) {
    var sat = iz[y];
    for (var x = 0; x < W; x++) if (sat.charAt(x) !== '.') temel[x + y * W] = 1;
  }
  var benKafa = b.x + b.y * W;
  var rakipKafa = r.x + r.y * W;

  function bfs(kaynak, duvar) {
    var mes = new Int16Array(N);
    for (var z = 0; z < N; z++) mes[z] = -1;
    var kuyruk = [kaynak];
    mes[kaynak] = 0;
    var bas = 0;
    while (bas < kuyruk.length) {
      var h = kuyruk[bas++];
      var hx = h % W, hy = (h - hx) / W;
      var nd = mes[h] + 1;
      if (hx > 0) { var s1 = h - 1; if (mes[s1] < 0 && !duvar[s1]) { mes[s1] = nd; kuyruk.push(s1); } }
      if (hx < W - 1) { var s2 = h + 1; if (mes[s2] < 0 && !duvar[s2]) { mes[s2] = nd; kuyruk.push(s2); } }
      if (hy > 0) { var s3 = h - W; if (mes[s3] < 0 && !duvar[s3]) { mes[s3] = nd; kuyruk.push(s3); } }
      if (hy < H - 1) { var s4 = h + W; if (mes[s4] < 0 && !duvar[s4]) { mes[s4] = nd; kuyruk.push(s4); } }
    }
    return mes;
  }

  function voronoi(bj, rj) {
    var duvar = new Uint8Array(temel);
    duvar[benKafa] = 1; duvar[rakipKafa] = 1; duvar[bj] = 1; duvar[rj] = 1;
    var db = bfs(bj, duvar), dr = bfs(rj, duvar);
    var benim = 0, onun = 0;
    for (var z = 0; z < N; z++) {
      if (duvar[z]) continue;
      var a = db[z], c2 = dr[z];
      if (a >= 0 && (c2 < 0 || a < c2)) benim++;
      else if (c2 >= 0 && (a < 0 || c2 < a)) onun++;
    }
    return [benim, onun];
  }

  var rakipHamle = [];
  for (var i = 0; i < 4; i++) {
    var d0 = YONLER[i];
    if (d0 === TERS[r.yon]) continue;
    var rx = r.x + V[d0][0], ry = r.y + V[d0][1];
    if (rx < 0 || ry < 0 || rx >= W || ry >= H) continue;
    var rj0 = rx + ry * W;
    if (temel[rj0] || rj0 === benKafa) continue;
    rakipHamle.push(rj0);
  }
  if (!rakipHamle.length) rakipHamle.push(rakipKafa);

  var aday = [];
  for (i = 0; i < 4; i++) {
    var d1 = YONLER[i];
    if (d1 === TERS[b.yon]) continue;
    var nx = b.x + V[d1][0], ny = b.y + V[d1][1];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    var nj = nx + ny * W;
    if (temel[nj]) continue;
    var cakisma = 0;
    for (var k = 0; k < rakipHamle.length; k++) if (rakipHamle[k] === nj) { cakisma = 1; break; }
    if (cakisma) continue;
    aday.push({ d: d1, j: nj, x: nx, y: ny });
  }
  if (!aday.length) {
    for (i = 0; i < 4; i++) {
      var d2 = YONLER[i];
      if (d2 === TERS[b.yon]) continue;
      var mx = b.x + V[d2][0], my = b.y + V[d2][1];
      if (mx < 0 || my < 0 || mx >= W || my >= H) continue;
      var mj = mx + my * W;
      if (!temel[mj]) { aday.push({ d: d2, j: mj, x: mx, y: my }); break; }
    }
  }
  if (!aday.length) return b.yon;

  var mesafeKafa = Math.abs(b.x - r.x) + Math.abs(b.y - r.y);
  var en = null, enSkor = -1e9;
  for (i = 0; i < aday.length; i++) {
    var c = aday[i];
    var kotuDif = 1e9, kotuB = 0, kotuR = 0;
    for (k = 0; k < rakipHamle.length; k++) {
      var sonuc = voronoi(c.j, rakipHamle[k]);
      var dif = sonuc[0] - sonuc[1];
      if (dif < kotuDif) { kotuDif = dif; kotuB = sonuc[0]; kotuR = sonuc[1]; }
    }
    var skor = kotuDif * 2;
    if (kotuB <= 2) skor -= 60;
    var komsu = 0;
    if (c.x > 0 && !temel[c.j - 1]) komsu++;
    if (c.x < W - 1 && !temel[c.j + 1]) komsu++;
    if (c.y > 0 && !temel[c.j - W]) komsu++;
    if (c.y < H - 1 && !temel[c.j + W]) komsu++;
    if (komsu < 2) skor -= 4;
    skor += komsu * 0.5;
    if (kotuB > kotuR && mesafeKafa <= 14) {
      skor += (14 - mesafeKafa) * 0.8;
      skor -= (Math.abs(c.x - r.x) + Math.abs(c.y - r.y)) * 0.6;
    }
    if (c.d === b.yon) skor += 0.3;
    if (skor > enSkor) { enSkor = skor; en = c; }
  }
  return en.d;
}
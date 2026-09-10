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
var benKafa = b.x + b.y * W, rakipKafa = r.x + r.y * W;
temel[benKafa] = 1;
temel[rakipKafa] = 1;
function bfsD(kaynak, engel) {
var mes = new Int16Array(N), kuyruk = new Int32Array(N), bas = 0, son = 0, zz;
for (zz = 0; zz < N; zz++) mes[zz] = -1;
kuyruk[son++] = kaynak; mes[kaynak] = 0;
while (bas < son) {
var h = kuyruk[bas++];
var hx = h % W, hy = (h - hx) / W, nd = mes[h] + 1;
if (hx > 0 && mes[h - 1] < 0 && !engel[h - 1]) { mes[h - 1] = nd; kuyruk[son++] = h - 1; }
if (hx < W - 1 && mes[h + 1] < 0 && !engel[h + 1]) { mes[h + 1] = nd; kuyruk[son++] = h + 1; }
if (hy > 0 && mes[h - W] < 0 && !engel[h - W]) { mes[h - W] = nd; kuyruk[son++] = h - W; }
if (hy < H - 1 && mes[h + W] < 0 && !engel[h + W]) { mes[h + W] = nd; kuyruk[son++] = h + W; }
}
return mes;
}
var mesBen = bfsD(benKafa, temel), mesRakip = bfsD(rakipKafa, temel);
var alanBen = 0, alanRakip = 0, ortak = 0, z;
for (z = 0; z < N; z++) {
if (mesBen[z] >= 0) alanBen++;
if (mesRakip[z] >= 0) alanRakip++;
if (mesBen[z] >= 0 && mesRakip[z] >= 0) ortak = 1;
}
var rakipHamle = [];
for (var i = 0; i < 4; i++) {
var d0 = YONLER[i];
if (d0 === TERS[r.yon]) continue;
var rx = r.x + V[d0][0], ry = r.y + V[d0][1];
if (rx < 0 || ry < 0 || rx >= W || ry >= H) continue;
var rj0 = rx + ry * W;
if (temel[rj0]) continue;
rakipHamle.push(rj0);
}
if (!rakipHamle.length) rakipHamle.push(rakipKafa);
var onIki = new Uint8Array(N);
for (i = 0; i < rakipHamle.length; i++) {
var rj1 = rakipHamle[i], qx = rj1 % W, qy = (rj1 - qx) / W;
if (qx > 0 && !temel[rj1 - 1]) onIki[rj1 - 1] = 1;
if (qx < W - 1 && !temel[rj1 + 1]) onIki[rj1 + 1] = 1;
if (qy > 0 && !temel[rj1 - W]) onIki[rj1 - W] = 1;
if (qy < H - 1 && !temel[rj1 + W]) onIki[rj1 + W] = 1;
}
var aday = [];
for (i = 0; i < 4; i++) {
var d1 = YONLER[i];
if (d1 === TERS[b.yon]) continue;
var nx = b.x + V[d1][0], ny = b.y + V[d1][1];
if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
var nj = nx + ny * W;
if (temel[nj]) continue;
var cak = 0, k;
for (k = 0; k < rakipHamle.length; k++) if (rakipHamle[k] === nj) { cak = 1; break; }
if (cak) continue;
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
if (!aday.length) {
for (i = 0; i < 4; i++) {
var d3 = YONLER[i];
if (d3 === TERS[b.yon]) continue;
var ex = b.x + V[d3][0], ey = b.y + V[d3][1];
if (ex < 0 || ey < 0 || ex >= W || ey >= H) continue;
var ej = ex + ey * W, k2, bul = 0;
for (k2 = 0; k2 < rakipHamle.length; k2++) if (rakipHamle[k2] === ej) { bul = 1; break; }
if (bul) { aday.push({ d: d3, j: ej, x: ex, y: ey }); break; }
}
}
if (!aday.length) return b.yon;
var mesafeKafa = Math.abs(b.x - r.x) + Math.abs(b.y - r.y);
var baskiW = alanBen > alanRakip * 1.25 ? 0.5 : 0.12;
var avAktif = ortak === 1 && mesafeKafa <= 12 && alanBen > alanRakip * 1.15;
var enSkor = -1e9;
for (i = 0; i < aday.length; i++) {
var c = aday[i], mAl = bfsD(c.j, temel), aJon = 0, koridor = 0;
for (z = 0; z < N; z++) {
if (mAl[z] >= 0) {
aJon++;
if (mAl[z] >= 1 && mAl[z] <= 8) koridor++;
}
}
var skor;
if (ortak === 0) {
var enCocuk = -80;
var duvarC = new Uint8Array(temel);
duvarC[c.j] = 1;
var k3, dC, cx2, cy2, cj2, mC, aC;
for (k3 = 0; k3 < 4; k3++) {
dC = YONLER[k3];
if (dC === TERS[c.d]) continue;
cx2 = c.x + V[dC][0];
cy2 = c.y + V[dC][1];
if (cx2 < 0 || cy2 < 0 || cx2 >= W || cy2 >= H) continue;
cj2 = cx2 + cy2 * W;
if (duvarC[cj2]) continue;
mC = bfsD(cj2, duvarC);
aC = 0;
for (z = 0; z < N; z++) if (mC[z] >= 0) aC++;
if (aC > enCocuk) enCocuk = aC;
}
skor = aJon * 5 + enCocuk * 1.5;
} else {
var kotuDif = 1e9, kotuB = 0, enIyiR = 0, avMes = 999, cokYakin = 0, k;
for (k = 0; k < rakipHamle.length; k++) {
var duvar = new Uint8Array(temel);
duvar[c.j] = 1; duvar[rakipHamle[k]] = 1;
var db = bfsD(c.j, duvar), dr = bfsD(rakipHamle[k], duvar), benim = 0, onun = 0;
for (z = 0; z < N; z++) {
if (duvar[z]) continue;
var a = db[z], c2 = dr[z];
if (a >= 0 && (c2 < 0 || a < c2)) benim++;
else if (c2 >= 0 && (a < 0 || c2 < a)) onun++;
}
var dif = benim - onun;
if (dif < kotuDif) { kotuDif = dif; kotuB = benim; }
if (onun > enIyiR) enIyiR = onun;
if (avAktif) {
for (z = 0; z < N; z++) {
if (onIki[z] && db[z] >= 0) {
if (db[z] === 1) cokYakin = 1;
else if (db[z] >= 2 && db[z] < avMes) avMes = db[z];
}
}
}
}
skor = kotuDif * 2 + kotuB * 0.3 - enIyiR * baskiW;
if (avAktif && avMes < 30) skor -= (30 - avMes) * 0.6;
if (cokYakin) skor -= 8;
}
var kesilen = (alanBen - 1) - aJon;
if (kesilen > 0) {
if (ortak === 0 && aJon < 80) skor -= kesilen * 1.2; else skor -= kesilen * 2.5;
}
if (aJon <= 1) skor -= 120;
if (ortak === 0 && aJon <= 2) skor -= 60;
if (ortak === 1 && koridor < 20) skor -= (20 - koridor) * 2;
var komsu = 0;
if (c.x > 0 && !temel[c.j - 1]) komsu++;
if (c.x < W - 1 && !temel[c.j + 1]) komsu++;
if (c.y > 0 && !temel[c.j - W]) komsu++;
if (c.y < H - 1 && !temel[c.j + W]) komsu++;
if (komsu < 2) skor -= 4;
skor += komsu * 0.5;
if (c.d === b.yon) skor += 0.3;
if (durum.tik <= 5 && aJon >= 100) skor += (Math.random() - 0.5) * 3;
skor += (Math.random() - 0.5) * 0.06;
c.s = skor;
if (skor > enSkor) enSkor = skor;
}
var havuz = [];
for (i = 0; i < aday.length; i++) if (aday[i].s >= enSkor - 0.05) havuz.push(aday[i]);
return havuz[Math.floor(Math.random() * havuz.length)].d;
}
function yonBul(durum) {
  const W = 45, H = 30, N = W * H;
  const DIRS = ['U', 'D', 'L', 'R'];
  const VX = { U: 0, D: 0, L: -1, R: 1 };
  const VY = { U: -1, D: 1, L: 0, R: 0 };
  const TERS = { U: 'D', D: 'U', L: 'R', R: 'L' };
  const ben = durum.ben, rak = durum.rakip;
  const benIdx = ben.y * W + ben.x;
  const rakIdx = rak.y * W + rak.x;
  const g = new Uint8Array(N);
  for (let y = 0; y < H; y++) {
    const row = durum.iz[y] || '';
    for (let x = 0; x < W; x++) if (row.charAt(x) !== '.') g[y * W + x] = 1;
  }
  g[benIdx] = 1; g[rakIdx] = 1;

  const distB = new Int16Array(N), distR = new Int16Array(N), q = new Int16Array(N);
  function bfs(start, dist) {
    dist.fill(-1);
    let head = 0, tail = 0;
    q[tail++] = start; dist[start] = 0;
    while (head < tail) {
      const cur = q[head++];
      const cx = cur % W, nd = dist[cur] + 1;
      if (cx > 0 && !g[cur - 1] && dist[cur - 1] < 0) { dist[cur - 1] = nd; q[tail++] = cur - 1; }
      if (cx < W - 1 && !g[cur + 1] && dist[cur + 1] < 0) { dist[cur + 1] = nd; q[tail++] = cur + 1; }
      if (cur >= W && !g[cur - W] && dist[cur - W] < 0) { dist[cur - W] = nd; q[tail++] = cur - W; }
      if (cur < N - W && !g[cur + W] && dist[cur + W] < 0) { dist[cur + W] = nd; q[tail++] = cur + W; }
    }
  }

  // tuket: mod0 max-derece, mod1 duz-oncelik, mod2 rastgele karisim (cep tahminini cesitlendir)
  function tuket(start, basYon, mod) {
    const yerel = new Uint8Array(g);
    let cur = start, yon = basYon, adim = 0;
    while (adim < 1400) {
      const cx = cur % W, cy = (cur - cx) / W;
      let eni = -1, enYon = yon, enS = -1e9;
      for (let k = 0; k < 4; k++) {
        const d = DIRS[k];
        const nx = cx + VX[d], ny = cy + VY[d];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (yerel[ni]) continue;
        let derece = 0;
        const dxc = ni % W;
        if (dxc > 0 && !yerel[ni - 1]) derece++;
        if (dxc < W - 1 && !yerel[ni + 1]) derece++;
        if (ni >= W && !yerel[ni - W]) derece++;
        if (ni < N - W && !yerel[ni + W]) derece++;
        let s;
        if (mod === 0) s = derece * 8 + (d === yon ? 1 : 0);
        else if (mod === 1) s = (d === yon ? 6 : 0) + derece;
        else s = derece * 4 + Math.random() * 3;
        if (derece === 0) s -= 1000;
        if (s > enS) { enS = s; eni = ni; enYon = d; }
      }
      if (eni < 0) break;
      yerel[cur] = 1;
      cur = eni; yon = enYon; adim++;
    }
    return adim;
  }
  function tuketMax(start, basYon) {
    const a = tuket(start, basYon, 0);
    const b = tuket(start, basYon, 1);
    const c = tuket(start, basYon, 2);
    return a > b ? (a > c ? a : c) : (b > c ? b : c);
  }

  // kucuk cepler icin butceli tam DFS: en uzun hayatta kalma yolunu birebir sayar
  const dfsZiy = new Uint8Array(N);
  let dfsDugum = 0;
  function dfsUzun(cur) {
    if (dfsDugum >= 16000) return 0;
    dfsDugum++;
    const cx = cur % W, cy = (cur - cx) / W;
    dfsZiy[cur] = 1;
    let en = 0;
    for (let k = 0; k < 4; k++) {
      const nx = cx + VX[DIRS[k]], ny = cy + VY[DIRS[k]];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (dfsZiy[ni] || g[ni]) continue;
      const der = 1 + dfsUzun(ni);
      if (der > en) en = der;
      if (dfsDugum >= 16000) break;
    }
    dfsZiy[cur] = 0;
    return en;
  }
  function bolgeSay(start) {
    const z = new Uint8Array(N);
    let head = 0, tail = 0, say = 0;
    q[tail++] = start; z[start] = 1;
    while (head < tail) {
      const cur = q[head++]; say++;
      const cx = cur % W;
      if (cx > 0 && !g[cur - 1] && !z[cur - 1]) { z[cur - 1] = 1; q[tail++] = cur - 1; }
      if (cx < W - 1 && !g[cur + 1] && !z[cur + 1]) { z[cur + 1] = 1; q[tail++] = cur + 1; }
      if (cur >= W && !g[cur - W] && !z[cur - W]) { z[cur - W] = 1; q[tail++] = cur - W; }
      if (cur < N - W && !g[cur + W] && !z[cur + W]) { z[cur + W] = 1; q[tail++] = cur + W; }
    }
    return say;
  }
  function cepUzunluk(start, basYon) {
    const say = bolgeSay(start);
    if (say <= 22) { dfsDugum = 0; dfsZiy.fill(0); return dfsUzun(start); }
    return tuketMax(start, basYon);
  }

  // degerlendirme: benim kafa cI, rakip kafa rI (ikisi de g'ye islenmis)
  function degerlendir(cI, cD, rI, rD) {
    bfs(cI, distB);
    bfs(rI, distR);
    let vor = 0, vorR = 0, benimSay = 0, rakipSay = 0, bagli = false;
    for (let i = 0; i < N; i++) {
      if (g[i]) continue;
      const da = distB[i], db = distR[i];
      if (da >= 0) { benimSay++; if (db >= 0) bagli = true; }
      if (db >= 0) rakipSay++;
      if (da >= 0 && (db < 0 || da < db)) vor++;
      else if (db >= 0 && (da < 0 || db < da)) vorR++;
    }
    if (!bagli) {
      const benimL = cepUzunluk(cI, cD);
      const rakipL = cepUzunluk(rI, rD);
      const fark = benimL - rakipL;
      if (fark >= 2) return 1e6 + benimL * 10 + fark;
      let s = fark * 1000 + benimL;
      if (fark >= -2 && fark <= 2) s -= 8000; // esit cep = ayni tik olum tuzagi
      return s;
    }
    const rx = rI % W, ry = (rI - rx) / W;
    const keX = Math.max(0, Math.min(W - 1, rx + VX[rD] * 2)); // kesme: rakibin 2 tik onu
    const keY = Math.max(0, Math.min(H - 1, ry + VY[rD] * 2));
    const cx2 = cI % W, cy2 = (cI - cx2) / W;
    const mesafe = Math.abs(cx2 - keX) + Math.abs(cy2 - keY);
    const avci = (benimSay > 120 && benimSay * 1.35 >= rakipSay) ? (rakipSay < 80 ? 12 : 8) : 2;
    let skor = benimSay * 50 + (vor - vorR) * 3 - Math.min(mesafe, 34) * avci;
    let acik = 0;
    if (cx2 > 0 && !g[cI - 1]) acik++;
    if (cx2 < W - 1 && !g[cI + 1]) acik++;
    if (cy2 > 0 && !g[cI - W]) acik++;
    if (cy2 < H - 1 && !g[cI + W]) acik++;
    if (acik === 0) skor -= 500; // cukura girme
    return skor + acik * 3;
  }

  const aday = [];
  for (let k = 0; k < 4; k++) {
    const d = DIRS[k];
    if (d === TERS[ben.yon]) continue;
    const nx = ben.x + VX[d], ny = ben.y + VY[d];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const ni = ny * W + nx;
    if (g[ni]) continue;
    aday.push({ d: d, i: ni });
  }
  if (!aday.length) {
    for (let k = 0; k < 4; k++) if (DIRS[k] !== TERS[ben.yon]) return DIRS[k];
    return ben.yon;
  }

  const rakAday = [];
  for (let k = 0; k < 4; k++) {
    const d = DIRS[k];
    if (d === TERS[rak.yon]) continue;
    const nx = rak.x + VX[d], ny = rak.y + VY[d];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const ni = ny * W + nx;
    if (g[ni]) continue;
    rakAday.push({ d: d, i: ni });
  }
  const ripSet = new Uint8Array(N);
  for (let r = 0; r < rakAday.length; r++) ripSet[rakAday[r].i] = 1;

  // 2-ply paranoid: adayim x rakibin cevabi, en kotu skoru sec
  let enIyi = aday[0].d, enSkor = -Infinity;
  for (let a = 0; a < aday.length; a++) {
    const c = aday[a];
    g[c.i] = 1;
    let enKotu;
    if (rakAday.length === 0) {
      enKotu = 1e7; // rakip bu tik sikisti
    } else {
      enKotu = Infinity;
      for (let r = 0; r < rakAday.length; r++) {
        const rr = rakAday[r];
        let s;
        if (rr.i === c.i) {
          s = -1e6; // kafa kafaya berabere
        } else {
          g[rr.i] = 1;
          s = degerlendir(c.i, c.d, rr.i, rr.d);
          g[rr.i] = 0;
        }
        if (s < enKotu) enKotu = s;
      }
    }
    if (ripSet[c.i]) enKotu -= 1e9;
    if (c.d === ben.yon) enKotu += 0.8; // gereksiz titremeyi azalt
    enKotu += Math.random() * 0.5;
    if (enKotu > enSkor) { enSkor = enKotu; enIyi = c.d; }
    g[c.i] = 0;
  }
  return enIyi;
}
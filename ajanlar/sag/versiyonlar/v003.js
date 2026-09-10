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

  // tuket v2: iki mod; derece=0 (olu son) -1000 cezali, cep hayatta-kalma tahmini
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
        else s = (d === yon ? 6 : 0) + derece;
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
    const a = tuket(start, basYon, 0), b = tuket(start, basYon, 1);
    return a > b ? a : b;
  }

  // degerlendirme: benim kafa cI, rakip kafa rI (ikisi de g'ye islenmis olmali)
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
      const benimL = tuketMax(cI, cD);
      const rakipL = tuketMax(rI, rD);
      const fark = benimL - rakipL;
      if (fark >= 2) return 1e6 + benimL * 10 + fark;
      let s = fark * 1000 + benimL;
      if (fark >= -1 && fark <= 1) s -= 5000; // esit cep = berabere tuzagi
      return s;
    }
    const rx = rI % W, ry = (rI - rx) / W;
    const keX = Math.max(0, Math.min(W - 1, rx + VX[rD]));
    const keY = Math.max(0, Math.min(H - 1, ry + VY[rD]));
    const cx2 = cI % W, cy2 = (cI - cx2) / W;
    const mesafe = Math.abs(cx2 - keX) + Math.abs(cy2 - keY);
    const avci = (benimSay > 120 && benimSay * 1.35 >= rakipSay) ? 8 : 2;
    let skor = benimSay * 50 + (vor - vorR) * 2 - Math.min(mesafe, 34) * avci;
    let acik = 0;
    if (cx2 > 0 && !g[cI - 1]) acik++;
    if (cx2 < W - 1 && !g[cI + 1]) acik++;
    if (cy2 > 0 && !g[cI - W]) acik++;
    if (cy2 < H - 1 && !g[cI + W]) acik++;
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
      enKotu = 1e7; // rakip bu tik sikisti, her guvenli hamle kazanir
    } else {
      enKotu = Infinity;
      for (let r = 0; r < rakAday.length; r++) {
        const rr = rakAday[r];
        let s;
        if (rr.i === c.i) {
          s = -1e6; // kafa kafaya berabere — kaybeden rakip bunu zorlayabilir
        } else {
          g[rr.i] = 1;
          s = degerlendir(c.i, c.d, rr.i, rr.d);
          g[rr.i] = 0;
        }
        if (s < enKotu) enKotu = s;
      }
    }
    if (ripSet[c.i]) enKotu -= 1e9;
    enKotu += Math.random() * 0.5;
    if (enKotu > enSkor) { enSkor = enKotu; enIyi = c.d; }
    g[c.i] = 0;
  }
  return enIyi;
}
function yonBul(durum) {
  const W = 45, H = 30, N = W * H;
  const DIRS = ['U', 'D', 'L', 'R'];
  const VX = { U: 0, D: 0, L: -1, R: 1 };
  const VY = { U: -1, D: 1, L: 0, R: 0 };
  const TERS = { U: 'D', D: 'U', L: 'R', R: 'L' };
  const ben = durum.ben, rak = durum.rakip;
  const rakIdx = rak.y * W + rak.x;

  const g = new Uint8Array(N);
  for (let y = 0; y < H; y++) {
    const row = durum.iz[y] || '';
    for (let x = 0; x < W; x++) if (row.charAt(x) !== '.') g[y * W + x] = 1;
  }
  g[ben.y * W + ben.x] = 1;
  g[rakIdx] = 1;

  // rakibin bu tik girebilecegi hucreler: kafa kafaya beraberlik yasaği
  const ripSet = new Uint8Array(N);
  for (let k = 0; k < 4; k++) {
    const d = DIRS[k];
    if (d === TERS[rak.yon]) continue;
    const nx = rak.x + VX[d], ny = rak.y + VY[d];
    if (nx >= 0 && ny >= 0 && nx < W && ny < H) ripSet[ny * W + nx] = 1;
  }

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

  // tuket: acgozlu en-uzun-yol simulasyonu — duvar sarerek yuru, kac tik hayatta kalirsin
  function tuket(start, basYon) {
    const yerel = new Uint8Array(g);
    let cur = start, yon = basYon, adim = 0;
    while (adim < 1400) {
      const cx = cur % W, cy = (cur - cx) / W;
      let eni = -1, enYon = yon, enSkor = 1e9;
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
        const s = derece * 4 + (d === yon ? 0 : 1);
        if (s < enSkor) { enSkor = s; eni = ni; enYon = d; }
      }
      if (eni < 0) break;
      yerel[cur] = 1;
      cur = eni; yon = enYon; adim++;
    }
    return adim;
  }

  const aday = [];
  for (let k = 0; k < 4; k++) {
    const d = DIRS[k];
    if (d === TERS[ben.yon]) continue;
    const nx = ben.x + VX[d], ny = ben.y + VY[d];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const ni = ny * W + nx;
    if (g[ni]) continue;
    aday.push({ d: d, i: ni, x: nx, y: ny });
  }
  if (!aday.length) {
    for (let k = 0; k < 4; k++) if (DIRS[k] !== TERS[ben.yon]) return DIRS[k];
    return ben.yon;
  }

  // kesme noktasi: rakibin 2 tik sonrasi tahmini konumu — pesinden kosma, onune kes
  const keX = Math.max(0, Math.min(W - 1, rak.x + 2 * VX[rak.yon]));
  const keY = Math.max(0, Math.min(H - 1, rak.y + 2 * VY[rak.yon]));

  let enIyi = aday[0].d, enSkor = -Infinity;
  for (let a = 0; a < aday.length; a++) {
    const c = aday[a];
    g[c.i] = 1;
    bfs(c.i, distB);
    bfs(rakIdx, distR);

    let vor = 0, vorR = 0, benimSay = 0, rakipSay = 0, bagli = false;
    for (let i = 0; i < N; i++) {
      if (g[i]) continue;
      const da = distB[i], db = distR[i];
      if (da >= 0) { benimSay++; if (db >= 0) bagli = true; }
      if (db >= 0) rakipSay++;
      if (da >= 0 && (db < 0 || da < db)) vor++;
      else if (db >= 0 && (da < 0 || db < da)) vorR++;
    }

    let skor;
    if (bagli) {
      // ayni bolgedeyiz: Voronoi toprak + alan ustunluguyle avlan
      skor = benimSay * 50 + (vor - vorR) * 2;
      const mesafe = Math.abs(c.x - keX) + Math.abs(c.y - keY);
      const avci = (benimSay > 150 && benimSay * 1.5 >= rakipSay) ? 8 : 2;
      skor -= Math.min(mesafe, 34) * avci;
      let acik = 0;
      if (c.x > 0 && !g[c.i - 1]) acik++;
      if (c.x < W - 1 && !g[c.i + 1]) acik++;
      if (c.y > 0 && !g[c.i - W]) acik++;
      if (c.y < H - 1 && !g[c.i + W]) acik++;
      skor += acik * 3;
    } else {
      // bolgeler ayrildi: tuketme yarisi — kim once biter, o kaybeder
      const benimL = tuket(c.i, c.d);
      const rakipL = tuket(rakIdx, rak.yon);
      const fark = benimL - rakipL;
      if (fark >= 2) skor = 1e6 + benimL * 10 + fark; // yarisi kazaniyorum: bolun ve tuket
      else skor = fark * 1000 + benimL; // esit/kayip yarisi: bolunmek beraberlik demek, bagli dal kazanir
    }
    if (ripSet[c.i]) skor -= 1e9;
    skor += Math.random() * 0.5;

    if (skor > enSkor) { enSkor = skor; enIyi = c.d; }
    g[c.i] = 0;
  }
  return enIyi;
}
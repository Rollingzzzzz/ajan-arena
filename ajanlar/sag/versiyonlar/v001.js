function yonBul(durum) {
  const W = 45, H = 30, N = W * H;
  const DIRS = ["U", "D", "L", "R"];
  const VX = { U: 0, D: 0, L: -1, R: 1 };
  const VY = { U: -1, D: 1, L: 0, R: 0 };
  const TERS = { U: "D", D: "U", L: "R", R: "L" };
  const ben = durum.ben, rak = durum.rakip;

  const g = new Uint8Array(N);
  for (let y = 0; y < H; y++) {
    const row = durum.iz[y] || "";
    for (let x = 0; x < W; x++) if (row.charAt(x) !== ".") g[y * W + x] = 1;
  }
  const rakIdx = rak.y * W + rak.x;
  g[ben.y * W + ben.x] = 1;
  g[rakIdx] = 1;

  // rakibin bu tik girebilecegi hucreler: ayni hucreye girmek = cift olum = beraberlik
  const ripSet = new Uint8Array(N);
  for (const d of DIRS) {
    if (d === TERS[rak.yon]) continue;
    const nx = rak.x + VX[d], ny = rak.y + VY[d];
    if (nx >= 0 && ny >= 0 && nx < W && ny < H) ripSet[ny * W + nx] = 1;
  }

  const distB = new Int16Array(N), distR = new Int16Array(N), q = new Int16Array(N);
  function bfs(start, dist) {
    dist.fill(-1);
    let head = 0, tail = 0, say = 0;
    q[tail++] = start; dist[start] = 0;
    while (head < tail) {
      const cur = q[head++]; say++;
      const cx = cur % W, nd = dist[cur] + 1;
      if (cx > 0 && !g[cur - 1] && dist[cur - 1] < 0) { dist[cur - 1] = nd; q[tail++] = cur - 1; }
      if (cx < W - 1 && !g[cur + 1] && dist[cur + 1] < 0) { dist[cur + 1] = nd; q[tail++] = cur + 1; }
      if (cur >= W && !g[cur - W] && dist[cur - W] < 0) { dist[cur - W] = nd; q[tail++] = cur - W; }
      if (cur < N - W && !g[cur + W] && dist[cur + W] < 0) { dist[cur + W] = nd; q[tail++] = cur + W; }
    }
    return say;
  }

  const aday = [];
  for (const d of DIRS) {
    if (d === TERS[ben.yon]) continue;
    const nx = ben.x + VX[d], ny = ben.y + VY[d];
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const ni = ny * W + nx;
    if (g[ni]) continue;
    aday.push({ d: d, i: ni, x: nx, y: ny });
  }
  if (!aday.length) {
    for (const d of DIRS) if (d !== TERS[ben.yon]) return d;
    return ben.yon;
  }

  let enIyi = aday[0].d, enSkor = -Infinity;
  for (const c of aday) {
    g[c.i] = 1;
    const benim = bfs(c.i, distB);
    const rakipAlan = bfs(rakIdx, distR);
    g[c.i] = 0;

    // Voronoi: kimin ulasimi hizliysa toprak onun
    let vor = 0, vorR = 0;
    for (let i = 0; i < N; i++) {
      if (g[i]) continue;
      const a = distB[i], b = distR[i];
      if (a >= 0 && (b < 0 || a < b)) vor++;
      else if (b >= 0 && (a < 0 || b < a)) vorR++;
    }

    let skor = benim * 50 + (vor - vorR) * 2;
    if (ripSet[c.i]) skor -= 1e9; // kafa kafaya hucreye girme = beraberlik
    const mesafe = Math.abs(c.x - rak.x) + Math.abs(c.y - rak.y);
    const avci = (benim > 150 && benim * 1.5 >= rakipAlan) ? 8 : 2;
    skor -= Math.min(mesafe, 34) * avci; // alan ustunken kapat/kes

    let acik = 0;
    if (c.x > 0 && !g[c.i - 1]) acik++;
    if (c.x < W - 1 && !g[c.i + 1]) acik++;
    if (c.y > 0 && !g[c.i - W]) acik++;
    if (c.y < H - 1 && !g[c.i + W]) acik++;
    skor += acik * 3;
    skor += Math.random() * 0.5;

    if (skor > enSkor) { enSkor = skor; enIyi = c.d; }
  }
  return enIyi;
}
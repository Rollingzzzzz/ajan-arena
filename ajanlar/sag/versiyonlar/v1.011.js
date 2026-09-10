function yonBul(durum) {
  function guvenliDonus() {
    const W = 45, H = 30, N = W * H;
    const TERS = { U: 'D', D: 'U', L: 'R', R: 'L' };
    const VX = { U: 0, D: 0, L: -1, R: 1 };
    const VY = { U: -1, D: 1, L: 0, R: 0 };
    try {
      const b = durum.ben;
      const g = new Uint8Array(N);
      for (let y = 0; y < H; y++) {
        const row = (durum.iz && durum.iz[y]) || '';
        for (let x = 0; x < row.length && x < W; x++) {
          const ch = row.charAt(x);
          if (ch === 'B' || ch === 'R') g[y * W + x] = 1;
        }
      }
      if (b && b.x >= 0 && b.x < W && b.y >= 0 && b.y < H) g[b.y * W + b.x] = 1;
      const rk = durum.rakip;
      if (rk && rk.x >= 0 && rk.x < W && rk.y >= 0 && rk.y < H) g[rk.y * W + rk.x] = 1;
      let enD = null, enA = -1;
      for (let k = 0; k < 4; k++) {
        const d = ['U', 'D', 'L', 'R'][k];
        if (d === TERS[b.yon]) continue;
        const nx = b.x + VX[d], ny = b.y + VY[d];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (g[ni]) continue;
        const z = new Uint8Array(N);
        const yigin = [ni];
        z[ni] = 1;
        let say = 0;
        while (yigin.length) {
          const cur = yigin.pop();
          say++;
          const cx = cur % W;
          if (cx > 0 && !g[cur - 1] && !z[cur - 1]) { z[cur - 1] = 1; yigin.push(cur - 1); }
          if (cx < W - 1 && !g[cur + 1] && !z[cur + 1]) { z[cur + 1] = 1; yigin.push(cur + 1); }
          if (cur >= W && !g[cur - W] && !z[cur - W]) { z[cur - W] = 1; yigin.push(cur - W); }
          if (cur < N - W && !g[cur + W] && !z[cur + W]) { z[cur + W] = 1; yigin.push(cur + W); }
        }
        if (say > enA || (say === enA && Math.random() < 0.5)) { enA = say; enD = d; }
      }
      if (enD) return enD;
    } catch (hata2) {}
    const dizi = ['U', 'D', 'L', 'R'];
    const yon0 = durum && durum.ben && durum.ben.yon ? durum.ben.yon : 'U';
    for (let k = 0; k < 4; k++) if (dizi[k] !== TERS[yon0]) return dizi[k];
    return 'U';
  }
  function avciCekirdek() {
    const W = 45, H = 30, N = W * H;
    const DIRS = ['U', 'D', 'L', 'R'];
    const VX = { U: 0, D: 0, L: -1, R: 1 };
    const VY = { U: -1, D: 1, L: 0, R: 0 };
    const TERS = { U: 'D', D: 'U', L: 'R', R: 'L' };
    const ben = durum.ben, rak = durum.rakip;
    const benIdx = ben.y * W + ben.x;
    const rakIdx = rak.y * W + rak.x;
    const g = new Uint8Array(N);
    let izSay = 0;
    for (let y = 0; y < H; y++) {
      const row = durum.iz[y] || '';
      for (let x = 0; x < W; x++) if (x < row.length && row.charAt(x) !== '.') { g[y * W + x] = 1; izSay++; }
    }
    g[benIdx] = 1; g[rakIdx] = 1;
    const acilis = izSay < 14;
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
        if (fark < 1) s -= 15000; else s -= 8000;
        return s;
      }
      const rx = rI % W, ry = (rI - rx) / W;
      const keX = Math.max(0, Math.min(W - 1, rx + VX[rD] * 2));
      const keY = Math.max(0, Math.min(H - 1, ry + VY[rD] * 2));
      const cx2 = cI % W, cy2 = (cI - cx2) / W;
      const mesafe = Math.abs(cx2 - keX) + Math.abs(cy2 - keY);
      if (bagli && benimSay < 18) return 9e5 + benimSay * 1000 - Math.min(mesafe, 20) * 5;
      const avci = (benimSay > 120 && benimSay * 1.35 >= rakipSay) ? (rakipSay < 80 ? 12 : 8) : 2;
      let skor = benimSay * 50 + (vor - vorR) * 3 - Math.min(mesafe, 34) * avci;
      if (benimSay > 150 && benimSay * 1.5 >= rakipSay) skor -= rakipSay * 1.5;
      let acik = 0;
      if (cx2 > 0 && !g[cI - 1]) acik++;
      if (cx2 < W - 1 && !g[cI + 1]) acik++;
      if (cy2 > 0 && !g[cI - W]) acik++;
      if (cy2 < H - 1 && !g[cI + W]) acik++;
      if (acik === 0) skor -= 1500;
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
    const darbogaz = rakAday.length <= 1;
    const rdxx = rak.x + VX[rak.yon], rdyy = rak.y + VY[rak.yon];
    const rakDuzI = (rdxx >= 0 && rdxx < W && rdyy >= 0 && rdyy < H) ? rdyy * W + rdxx : -1;
    let enIyi = aday[0].d, enSkor = -Infinity;
    for (let a = 0; a < aday.length; a++) {
      const c = aday[a];
      g[c.i] = 1;
      let acikA = 0;
      const cxA = c.i % W, cyA = (c.i - cxA) / W;
      if (cxA > 0 && !g[c.i - 1]) acikA++;
      if (cxA < W - 1 && !g[c.i + 1]) acikA++;
      if (cyA > 0 && !g[c.i - W]) acikA++;
      if (cyA < H - 1 && !g[c.i + W]) acikA++;
      let enKotu;
      if (rakAday.length === 0) {
        enKotu = 1e7;
      } else {
        enKotu = Infinity;
        for (let r = 0; r < rakAday.length; r++) {
          const rr = rakAday[r];
          let s;
          if (rr.i === c.i) {
            s = -1e6;
          } else {
            g[rr.i] = 1;
            s = degerlendir(c.i, c.d, rr.i, rr.d);
            g[rr.i] = 0;
          }
          if (s < enKotu) enKotu = s;
        }
      }
      if (acikA === 0) enKotu -= 3e5;
      if (ripSet[c.i]) enKotu -= 1e9;
      if (c.i === rakDuzI) enKotu -= 1e9;
      if (darbogaz) {
        const cx3 = c.i % W, cy3 = (c.i - cx3) / W;
        let ac = 0;
        if (cx3 > 0 && !g[c.i - 1]) ac++;
        if (cx3 < W - 1 && !g[c.i + 1]) ac++;
        if (cy3 > 0 && !g[c.i - W]) ac++;
        if (cy3 < H - 1 && !g[c.i + W]) ac++;
        if (ac >= 1) enKotu += 450;
        else enKotu -= 700;
      }
      if (c.d === ben.yon) enKotu += 0.8;
      if (acilis && c.d !== ben.yon) enKotu += Math.random() * 3.2 + (izSay < 6 ? 1.5 : 0);
      enKotu += acikA * 2 + Math.random() * 0.5;
      if (enKotu > enSkor) { enSkor = enKotu; enIyi = c.d; }
      g[c.i] = 0;
    }
    return enIyi;
  }
  try {
    const secim = avciCekirdek();
    if (secim === 'U' || secim === 'D' || secim === 'L' || secim === 'R') return secim;
    return guvenliDonus();
  } catch (hata) {
    return guvenliDonus();
  }
}
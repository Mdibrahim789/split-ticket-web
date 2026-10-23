// Ported from TonmoyNaimur/split-ticket-finder (scanner.js) — findRoutes()
// Tickets may start before From or end after To. Optional no-ticket stretches
// inside the trip (gaps). Ranking: fewest gaps, fewest tickets, least extra
// distance, most seats (min segment), lowest fare.
export function findRoutes(stations, counts, fi, ti, maxGap) {
  const last = stations.length - 1;
  const out = [];
  let budget = 500000;

  function dfs(p, segs, gaps) {
    if (budget-- <= 0 || out.length >= 20000) return;
    if (p >= ti) {
      if (segs.some((s) => s.type === "t")) out.push({ segs: segs.map((s) => ({ ...s })), gaps });
      return;
    }
    const first = segs.length === 0;
    for (let q = last; q > p; q--) {
      const lo = first ? 0 : p, hi = p;
      for (let s = lo; s <= hi; s++) {
        const c = counts[s + "," + q];
        if (c && c.online >= 1) {
          segs.push({ type: "t", a: s, b: q, c });
          dfs(q, segs, gaps);
          segs.pop();
        }
      }
    }
    if (gaps < maxGap) {
      const prev = segs[segs.length - 1];
      if (prev && prev.type === "g") {
        const oldB = prev.b;
        prev.b = p + 1;
        dfs(p + 1, segs, gaps + 1);
        prev.b = oldB;
      } else {
        segs.push({ type: "g", a: p, b: p + 1 });
        dfs(p + 1, segs, gaps + 1);
        segs.pop();
      }
    }
  }
  dfs(fi, [], 0);

  out.forEach((r) => {
    const t = r.segs.filter((s) => s.type === "t");
    r.tickets = t.length;
    r.min = Math.min(...t.map((s) => s.c.online));
    r.fare = t.reduce((sum, s) => sum + (Number(s.c.fare) || 0), 0);
    r.extra = t.reduce((sum, s) => sum + Math.max(0, fi - s.a) + Math.max(0, s.b - ti), 0);
  });
  out.sort((a, b) => a.gaps - b.gaps || a.tickets - b.tickets || a.extra - b.extra || b.min - a.min || a.fare - b.fare);
  return out;
}

export function buyLink(from, to, date, cls) {
  const q = new URLSearchParams({ fromcity: from, tocity: to, doj: date, class: cls });
  return `https://eticket.railway.gov.bd/booking/train/search?${q.toString()}`;
}

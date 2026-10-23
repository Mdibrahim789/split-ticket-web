// Planner logic — extension-free, web-only.
// Builds an ordered checklist of station pairs to check on the official
// e-ticket site, then assembles confirmed combos from what the user marks.
import { findRoutes } from "./algorithm.js";

// Bigger interchange stations: splits here are usually easier to use.
const MAJOR = new Set([
  "Dhaka", "Dhaka Airport", "Joydebpur", "Ishwardi", "Natore", "Abdulpur",
  "Santahar", "Parbatipur", "Saidpur", "Joypurhat", "Rajshahi", "Khulna",
  "Jashore", "Bhairab Bazar", "Cumilla", "Feni", "Chattogram", "Akhaura",
  "Sylhet", "Mymensingh", "Jamalpur Town", "Rangpur", "Dinajpur", "Bogura",
  "Sirajganj Bazar", "Tangail", "B. B. East", "Chatmohor", "Lalmonirhat",
]);

function splitScore(stations, fi, s, ti) {
  const leg1 = s - fi, leg2 = ti - s;
  let score = Math.min(leg1, leg2) * 10;                 // balanced legs first
  if (leg1 >= 2 && leg2 >= 2) score += 25;               // avoid 1-hop legs
  if (MAJOR.has(stations[s])) score += 20;               // major station bonus
  score -= Math.abs(leg1 - leg2);                        // prefer balance
  return score;
}

// Ordered, de-duplicated checklist: direct, then 2-ticket split pairs
// (best split points first), then extra pairs for 3-ticket combos.
export function buildChecklist(stations, fi, ti) {
  const items = [];
  const seen = new Set();
  const add = (a, b, phase) => {
    const k = a + "," + b;
    if (seen.has(k) || b <= a) return;
    seen.add(k);
    items.push({ a, b, phase });
  };
  add(fi, ti, "direct");

  const splits = [];
  for (let s = fi + 1; s < ti; s++) splits.push(s);
  splits.sort((x, y) => splitScore(stations, fi, y, ti) - splitScore(stations, fi, x, ti));
  for (const s of splits) { add(fi, s, "split2"); add(s, ti, "split2"); }

  // 3-ticket combos: pick the best pairs of split points, add their segments.
  const plans = [];
  for (let i = 0; i < splits.length; i++)
    for (let j = i + 1; j < splits.length; j++) {
      const s1 = splits[i], s2 = splits[j];
      const sc = splitScore(stations, fi, s1, s2) + splitScore(stations, s1, s2, ti);
      plans.push({ s1, s2, sc });
    }
  plans.sort((a, b) => b.sc - a.sc);
  for (const p of plans.slice(0, 10)) { add(fi, p.s1, "split3"); add(p.s1, p.s2, "split3"); add(p.s2, ti, "split3"); }

  return items;
}

// Assemble confirmed combos from user marks.
// status: { "a,b": "yes" | "no" }, seats: { "a,b": number }
export function confirmedRoutes(stations, fi, ti, status, seats) {
  const counts = {};
  for (let i = 0; i < stations.length - 1; i++)
    for (let j = i + 1; j < stations.length; j++) {
      const k = i + "," + j, st = status[k];
      if (st === "yes") counts[k] = { online: Math.max(1, parseInt(seats[k], 10) || 1), offline: 0, fare: 0 };
      else if (st === "no") counts[k] = { online: 0, offline: 0, fare: 0 };
    }
  if (!Object.keys(counts).length) return [];
  return findRoutes(stations, counts, fi, ti, 0).slice(0, 5);
}

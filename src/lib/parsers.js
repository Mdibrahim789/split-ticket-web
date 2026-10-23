// Ported / adapted from scanner.js: parseDate, parseClass + local Smart Fill
export const CLASSES = ["S_CHAIR", "SHOVAN", "SNIGDHA", "F_SEAT", "F_BERTH", "F_CHAIR", "AC_S", "AC_B", "AC_CHAIR", "SHULOV"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(d) {
  return String(d.getDate()).padStart(2, "0") + "-" + MON[d.getMonth()] + "-" + d.getFullYear();
}

export function parseDate(raw) {
  const s = String(raw || "").trim().toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ");
  if (!s) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (s === "today" || s.includes("ajke") || s.includes("আজ")) return fmtDate(today);
  if (s === "tomorrow" || s.includes("kalke") || s.includes("আগামীকাল")) { const t = new Date(today); t.setDate(t.getDate() + 1); return fmtDate(t); }
  const build = (y, mo, d, noYear) => {
    if (mo > 11 && d <= 12) { const t = mo + 1; mo = d - 1; d = t; }
    let dt = new Date(y, mo, d);
    if (dt.getMonth() !== mo || dt.getDate() !== d) return null;
    if (noYear && dt < today) dt = new Date(y + 1, mo, d);
    return fmtDate(dt);
  };
  const mIdx = (w) => MONTHS.findIndex((x) => w.startsWith(x));
  const yr = (y) => (y < 100 ? 2000 + y : y);
  const now = today.getFullYear();
  let m;
  if ((m = s.match(/^(\d{4})[-\/. ](\d{1,2})[-\/. ](\d{1,2})$/))) return build(+m[1], +m[2] - 1, +m[3]);
  if ((m = s.match(/^(\d{1,2})[-\/. ](\d{1,2})[-\/. ](\d{2,4})$/))) return build(yr(+m[3]), +m[2] - 1, +m[1]);
  if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[-\/. ]*([a-z]{3,9})(?:[-\/. ]*(\d{2,4}))?$/))) {
    const mi = mIdx(m[2]); if (mi < 0) return null;
    return build(m[3] ? yr(+m[3]) : now, mi, +m[1], !m[3]);
  }
  if ((m = s.match(/^([a-z]{3,9})[-\/. ]*(\d{1,2})(?:st|nd|rd|th)?(?:[-\/. ]*(\d{2,4}))?$/))) {
    const mi = mIdx(m[1]); if (mi < 0) return null;
    return build(m[3] ? yr(+m[3]) : now, mi, +m[2], !m[3]);
  }
  if ((m = s.match(/^(\d{1,2})$/))) {
    let dt = new Date(now, today.getMonth(), +m[1]);
    if (dt < today) dt = new Date(now, today.getMonth() + 1, +m[1]);
    return fmtDate(dt);
  }
  return null;
}

export function parseClass(raw, fallback = "S_CHAIR") {
  const s = String(raw || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!s) return fallback;
  const exact = CLASSES.find((c) => c.toLowerCase().replace(/_/g, "") === s);
  if (exact) return exact;
  if (s.startsWith("snig")) return "SNIGDHA";
  if (/^ac(b|berth)/.test(s)) return "AC_B";
  if (/^ac(chair)/.test(s)) return "AC_CHAIR";
  if (/^ac/.test(s)) return "AC_S";
  if (/^(f|first)(b|berth)/.test(s)) return "F_BERTH";
  if (/^(f|first)(c|chair)/.test(s)) return "F_CHAIR";
  if (/^(f|first)/.test(s)) return "F_SEAT";
  if (/^shul/.test(s)) return "SHULOV";
  if (/chair/.test(s)) return "S_CHAIR";
  if (/^(sho|sha|sob)/.test(s)) return "SHOVAN";
  return fallback;
}

// Local Smart Fill — no API key needed. Finds station names, class,
// train name/number and date words inside free text (EN + common Banglish).
export function smartFill(text, stations) {
  const low = " " + String(text || "").toLowerCase() + " ";
  const found = [];
  stations.forEach((st) => {
    const idx = low.indexOf(st.toLowerCase());
    if (idx >= 0) found.push({ name: st, idx });
  });
  found.sort((a, b) => a.idx - b.idx);
  const out = {};
  if (found.length >= 2) { out.from = found[0].name; out.to = found[found.length - 1].name; }
  else if (found.length === 1) { out.from = found[0].name; }

  if (/snigdha|স্নিগ্ধা/.test(low)) out.cls = "SNIGDHA";
  else if (/ac\s*b|ac berth/.test(low)) out.cls = "AC_B";
  else if (/ac/.test(low)) out.cls = "AC_S";
  else if (/shovan|শোভন/.test(low)) out.cls = "SHOVAN";
  else if (/shulov|শুলভ/.test(low)) out.cls = "SHULOV";
  else if (/s[_\s]?chair|এস চেয়ার/.test(low)) out.cls = "S_CHAIR";

  if (/titumir|তিতুমীর/.test(low)) out.train = "Titumir Express (734)";
  const num = String(text).match(/\b(7\d{2}|8\d{2})\b/);
  if (num && !out.train) out.train = num[1];

  if (/tomorrow|আগামীকাল|kalke/.test(low)) { const t = new Date(); t.setDate(t.getDate() + 1); out.date = fmtDate(t); }
  else if (/today|আজ/.test(low)) out.date = fmtDate(new Date());
  else {
    const dm = String(text).match(/\d{1,2}[-\/. ]*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\/. ]*\d{0,4}/i) || String(text).match(/\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}/);
    if (dm) { const d = parseDate(dm[0]); if (d) out.date = d; }
  }
  return out;
}

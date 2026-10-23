import { useEffect, useMemo, useRef, useState } from "react";
import { findRoutes, buyLink } from "./lib/algorithm.js";
import { CLASSES, fmtDate, parseDate, smartFill } from "./lib/parsers.js";
import { STATIONS, TRAIN, seatFor } from "./lib/demoData.js";
import { pingBridge, scanLive } from "./lib/bridge.js";
import Planner from "./Planner.jsx";

const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return fmtDate(d); };
const idxOf = (name) => STATIONS.findIndex((s) => s.toLowerCase() === String(name).toLowerCase());

export default function App() {
  const [train, setTrain] = useState("Titumir Express (734)");
  const [from, setFrom] = useState("Birampur");
  const [to, setTo] = useState("Rajshahi");
  const [date, setDate] = useState(tomorrow());
  const [cls, setCls] = useState("S_CHAIR");
  const [passengers, setPassengers] = useState(1);
  const [gap, setGap] = useState(0);
  const [free, setFree] = useState("");
  const [note, setNote] = useState("");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [counts, setCounts] = useState({});
  const [scanned, setScanned] = useState(false);
  const stopRef = useRef(false);
  const [tab, setTab] = useState("planner"); // planner = web-only (default), scan = demo/extension
  const [bridge, setBridge] = useState(undefined); // undefined=checking, null=not installed
  const [forceDemo, setForceDemo] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [liveTrain, setLiveTrain] = useState("");

  async function checkBridge() {
    const b = await pingBridge();
    setBridge(b);
    return b;
  }
  useEffect(() => { checkBridge(); }, []);

  const liveReady = !!(bridge && bridge.hasAuth && !forceDemo);

  const fi = idxOf(from), ti = idxOf(to);
  const routes = useMemo(() => {
    if (!scanned || fi < 0 || ti < 0 || fi >= ti) return [];
    return findRoutes(STATIONS, counts, fi, ti, gap);
  }, [scanned, counts, fi, ti, gap]);

  const filtered = useMemo(() => routes.filter((r) => r.min >= passengers), [routes, passengers]);
  const shownRoutes = (filtered.length ? filtered : routes).slice(0, 5);
  const best = shownRoutes[0];

  function doSmartFill() {
    const o = smartFill(free, STATIONS);
    if (!o.from && !o.to && !o.cls && !o.train && !o.date) { setNote("কিছু বুঝতে পারলাম না — station এর নাম ইংরেজিতে লিখে দেখো।"); return; }
    if (o.from) setFrom(o.from);
    if (o.to) setTo(o.to);
    if (o.cls) setCls(o.cls);
    if (o.train) setTrain(o.train);
    if (o.date) setDate(o.date);
    setNote("✨ Smart Fill হয়ে গেছে — নিচে check করে Scan চাপো।");
  }

  async function runScan() {
    if (fi < 0 || ti < 0) { setNote("From / To station list থেকে বেছে নাও।"); return; }
    if (fi >= ti) { setNote("এই ট্রেনের route-এ From, To-এর পরে আসে — উল্টো দিকের যাত্রা।"); return; }
    const parsed = parseDate(date);
    if (!parsed) { setNote("তারিখ বুঝতে পারলাম না — যেমন 24-Oct-2026 লিখো।"); return; }
    setDate(parsed);

    if (liveReady) {
      setScanning(true); setScanned(false); setCounts({}); setProgress(0); setNote(""); setLiveTrain("");
      try {
        const res = await scanLive(
          { stations: STATIONS, from, to, date: parsed, cls, train },
          (pr) => { setCounts(pr.counts); setProgress(Math.round((pr.done / pr.total) * 100)); }
        );
        setCounts(res.counts);
        setLiveTrain(res.train ? res.train.tripNumber : "");
        if (res.warning) setNote("কিছু lookup fail হয়েছে: " + res.warning);
        setLiveMode(true);
        setScanned(true);
      } catch (e) {
        if (e.code === "AUTH" || e.code === "NO_AUTH") {
          setBridge({ installed: true, hasAuth: false, authAgeSec: null });
          setNote("e-ticket session পাওয়া যায়নি/মেয়াদ শেষ। নিচের সবুজ card এর ধাপগুলো করো, তারপর আবার Scan চাপো।");
        } else if (e.code === "NO_TRAIN") {
          setNote("Live সাইটে এই ট্রেনটা এই route/date/class এ পাওয়া যায়নি। Train এর নাম/নম্বর, date আর class check করো।");
        } else {
          setNote("Live scan fail হয়েছে: " + e.message + " — Demo mode এ আবার চেষ্টা করতে পারো।");
        }
      }
      setScanning(false);
      return;
    }

    stopRef.current = false;
    setScanning(true); setScanned(false); setCounts({}); setProgress(0); setNote("");
    const pairs = [];
    for (let i = 0; i < STATIONS.length - 1; i++) for (let j = i + 1; j < STATIONS.length; j++) pairs.push([i, j]);
    const acc = {};
    for (let k = 0; k < pairs.length; k++) {
      if (stopRef.current) break;
      const [i, j] = pairs[k];
      acc[i + "," + j] = seatFor(i, j, cls);
      if (k % 4 === 0 || k === pairs.length - 1) {
        setCounts({ ...acc });
        setProgress(Math.round(((k + 1) / pairs.length) * 100));
        await new Promise((r) => setTimeout(r, 12));
      }
    }
    setCounts({ ...acc });
    setLiveMode(false);
    setScanning(false); setScanned(true);
  }

  return (
    <div className="min-h-screen text-slate-800">
      {/* Header */}
      <header className="bg-emerald-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="text-3xl">🚆</div>
          <div className="flex-1">
            <div className="font-bold text-lg leading-tight">SplitTicket BD</div>
            <div className="text-emerald-200 text-xs">সরাসরি টিকিট না থাকলেও, ভাগে ভাগে যাওয়ার উপায় খুঁজুন</div>
          </div>
          <span className="bg-amber-400 text-amber-900 text-[11px] font-bold px-2 py-1 rounded-full">v0.3 • Planner</span>
        </div>
      </header>

      {tab === "planner" ? (
        <div className="bg-sky-50 border-b border-sky-200 text-sky-800 text-xs px-4 py-2 text-center">
          🧭 Planner mode — train/station এর নাম আসল data; seat check হবে অফিসিয়াল e-ticket সাইটে, app সাজিয়ে দেবে কোন order-এ check করবে।
        </div>
      ) : liveReady ? (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs px-4 py-2 text-center">
          🟢 Live mode ready — extension দিয়ে তোমার e-ticket session থেকে আসল seat data আসবে। টিকিট কেনা যাবে শুধু অফিসিয়াল e-ticket সাইটে।
        </div>
      ) : (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs px-4 py-2 text-center">
          ⚠️ Demo mode — seat সংখ্যাগুলো আসল নয়। Live data পেতে নিচের card দেখো।
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 pt-4 flex gap-2">
        <button onClick={() => setTab("planner")} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === "planner" ? "bg-emerald-700 text-white" : "bg-white border"}`}>🧭 Planner (Web-only)</button>
        <button onClick={() => setTab("scan")} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === "scan" ? "bg-emerald-700 text-white" : "bg-white border"}`}>🔍 Scan (Demo / Extension)</button>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {tab === "planner" ? <Planner /> : <>
        {/* Bridge status */}
        <section className={`rounded-2xl shadow-sm border p-4 text-sm ${liveReady ? "bg-emerald-50 border-emerald-200" : "bg-white"}`}>
          {bridge === undefined && <p>🔌 Extension check হচ্ছে…</p>}
          {bridge === null && (
            <div>
              <p className="font-semibold">🔌 Extension পাওয়া যায়নি — Demo mode চলছে</p>
              <p className="text-xs text-slate-500 mt-1">
                Live seat data পেতে PC এর Chrome এ <b>Train Split Finder</b> extension (v0.4+) install করো, তারপর এই পেজটা reload দাও।
                Extension: <a className="underline text-emerald-700 font-semibold" href="https://github.com/Mdibrahim789/split-ticket-finder" target="_blank" rel="noreferrer">github.com/Mdibrahim789/split-ticket-finder</a>
              </p>
            </div>
          )}
          {bridge && !bridge.hasAuth && (
            <div>
              <p className="font-semibold">🔌 Extension আছে, কিন্তু e-ticket session নেই</p>
              <ol className="text-xs text-slate-600 mt-1 list-decimal ml-4 space-y-0.5">
                <li>নতুন tab এ <a className="underline text-emerald-700 font-semibold" href="https://eticket.railway.gov.bd" target="_blank" rel="noreferrer">eticket.railway.gov.bd</a> খোলো (login থাকলে ভালো)</li>
                <li>যেকোনো একটা train search করো — তাহলেই session টা extension এ save হবে</li>
                <li>এই tab এ ফিরে এসে নিচে "আবার check করো" চাপো</li>
              </ol>
              <button onClick={checkBridge} className="mt-2 border border-emerald-700 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-semibold">আবার check করো</button>
            </div>
          )}
          {bridge && bridge.hasAuth && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-semibold">🟢 Extension connected — Live scan হবে</p>
              <span className="text-xs text-slate-500">e-ticket session save হয়েছে {bridge.authAgeSec == null ? "" : bridge.authAgeSec < 90 ? "এইমাত্র" : Math.round(bridge.authAgeSec / 60) + " মিনিট আগে"}</span>
              <label className="text-xs ml-auto flex items-center gap-1">
                <input type="checkbox" checked={forceDemo} onChange={(e) => setForceDemo(e.target.checked)} /> Demo mode এ scan করো
              </label>
            </div>
          )}
        </section>

        {/* Smart fill */}
        <section className="bg-white rounded-2xl shadow-sm border p-4">
          <label className="font-semibold text-sm">✨ নিজের ভাষায় লিখুন (Smart Fill)</label>
          <div className="flex gap-2 mt-2">
            <input value={free} onChange={(e) => setFree(e.target.value)}
              placeholder="e.g. titumir birampur to rajshahi tomorrow s chair"
              className="flex-1 border rounded-xl px-3 py-2 text-sm" />
            <button onClick={doSmartFill} className="bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">Fill করো</button>
          </div>
          {note && <p className="text-xs text-emerald-700 mt-2">{note}</p>}
        </section>

        {/* Form */}
        <section className="bg-white rounded-2xl shadow-sm border p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Field label="ট্রেন"><input value={train} onChange={(e) => setTrain(e.target.value)} className="inp" /></Field>
            <Field label="From (থেকে)">
              <select value={from} onChange={(e) => setFrom(e.target.value)} className="inp">
                {STATIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="To (পর্যন্ত)">
              <select value={to} onChange={(e) => setTo(e.target.value)} className="inp">
                {STATIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="তারিখ"><input value={date} onChange={(e) => setDate(e.target.value)} placeholder="24-Oct-2026" className="inp" /></Field>
            <Field label="ক্লাস">
              <select value={cls} onChange={(e) => setCls(e.target.value)} className="inp">
                {CLASSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="যাত্রী"><input type="number" min="1" max="10" value={passengers} onChange={(e) => setPassengers(Math.max(1, +e.target.value || 1))} className="inp" /></Field>
              <Field label="No-ticket gap (সর্বোচ্চ)"><input type="number" min="0" max="5" value={gap} onChange={(e) => setGap(Math.min(5, Math.max(0, +e.target.value || 0)))} className="inp" /></Field>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2">Route: {TRAIN.name} ({TRAIN.number}) • {STATIONS[0]} → {STATIONS[STATIONS.length - 1]} • মোট {STATIONS.length}টা stop (demo)</div>
          <div className="flex gap-2 mt-4">
            <button onClick={runScan} disabled={scanning} className="bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-sm">
              {scanning ? `Scanning… ${progress}%` : liveReady ? "🔍 Live Scan করো (আসল data)" : "🔍 পুরো ট্রেন Scan করো (Demo)"}
            </button>
            {scanning && !liveReady && <button onClick={() => (stopRef.current = true)} className="border px-4 py-2.5 rounded-xl text-sm">Stop</button>}
            {scanning && liveReady && <span className="text-xs text-slate-500 self-center">Live scan এ প্রতি pair এ ~১.৫ সেকেন্ড করে লাগতে পারে — tab টা খোলা রাখো।</span>}
          </div>
          {scanning && <div className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden"><div className="h-full bg-emerald-600 transition-all" style={{ width: progress + "%" }} /></div>}
        </section>

        {/* Best route timeline */}
        {scanned && best && (
          <section className="bg-white rounded-2xl shadow-sm border p-4">
            <h2 className="font-bold">সেরা উপায়: {from} → {to} {liveMode
              ? <span className="bg-emerald-600 text-white text-[11px] px-2 py-0.5 rounded-full align-middle">LIVE{liveTrain ? " • " + liveTrain : ""}</span>
              : <span className="bg-amber-400 text-amber-900 text-[11px] px-2 py-0.5 rounded-full align-middle">DEMO DATA</span>}</h2>
            <Timeline route={best} date={date} cls={cls} />
            <p className="text-xs text-slate-500 mt-2">💡 টিপ: যে segment-এ seat সবচেয়ে কম, সেই টিকিটটা আগে কাটো। প্রতিটা টিকিটে seat number আলাদা হতে পারে।</p>
          </section>
        )}
        {scanned && !routes.length && (
          <section className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            এই মুহূর্তে কোনোভাবেই {from} → {to} যাওয়া যাচ্ছে না (gap সর্বোচ্চ {gap} রাখা আছে)। Gap বাড়িয়ে আবার দেখতে পারো — তবে বিনা টিকিটে ভ্রমণে জরিমানা হতে পারে।
          </section>
        )}
        {scanned && routes.length > 0 && filtered.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-800">
            {passengers} জন যাত্রীর জন্য যথেষ্ট seat-ওয়ালা কম্বো পাইনি — নিচে সবচেয়ে কাছের অপশনগুলো দেখাচ্ছি।
          </div>
        )}

        {/* Route cards */}
        {scanned && shownRoutes.map((r, idx) => (
          <section key={idx} className={`bg-white rounded-2xl shadow-sm border p-4 ${r.gaps ? "border-amber-300" : ""}`}>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold">#{idx + 1}</span>
              <span className="text-sm font-semibold">{labelFor(r)}</span>
              <span className="ml-auto font-bold text-emerald-700">মোট ≈ ৳{r.fare}</span>
            </div>
            <div className="mt-2 space-y-1.5 text-sm">
              {r.segs.map((s, k) => s.type === "t" ? (
                <div key={k} className="flex flex-wrap items-center gap-2">
                  <span>🎫 {STATIONS[s.a]} → {STATIONS[s.b]}</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">{s.c.online} seat • ৳{s.c.fare}</span>
                  {s.a < fi && <span className="text-xs text-slate-500">(উঠবে {from} থেকে)</span>}
                  {s.b > ti && <span className="text-xs text-slate-500">(নামবে {to}-তে)</span>}
                  <a href={buyLink(STATIONS[s.a], STATIONS[s.b], date, cls)} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 underline font-semibold">e-ticket এ কিনুন →</a>
                </div>
              ) : (
                <div key={k} className="text-amber-700 font-semibold text-sm">🧍 {STATIONS[s.a]} → {STATIONS[s.b]}: NO TICKET ({s.b - s.a} stop) — ঝুঁকি নিজের</div>
              ))}
            </div>
          </section>
        ))}

        {/* Matrix */}
        {(scanning || scanned) && Object.keys(counts).length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border p-4 overflow-x-auto">
            <h3 className="font-bold text-sm mb-1">Seat Matrix</h3>
            <p className="text-xs text-slate-500 mb-2">সংখ্যা = ঐ From → To তে online seat ({liveMode ? "LIVE — e-ticket থেকে আনা" : "demo"})। নীল outline = তোমার পুরো যাত্রা cover করে।</p>
            <table className="text-[11px] border-collapse">
              <thead>
                <tr><th className="th">From \ To</th>{STATIONS.slice(1).map((s) => <th key={s} className="th">{s}</th>)}</tr>
              </thead>
              <tbody>
                {STATIONS.slice(0, -1).map((fs, i) => (
                  <tr key={fs}>
                    <th className="th text-left">{fs}</th>
                    {STATIONS.slice(1).map((ts, jj) => {
                      const j = jj + 1;
                      if (j <= i) return <td key={ts} className="td bg-slate-100" />;
                      const c = counts[i + "," + j];
                      const cover = i <= fi && j >= ti;
                      return (
                        <td key={ts} title={c ? `Fare ৳${c.fare} • counter ${c.offline}` : ""}
                          className={`td ${c === undefined ? "" : c === null ? "bg-slate-100 text-slate-400" : c.online > 0 ? "bg-emerald-100 font-bold" : "bg-red-100 text-red-500"} ${cover ? "outline outline-2 outline-blue-500 -outline-offset-2" : ""}`}>
                          {c === undefined ? "…" : c === null ? "–" : c.online}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* How it works */}
        <section className="grid md:grid-cols-3 gap-3 text-sm">
          {[
            ["১. যাত্রা লেখো", "From, To, তারিখ আর ক্লাস দাও — কিংবা নিজের ভাষায় লিখে Smart Fill করো।"],
            ["২. পুরো ট্রেন scan হয়", "ট্রেনের প্রতিটা station pair-এ seat আছে কিনা একে একে check হয়।"],
            ["৩. সেরা কম্বো কিনে নাও", "সাজানো কম্বোগুলো থেকে পছন্দ করে প্রতিটা টিকিট অফিসিয়াল e-ticket সাইটে কিনে নাও।"],
          ].map(([t, d]) => (
            <div key={t} className="bg-white rounded-2xl border p-4"><div className="font-bold">{t}</div><p className="text-slate-500 text-xs mt-1">{d}</p></div>
          ))}
        </section>

        <footer className="text-center text-[11px] text-slate-400 pb-6">
          এটি বাংলাদেশ রেলওয়ের অফিসিয়াল অ্যাপ নয়। SplitTicket BD — Phase 2 (extension bridge দিয়ে live data; extension ছাড়া demo)।
          Algorithm: মূল extension <span className="underline">TonmoyNaimur/split-ticket-finder</span> থেকে port করা, fork: Mdibrahim789/split-ticket-finder।
        </footer>
        </>}
      </main>
      <style>{`.inp{width:100%;border:1px solid #cbd5e1;border-radius:0.75rem;padding:0.5rem 0.75rem;font-size:0.875rem}.th{border:1px solid #e2e8f0;padding:2px 5px;background:#f8fafc;white-space:nowrap}.td{border:1px solid #e2e8f0;padding:2px 5px;text-align:center;white-space:nowrap}`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="block text-xs font-semibold text-slate-500 mb-1">{label}</span>{children}</label>;
}

function labelFor(r) {
  if (r.gaps === 0 && r.tickets === 1) return "১ টিকিট, পুরো পথ এক seat-এ";
  if (r.gaps === 0) return `${r.tickets} টিকিট, পুরোপুরি covered`;
  return `${r.tickets} টিকিট + ${r.gaps} stop বিনা টিকিটে`;
}

function Timeline({ route, date, cls }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {route.segs.map((s, k) => (
        <div key={k} className={`flex-1 min-w-[130px] rounded-xl px-3 py-2 text-center ${s.type === "t" ? "bg-emerald-600 text-white" : "bg-amber-400 text-amber-900"}`}>
          <div className="text-xs font-bold">{s.type === "t" ? "🎫 টিকিট" : "🧍 NO TICKET"}</div>
          <div className="text-[13px] font-semibold leading-tight">{STATIONS[s.a]} → {STATIONS[s.b]}</div>
          {s.type === "t" && <div className="text-[11px] opacity-90">{s.c.online} seat • ৳{s.c.fare}</div>}
        </div>
      ))}
    </div>
  );
}

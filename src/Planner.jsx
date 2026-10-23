import { useMemo, useState } from "react";
import { TRAINS, SEAT_CLASSES } from "./lib/railwayData.js";
import { allRoutes, saveCustomRoute } from "./lib/routes.js";
import { buildChecklist, confirmedRoutes } from "./lib/planner.js";
import { buyLink } from "./lib/algorithm.js";
import { fmtDate } from "./lib/parsers.js";

const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return fmtDate(d); };
const PHASES = [
  ["direct", "ধাপ ১ — সরাসরি টিকিট"],
  ["split2", "ধাপ ২ — ২ টিকিটের জোড়া (সবচেয়ে সম্ভাব্য আগে)"],
  ["split3", "ধাপ ৩ — ৩ টিকিটের বাড়তি জোড়া"],
];

export default function Planner() {
  const [routes, setRoutes] = useState(() => allRoutes());
  const [train, setTrain] = useState("TITUMIR EXPRESS (734)");
  const [stopsText, setStopsText] = useState(() => (allRoutes()[0]?.stops || []).join(", "));
  const [from, setFrom] = useState("Birampur");
  const [to, setTo] = useState("Rajshahi");
  const [date, setDate] = useState(tomorrow());
  const [cls, setCls] = useState("S_CHAIR");
  const [planned, setPlanned] = useState(false);
  const [status, setStatus] = useState({});
  const [seats, setSeats] = useState({});
  const [msg, setMsg] = useState("");

  const stops = useMemo(() => stopsText.split(",").map((s) => s.trim()).filter(Boolean), [stopsText]);
  const fi = stops.indexOf(from), ti = stops.indexOf(to);
  const checklist = useMemo(() => (planned && fi >= 0 && ti > fi ? buildChecklist(stops, fi, ti) : []), [planned, stops, fi, ti]);
  const confirmed = useMemo(() => (planned && fi >= 0 && ti > fi ? confirmedRoutes(stops, fi, ti, status, seats) : []), [planned, stops, fi, ti, status, seats]);
  const checkedCount = checklist.filter((x) => status[x.a + "," + x.b]).length;
  const best = confirmed[0];

  function pickTrain(name) {
    setTrain(name);
    const r = routes.find((x) => x.train === name);
    if (r) {
      setStopsText(r.stops.join(", "));
      setFrom(r.stops[Math.min(6, r.stops.length - 2)] || r.stops[0]);
      setTo(r.stops[r.stops.length - 1]);
      setPlanned(false); setStatus({}); setSeats({});
      setMsg("Route load হয়েছে — From/To ঠিক করে Plan বানাও।");
    }
  }

  function saveRoute() {
    if (stops.length < 2) { setMsg("কমপক্ষে ২টা station লাগবে।"); return; }
    const name = train.trim() || "আমার Route";
    const updated = saveCustomRoute({ train: name, stops, note: "নিজের save করা route" });
    setRoutes(updated);
    setMsg(`"${name}" route save হলো — পরে train list থেকে আবার পাবে।`);
  }

  function makePlan() {
    if (fi < 0 || ti < 0) { setMsg("From / To stops list এ নেই — stops ঠিক করো অথবা list থেকে বেছে নাও।"); return; }
    if (fi >= ti) { setMsg("এই route এ From, To এর পরে আসে — উল্টো দিকের train/route বেছে নাও।"); return; }
    setStatus({}); setSeats({}); setPlanned(true); setMsg("");
  }

  const setSeg = (k, v) => setStatus((s) => ({ ...s, [k]: s[k] === v ? undefined : v }));

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl shadow-sm border p-4">
        <h2 className="font-bold">🧭 Planner — extension ছাড়াই, শুধু web এ</h2>
        <p className="text-xs text-slate-500 mt-1">
          Live seat web দিয়ে আনা যায় না (রেলওয়ের নিয়ম)। তাই app তোমাকে <b>ঠিক কোন জোড়াগুলো, কোন order-এ</b> অফিসিয়াল সাইটে check করতে হবে তা সাজিয়ে দেয়।
          প্রতিটা জোড়ার পাশে e-ticket লিংক — ক্লিক করে seat দেখে এখানে ✅/❌ mark করো, app নিজেই পূর্ণ combo বানিয়ে দেবে।
          Train ও station এর নাম আসল (রেলওয়ের public data); stop list মিলিয়ে নাও, ভুল থাকলে নিচে edit করো।
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mt-3">
          <label className="block col-span-2 md:col-span-1">
            <span className="lbl">ট্রেন (আসল list থেকে বেছে নাও)</span>
            <input list="trainlist" value={train} onChange={(e) => pickTrain(e.target.value)} className="inp" placeholder="Train এর নাম লিখো…" />
            <datalist id="trainlist">{TRAINS.map((t) => <option key={t.name} value={t.name} />)}</datalist>
          </label>
          <label className="block"><span className="lbl">তারিখ</span><input value={date} onChange={(e) => setDate(e.target.value)} className="inp" placeholder="24-Oct-2026" /></label>
          <label className="block"><span className="lbl">ক্লাস</span>
            <select value={cls} onChange={(e) => setCls(e.target.value)} className="inp">{SEAT_CLASSES.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
        </div>
        <label className="block mt-3">
          <span className="lbl">Train এর stops (যাওয়ার order-এ) — edit করা যায়</span>
          <textarea value={stopsText} onChange={(e) => { setStopsText(e.target.value); setPlanned(false); }} rows={2} className="inp text-xs" />
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          <button onClick={saveRoute} className="border border-emerald-700 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-semibold">💾 এই route save করো</button>
          <span className="text-[11px] text-slate-400 self-center">Save করা route: {routes.map((r) => r.train).join(" • ")}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm mt-3">
          <label className="block"><span className="lbl">From</span>
            <select value={from} onChange={(e) => setFrom(e.target.value)} className="inp">{stops.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="block"><span className="lbl">To</span>
            <select value={to} onChange={(e) => setTo(e.target.value)} className="inp">{stops.map((s) => <option key={s}>{s}</option>)}</select></label>
        </div>
        {msg && <p className="text-xs text-emerald-700 mt-2">{msg}</p>}
        <button onClick={makePlan} className="bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm mt-4">🧭 Check Plan বানাও</button>
      </section>

      {planned && best && (
        <section className="bg-emerald-700 text-white rounded-2xl shadow-sm p-4">
          <h3 className="font-bold">🎉 পূর্ণ combo পাওয়া গেছে!</h3>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {best.segs.map((s, k) => (
              <div key={k} className="bg-white/15 rounded-xl px-3 py-2 text-center">
                <div className="text-[13px] font-semibold">{stops[s.a]} → {stops[s.b]}</div>
                <a href={buyLink(stops[s.a], stops[s.b], date, cls)} target="_blank" rel="noreferrer" className="text-[11px] underline font-bold">এই টিকিটটা কিনুন →</a>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-2 opacity-90">মোট {best.tickets}টা টিকিট। টিপ: যে segment এ seat সবচেয়ে কম দেখেছো, সেটা আগে কাটো।</p>
        </section>
      )}

      {planned && (
        <section className="bg-white rounded-2xl shadow-sm border p-4">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="font-bold text-sm">✅ Check List — {from} → {to}</h3>
            <span className="text-xs text-slate-500">{checkedCount}/{checklist.length}টা check হয়েছে • ✅ {Object.values(status).filter((v) => v === "yes").length}টা তে seat আছে</span>
          </div>
          {PHASES.map(([phase, title]) => {
            const items = checklist.filter((x) => x.phase === phase);
            if (!items.length) return null;
            return (
              <div key={phase} className="mt-3">
                <div className="text-xs font-bold text-slate-500">{title}</div>
                <div className="space-y-1.5 mt-1.5">
                  {items.map(({ a, b }) => {
                    const k = a + "," + b, st = status[k];
                    return (
                      <div key={k} className={`flex flex-wrap items-center gap-2 border rounded-xl px-3 py-2 text-sm ${st === "yes" ? "border-emerald-300 bg-emerald-50" : st === "no" ? "border-red-200 bg-red-50 opacity-70" : ""}`}>
                        <span className="font-medium">{stops[a]} → {stops[b]}</span>
                        <a href={buyLink(stops[a], stops[b], date, cls)} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 underline font-semibold">e-ticket এ দেখো →</a>
                        <span className="ml-auto flex items-center gap-1">
                          <button onClick={() => setSeg(k, "yes")} className={`px-2 py-1 rounded-lg text-xs font-bold ${st === "yes" ? "bg-emerald-600 text-white" : "border"}`}>✅ আছে</button>
                          <button onClick={() => setSeg(k, "no")} className={`px-2 py-1 rounded-lg text-xs font-bold ${st === "no" ? "bg-red-500 text-white" : "border"}`}>❌ নেই</button>
                          {st === "yes" && <input type="number" min="1" placeholder="কয়টা?" value={seats[k] || ""} onChange={(e) => setSeats((s) => ({ ...s, [k]: e.target.value }))} className="w-16 border rounded-lg px-1.5 py-1 text-xs" />}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!best && <p className="text-xs text-slate-500 mt-3">উপর থেকে একে একে check করো — পূর্ণ combo মিললেই উপরে সবুজ card এ কেনার লিংকসহ দেখা যাবে।</p>}
        </section>
      )}
      <style>{`.lbl{display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px}`}</style>
    </div>
  );
}

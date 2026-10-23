// Seed route (stop sequence) data. Stop lists can be edited in the app —
// always verify against the e-ticket site, which is the source of truth.
// Users can save their own routes (any train) — those live in localStorage.
export const SEED_ROUTES = [
  {
    train: "TITUMIR EXPRESS (734)",
    number: "734",
    note: "Seed route — e-ticket এ মিলিয়ে নাও, ভুল থাকলে Edit করো।",
    stops: ["Chilahati", "Domar", "Nilphamari", "Saidpur", "Parbatipur", "Fulbari", "Birampur", "Hili", "Panchbibi", "Joypurhat", "Akkelpur", "Ahsanganj", "Madhnagar", "Natore", "Abdulpur", "Rajshahi"],
  },
  {
    train: "SUBARNA EXPRESS (701)",
    number: "701",
    note: "Seed route — e-ticket এ মিলিয়ে নাও, ভুল থাকলে Edit করো।",
    stops: ["Dhaka", "Dhaka Airport", "Chattogram"],
  },
];

const KEY = "stw-custom-routes-v1";
export function loadCustomRoutes() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveCustomRoute(route) {
  const all = loadCustomRoutes().filter((r) => r.train !== route.train);
  all.push(route);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
  return all;
}
export function allRoutes() {
  const custom = loadCustomRoutes();
  const seed = SEED_ROUTES.filter((s) => !custom.some((c) => c.train === s.train));
  return [...custom, ...seed];
}

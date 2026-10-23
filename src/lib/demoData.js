// DEMO DATA — Phase 1 only. Not real seat availability.
// Route order is illustrative (Titumir Express, Chilahati → Rajshahi).
// Phase 2 will replace seatFor() with live data from the extension bridge.
export const TRAIN = { name: "Titumir Express", number: "734" };
export const STATIONS = [
  "Chilahati", "Domar", "Nilphamari", "Saidpur", "Parbatipur", "Fulbari",
  "Birampur", "Hili", "Panchbibi", "Joypurhat", "Akkelpur", "Ahsanganj",
  "Madhnagar", "Natore", "Abdulpur", "Rajshahi",
];

const CLASS_FACTOR = {
  S_CHAIR: 1, SHOVAN: 0.8, SHULOV: 0.65, SNIGDHA: 1.9, F_SEAT: 1.7,
  F_CHAIR: 1.8, F_BERTH: 2.4, AC_S: 2.8, AC_CHAIR: 2.6, AC_B: 3.6,
};
const HOP_FARE = 55; // demo taka per hop for S_CHAIR

// Hand-crafted overrides so the default trip (Birampur → Rajshahi)
// shows the classic split case: direct = 0, splits available.
const OVERRIDE = {
  "6,15": 0,   // Birampur → Rajshahi (direct, sold out)
  "6,13": 12,  // Birampur → Natore
  "13,15": 7,  // Natore → Rajshahi
  "6,14": 3,   // Birampur → Abdulpur
  "14,15": 18, // Abdulpur → Rajshahi
  "6,12": 0,   // Birampur → Madhnagar
  "12,15": 5,  // Madhnagar → Rajshahi
  "5,13": 9,   // Fulbari → Natore (starts before Birampur)
  "5,15": 0,
  "6,11": 14,  // Birampur → Ahsanganj
  "11,14": 6,  // Ahsanganj → Abdulpur
};

export function seatFor(i, j, cls) {
  if (j <= i) return null;
  const key = i + "," + j;
  let online;
  if (key in OVERRIDE) online = OVERRIDE[key];
  else if (j - i >= 8) online = 0; // long direct tickets sold out in demo scenario
  else {
    const v = (i * 31 + j * 17 + (j - i) * 7) % 11;
    online = v < 4 ? 0 : v < 7 ? v : v * 2;
  }
  // class tweak: premium classes are scarcer in demo
  if (cls === "SNIGDHA" || cls === "AC_S" || cls === "AC_B") online = Math.floor(online / 2);
  const fare = Math.round(((j - i) * HOP_FARE * (CLASS_FACTOR[cls] || 1)) / 5) * 5;
  const offline = (i * 13 + j * 7) % 6;
  return { online, offline, fare };
}

export function allCounts(cls) {
  const counts = {};
  for (let i = 0; i < STATIONS.length - 1; i++)
    for (let j = i + 1; j < STATIONS.length; j++)
      counts[i + "," + j] = seatFor(i, j, cls);
  return counts;
}

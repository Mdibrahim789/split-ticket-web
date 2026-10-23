// Bridge client — talks to the Train Split Finder extension (v0.4+)
// through window.postMessage. The extension's webbridge.js content script
// relays to the background, which runs the live scan with the user's own
// e-ticket session. This page never receives the token — only seat counts.
const PAGE = "STW_PAGE", BRIDGE = "STW_BRIDGE";
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function pingBridge(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const id = uid();
    const timer = setTimeout(() => { window.removeEventListener("message", h); resolve(null); }, timeoutMs);
    function h(e) {
      if (e.source !== window || !e.data || e.data.source !== BRIDGE) return;
      if (e.data.kind === "hello") { /* extension present, pong will follow after our ping */ }
      if (e.data.id !== id || e.data.kind !== "pong") return;
      clearTimeout(timer);
      window.removeEventListener("message", h);
      resolve({ installed: !!e.data.installed, hasAuth: !!e.data.hasAuth, authAgeSec: e.data.authAgeSec });
    }
    window.addEventListener("message", h);
    window.postMessage({ source: PAGE, id, kind: "ping" }, "*");
  });
}

// params: { stations, from, to, date, cls, train }
// onProgress({done,total,counts}) streams partial counts.
// Resolves { counts, train, warning } or rejects Error with .code
// (NO_AUTH / AUTH / NO_TRAIN / TIMEOUT / ERROR).
export function scanLive(params, onProgress) {
  return new Promise((resolve, reject) => {
    const id = uid();
    const timer = setTimeout(() => {
      window.removeEventListener("message", h);
      reject(Object.assign(new Error("Live scan timed out (15 min). The railway API may be slow — try again."), { code: "TIMEOUT" }));
    }, 15 * 60 * 1000);
    function h(e) {
      if (e.source !== window || !e.data || e.data.source !== BRIDGE || e.data.id !== id) return;
      if (e.data.kind === "progress") { if (onProgress) onProgress(e.data); return; }
      clearTimeout(timer);
      window.removeEventListener("message", h);
      if (e.data.kind === "result") resolve({ counts: e.data.counts, train: e.data.train, warning: e.data.warning || "" });
      else reject(Object.assign(new Error(e.data.error || "Live scan failed"), { code: e.data.code || "ERROR" }));
    }
    window.addEventListener("message", h);
    window.postMessage({ source: PAGE, id, kind: "scan", params }, "*");
  });
}

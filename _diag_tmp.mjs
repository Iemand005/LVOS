import puppeteer from "puppeteer-core";
import http from "http";
import fs from "fs";
import path from "path";
const ROOT = "J:\\LVOS";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = http.createServer((req, res) => { let url = decodeURIComponent(req.url.split("?")[0]); if (url.endsWith("/")) url += "index.html"; try { const d = fs.readFileSync(path.join(ROOT, url)); res.writeHead(200, { "Content-Type": MIME[path.extname(url)] || "application/octet-stream" }); res.end(d); } catch (e) { res.writeHead(404); res.end("nf"); } });
await new Promise(r => server.listen(8321, r));
const browser = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: "new", args: ["--no-sandbox", "--window-size=1280,800"] });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:8321/index.html", { waitUntil: "networkidle2", timeout: 40000 });
const result = await page.evaluate(async () => {
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const wm = window.windowManager;
  await pause(1500);
  const out = { hasWM: !!wm, wmKeys: wm ? Object.keys(wm).slice(0, 40) : [] };
  if (wm && wm._windows) {
    const entries = Object.entries(wm._windows);
    out.numWindows = entries.length;
    out.sample = entries.slice(0, 8).map(([k, d]) => ({
      id: k,
      isOpen: d && (d.isOpen ?? d._stateOpen),
      hasTarget: !!(d && d.target),
      targetConn: d && d.target ? d.target.isConnected : null,
      targetClass: d && d.target ? d.target.className : null,
      ownKeys: d ? Object.keys(d).slice(0, 25) : []
    }));
  }
  out.domWindows = Array.from(document.querySelectorAll(".window")).map(w => ({ id: w.id, cls: w.className, size: (() => { try { const r = w.getBoundingClientRect(); return Math.round(r.width) + "x" + Math.round(r.height); } catch (e) { return "err"; } })() }));
  out.launchpad = typeof window.launchpad !== "undefined" ? Object.keys(window.launchpad) : "n/a";
  out.hasLaunch = wm ? typeof wm.launch : "n/a";
  return out;
});
console.log(JSON.stringify(result, null, 2));
await browser.close(); server.close(); process.exit(0);

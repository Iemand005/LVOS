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
const errors = [];
page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
await page.goto("http://127.0.0.1:8321/index.html", { waitUntil: "networkidle2", timeout: 40000 });

const result = await page.evaluate(async () => {
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const wm = window.windowManager;
  await pause(800);
  const out = { hasWM: !!wm };

  const dialogs = Object.values(wm._windows || {});
  // prefer a dialog whose target element exists in the DOM (so getRect works)
  let d = dialogs.find(x => x && x.target && x.target.isConnected && typeof x.move === "function");
  if (!d) d = dialogs.find(x => x && x.target && typeof x.move === "function");
  if (!d) d = dialogs.find(x => x && typeof x.move === "function");
  if (!d) { out.error = "no dialog"; return out; }
  out.dialogId = d.id;
  out.hasTarget = !!d.target;
  out.targetIsConnected = !!(d.target && d.target.isConnected);
  try { const r = d.getRect && d.getRect(); out.getRectVal = r ? (r.width + "x" + r.height) : "null"; } catch (e) { out.getRectVal = "err:" + e.message; }
  d.move(300, 200);
  const origW = d.width, origH = d.height;
  out.dialogId = d.id;
  out.afterReset = { x: d.x, y: d.y, w: d.width, h: d.height };

  // ---- MOVE DRAG ----
  wm.activeDialog = d;
  d.setClickOffset(350, 210);
  wm.enableDialogDrag();
  wm.dragAction.set(0);
  out.moveClickOffset = d.clickOffset && { sx: d.clickOffset.startX, sy: d.clickOffset.startY, clickX: d.clickOffset.clickX, w: d.clickOffset.width, h: d.clickOffset.height };
  wm.handleWindowDrag(450, 270); // +100,+60
  out.afterMove = { x: d.x, y: d.y, dragAction: wm.dragAction.execute.name, clickOffset: d.clickOffset && { sx: d.clickOffset.startX, sy: d.clickOffset.startY } };
  out.moveApplied = !(out.afterMove.x === out.afterReset.x && out.afterMove.y === out.afterReset.y);
  wm.disableDialogDrag();
  out.afterMoveRelease = { dragAction: wm.dragAction.execute.name, isDragging: wm.isDragging };

  // ---- RESIZE bottomRight (7) ----
  d.move(300, 200); // reset
  d.setWidth(400); d.setHeight(300);
  out.beforeResize = { x: d.x, y: d.y, w: d.width, h: d.height };
  wm.activeDialog = d;
  d.setClickOffset(700, 500); // press at bottom-right corner of 400x300 at (300,200)
  wm.enableDialogDrag();
  wm.dragAction.set(7); // bottomRight
  out.resizeClickOffset = d.clickOffset && { sx: d.clickOffset.startX, sy: d.clickOffset.startY, clickX: d.clickOffset.clickX, clickY: d.clickOffset.clickY, w: d.clickOffset.width, h: d.clickOffset.height };
  wm.handleWindowDrag(730, 530); // +30,+30 on both axes
  out.afterResize = { w: d.width, h: d.height, dragAction: wm.dragAction.execute.name };
  out.resizeApplied = d.width !== out.beforeResize.w || d.height !== out.beforeResize.h;
  wm.disableDialogDrag();
  out.afterResizeRelease = { dragAction: wm.dragAction.execute.name, executeIsMove: wm.dragAction.execute === wm.dragAction.resizeFunctions[0], isDragging: wm.isDragging };

  // ---- check set() with no args ----
  wm.dragAction.set();
  out.setNoArg = { executeIsMove: wm.dragAction.execute === wm.dragAction.resizeFunctions[0], name: wm.dragAction.execute.name };

  return out;
});

console.log("=== RESULT ===");
console.log(JSON.stringify(result, null, 2));
console.log("=== PAGE ERRORS ===");
console.log(errors.join("\n"));
await browser.close(); server.close(); process.exit(0);

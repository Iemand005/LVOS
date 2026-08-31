import puppeteer from "puppeteer-core";
import http from "http";
import fs from "fs";
import path from "path";

const ROOT = "J:\\LVOS";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split("?")[0]);
  if (url.endsWith("/")) url += "index.html";
  try { const d = fs.readFileSync(path.join(ROOT, url)); res.writeHead(200, { "Content-Type": MIME[path.extname(url)] || "application/octet-stream" }); res.end(d); }
  catch (e) { res.writeHead(404); res.end("nf"); }
});
await new Promise(r => server.listen(8321, r));

const browser = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: "new", args: ["--no-sandbox", "--window-size=1280,800"] });
const page = await browser.newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
await page.goto("http://127.0.0.1:8321/index.html", { waitUntil: "networkidle2", timeout: 40000 });

const result = await page.evaluate(async () => {
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const wm = window.windowManager;
  let out = { hasWM: !!wm };
  const usePointer = typeof PointerEvent !== "undefined";
  out.usePointer = usePointer;

  const pEv = (el, type, x, y, buttons) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons, pointerId: 1, isPrimary: true }));
  const mEv = (el, type, x, y, buttons) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, buttons, button: 0 }));

  // OPEN dialogs so windows get sized in the DOM
  const dialogs = wm && wm._windows ? Object.values(wm._windows) : [];
  out.totalDialogs = dialogs.length;
  for (const d of dialogs) { try { if (d && typeof d.open === "function" && !(d.isOpen || d._stateOpen)) d.open(); } catch (e) {} }

  // find any .window with real geometry by polling and pressing until one activates
  let ad = null, liveWin = null;
  for (let i = 0; i < 80; i++) {
    if (!liveWin) {
      const ws = Array.from(document.querySelectorAll(".window"));
      for (const w of ws) {
        let r = null; try { r = w.getBoundingClientRect(); } catch (e) {}
        if (r && r.width > 40 && r.height > 40) { liveWin = w; break; }
      }
    }
    if (liveWin) {
      let r = liveWin.getBoundingClientRect();
      const tx = r.left + r.width / 2, ty = r.top + 10;
      if (usePointer) pEv(liveWin, "pointerdown", tx, ty, 1); else mEv(liveWin, "mousedown", tx, ty, 1);
      await pause(30);
      ad = wm.activeDialog;
      if (ad) break;
    }
    await pause(300);
  }
  if (!ad || !liveWin) {
    out.error = "no interactive window";
    out.domWindows = document.querySelectorAll(".window").length;
    const sizes = Array.from(document.querySelectorAll(".window")).map(w => { try { const r = w.getBoundingClientRect(); return w.id + ":" + Math.round(r.width) + "x" + Math.round(r.height); } catch (e) { return w.id + ":err"; } });
    out.windowSizes = sizes;
    return out;
  }
  out.numDomWindows = document.querySelectorAll(".window").length;

  let r = liveWin.getBoundingClientRect();
  const tx = r.left + r.width / 2, ty = r.top + 10;
  out.winId = liveWin.id;
  out.startRect = { l: r.left, t: r.top, w: r.width, h: r.height };
  out.pressDragAction = wm.dragAction.execute.name;
  out.pressIsDragging = wm.isDragging;

  // MOVE (drag right+down)
  for (let n = 1; n <= 8; n++) {
    if (usePointer) document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, cancelable: true, clientX: tx + n * 25, clientY: ty + n * 10, button: 0, buttons: 1, pointerId: 1, isPrimary: true }));
    else document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, cancelable: true, clientX: tx + n * 25, clientY: ty + n * 10, buttons: 1 }));
    await pause(30);
  }
  r = liveWin.getBoundingClientRect();
  out.afterMoveRect = { l: r.left, t: r.top, w: r.width, h: r.height };
  out.afterMoveModel = { x: ad.x, y: ad.y, dragAction: wm.dragAction.execute.name };

  // release
  if (usePointer) document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, clientX: tx + 200, clientY: ty + 80, button: 0, buttons: 0, pointerId: 1, isPrimary: true }));
  else document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, buttons: 0 }));
  await pause(80);
  out.afterRelease = { isDragging: wm.isDragging, dragAction: wm.dragAction.execute.name };

  // RESIZE via sizer-8 (bottom-right)
  const sizer = liveWin.querySelector(".sizer-8");
  if (!sizer) { out.sizerFound = false; return out; }
  out.sizerFound = true;
  const sr = sizer.getBoundingClientRect();
  const w0 = ad.width, h0 = ad.height;
  if (usePointer) pEv(sizer, "pointerdown", sr.left + sr.width / 2, sr.top + sr.height / 2, 1); else mEv(sizer, "mousedown", sr.left, sr.top, 1);
  await pause(40);
  out.resizePressDragAction = wm.dragAction.execute.name;
  for (let n = 1; n <= 8; n++) {
    if (usePointer) document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, cancelable: true, clientX: sr.left + n * 15, clientY: sr.top + n * 15, button: 0, buttons: 1, pointerId: 1, isPrimary: true }));
    else document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, cancelable: true, clientX: sr.left + n * 15, clientY: sr.top + n * 15, buttons: 1 }));
    await pause(30);
  }
  out.resizeAfterDrag = { w: ad.width, h: ad.height, w0, h0, dragAction: wm.dragAction.execute.name };
  if (usePointer) document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, clientX: sr.left + 100, clientY: sr.top + 100, button: 0, buttons: 0, pointerId: 1, isPrimary: true }));
  else document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, buttons: 0 }));
  await pause(80);
  out.resizeAfterRelease = { w: ad.width, h: ad.height, dragAction: wm.dragAction.execute.name, isDragging: wm.isDragging };

  return out;
});

console.log("=== RESULT ===");
console.log(JSON.stringify(result, null, 2));
console.log("=== CONSOLE ERRORS ===");
console.log(errors.join("\n"));
await browser.close();
server.close();
process.exit(0);

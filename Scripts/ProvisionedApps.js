/* Application handler for the Window Manager
  // Copyright Lasse Lauwerys 2023-2024
  / Last modified: 8/1/2024 - added back velocity demo, code cleanup and bug fix.
*/

"use strict";

var dockAppList = document.getElementById("dockapplist");

/**
 * Compact factory for the provisioned app tables below.
 * @param {string} title
 * @param {string} id
 * @param {string} src
 * @param {Partial<Application>} [extra]
 * @returns {Application}
 */
function provisionedApp(title, id, src, extra) {
	return Object.assign({ title: title, id: id, src: src }, extra);
}

/** @type {Application[]} */
var applications = [
	provisionedApp("Settings App", "settings", "./Applications/Settings/settings.html"),
	provisionedApp("Frosted Colors", "colors", "Applications/FrostedColours/index.html", { distSrc: "https://iemand005.github.io/FrostedColours", wallpaper: true }),
	provisionedApp("Calculator", "calculator", "./Applications/Calculator/calculator.html", { minWidth: 180, minHeight: 240 }),
	provisionedApp("Color Tool", "colortool", "./Applications/ColorTool/colors.html", { minWidth: 180, minHeight: 240 }),
	provisionedApp("Example", "0", "./example.html"),
	provisionedApp("Camera", "camera", "./Applications/Camera/index.html", { camera: true, microphone: true }),
	provisionedApp("Video", "video", "./Applications/Video/index.html", { hidden: true }),
	provisionedApp("Cover Flow", "coverflow", "./Applications/Coverflow/Coverflow.html"),
	provisionedApp("Music", "music", "./Applications/Music/index.html"),
	provisionedApp("Citates", "citates", "./Applications/Citaten/index.html", { hidden: true }),
	provisionedApp("Clock", "clock", "./Applications/Clock/index.html", { hidden: true }),
	provisionedApp("Verlet", "verlet", "./Applications/Verlet/index.html", { hidden: true }),
	provisionedApp("Recorder", "recorder", "./Applications/Recorder/index.html", { hidden: true }),
	provisionedApp("Error", "error", "./Applications/Error/error.html", { hidden: true }),
	provisionedApp("Cube", "cube", "./Applications/Cube/cube.html", { hidden: true }),
	provisionedApp("Geode", "geode", "https://geode.tepartive.net", { hidden: true }),
	provisionedApp("Level", "level", "./Applications/Level/level.html", { hidden: true }),
	provisionedApp("Browser", "browser", "./Applications/Browser/index.html"),
	provisionedApp("MPTool", "mptool", "./Applications/MPTool/index.html", { hidden: true }),
	provisionedApp("Autostereograms", "stereograms", "./Applications/StereogramMaker/index.html", { hidden: true }),
	provisionedApp("Metronome", "cyanide.metronome", "./Applications/Cyanide/metronome/index.html", { hidden: true }),
	provisionedApp("Rainboy", "cyanide.rainboy", "./Applications/Cyanide/rainboy/index.html", { hidden: true }),
	provisionedApp("OPC", "opc", "https://bypass-online.netlify.app/", { iconUrl: "https://iemand005.github.io/OPC/files/apps/me.flexan.terminal/terminal.png", accentColor: "rgb(37, 104, 245)" }),
	provisionedApp("daedalOS", "daedal", "https://dustinbrett.com/"),
	provisionedApp("Fenix Engine Demo", "fenix.web", "https://iemand005.github.io/FenixWeb/"),
	provisionedApp("FoxCraft", "fenix.foxcraft", "https://iemand005.github.io/FenixWeb/FoxCraft/index.html"),
	provisionedApp("Cake", "fenix.cake", "https://iemand005.github.io/FenixWeb/Cake/index.html", { audioVisualizer: true }),
	provisionedApp("My Web Archive", "foxyz.archive", "https://iemand005.github.io/Archive-2023/index.html"),
	provisionedApp("Tappy", "foxyz.tappy", "./Applications/Tappy/tappy.html", { hidden: true }),
	provisionedApp("AIOne", "foxyz.aione", "./Applications/AIOneWeb/index.html", { hidden: true }),
	provisionedApp("WebGPUFluidSim", "foxyz.webgpufluidsim", "./Applications/WebGPUFluidSim/index.html", { moveEvents: true }),
	provisionedApp("Fur:Trash", "foxyz.fur:trash", "https://open.spotify.com/embed/artist/1jp7cmyHDn5nuP3MMSwm1m?utm_source=generator&si=86b6cf864e0048c3", { iconUrl: "https://image-cdn-fa.spotifycdn.com/image/ab6761610000f1788c05c5ac8638f68f84053a57" }),
	provisionedApp("Cavetown", "foxyz.cavetown", "https://open.spotify.com/embed/artist/2hR4h1Cao2ueuI7Cx9c7V8?utm_source=generator&theme=0&si=714602d32e764d47", { iconUrl: "https://image-cdn-fa.spotifycdn.com/image/ab6761610000f17845ec07bbcf1fed2a4747e780" }),
	provisionedApp("Awolnation", "foxyz.awolnation", "https://open.spotify.com/embed/artist/4njdEjTnLfcGImKZu1iSrz", { iconUrl: "https://image-cdn-fa.spotifycdn.com/image/ab6761610000f17845ec07bbcf1fed2a4747e780" }),
	provisionedApp("Papa Roach", "foxyz.papa-roach", "https://open.spotify.com/embed/artist/4RddZ3iHvSpGV4dvATac9X", { iconUrl: "https://image-cdn-fa.spotifycdn.com/image/ab6761610000f17845ec07bbcf1fed2a4747e780" }),
	provisionedApp("Monaco", "monaco", "./Applications/Monaco/monaco.html", { iconUrl: "https://code.visualstudio.com/favicon.ico" }),
	provisionedApp("Furzona Lite", "furzona", "https://iemand005.github.io/FurzonaWeb", { iconUrl: "https://iemand005.github.io/FurzonaWeb/Logo.png" }),
	provisionedApp("The Useless Web", "theuselessweb", "https://theuselessweb.com/"),
	provisionedApp("Windows 95", "win95", "https://98.js.org/"),
	provisionedApp("Pinball Space Cadet", "pinball", "https://98.js.org/programs/pinball/space-cadet.html", { iconUrl: "https://98.js.org/images/icons/pinball-16x16.png" }),
	provisionedApp("Internet Exporer", "ie", "https://98.js.org/programs/explorer/index.html?address=https%3A%2F%2Fwww.google.com", { iconUrl: "https://98.js.org/images/icons/html-16x16.png" }),
	provisionedApp("Solitaire", "solitaire", "https://98.js.org/programs/js-solitaire/index.html", { iconUrl: "https://98.js.org/images/icons/solitaire-16x16.png" }),
	provisionedApp("Pipes", "pipes", "https://98.js.org/programs/pipes/index.html#%7B%22hideUI%22%3Atrue%7D", { iconUrl: "https://98.js.org/images/icons/solitaire-16x16.png", screensaver: true }),
	provisionedApp("Cavetown - Big Strong Man", "cavetown.bigstrongmen", "https://www.youtube.com/embed/uKn0BtAAEyw?si=s3Pz0PzIpQDCxizU"),
	provisionedApp("Gamepad Input Recorder", "inputrecorder", "https://iemand005.github.io/GamepadRecorder/"),
	provisionedApp("LVOS Mobile", "mobile", "./mobile.html", { distSrc: "https://iemand005.github.io/LVOS/mobile.html" }),
	provisionedApp("LVOS", "lvos", "index.html", { distSrc: "https://iemand005.github.io/LVOS/", altUrls: ["https://iemand005.github.io/LVOS-dist/", "https://vulpos.pages.dev/", "https://localhost:5000/index.html", "https://localhost:5001/index.html", "https://lvos.neocities.org"] }),
	provisionedApp("Speak", "speak", "Applications/Speak/speak.html"),
	provisionedApp("Tepartive.NET", "tepartive", "https://tepartive.net/"),
	provisionedApp("ColourTool", "color-tool", "Applications/ColorTool/colors.html")
];

/** @type {Application[]} */
var games = [
	provisionedApp("Conway", "conway", "./Games/Conway/index.html", { classes: ["rounded-corners"] }),
	provisionedApp("Velocities", "velocities", "./Applications/Velocities/index.html", { moveEvents: true }),
	provisionedApp("Minesweeper", "minesweeper", "./Games/Minesweeper/index.html", { resizable: false, scroll: false }),
	provisionedApp("Chess", "chess", "./Games/Chess/index.html", { hidden: true }),
	provisionedApp("Tetris", "tetris", "./Games/Tetris/tetris.html", { hidden: true }),
	provisionedApp("Sudoku", "sudoku", "./Games/Sudoku/sudoku.html", { hidden: true }),
	provisionedApp("Clicker", "clicker", "./Games/ChoccyClicker/clicker.html", { hidden: true }),
	provisionedApp("FAT", "mountain", "https://iemand005.github.io/MountainWeb/"),
	provisionedApp("Planet Life", "planetlife", "https://www.planetlife.space/static/game/index.html"),
	provisionedApp("Horizon Background", "horizon-bg", "https://iemand005.github.io/HorizonBackground/", { wallpaper: true })
];

if (typeof windowManager !== "undefined") {
	Object.defineProperty(Window.prototype, "windows", {
		get: function () {
			return windowManager.windows;
		}
	});
}

/** @param {Dialog?} dialog */
function dockApp(dialog) {
	if (dockAppList && dialog) dockAppList.appendChild(dialog.createOpenButton());
}

function initApps() {
	if (typeof windowManager !== "undefined") {
		windowManager.injectApplications(applications);
		windowManager.injectApplications(games);
		windowManager.loadInstalledApps();
		windowManager.loadState();

		var windows = windowManager.windows;
		if (dockAppList) {
			if (windows.browser) dockApp(windows.browser);
			if (windows.console) dockApp(windows.console);
			if (windows.music) dockApp(windows.music);
		}
	}
	finishAppInstall();
}

/**
 * Finalize the app installation and refresh everything that depends on the app
 * 
 * 
 * 
 * 
 * 
 * registry. AppRegistry.js is loaded async, so the apps may not have made it
 * into the registry when the deferred scripts (Settings) first ran; calling
 * this once everything is in place repopulates dependents like the wallpaper
 * dropdown.
 */
function finishAppInstall() {
	if (typeof appManager !== "undefined") {
		appManager.addApps(applications, games);
		appManager.loadApps();
	}
	if (typeof restoreWallpaperSetting == "function") restoreWallpaperSetting();
}

finishAppInstall();

window.addEventListener("load", initApps, false);

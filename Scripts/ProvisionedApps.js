/* Application handler for the Window Manager
  // Copyright Lasse Lauwerys 2023-2024
  / Last modified: 8/1/2024 - added back velocity demo, code cleanup and bug fix.
*/

"use strict";

var dockAppList = document.getElementById("dockapplist");
// var windows = windowManager.windows;

// Working tests of my Window injection API.
/** @type {Application[]} */
var applications = [
	{
		title: "Calculator",
		id: "calculator",
		minWidth: 180,
		minHeight: 240,
		src: "./Applications/Calculator/calculator.html"
	},
	{ title: "Example", id: "0", src: "./example.html" },
	{
		title: "Camera",
		id: "camera",
		src: "./Applications/Camera/index.html",
		camera: true,
		microphone: true, // add attribute allow="camera; microphone" to iframe!
	},
	{
		title: "Video",
		id: "video",
		src: "./Applications/Video/index.html",
		hidden: true
	},
	{
		title: "Cover Flow",
		id: "coverflow",
		src: "./Applications/Coverflow/Coverflow.html",
	},
	{
		title: "Music",
		id: "music",
		src: "./Applications/Music/index.html"
	},
	{
		title: "Citates",
		id: "citates",
		src: "./Applications/Citaten/index.html",
		hidden: true // Hiding the incomplete apps. These are enabled once finished.
	},
	{
		title: "Clock",
		id: "clock",
		src: "./Applications/Clock/index.html",
		hidden: true
	},
	{
		title: "Verlet",
		id: "verlet",
		src: "./Applications/Verlet/index.html",
		hidden: true
	},
	{
		title: "Recorder",
		id: "recorder",
		src: "./Applications/Recorder/index.html",
		hidden: true
	},
	{
		title: "Error",
		id: "error",
		src: "./Applications/Error/error.html",
		hidden: true
	},
	{
		title: "Cube",
		id: "cube",
		src: "./Applications/Cube/cube.html",
		hidden: true
	},
	{
		title: "Geode",
		id: "geode",
		src: "https://geode.tepartive.net",
		hidden: true
	},
	{
		title: "Level",
		id: "level",
		src: "./Applications/Level/level.html",
		hidden: true
	},
	{
		title: "Browser",
		id: "browser",
		src: "./Applications/Browser/index.html"
	},
	{
		title: "MPTool",
		id: "mptool",
		src: "./Applications/MPTool/index.html",
		hidden: true
	},
	{
		title: "Autostereograms",
		id: "stereograms",
		src: "./Applications/StereogramMaker/index.html",
		hidden: true
	},
	{
		title: "Metronome",
		id: "cyanide.metronome",
		src: "./Applications/Cyanide/metronome/index.html",
		hidden: true
	},
	{
		title: "Rainboy",
		id: "cyanide.rainboy",
		src: "./Applications/Cyanide/rainboy/index.html",
		hidden: true
	},
	{
		title: "OPC",
		id: "opc",
		src: "https://bypass-online.netlify.app/",
		iconUrl: "https://iemand005.github.io/OPC/files/apps/me.flexan.terminal/terminal.png",
		accentColor: "rgb(37, 104, 245)"
	},
	{
		title: "daedalOS",
		id: "daedal",
		src: "https://dustinbrett.com/"
	},
	{
		title: "Fenix Engine Demo",
		id: "fenix.web",
		src: "https://iemand005.github.io/FenixWeb/"
	},
	{
		title: "FoxCraft",
		id: "fenix.foxcraft",
		src: "https://iemand005.github.io/FenixWeb/FoxCraft/index.html"
	},
	{
		title: "Cake",
		id: "fenix.cake",
		src: "https://iemand005.github.io/FenixWeb/Cake/index.html",
		audioVisualizer: true
	},
	{
		title: "My Web Archive",
		id: "foxyz.archive",
		src: "https://iemand005.github.io/Archive-2023/index.html"
	},
	{
		title: "Tappy",
		id: "foxyz.tappy",
		// src: "https://iemand005.github.io/Tappy/tappy.html", // TODO: perhaps uh a prod vs dev env for github url and local
		src: "./Applications/Tappy/tappy.html",
		hidden: true
	},
	{
		title: "AIOne",
		id: "foxyz.aione",
		src: "./Applications/AIOneWeb/index.html",
		hidden: true
	},
	{
		title: "WebGPUFluidSim",
		id: "foxyz.webgpufluidsim",
		src: "./Applications/WebGPUFluidSim/index.html",
		moveEvents: true
	},
	{
		title: "Fur:Trash",
		id: "foxyz.fur:trash",
		src: "https://open.spotify.com/embed/artist/1jp7cmyHDn5nuP3MMSwm1m?utm_source=generator&si=86b6cf864e0048c3",
		iconUrl: "https://image-cdn-fa.spotifycdn.com/image/ab6761610000f1788c05c5ac8638f68f84053a57",
		// appIcon?
	},
	{
		title: "Cavetown",
		id: "foxyz.cavetown",
		src: "https://open.spotify.com/embed/artist/2hR4h1Cao2ueuI7Cx9c7V8?utm_source=generator&theme=0&si=714602d32e764d47",
		iconUrl: "https://image-cdn-fa.spotifycdn.com/image/ab6761610000f17845ec07bbcf1fed2a4747e780"
	},
	{
		title: "Monaco",
		id: "foxyz.monaco",
		src: "./Applications/Monaco/monaco.html"
	},
	{
		title: "Furzona Lite",
		id: "furzona",
		src: "https://iemand005.github.io/FurzonaWeb",
		iconUrl: "https://iemand005.github.io/FurzonaWeb/Logo.png"
	},
	{
		title : "The Useless Web",
		id: "theuselessweb",
		src: "https://theuselessweb.com/"
	},
	{
		title: "Windows 95",
		id : "win95",
		src : "https://98.js.org/"
	},
	{
		title: "Pinball Space Cadet",
		id: "pinball",
		src: "https://98.js.org/programs/pinball/space-cadet.html",
		iconUrl : "https://98.js.org/images/icons/pinball-16x16.png"
	},
	{
		title: "Internet Exporer",
		id: "ie",
		src: "https://98.js.org/programs/explorer/index.html?address=https%3A%2F%2Fwww.google.com",
		iconUrl : "https://98.js.org/images/icons/html-16x16.png"
	},
	{
		title: "Solitaire",
		id: "solitaire",
		src: "https://98.js.org/programs/js-solitaire/index.html",
		iconUrl: "https://98.js.org/images/icons/solitaire-16x16.png"
	}
];

/** @type {Application[]} */
var games = [
  {
    title: "Conway",
    id: "conway",
    src: "./Games/Conway/index.html",
    classes: ["rounded-corners"]
  },
  {
    title: "Velocities",
    id: "velocities",
    src: "./Applications/Velocities/index.html",
    moveEvents: true // This flag enables attaching window movement statistic listener.
  },
  {
    title: "Minesweeper",
    id: "minesweeper",
    src: "./Games/Minesweeper/index.html",
    fixed: true,
    scroll: false
  },
  {
    title: "Chess",
    id: "chess",
    src: "./Games/Chess/index.html",
    hidden: true
  },
  {
    title: "Tetris",
    id: "tetris",
    src: "./Games/Tetris/tetris.html",
    hidden: true
  },
  {
    title: "Sudoku",
    id: "sudoku",
    src: "./Games/Sudoku/sudoku.html",
    hidden: true
  },
  {
    title: "Clicker",
    id: "clicker",
    src: "./Games/ChoccyClicker/clicker.html",
    hidden: true
  },
  {
	title: "FAT",
	id : "mountain",
	src : "https://iemand005.github.io/MountainWeb/"
  }
];

// function loadApps
var initApps = function () {
	var loadApps = true;
	if (loadApps) {

	windowManager.injectApplications(applications);
	windowManager.injectApplications(games);
	windowManager.loadInstalledApps();
	windowManager.loadState();
}

/** @param {Dialog} dialog */
function dockApp(dialog) {
	if (dockAppList) dockAppList.appendChild(dialog.createOpenButton());
}

Object.defineProperty(Window.prototype, "windows", {
	get: function () {
		return windowManager.windows;
	}
})

var windows = windowManager.windows;
if (dockAppList) {
	dockApp(windows.browser);
	dockApp(windows.console);
	dockApp(windows.browser);
	dockApp(windows.console);
	dockApp(windows.music);
}

//toggleReflections(true);
};

window.addEventListener("load", initApps, false);

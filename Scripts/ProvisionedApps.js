/* Application handler for the Window Manager
  // Copyright Lasse Lauwerys 2023-2024
  / Last modified: 8/1/2024 - added back velocity demo, code cleanup and bug fix.
*/

"use strict";
"use esnext";

try {

var dockAppList = document.getElementById("dockapplist");
// var windows = windowManager.windows;
if (windowManager && windowManager.windows.browser) {
  var browser = windowManager.windows.browser.target; //document.getElementById("browser");
  var browserform = windowManager.windows.browser.originalBody; //document.getElementById("browserform");

  if (browser && browserform instanceof HTMLElement) {
    var browserframe = browser.getElementsByTagName("iframe")[0];

    browserform.addEventListener("submit", function(event) {
      event.preventDefault();
      // if (!event.target && !(event instanceof HTMLFormControlsCollection)) return;
      /** @ignore */
      // @ts-ignore
      var url = event.target.address.value;
      var xhr = new XMLHttpRequest();
      try {
        console.log("The browser is navigating to '" + url + "'");
        if (!/^https?:\/\//i.test(url)) url = "https://" + url.trim(); // Sanitising the url.
        url = new URL(url);
        console.log("full url: ", url.href);
        // We can't extract the website info from our iframe for security reasons, my idea here is to first probe the website before feeding it to our independent iframe.
        //  xhr.open('HEAD', url.href, false);
        //  xhr.send();

        browserframe.src = url.href;
        // /*const*/var links = browserframe.document.getElementsByTagName("a");
        // for (/*let*/var link in links) if (links.hasOwnProperty(link)) links[link].target = "_self";
      } catch (e) {
        // if(e.code == )
        console.log(url, url.hostname);
        if (url.hostname.indexOf("youtube") != -1) {
          console.log("yoututbe!", url.pathname);
          if (url.pathname === "/watch") {
            console.log("wanna watch??");
            windowManager.windows["video"].openUrl(url.href);
          }
        }

        // if (!(e instanceof Error)) return console.log(e);
        if (!(e instanceof WebTransportError)) return console.log(e);

        console.error(e.code);
        url = new URL("./Applications/Error/error.html", window.location.href);
        url.searchParams.set("errormessage", e.message);
        url.searchParams.set("code", e.code);
        if (e.code === 19) {
          // Error handling for other potential problems can be done here!
          //url = new URL("./Applications/Error/error.html", window.location.href);
          url.searchParams.set(
            "message",
            "Some websites like the ones hosted by Google do not allow loading their website inside another website for security reasons."
          );
          //url.searchParams.set("code", e.code);
          //browserframe.src = "./Applications/Error/error.html?message=something went wrong!"
          browserframe.src = url;
          console.log(
            "Blocked by CORS! Websites like the ones from Google don't allow insertion in an iframe if not embedded!"
          );
        }
      }
    });
  }
}

} catch (ex) {
  console.warn("Browser loading failed", ex);
}

// alert

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
		src: "./Applications/GeodeWeb/login.html",
		hidden: true
	}
	,
	{
		title: "Level",
		id: "level",
		src: "./Applications/Level/level.html",
		hidden: true
	},
	{
		title: "Browser",
		id: "browser",
		src: "./Applications/Browser/index.html",
		hidden: true
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
		src: "https://bypass-online.netlify.app/"
	},
	{
		title: "daedalOS",
		id: "daedal",
		src: "https://dustinbrett.com/"
	}
]

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
  }
];

// function loadApps
var initApps = function () {
	var loadApps = true;
	if (loadApps) {

	injectApplications(applications);
  	injectApplications(games);
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

try {
  var windows = windowManager.windows;
  if (dockAppList) {
    dockApp(windows.browser);
    dockApp(windows.console);
    dockApp(windows.browser);
    dockApp(windows.console);
    dockApp(windows.music);
  }
} catch (ex) {
  if (ex instanceof Error) console.warn(ex.message);
}
//toggleReflections(true);
};

window.addEventListener("load", initApps, false);

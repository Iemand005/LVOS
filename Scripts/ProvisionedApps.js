   /* Application handler for the Window Manager
  // Copyright Lasse Lauwerys 2023-2024
  / Last modified: 8/1/2024 - added back velocity demo, code cleanup and bug fix.
*/

'use strict';
'use esnext';


var dockapplist = document.getElementById("dockapplist");

if (windows.browser) {
var browser = windows.browser.target;//document.getElementById("browser");
var browserform = windows.browser.originalBody;//document.getElementById("browserform");

if (browser && browserform) {
var browserframe = browser.getElementsByTagName("iframe")[0];

browserform.addEventListener("submit", function(event){
    event.preventDefault();
    // if (!event.target && !(event instanceof HTMLFormControlsCollection)) return;
    /** @ignore */
    // @ts-ignore
    var url = event.target.address.value;
    var xhr = new XMLHttpRequest();
    try{
        console.log("The browser is navigating to '" + url + "'");
        if(!/^https?:\/\//i.test(url)) url = "https://" + url.trim(); // Sanitising the url.
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
        console.log(url, url.hostname)
        if(url.hostname.indexOf("youtube")!=-1) {
            console.log("yoututbe!", url.pathname);
            if(url.pathname === "/watch"){
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
        if(e.code === 19) { // Error handling for other potential problems can be done here!
            //url = new URL("./Applications/Error/error.html", window.location.href);
            url.searchParams.set("message", "Some websites like the ones hosted by Google do not allow loading their website inside another website for security reasons.");
            //url.searchParams.set("code", e.code);
            //browserframe.src = "./Applications/Error/error.html?message=something went wrong!"
            browserframe.src = url;
            console.log("Blocked by CORS! Websites like the ones from Google don't allow insertion in an iframe if not embedded!")
        }
    }
});
}
}

// Demonstration of my Window API. This lets us inject windows into our desktop environment straight from JavaScript.
var demo = { // More parameters will be added over time when I need them, you will probably find them as I start using the API instead of hard coding the applications.
    title: "demo", // The window title! These don't have to be unique.
    id: "demo", // !! Unique identifier !! Necessary to save, restore and identify the window / dialog in HTML and JavaScript. Duplicates end up giving unexpected behaviour when dragging windows around (the first occurency of given ID is selected from HTML and all code from duplicates is forwarded to this). A way to prevent these problems is by providing a check to see if an ID exists and if so, add a number to the ID (ex: demo1, demo2, demo3).
    src: "./Applications/Velocities.html", // The path to the HTML file. Inline HTML can be added later but making that work with scripts is excessive work.
    moveEvents: true // This flag enables attaching window movement statistic listener.
}

// Working tests of my Window injection API.
/** @type {Application[]} */
var applications = [
    {
        title: "Calculator",
        id: "calculator",
        src: "./Applications/Calculator/index.html"
    },
    {
        title: "Exmple",
        id: "0",
        src: "./example.html"
    },
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
]

var loadApps = true;
if (loadApps) {
    injectApplications(applications);
    injectApplications(games);
}

/** @param {Application} app */
function dockApp(app) {
    dockapplist.appendChild(app.createOpenButton());
}

try {
    if (dockapplist) {
        dockapplist.appendChild(windowManager.windows.browser.createOpenButton());
        dockapplist.appendChild(windowManager.windows.console.createOpenButton());
        dockapplist.appendChild(windowManager.windows.browser.createOpenButton());
        dockapplist.appendChild(windowManager.windows.console.createOpenButton());
        dockapplist.appendChild(windowManager.windows.music.createOpenButton());
    }
} catch(ex) {
    if (ex instanceof Error)
        console.warn(ex.message);
}


toggleReflections(true);
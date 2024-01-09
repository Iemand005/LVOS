// Application handler for the Window Manager
// Copyright Lasse Lauwerys 2023-2024
// Last modified: 8/1/2024 - added back velocity demo, code cleanup and bug fix.

'use strict';

const browser = document.getElementById("browser");
const browserform = document.getElementById("browserform");
const browserframe = browser.getElementsByTagName("iframe")[0];
browserform.addEventListener("submit", function(event){
    event.preventDefault();
    let url = event.target.address.value;

    try{
        console.log("The browser is navigating to '" + url + "'");
        if(!/^https?:\/\//i.test(url)) url = "https://" + url.trim(); // Sanitising the url.
        url = new URL(url);
        var http = new XMLHttpRequest(); // We can't extract the website info from our iframe for security reasons, my idea here is to first probe the website before feeding it to our independent iframe.
        http.open('HEAD', url.href, false);
        http.send();

        browserframe.src = url.href;
        // const links = browserframe.document.getElementsByTagName("a");
        // for (let link in links) if (links.hasOwnProperty(link)) links[link].target = "_self";
    } catch (e) {
        //let ai = 
        console.log(url, url.hostname)
        if(url.hostname.indexOf("youtube")!=-1) {
            console.log("yoututbe!", url.pathname);
            if(url.pathname === "/watch"){
                console.log("wanna watch??");
                windows["video"].openUrl(url.href);
            }
        }

        console.error(e.code);
        url = new URL("./Applications/Error/error.html", window.location.href);
        url.searchParams.set("errormessage", e.message);
        url.searchParams.set("code", e.code);
        if(e.code === 19) { // Error handling for other potential problems can be done here!
            //url = new URL("./Applications/Error/error.html", window.location.href);
            // url.searchParams.set("message", "pkake");
            url.searchParams.set("message", "Some websites like the ones hosted by Google do not allow loading their website inside another website for security reasons.");
            //url.searchParams.set("code", e.code);
            //browserframe.src = "./Applications/Error/error.html?message=something went wrong!"
            browserframe.src = url;
            console.log("Blocked by CORS! Websites like the ones from Google don't allow insertion in an iframe if not embedded!")
        }
    }
});

function initializeConsoleApplication(){
    const consoleElement = document.getElementById("console");
    const article = consoleElement.querySelector("section");
    const consoleform = consoleElement.getElementsByTagName("form")[0];
    const stdout = consoleform.stdout || consoleform.getElementsByTagName("output")[0];
    const interceptConsole = function(){
        if(stdout.firstChild) stdout.removeChild(stdout.firstChild);
        stdout.appendChild(console.getHTML());
        article.scrollTop = article.scrollHeight;
    }

    consoleform.addEventListener("submit", function(event){
        event.preventDefault();
        try{
            console.results.push({type: -1, data: [event.target.input.value]});
            console.results.push({type: 0, data: [eval(event.target.input.value)]});
        }
        catch(exception){
            console.results.push({type: 2, data: [exception]});
        }
        interceptConsole();
        //consoleElement.scrollTo(consoleElement.scrollX, consoleElement.scrollHeight);
    });

    console.results = new Array();

    // We gaan hier de console calls opvangen door de functie te binden aan een nieuwe en de originele te vervangen met een aangepaste.
    console.standardLog = console.log.bind(console);
    console.logs = new Array();
    console.log = function(){
        console.standardLog.apply(console, arguments);
        console.results.push({type: 1, data: arguments});
        interceptConsole();
    }

    console.standardError = console.error.bind(console);
    console.errors = new Array();
    console.error = function(){
        console.standardError.apply(console, arguments);
        console.results.push({type: 2, data: arguments});
        interceptConsole();
    }

    console.getHTML = function(){
        let output = document.createElement("table");
        for (let index in console.results) {
            const result = console.results[index];
            const tableRow = document.createElement("tr");
            const tableData = document.createElement("td");
            for(let dataIndex in result.data){
                const data = result.data[dataIndex];
                const span = document.createElement("span");
                switch(result.type){
                    case -1:
                        span.style.color = "black";
                        span.innerText = data;
                        tableData.insertAdjacentText("beforeend", "← ");
                        tableData.insertAdjacentElement("beforeend", span);
                        break;
                    case 0:
                        span.style.color = "gray";
                        span.innerText = data;
                        tableData.insertAdjacentText("beforeend", "→ ");
                        tableData.insertAdjacentElement("beforeend", span);
                        break;
                    case 2:
                        span.style.color = "red";
                        span.innerText = data;
                        tableData.appendChild(span);
                        span.insertAdjacentText("afterbegin", "⚠ ");
                        break;
                    default:
                        tableData.innerText += data + "\t";
                        break;
                }
                tableRow.appendChild(tableData);
            }
            output.appendChild(tableRow);
        }
        return output;
    }

    
}

initializeConsoleApplication();

// Demonstration of my Window API. This lets us inject windows into our desktop environment straight from JavaScript.
const demo = { // More parameters will be added over time when I need them, you will probably find them as I start using the API instead of hard coding the applications.
    title: "demo", // The window title! These don't have to be unique.
    id: "demo", // !! Unique identifier !! Necessary to save, restore and identify the window / dialog in HTML and JavaScript. Duplicates end up giving unexpected behaviour when dragging windows around (the first occurency of given ID is selected from HTML and all code from duplicates is forwarded to this). A way to prevent these problems is by providing a check to see if an ID exists and if so, add a number to the ID (ex: demo1, demo2, demo3).
    src: "./Applications/Velocities.html", // The path to the HTML file. Inline HTML can be added later but making that work with scripts is excessive work.
    moveEvents: true // This flag enables attaching window movement statistic listener.
}

//windows[demo.id] = new Dialog(demo); Deprecated! Using an API now to wrap this action so it happens safely!

// Working tests of my Window injection API.
const applications = [
    {
        title: "Camera",
        id: "camera",
        src: "./Applications/Camera/index.html",
        camera: true,
        microphone: true,
        // add attribute allow="camera; microphone" to iframe!
    },
    {
        title: "Video",
        id: "video",
        src: "./Applications/Video/index.html",
    }
]

const games = [
    {
        title: "Minesweeper",
        id: "minesweeper",
        src: "./Games/Minesweeper/index.html",
        fixed: true,
        scroll: false
    },
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
    {}
]

injectApplications(applications);
injectApplications(games);
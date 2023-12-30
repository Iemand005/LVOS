'use strict';
const browser = document.getElementById("browser");
const browserform = document.getElementById("browserform");
const browserframe = browser.getElementsByTagName("iframe")[0];
browserform.addEventListener("submit", function(event){
    event.preventDefault();
    console.log("The browser is navigating to " + event.target.address.value);
    browserframe.src = event.target.address.value;
    const links = browserframe.document.getElementsByTagName("a");
    for (let link in links) if (links.hasOwnProperty(link)) links[link].target = "_self";
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

                //span.innerText = string;

                //output.insertAdjacentElement("beforeend", span)
                //output.appendChild(span);
                //output.appendChild(document.createElement("br"));
            }
            output.appendChild(tableRow);
        }
        return output;
    }

    
}
/// <summary>
/// yosumsum
/// </summary>

initializeConsoleApplication();

// Demonstration of my Window API. This lets us inject windows into our desktop environment straight from JavaScript.
const demo = {
    title: "demo",
    id: "demo",
    src: "./Applications/Velocities.html",
    moveEvents: true // This flag enables attaching window movement statistic listener.
}

windows[demo.id] = new Dialog(demo);



const bindConsole = true;


const ConsoleOutType = {
    Input: -1,
    Return: 0,
    Log: 1,
    Warn: 2,
    Error: 3,
}

function initializeConsoleApplication(){
    if(!windows["console"]) return;
    const consoleform = windows["console"].originalBody;//consoleElement.getElementsByTagName("form")[0];
    const stdout = consoleform.stdout || consoleform.getElementsByTagName("output")[0];
    const interceptConsole = function(){
        if(stdout.firstChild) stdout.removeChild(stdout.firstChild);
        stdout.appendChild(console.getHTML());
        consoleform.scrollTop = consoleform.scrollHeight;
    }

    consoleform.addEventListener("submit", function(event){
        event.preventDefault();
        try{
            console.results.push({type: ConsoleOutType.Input, data: [event.target.input.value]});
            console.results.push({type: ConsoleOutType.Log, data: [eval(event.target.input.value)]});
        }
        catch(exception){
            console.results.push({type: ConsoleOutType.Error, data: [exception]});
        }
        interceptConsole();
    });

    console.results = new Array();

    // We gaan hier de console calls opvangen door de functie te binden aan een nieuwe en de originele te vervangen met een aangepaste.
    if (bindConsole) {
      console.standardLog = console.log.bind(console);
      console.logs = new Array();
      console.log = function(){
          console.standardLog.apply(console, arguments); // Here we call the original log so everything is visible in the browser console too. Only the line number is different.
          console.results.push({type: ConsoleOutType.Log, data: arguments});
          interceptConsole();
      }

      console.standardWarning = console.error.bind(console);
      console.warnings = new Array();
      console.warn = function(){
          console.standardWarning.apply(console, arguments);
          console.results.push({type: ConsoleOutType.Warn, data: arguments});
          interceptConsole();
      }

      console.standardError = console.error.bind(console);
      console.errors = new Array();
      console.error = function(){
          console.standardError.apply(console, arguments);
          console.results.push({type: ConsoleOutType.Error, data: arguments});
          interceptConsole();
      }
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
                    case ConsoleOutType.Input:
                        span.style.color = "black";
                        span.innerText = data;
                        tableData.insertAdjacentText("beforeend", "← ");
                        tableData.insertAdjacentElement("beforeend", span);
                        break;
                    case ConsoleOutType.Return:
                        span.style.color = "gray";
                        span.innerText = data;
                        tableData.insertAdjacentText("beforeend", "→ ");
                        tableData.insertAdjacentElement("beforeend", span);
                        break;
                    case ConsoleOutType.Warn:
                        span.style.color = "yellow";
                        span.innerText = data;
                        tableData.appendChild(span);
                        span.insertAdjacentText("afterbegin", "⚠ ");
                        break;  
                    case ConsoleOutType.Error:
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
if(bindConsole) initializeConsoleApplication();
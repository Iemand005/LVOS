
var bindConsole = true;

/** @typedef {"input" | "return" | "log" | "warn" | "error"} ConsoleOutputType */
/**
 * @typedef ConsoleOutput
 * @prop {ConsoleOutputType} type
 * @prop {string} data
 */

var ConsoleOutType = {
	Input: -1,
	Return: 0,
	Log: 1,
	Warn: 2,
	Error: 3
};

function ConsoleInterceptor() {
	/** @type {ConsoleOutput[]} */
	this.results = [];
	/** @type {HTMLElement?} */
	this.stdout = null;
}

ConsoleInterceptor.prototype.intercept = function() {
	if (stdout.firstChild) stdout.removeChild(stdout.firstChild);
    stdout.appendChild(console.getHTML());
    stdout.scrollTop = stdout.scrollHeight;
};

ConsoleInterceptor.prototype.init = function() {
	var self = this;
	
	var consoleForm = windowManager && windowManager.windows && windowManager.windows["console"] &&windowManager.windows["console"].originalBody || document.getElementById("console").getElementsByTagName("form")[0]; //consoleElement.getElementsByTagName("form")[0];
	alert(consoleForm)
	var stdout = consoleForm.stdout || consoleForm.getElementsByTagName("output")[0];
	/** @type {HTMLInputElement?} */
	var stdin = consoleForm.stdin || consoleForm.getElementById("stdin");

	var interceptConsole = function() {
		self.intercept();
	};


	consoleForm.addEventListener("submit", function(event) {
		event.preventDefault();
		try {
			alert(self.results.length)
			alert(event.target)

			var input = (event.target.input | stdin).value;

			self.results.push({
				type: ConsoleOutType.Input,
				data: []
			});
			self.results.push({
				type: ConsoleOutType.Log,
				data: [eval(event.target.input.value)]
			});
		} catch (exception) {
		alert(exception)
		self.results.push({ type: ConsoleOutType.Error, data: [exception] });
		}
		interceptConsole();
	}, false);

  	// self.results = [];

  // We gaan hier de console calls opvangen door de functie te binden aan een nieuwe en de originele te vervangen met een aangepaste.
  if (bindConsole) {
    console.standardLog = console.log.bind(console);
    console.logs = [];
    console.log = function() {
      console.standardLog.apply(console, arguments); // Here we call the original log so everything is visible in the browser console too. Only the line number is different.
      self.results.push({ type: ConsoleOutType.Log, data: arguments });
      interceptConsole();
    };

    console.standardWarning = console.error.bind(console);
    console.warnings = [];
    console.warn = function() {
      console.standardWarning.apply(console, arguments);
      self.results.push({ type: ConsoleOutType.Warn, data: arguments });
      interceptConsole();
    };

    console.standardError = console.error.bind(console);
    console.errors = new Array();
    console.error = function() {
      console.standardError.apply(console, arguments);
      self.results.push({ type: ConsoleOutType.Error, data: arguments });
      interceptConsole();
    };
  }

  console.getHTML = function() {
    var output = document.createElement("table");
    for (var index in self.results) {
      var result = self.results[index];
      var tableRow = document.createElement("tr");
      var tableData = document.createElement("td");
      for (var dataIndex in result.data) {
        var data = result.data[dataIndex];
        var span = document.createElement("span");
        switch (result.type) {
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
  };
};

var interceptor = new ConsoleInterceptor();

window.addEventListener("load", function() {
  	if (bindConsole) interceptor.init();
}, false);

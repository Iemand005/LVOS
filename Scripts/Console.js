
var bindConsole = true;

/** @typedef {"input" | "return" | "log" | "warn" | "error"} ConsoleOutputType */
/**
 * @typedef ConsoleOutput
 * @prop {ConsoleOutputType} type
 * @prop {any[]} data
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
	// alert("stds out here" + this.stdout);
	try {
	if (this.stdout.firstChild) this.stdout.removeChild(this.stdout.firstChild);
	var html = this.getHTML();
	html.style.background = "purple"
	// html.style.display = "block";
	// html.style.position = "absolute";
	// html.style.left = "0";
	// html.style.top = "0";
	// html.style.width = "100%";
	// html.style.height = "100%";
	// alert("kaker")
	// alert(html)       
	// alert (this.stdout)
    this.stdout.appendChild(html);
    // this.stdout.scrollTop = this.stdout.scrollHeight;
	} catch(ex){alert(ex)}
};

ConsoleInterceptor.prototype.init = function() {
	var self = this;
	//windowManager && windowManager.windows && windowManager.windows["console"] &&windowManager.windows["console"].originalBody ||
	var consoleForm =  document.getElementById("console").getElementsByTagName("form")[0]; //consoleElement.getElementsByTagName("form")[0];
	alert(consoleForm)
	var stdout = self.stdout = consoleForm.stdout || consoleForm.getElementsByTagName("output")[0] || document.getElementById("stdout");
	/** @type {HTMLInputElement?} */
	var stdin = consoleForm.stdin ||consoleForm.getElementsByTagName("INPUT")[0] || consoleForm.getElementById("stdin");

	var interceptConsole = function() { self.intercept(); };


	consoleForm.addEventListener("submit", function(event) {
		event.preventDefault();
		try {
			alert(self.results.length)
			// alert(event.target)

			var input = (event.target.input || stdin).value;

			self.results.push({
				type: ConsoleOutType.Input,
				data: [input]
			});
			self.results.push({
				type: ConsoleOutType.Log,
				data: [eval(input)]
			});
		} catch (exception) {
			alert(exception)
			self.results.push({ type: ConsoleOutType.Error, data: [exception] });
		}
		interceptConsole();
	}, false);


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
};

ConsoleInterceptor.prototype.getHTML = function() {
	var output = document.createElement("table");

	for (var i = 0; i < this.results.length; i++) {

		var result = this.results[i];

		var tableRow = document.createElement("tr");
		var tableData = document.createElement("td");

		for (var j = 0; j < result.data.length; j++) {

			var data = result.data[j];
			var span = document.createElement("span");
			span.style.background = "blue";

			if (result.type == ConsoleOutType.Input) {
				span.style.color = "black";
				span.appendChild(document.createTextNode(data));

				tableData.appendChild(document.createTextNode("← "));
				tableData.appendChild(span);

			} else if (result.type == ConsoleOutType.Log) {
				span.style.color = "gray";
				span.appendChild(document.createTextNode(data));

				tableData.appendChild(document.createTextNode("→ "));
				tableData.appendChild(span);

			} else if (result.type == ConsoleOutType.Warn) {
				span.style.color = "yellow";
				span.appendChild(document.createTextNode("⚠ " + data));
				tableData.appendChild(span);

			} else if (result.type == ConsoleOutType.Error) {
				span.style.color = "red";
				span.appendChild(document.createTextNode("⚠ " + data));
				tableData.appendChild(span);

			} else {
				tableData.appendChild(document.createTextNode(data + "\t"));
			}
		}

		tableRow.appendChild(tableData);
		output.appendChild(tableRow);
	}

	return output;
};

var interceptor = new ConsoleInterceptor();

window.addEventListener("load", function() {
  	if (bindConsole) interceptor.init();
}, false);

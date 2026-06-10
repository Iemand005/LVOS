
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
	// alert(this.results.length	+ " eresultas")
    for (var index in this.results) {
		var result = this.results[index];
		var tableRow = document.createElement("tr");
		var tableData = document.createElement("td");
		// alert("dater" + result.data)
		for (var dataIndex in result.data) {
			// alert("ideks" + dataIndex)
			var data = result.data[dataIndex];
			var span = document.createElement("span");
			span.style.background = "blue"
			switch (result.type) {
			case ConsoleOutType.Input:
				span.style.color = "black";
				span.innerText = data + "h";
				tableData.appendChild(document.createTextNode("← "));
				tableData.appendChild(span);
				break;
			case ConsoleOutType.Return:
				span.style.color = "gray";
				span.innerText = data + "oh this one";
				tableData.appendChild(document.createTextNode("→ "));
				tableData.appendChild(span);
				break;
			case ConsoleOutType.Warn:
				span.style.color = "yellow";
				span.innerText = data;
				tableData.appendChild(span);
				span.insertBefore(document.createTextNode("⚠ "), span.firstChild);
				break;
			case ConsoleOutType.Error:
				span.style.color = "red";
				span.innerText = data;
				tableData.appendChild(span);
				span.insertBefore(document.createTextNode("⚠ "), span.firstChild);
				break;
			default:
				tableData.innerText += data + "\t";
				break;
			}
			tableRow.appendChild(tableData);
			// alert("rowie " + tableRow)
      }
	  if (!tableRow.childNodes.length)  tableRow.appendChild(tableData);
	//   tableRow.style.width = "100px";
	//   tableRow.style.height = "100px";
	  tableRow.style.background="blue"
      output.appendChild(tableRow);
	//   alert("dalength " + tableRow.childNodes.length)
    }
    return output;
};

var interceptor = new ConsoleInterceptor();

window.addEventListener("load", function() {
  	if (bindConsole) interceptor.init();
}, false);

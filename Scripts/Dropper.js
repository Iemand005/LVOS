(function () {
	/** @type {IWebBrowser2} */
	var wb = /** @type {any} */ (document.getElementById("wb"));

	window.onload = function () {
		wb.RegisterAsDropTarget = true;

		wb.Navigate(location.href.replace(/[^\/\\]+$/, "") + "index.html");

		if (wb.attachEvent) {
			wb.attachEvent('onbeforenavigate', function (pDisp, URL, Flags, TargetFrameName, PostData, Headers, Cancel) {
				if (URL.indexOf("index.html") == -1) {
					wb.Document.parentWindow.handleDroppedFilePath(URL);
					if (Cancel != null) Cancel.value = true;
				}
			});
		} else {
			wb.BeforeNavigate2 = function (pDisp, URL, Flags, TargetFrameName, PostData, Headers, Cancel) {
				if (URL.indexOf("index.html") == -1) {
					wb.Document.parentWindow.handleDroppedFilePath(URL);
					if (Cancel != null) Cancel.value = true;
				}
			};
		}
	};
})();

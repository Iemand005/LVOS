
(function () {
	/** @typedef {{ name: string, icon?: string, kind?: string, values?: Function, getFile?: Function }} LVDirectoryEntry */

	var FILE_ICON = "../../Assets/icon-192.png";
	var FOLDER_ICON = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><path fill='%23f4c542' d='M3 11h15l4 5h23v25H3z'/></svg>";

	/** @type {any} */
	var mountedHandle = null;
	try {
		if (typeof LVMessenger.callParent === "function")
			mountedHandle = LVMessenger.callParent("get-mounted-directory") || null;
	} catch (ex) {}

	LVMessenger.get("os", function (os) {
		var viewElement = document.getElementById("file-view");
		if (!viewElement) return;
		var view = viewElement;

		/** @type {HTMLInputElement | null} */
		var address = /** @type {HTMLInputElement | null} */ (document.getElementById("address"));
		/** @type {HTMLElement | null} */
		var count = document.getElementById("file-count");
		/** @type {any[]} */
		var history = [];
		var historyIndex = -1;

		/** @param {string} message */
		var setStatus = function (message) {
			if (count) count.textContent = message;
		};
		var updateCount = function () {
			if (!count) return;
			var total = view.querySelectorAll(".file-item").length;
			count.textContent = total + (total === 1 ? " file" : " files");
		};
		/** @param {LVDirectoryEntry} entry */
		var openEntry = function (entry) {
			if (typeof os.open !== "function") return;
			var open = function (file) {
				try {
					if (os.open(file) !== true) setStatus("No app for " + entry.name);
				} catch (ex) {
					setStatus("Could not open " + entry.name);
				}
			};
			if (entry && typeof entry.getFile === "function")
				Promise.resolve(entry.getFile()).then(open, function () { open(entry); });
			else open(entry);
		};
		/** @param {LVDirectoryEntry[]} entries */
		var render = function (entries) {
			view.replaceChildren();
			os.to(view).addFileView(entries.map(function (entry) {
				return {
					name: entry.name,
					icon: entry.kind === "directory" ? FOLDER_ICON : FILE_ICON,
					onFileDoubleClick: entry.kind === "directory" ? function () { goTo(entry, true); } : function () { openEntry(entry); }
				};
			}), undefined, undefined);
			updateCount();
		};
		/** @param {any} directory @param {boolean} push */
		var goTo = function (directory, push) {
			if (push) {
				history = history.slice(0, historyIndex + 1);
				history.push(directory);
				historyIndex++;
			}
			if (address) address.value = directory.name;
			/** @type {LVDirectoryEntry[]} */
			var entries = [];
			if (typeof directory.values !== "function") {
				render(entries);
				return;
			}
			var iterator = directory.values();
			var next = function () {
				Promise.resolve(iterator.next()).then(function (result) {
					if (result.done) {
						entries.sort(function (a, b) {
							if (a.kind === b.kind) return a.name.localeCompare(b.name);
							return a.kind === "directory" ? -1 : 1;
						});
						render(entries);
						return;
					}
					entries.push(result.value);
					next();
				}, function () { render(entries); });
			};
			next();
		};

		var mount = document.getElementById("mount");
		if (mount) mount.addEventListener("click", function () {
			if (typeof window.showDirectoryPicker !== "function") {
				setStatus("Directory picker is unavailable");
				return;
			}
			try {
				Promise.resolve(window.showDirectoryPicker()).then(function (directory) {
					return LVMessenger.callParent("mount-directory", { handle: directory, appId: "files" });
				})["catch"](function (ex) {
					if (!ex || ex.name !== "AbortError") setStatus("Could not mount directory");
				});
			} catch (ex) {
				setStatus("Could not mount directory");
			}
		});

		/** @param {string} label @param {number} step */
		var bindNavigation = function (label, step) {
			var button = document.querySelector('nav button[aria-label="' + label + '"]');
			if (button) button.addEventListener("click", function () {
				var index = historyIndex + step;
				if (index < 0 || index >= history.length) return;
				historyIndex = index;
				goTo(history[index], false);
			});
		};
		bindNavigation("Back", -1);
		bindNavigation("Forward", 1);
		bindNavigation("Up", -1);

		if (mountedHandle) goTo(mountedHandle, true);
		else render([
			{ name: "Konk", icon: FILE_ICON },
			{ name: "Kink", icon: FILE_ICON },
			{ name: "Kenk", icon: FILE_ICON },
			{ name: "Kank", icon: FILE_ICON }
		]);

		view.addEventListener("drop", function () { setTimeout(updateCount, 0); });
	});
})();

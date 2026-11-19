  // iFrame <-> mainFrame LVMessenger
 // Lasse Lauwerys (c) 2026
// 8/1/2024 -> patch 11/1/2024, added origin identifier without CORS -> patch 01/02/2026, don't parse if not a string, did other stuff ya kno -> patch 08/03/2026, remove duplicate function

"use strict";

/** @class */
function LVMessenger(){}

/**
 * @param {Window | BroadcastChannel} target
 * @param {MessageType} type
 * @param {*} data
 * @param {string} [id]
 */
LVMessenger.broadcast = function (target, type, data, id){
	if(target && "JSON" in window) target.postMessage(JSON.stringify({type: type, data: data, id: id}), "*");
};

/**
 * @param {(type:MessageType,data:*,id?:string)=>void} callback
 * @param {MessageType} [destroyWhenType]
 */
LVMessenger.receive = function (callback, destroyWhenType) {
	/** @type {(this: Window, ev: MessageEvent<any>) => any} */
	var messageListener = function (ev) {
		try {
			/** @type {LVMessage} */
			var data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;

			if (data.type) switch (data.type) {
				default: callback(data.type, data.data, data.id); break;
				case "identify":
					console.log("Reveived an identity request", ev);
					/** @type {Identity} */
					var identity = { name: "LVOS" };
					if (ev.source instanceof Window && typeof ev.source.postMessage === "function")
						LVMessenger.broadcast(ev.source, "identity",  identity);
					else console.warn("Couldn't send identity request!", ev);
					break;
			}
			// else console.warn("Missing data property", data);
			if (data.type === destroyWhenType) this.window.removeEventListener("message", messageListener);
		} catch (ex) {
			console.warn("Error decoding data", ev.data, ex);
		}
	};

	window.addEventListener("message", messageListener, false);

	return messageListener;
};

function getParentWindow() {
	return window.parent && window.parent !== window ? window.parent : window.top;
}

/**
 * @template {MessageType} T
 * @param {T} type
 * @param {unknown} [message]
 * @param {string} [id]
 * @param {CallbackFor<T>} [callback]
 */
LVMessenger.broadcastToParent = function (type, message, id, callback) {
	var target = getParentWindow();
	var response;
	try {
		if (target && typeof target.__LVMessengerReceive === "function")
			response = target.__LVMessengerReceive(type, message, id);
	} catch (ex) {
		console.warn("Direct parent bridge failed, falling back to postMessage.", ex);
		if (target) LVMessenger.broadcast(target, type, message, id);
	}
	// @ts-ignore
	if (callback) callback(response);
};

/**
 * @typedef {{
 *   os: (os: VulpOS) => void,
 * }} MessageCallbackMap
 */

/**
 * @template {MessageType} T
 * @typedef {T extends keyof MessageCallbackMap ? MessageCallbackMap[T] : () => void} CallbackFor
 */

/**
 * @template {MessageType} T
 * @param {T} type
 * @param {CallbackFor<T>} [callback]
 */
LVMessenger.get = function (type, callback) {
	LVMessenger.broadcastToParent(type, {}, undefined, callback);
};

LVMessenger.callParent = function (type, message) {
	var target = getParentWindow();
	if (!target || typeof target.__LVMessengerReceive !== "function") return false;
	return target.__LVMessengerReceive(type, message, window);
};

LVMessenger.registerFileOpenHandler = function (callback) {
	if (typeof callback !== "function") return false;
	return LVMessenger.callParent("register-file-handler", { callback: callback }) === true;
};

/**
 * @param {MessageType} type
 * @param {HTMLIFrameElement} iFrame
 * @param {*} [message]
 */
LVMessenger.broadcastToChild = function (type, iFrame, message) {
	if (iFrame.contentWindow) LVMessenger.broadcast(iFrame.contentWindow, type, message);
};

/** @param {()=>void} callback */
LVMessenger.onHostBeingLVOS = function (callback) {
	try {
		LVMessenger.receive(function(type, data) {
			if (type === "identity" && data.name === "LVOS") callback();
		}, "identity");
		LVMessenger.broadcastToParent("identify");
	} catch (ex) {
		console.warn("Failed to request host OS", ex);
	}
};

LVMessenger.registerThemeChangeHandler = function() {
	LVMessenger.receive(function(message, data) {
		if (message === "theme")
			document.body.className = data.className;
	});
};

/**
 * Find the frame that sent a message, on either the desktop or the mobile host.
 * @param {string} [source]
 * @returns {HTMLIFrameElement | null}
 */
LVMessenger.getFrameForSource = function(source) {
	if (!source) return null;
	var wm = window.windowManager;
	if (wm) {
		var dialog = wm.windows && wm.windows[source];
		return dialog && dialog.frame || null;
	}
	var manager = window.mobileFrameManager;
	if (!manager) return null;
	var frames = manager._frames;
	if (frames && frames[source]) return frames[source];
	return typeof manager.getActiveFrame === "function" ? manager.getActiveFrame() : null;
};

/**
 * Put a mobile app frame into fullscreen, keeping the app's fullscreen styling in sync.
 * @param {HTMLIFrameElement} frame
 */
LVMessenger.fullscreenFrame = function(frame) {
	if (!frame) return;
	LVMessenger.broadcastToChild("prepareToLaunchOverlay", frame);
	try {
		var url = new URL(frame.src, location.href);
		url.searchParams.set("fullscreen", "true");
		frame.src = url.href;
	} catch (ex) {
		if (frame.src.indexOf("fullscreen=true") === -1)
			frame.src += (frame.src.indexOf("?") === -1 ? "?" : "&") + "fullscreen=true";
	}
	var container = document.getElementById("main-frame");
	if (container) container.classList.add("fullscreen");
	try {
		if (typeof frame.requestFullscreen === "function") {
			var request = frame.requestFullscreen();
			if (request && typeof request["catch"] === "function") request["catch"](function() {});
		} else if (typeof frame.msRequestFullscreen === "function") frame.msRequestFullscreen();
	} catch (ex) {}
};

function getDialogForSource(source) {
	var wm = window.windowManager;
	if (!wm || !wm.windows || !source) return null;

	if (typeof source === "string") return wm.windows[source] || null;

	for (var id in wm.windows) {
		if (!wm.windows.hasOwnProperty(id)) continue;
		var candidate = wm.windows[id];
		if (candidate && candidate.frame && candidate.frame.contentWindow === source) return candidate;
	}
	return null;
}

/**
 * Handle a message sent by an app frame or another LVOS instance.
 * @param {MessageType} type
 * @param {any} data
 * @param {string | Window} [source]
 */
function messageReceived(type, data, source) {
	var wm = window.windowManager;

	switch (type) {
		case "os": return window.os;
	}

	if (!source) return;

	var dialog = getDialogForSource(source);
	var frame = dialog ? dialog.frame : LVMessenger.getFrameForSource(typeof source === "string" ? source : undefined);

	if (dialog && type === "window-size" && data && typeof data === "object")
		dialog.resizeBody(data.width, data.height);

	switch (type) {
		case "register-file-handler":
			if (!dialog || !data || typeof data.callback !== "function") return false;
			dialog.fileOpenHandler = data.callback;
			if (typeof VulpOS !== "undefined" && VulpOS.deliverPendingFiles) VulpOS.deliverPendingFiles(dialog);
			return true;
		case "launchOverlay":
			if (dialog) {
				var overlay = Helpers.getOverlay();
				if (!overlay) break;

				overlay.ontransitionend = function() {
					if (!dialog) return;
					dialog.messageFrame("prepareToLaunchOverlay");
					if (dialog.frame) {
						var oriel = new URL(dialog.frame.src);
						oriel.searchParams.set("fullscreen", String(true));
						dialog.frame.src = oriel.href;
					}
					if (!overlay) return;
					overlay.ontransitionend = null;
					if (typeof overlay.requestFullscreen === "function") overlay.requestFullscreen()["catch"](function() {});
					if (dialog.body) overlay.appendChild(dialog.body);
					window.setTimeout(overlay.classList.add.bind(overlay.classList, "shown"), 500);
				};
				overlay.classList.toggle("open");
			} else if (frame) LVMessenger.fullscreenFrame(frame);
			break;
		case "readyToLaunchOverlay":
			if (dialog) {
				var overlay1 = Helpers.getOverlay();
				if (!overlay1) break;
				if (dialog.body) overlay1.appendChild(dialog.body);
				window.setTimeout(overlay1.classList.add.bind(overlay1.classList, "shown"), 500);
			} else if (frame) {
				var container = document.getElementById("main-frame");
				if (container) container.classList.add("fullscreen");
			}
			break;
		case "pip":
			if (dialog) dialog.moveElementIntoPipById(data.id, data.stylesheet);
			break;
		case "visualizers":
			if (dialog && wm) dialog.messageFrame("visualizers", wm.getVisualizerApps());
			break;
	}
}

LVMessenger.messageReceived = messageReceived;
window.__LVMessengerReceive = messageReceived;
window.__LVMessenger = window.__LVMessenger || {};
LVMessenger.receive(messageReceived);

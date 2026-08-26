/* AppRegistry - Lightweight app registry for LVOS Mobile.
   Provides app registration, iteration, installation, and persistence
   without the full WindowManager/Dialog desktop scaffolding. */

var canSave = true;
var hasLocalStorage = false;

try {
    hasLocalStorage = typeof localStorage !== "undefined";
} catch (ex) {
    hasLocalStorage = false;
}

if (!hasLocalStorage) canSave = false;

function isElement(object) {
    return object && typeof object === "object" && "nodeType" in object;
}

function getFaviconUrl(url) {
    if (typeof url !== "string") return "";
    var m = url.match(/^([a-z]+:\/\/[^\/]+)/i);
    return (m ? m[1] : url) + "/favicon.ico";
}

function getDomain(url) {
    if (typeof url !== "string") return "";
    return url.replace(/^[a-z]+:\/\//i, "").split("/")[0].split("?")[0];
}

function getSiteName(url) {
    if (typeof url !== "string") return "";
    var domain = url.replace(/^[a-z]+:\/\//i, "").split("/")[0].split("?")[0];
    var parts = domain.split(".");
    var name = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function handleStorageException(exception) {
    console.error(exception);
    console.warn("A problem occurred, app state saving has been disabled for this session.");
    canSave = false;
}

function AppRegistry() {
    this._apps = {};
}

AppRegistry.prototype.registerApp = function(app) {
    if (!app || typeof app !== "object") return;
    if (!app.id) app.id = app.title || "unknown";
    this._apps[app.id] = app;
};

AppRegistry.prototype.registerApps = function(/* ...arrays */) {
    for (var i = 0; i < arguments.length; i++) {
        var arr = arguments[i];
        if (arr instanceof Array) {
            for (var j = 0; j < arr.length; j++) {
                this.registerApp(arr[j]);
            }
        }
    }
};

AppRegistry.prototype.getApp = function(id) {
    if (!id) return null;
    return this._apps[id] || null;
};

AppRegistry.prototype.forEachApp = function(callback) {
    if (typeof callback !== "function") return;
    for (var id in this._apps) {
        if (this._apps.hasOwnProperty(id)) {
            callback(this._apps[id], id);
        }
    }
};

Object.defineProperty(AppRegistry.prototype, "apps", {
    get: function() { return this._apps; }
});

Object.defineProperty(AppRegistry.prototype, "installedApps", {
    get: function() {
        if (!hasLocalStorage) return [];
        try {
            var string = localStorage.getItem("installedApps");
            if (string === null) return [];
            var apps = JSON.parse(string);
            return apps instanceof Array ? apps : [];
        } catch (exception) {
            if (exception instanceof Error) console.error(exception.message);
            return [];
        }
    }
});

AppRegistry.prototype.saveInstalledApp = function(app) {
    if (!canSave || !hasLocalStorage) return;
    try {
        var apps = this.installedApps;
        for (var i = 0; i < apps.length; i++) {
            if (apps[i].id === app.id) return;
        }
        apps.push(app);
        localStorage.setItem("installedApps", JSON.stringify(apps));
    } catch (exception) {
        handleStorageException(exception);
    }
};

AppRegistry.prototype.loadInstalledApps = function() {
    if (!canSave || !hasLocalStorage) return;
    var self = this;
    try {
        var apps = this.installedApps;
        for (var i = 0; i < apps.length; i++) {
            var app = apps[i];
            if (app && app.src) self.registerApp(app);
        }
    } catch (exception) {
        handleStorageException(exception);
    }
};

AppRegistry.prototype.installApp = function(url, title, id, iconUrl) {
    var app = {
        src: url,
        id: id || "custom." + getDomain(url),
        title: title || getSiteName(url)
    };
    if (iconUrl) app.iconUrl = iconUrl;
    this.registerApp(app);
    this.saveInstalledApp(app);
};

AppRegistry.prototype.installAppProxied = function(url, proxyUrl) {
    if (!proxyUrl) proxyUrl = "https://browz.netlify.app/browz-set-cookie/";
    this.installApp(
        proxyUrl + url,
        getSiteName(url),
        "custom." + getDomain(url),
        getFaviconUrl(url)
    );
};

var appRegistry = new AppRegistry;
window.appRegistry = appRegistry;

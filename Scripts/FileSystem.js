
/** @typedef {"WebKitFS"} StorageAPI */

function probeAllStorage() {
  return {
    OPFS: !!navigator.storage && typeof navigator.storage.getDirectory == 'function',
    CacheAPI: 'caches' in window,
    
    IndexedDB: !!window.indexedDB,
    ChromeFileSystem: 'webkitRequestFileSystem' in window,
    LocalStorage: 'localStorage' in window,
    
    WebSQL: 'openDatabase' in window,
    GoogleGears: typeof window.GearsFactory != 'undefined',
    FlashBridge: (function() {
      try { return !!new ActiveXObject('ShockwaveFlash.ShockwaveFlash'); } 
      catch(e) { return !!navigator.plugins && !!navigator.plugins['Shockwave Flash']; }
    })(),
    
    IE_userData: (function() {
      try { return !!document.createElement('div').addBehavior; } catch(e) { return false; }
    })(),
    ActiveX_FSO: (function() {
      try { return !!new ActiveXObject("Scripting.FileSystemObject"); } catch(e) { return false; }
    })(),
    JavaApplets: typeof navigator.javaEnabled == 'function' && navigator.javaEnabled()
  };
}

console.log("Detected Browser Capabilities:", probeAllStorage());


function OmniFS() {
	
	this.webkitSize = 5 * 1024 * 1024;
	this.webkitFs = null;

	this.apis = [];
}

/**
 * @param {StorageAPI} api 
 */
OmniFS.prototype.init = function (api) {
	var self = this;

	if (this.apis.indexOf(api) != -1) return;

	this.apis.push(api);

	return new Promise(function (resolve, reject) {
		switch (api) {
			case "WebKitFS":
				if (!window.webkitRequestFileSystem)
				return reject('webkitRequestFileSystem not supported here.');
				
				window.webkitRequestFileSystem(window.PERSISTENT, this.webkitSize, function (fs) {
					self.webkitFs = fs;
				}, reject);
				break;
		}
	});
};

OmniFS.prototype.writeToChromeLegacyFS = function (fileName, textData) {
	var self = this;
  return new Promise(function (resolve, reject) {
    if (!self.webkitFs)
      return reject('webkitRequestFileSystem not initialized.');
    
      self.webkitFs.root.getFile(fileName, { create: true }, function(fileEntry) {
        fileEntry.createWriter(function(fileWriter) {
          
          fileWriter.onwriteend = function () {
			resolve("Saved via Chrome Legacy FS to" + fileEntry.toURL());
		  }
          fileWriter.onerror = reject;
          
          const blob = new Blob([textData], { type: 'text/plain' });
          fileWriter.write(blob);
          
        }, reject);
      }, reject);
    });
}

OmniFS.prototype.readFromChromeLegacyFS = function (fileName) {
	var self = this;
  return new Promise(function(resolve, reject) {
    if (!self.webkitFs)
      return reject('webkitRequestFileSystem not initialized.');
    
    self.webkitFs.root.getFile(fileName, { create: false }, function(fileEntry) {
		fileEntry.file(function(file) {
			var reader = new FileReader();

			reader.onloadend = function() {
				resolve(this.result);
			};

			reader.onerror = reject;

			reader.readAsText(file);
			
		}, reject);
	}, reject);
  });
}

OmniFS.prototype.prototypewriteToOPFS = function (fileName, content) {
    return new Promise(function (resolve, reject) {
        if (!navigator.storage || typeof navigator.storage.getDirectory != 'function') {
            return reject(new Error("OPFS wordt niet ondersteund door deze browser."));
        }

        navigator.storage.getDirectory()
            ["then"](function (root) {
                // 2. Open of maak het bestand aan
                return root.getFileHandle(fileName, { create: true });
            })
            ["then"](function (fileHandle) {
                // 3. Start de writable stream op het bestand
                // We bewaren de handle tijdelijk in een variabele om hem later te sluiten bij errors
                var currentWritable;
                
                return fileHandle.createWritable()
                    ["then"](function (writable) {
                        currentWritable = writable;
                        // 4. Schrijf de content weg naar de stream
                        return writable.write(content);
                    })
                    ["then"](function () {
                        // 5. Sluit de stream netjes af om de data te committen
                        return currentWritable.close();
                    });
            })
            ["then"](function () {
                // Alles is succesvol doorlopen
                resolve("Data veilig opgeslagen in OPFS sandbox!");
            })
            ["catch"](function (error) {
                // Vang eventuelle errors (zoals disk-full of permissie fouten) centraal op
                reject(error);
            });
    });
}

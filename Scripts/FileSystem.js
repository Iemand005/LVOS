
/** @typedef {"WebKitFS"} StorageAPI */

function probeAllStorage() {
  return {
    OPFS: typeof navigator.storage?.getDirectory === 'function',
    CacheAPI: 'caches' in window,
    
    IndexedDB: !!window.indexedDB,
    ChromeFileSystem: 'webkitRequestFileSystem' in window,
    LocalStorage: 'localStorage' in window,
    
    WebSQL: 'openDatabase' in window,
    GoogleGears: typeof window.GearsFactory !== 'undefined',
    FlashBridge: (function() {
      try { return !!new ActiveXObject('ShockwaveFlash.ShockwaveFlash'); } 
      catch(e) { return !!navigator.plugins?.['Shockwave Flash']; }
    })(),
    
    IE_userData: (function() {
      try { return !!document.createElement('div').addBehavior; } catch(e) { return false; }
    })(),
    ActiveX_FSO: (function() {
      try { return !!new ActiveXObject("Scripting.FileSystemObject"); } catch(e) { return false; }
    })(),
    JavaApplets: typeof navigator.javaEnabled === 'function' && navigator.javaEnabled()
  };
}

console.log("Detected Browser Capabilities:", probeAllStorage());


function OmniFS() {
	
	this.webkitSize = 5 * 1024 * 1024;
	this.webkitFs = null;
}

/**
 * @param {StorageAPI} api 
 */
OmniFS.prototype.init = function(api) {
	var self = this;
	
	if (api == "WebKitFS") {
		if (!window.webkitRequestFileSystem) {
		  return reject('webkitRequestFileSystem not supported here.');
		}
		
		window.webkitRequestFileSystem(window.PERSISTENT, this.webkitSize, function(fs) {
		  fs.root.getFile(fileName, { create: true }, function(fileEntry) {
			fileEntry.createWriter(function(fileWriter) {
			  
			  fileWriter.onwriteend = () => resolve(`Saved via Chrome Legacy FS to ${fileEntry.toURL()}`);
			  fileWriter.onerror = (e) => reject(e);
			  
			  const blob = new Blob([textData], { type: 'text/plain' });
			  fileWriter.write(blob);
			  
			}, reject);
		  }, reject);
		}, reject);
	}
};

OmniFS.prototype.writeToChromeLegacyFS = function(fileName, textData) {
  return new Promise((resolve, reject) => {
    if (!window.webkitRequestFileSystem) {
      return reject('webkitRequestFileSystem not supported here.');
    }
    
    window.webkitRequestFileSystem(window.TEMPORARY, this.webkitSize, function(fs) {
      fs.root.getFile(fileName, { create: true }, function(fileEntry) {
        fileEntry.createWriter(function(fileWriter) {
          
          fileWriter.onwriteend = () => resolve(`Saved via Chrome Legacy FS to ${fileEntry.toURL()}`);
          fileWriter.onerror = (e) => reject(e);
          
          const blob = new Blob([textData], { type: 'text/plain' });
          fileWriter.write(blob);
          
        }, reject);
      }, reject);
    }, reject);
  });
}

OmniFS.prototype.readFromChromeLegacyFS = function(fileName) {
  return new Promise(function(resolve, reject) {
    // Check if the legacy API exists
    if (!window.webkitRequestFileSystem) {
      return reject('webkitRequestFileSystem not supported here.');
    }
    
    window.webkitRequestFileSystem(window.TEMPORARY, this.webkitSize, function(fs) {
      
      fs.root.getFile(fileName, { create: false }, function(fileEntry) {
        
        fileEntry.file(function(file) {
          var reader = new FileReader();

          reader.onloadend = function() {
            resolve(this.result);
          };

          reader.onerror = function(e) {
            reject(e);
          };

          reader.readAsText(file);
          
        }, reject);
      }, reject);
    }, reject);
  });
}
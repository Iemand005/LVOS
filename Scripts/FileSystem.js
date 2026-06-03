
/** @typedef ""  */

function FileSystem() {
	if (!window.webkitRequestFileSystem) {
      return reject('webkitRequestFileSystem not supported here.');
    }

    const size = 5 * 1024 * 1024;
    
    window.webkitRequestFileSystem(window.TEMPORARY, size, function(fs) {
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
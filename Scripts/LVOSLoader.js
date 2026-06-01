

function loadStyleSheet(url) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = url;
  
  document.head.appendChild(link);

}

function loadScript(url, callback) {
  const script = document.createElement('script');
  script.src = url;
  
  script.onload = callback;
  
  document.head.appendChild(script);
}

var scriptSrc = document.currentScript.src;
var scriptDir = scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1);
var stylePath = scriptDir + "../Styles/general.css";
console.log("Currently in", scriptDir, "wanna load css in", scriptDir + "../Styles/general.css");

loadStyleSheet(stylePath);


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
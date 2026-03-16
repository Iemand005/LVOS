// Error page display handler for LWM
// Lasse Lauwerys � 2024

'use strict';
'use esnext';
'use moz';

/*const*/var reasoningElement = document.getElementById("reason");
if (typeof URLSearchParams !== "undefined") {
  /*const*/var urlSearchParams = new URLSearchParams(window.location.search);
  /*const*/var message = urlSearchParams.get("message");
  reasoningElement.innerText = message;
  document.getElementById("code").innerText = urlSearchParams.get("code");
  document.getElementById("errormessage").innerText = urlSearchParams.get("errormessage");
}
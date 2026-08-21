// Error page display handler for LWM
// Lasse Lauwerys � 2024

'use strict';

var reasoningElement = document.getElementById("reason");
if (typeof URLSearchParams != "undefined") {
  var urlSearchParams = new URLSearchParams(window.location.search);
  var message = urlSearchParams.get("message");
  reasoningElement.innerText = message;
  document.getElementById("code").innerText = urlSearchParams.get("code");
  document.getElementById("errormessage").innerText = urlSearchParams.get("errormessage");
}

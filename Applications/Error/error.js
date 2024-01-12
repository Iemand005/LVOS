// Error page display handler for LWM
// Lasse Lauwerys © 2024

'use strict';
'use esnext';
'use moz';

const reasoningElement = document.getElementById("reason");
const urlSearchParams = new URLSearchParams(window.location.search);
const message = urlSearchParams.get("message");
reasoningElement.innerText = message;
document.getElementById("code").innerText = urlSearchParams.get("code");
document.getElementById("errormessage").innerText = urlSearchParams.get("errormessage");
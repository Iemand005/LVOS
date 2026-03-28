

var browser = windows.browser.target;//document.getElementById("browser");
var browserform = windows.browser.originalBody;//document.getElementById("browserform");
var browserframe = browser.getElementsByTagName("iframe")[0];

dockapplist.appendChild(windows.browser.createOpenButton());
dockapplist.appendChild(windows.console.createOpenButton());

browserform.addEventListener("submit", function(event){
    event.preventDefault();
    /*let*/var url = event.target.address.value;
    /*let*/var xhr = new XMLHttpRequest();
    try{
        console.log("The browser is navigating to '" + url + "'");
        if(!/^https?:\/\//i.test(url)) url = "https://" + url.trim(); // Sanitising the url.
        url = new URL(url);
        console.log("full url: ", url.href);
         // We can't extract the website info from our iframe for security reasons, my idea here is to first probe the website before feeding it to our independent iframe.
        //  xhr.open('HEAD', url.href, false);
        //  xhr.send();

        browserframe.src = url.href;
        // /*const*/var links = browserframe.document.getElementsByTagName("a");
        // for (/*let*/var link in links) if (links.hasOwnProperty(link)) links[link].target = "_self";
    } catch (e) {
        // if(e.code == )
        console.log(url, url.hostname)
        if(url.hostname.indexOf("youtube")!=-1) {
            console.log("yoututbe!", url.pathname);
            if(url.pathname === "/watch"){
                console.log("wanna watch??");
                windowManager.windows["video"].openUrl(url.href);
            }
        }

        console.error(e.code);
        url = new URL("./Applications/Error/error.html", window.location.href);
        url.searchParams.set("errormessage", e.message);
        url.searchParams.set("code", e.code);
        if(e.code === 19) { // Error handling for other potential problems can be done here!
            //url = new URL("./Applications/Error/error.html", window.location.href);
            url.searchParams.set("message", "Some websites like the ones hosted by Google do not allow loading their website inside another website for security reasons.");
            //url.searchParams.set("code", e.code);
            //browserframe.src = "./Applications/Error/error.html?message=something went wrong!"
            browserframe.src = url;
            console.log("Blocked by CORS! Websites like the ones from Google don't allow insertion in an iframe if not embedded!")
        }
    }
});
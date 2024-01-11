
const settings = bodyCrawler.settings;
settings.onsubmit=function(ev){ev.preventDefault();}

bodyCrawler.theme.onchange = function(ev){
    console.log(this.selectedIndex);
    for(let index in windows){
        const window = windows[index];
        if(this.selectedIndex == 0) window.target.classList.remove("rounded-corners"), window.target.classList.add("sharp-corners");
        if(this.selectedIndex == 1) window.target.classList.remove("rounded-corners"), window.target.classList.remove("sharp-corners");
        if(this.selectedIndex == 2) window.target.classList.remove("sharp-corners"), window.target.classList.add("rounded-corners");
    }
}

const charmsbutton = applist.appendChild(document.createElement("button"));
charmsbutton.onclick = toggleCharms.bind();
charmsbutton.innerText = "Charms"

const charmsbutton2 = document.getElementById("dockapplist").appendChild(document.createElement("button"));
charmsbutton2.onclick = toggleCharms.bind();
charmsbutton2.innerText = "Charms"

bodyCrawler.desktop.addEventListener("mousedown", toggleCharms.bind(this, false));
// bodyCrawler.charms.onmousedown = function(ev){ev.preventDefault()}
// document.body.addEventListener("mousedown", toggleCharms.bind(this, false));
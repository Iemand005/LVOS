
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
//charmsbutton.onclick = toggleCharms.bind();
charmsbutton.innerText = "Charms"
// charmsbutton.onclick = toggleCharmsEvent.bind();

const charmsbutton2 = document.getElementById("dockapplist").appendChild(document.createElement("button"));
// charmsbutton2.onclick = toggleCharmsEvent//toggleCharms.bind();
charmsbutton2.innerText = "Charms"

// document.body.addEventListener("mousedown", toggleCharmsEvent);
window.addEventListener("mousedown", toggleCharmsEvent);

function toggleCharmsEvent(ev){
    clickedElement = document.elementFromPoint(ev.clientX, ev.clientY);
    // collectEssentialWindowData.log()
    console.log(clickedElement)
    if(!(clickedElement == bodyCrawler.charms || bodyCrawler.charms.contains(clickedElement))) {
        if(clickedElement == charmsbutton || clickedElement == charmsbutton2) toggleCharms();
        else toggleCharms(false);
    }
    
}

const color = document.getElementById("color");
const accent = document.getElementById("accent");

color.oninput = color.onchange = function(ev){
    setColor(this.value);
}

accent.oninput = accent.onchange = function(ev){
    setAccentColor(this.value);
}
// bodyCrawler.charms.onmousedown = function(ev){ev.preventDefault()}
// document.body.addEventListener("mousedown", toggleCharms.bind(this, false));
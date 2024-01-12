
const settings = bodyCrawler.settings;
settings.onsubmit=function(ev){ev.preventDefault();}
const desktop = document.getElementById("desktop");

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
charmsbutton.innerText = "Charms";

const charmsbutton2 = document.getElementById("dockapplist").appendChild(document.createElement("button"));
charmsbutton2.innerText = "Charms"

window.addEventListener("mousedown", toggleCharmsEvent);

function toggleCharmsEvent(ev){
    clickedElement = document.elementFromPoint(ev.clientX, ev.clientY);

    if(!(clickedElement == bodyCrawler.charms || bodyCrawler.charms.contains(clickedElement))) {
        if(clickedElement == charmsbutton || clickedElement == charmsbutton2) toggleCharms();
        else toggleCharms(false);
    }
    
}

const metroAppList = document.getElementById("metroapplist");
metroAppList.classList.toggle("bottom", true);

function hexToRGB(hex){
    const int = parseInt(hex.replace('#', ''), 16);
    return {r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255};
}

function isColorDark(color){
    const rgb = hexToRGB(color);
    return 0.2126*rgb.r + 0.7152*rgb.g + 0.0722*rgb.b < 128;
}

function setColor(color){
    // const y = 0.2126*rgb.r + 0.7152*rgb.g + 0.0722*rgb.b;
    // const c = y < 128 ? "black" : "white";
    const isWhite = isColorDark(color);
    for(let index in windows){
        const content = windows[index].target.getElementsByTagName("content")[0];
        content.style.backgroundColor = color;
        content.style.color = isWhite?"white":"black";
    }
}

function setAccentColor(color){
    const isWhite = isColorDark(color);
    const metroStyle = document.getElementById("metro").style, charmStyle = document.getElementById("charms").style;
    metroStyle.backgroundColor = charmStyle.backgroundColor = color;
    metroStyle.color = charmStyle.color = isWhite?"white":"black";
    // document.getElementById("metro").style.backgroundColor = document.getElementById("charms").style.backgroundColor = color;;

}

const color = document.getElementById("color");
const accent = document.getElementById("accent");

color.oninput = color.onchange = function(ev){
    setColor(this.value);
}

accent.oninput = accent.onchange = function(ev){
    setAccentColor(this.value);
}



window.ondrag = document.ondrag = function(ev){
    ev.preventDefault();
    desktop.style.opacity = 0;
}

window.ondragleave = function(ev){
    ev.preventDefault();
    desktop.style.opacity = null;
}

window.ondrop = document.ondrop = function(ev){
    ev.preventDefault();

    if (ev.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        [...ev.dataTransfer.items].forEach((item, i) => {
          // If dropped items aren't files, reject them
          if (item.kind === "file") {
            const file = item.getAsFile();
            console.log(`… file[${i}].name = ${file.name}`);
          }
        });
      } else {
        // Use DataTransfer interface to access the file(s)
        [...ev.dataTransfer.files].forEach((file, i) => {
          console.log(`… file[${i}].name = ${file.name}`);
        });
      }
    console.log(ev);
}
// bodyCrawler.charms.onmousedown = function(ev){ev.preventDefault()}
// document.body.addEventListener("mousedown", toggleCharms.bind(this, false));
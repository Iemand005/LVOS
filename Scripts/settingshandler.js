
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
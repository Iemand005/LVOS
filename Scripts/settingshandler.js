
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
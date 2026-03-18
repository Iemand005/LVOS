
    //              Minesweeper!              \\    
   //       Lasse Lauwerys © 23/12/2023        \\   
  //   Original game by Microsoft Corporation   \\  

'use strict';

var width = 12, height = 13,
    quickReveal = true,
    singleSidedDisplay = true,
    showBombInsteadOfCheckmark = true;

var icons = { // Quick configuration of the signs used in game. These particular emojis were tested by me and confirmed working on Windows 7 and up.
        bomb: "💣",
        exploded: "💥",
        correct: "✔",
        flag: "🚩",
        alive: "😃",
        scared: "😮",
        dead: "😵",
        won: "😁",
        unknown: "❓",
        none: ""
    },

    // declaring the objects.
    tiles = new Array(height),
    lineartiles = new Array(height*width),
    displays = [new MultiDigitDisplayBuilder(3, 3, singleSidedDisplay), new MultiDigitDisplayBuilder(3, 0, singleSidedDisplay)],
    mutationObserver = new MutationObserver(function(){ sendDesiredSize(); });

// Declaring the modifiable variables.
var isGameOver = false,
    isGameWon = false,
    mousedown = false,
    gameStarted = false,
    timerInterval = 0,
    bombCount = 0;

/**
 * 
 * @param {HTMLButtonElement} button 
 * @param {number} x 
 * @param {number} y 
 * @param {boolean} mine 
 */
function Tile(button, x, y, mine){
    this.disable = this.toggleDisabled.bind(this, false);
    this.enable = this.toggleDisabled.bind(this, true);
    this.mine = mine || false;
    /** @type {HTMLButtonElement?} */
    this.button = button;
    this.flagged = false;
    this.position = { x: x, y: y };
    this.revealed = false;
    this.mousedown = false;
}

Tile.prototype = {
    generate: function(){ // This generates the mines, the algorithm can also be modified to generate a specified amount of mines instead of random.
        this.mine = 1 == Math.round(Math.random() * 0.6);
    },
    reveal: function(){
        if(this.revealed) return 0;
        if(!gameStarted) gameStarted = true, activateTimer();
        this.revealed = true;
        var remaining = countRemainingFields(), neighbours = this.getNeighbours(), neighbourCount = this.countNeighbouringMines(), classes = this.button.classList;

        classes.add("revealed");
        this.disable();
        if(!this.mine) {
            if(remaining==0) gameOver(true);
            this.button.textContent = neighbourCount, classes.add('n' + neighbourCount);
        }
        else this.button.textContent = !isGameWon?icons.exploded:icons.correct, gameOver();
        console.log("Neighbours: ", neighbours);
        if(neighbourCount == 0) for(var neighbour in neighbours) try { if (neighbours[neighbour] && neighbours[neighbour].reveal) neighbours[neighbour].reveal() } catch (ex) {};
        return neighbourCount;
    },
    getNeighbours: function(){
        /*const*/var neighbours = new Array();
        for (/*let*/var i = 0; i < 9; i++) {
            /*const*/var x = this.position.x + (i % 3) - 1, y = this.position.y + Math.floor((i / 3) - 1);
            if((!(x == this.position.x && y == this.position.y)) && tiles[y] && tiles[y][x]) neighbours.push(tiles[y][x]);
        }
        return neighbours;
    },
    countNeighbouringMines: function(){ return this.getNeighbouringMines().length; },
    getNeighbouringMines: function(neighbours){ return this.iterateNeighbours(neighbours, function(neighbour){ return neighbour.mine }); },
    iterateNeighbours: function(neighbours, filter){ return (neighbours || this.getNeighbours()).filter(filter); },
    getFlaggedNeighbouringMines: function(neighbours){ return this.iterateNeighbours(neighbours, function(neighbour){ return neighbour.flagged == 1 }); },
    countFlaggedNeighbouringMines: function(neighbours){ return this.getFlaggedNeighbouringMines(neighbours).length; },
    getUnflaggedNeighbouringMines: function(neighbours){ return this.iterateNeighbours(neighbours, function(neighbour){ return neighbour.flagged != 1 }); },
    countUnflaggedNeighbouringMines: function(neighbours){ return this.getUnflaggedNeighbouringMines(neighbours).length; },
    getUnflaggedNeighbouringNotMines: function(neighbours){ return this.iterateNeighbours(neighbours, function(neighbour){ return neighbour.mine && neighbour.flagged != 1 }); },
    countUnflaggedNeighbouringNotMines: function(neighbours){ return this.getUnflaggedNeighbouringnotMines(neighbours).length; },
    toggleDisabled: function(enabled){ if(enabled == null || (this.button.hasAttribute("disabled") == enabled)) this.button.toggleAttribute("disabled"); },
    toggleFlag: function(enabled){if(!this.revealed)this.flagged=enabled==null?(this.flagged+1)%3:enabled?3:0,this.button.innerText=this.flagged?this.flagged==1?(displays[0].update(--bombCount),icons.flag):(displays[0].update(++bombCount),icons.unknown):icons.none; },
    disableVisual: function(){ this.button.classList.remove("active"); },
    isClickAllowed: function(){ return this.flagged != 1; },
    enableVisual: function(){ if(this.isClickAllowed() && this.mousedown) this.button.classList.add("active"); },
    quickReveal: function(){
        if(quickReveal){
            /*const*/var neighbours = this.getNeighbours();
            if(this.countFlaggedNeighbouringMines(neighbours) == this.countNeighbouringMines(neighbours)) this.getUnflaggedNeighbouringMines(neighbours).forEach(function(neighbour){neighbour.reveal();});
        }
    },
}

function Minesweeper() {

}

Minesweeper.prototype.startGame = function () {
    document.querySelector("form").addEventListener("submit", function (ev) { ev.preventDefault(); }, false );
    stopTimer(true);
    isGameWon = false;
    isGameOver = false;
    setEmoji();
    var table = document.querySelector("table");
    while (table.firstChild) table.removeChild(table.firstChild); // Clear the table
    for (var y = 0; y < height; y++) {
        tiles[y] = new Array();
        var row = table.appendChild(document.createElement("tr"));
        for (var x = 0; x < width; x++) (
            function(x, y) {
                var button = document.createElement("button"), tile = tiles[y][x] = lineartiles[button.id = x + (y*width)] = new Tile(button, x, y);
                row.appendChild(document.createElement("td")).appendChild(button);
                try {

                    button.classList.add("mine");
                } catch(ex) {
                    // alert(ex.message);
                }
                tile.generate();

                button.onmouseover = tile.enableVisual.bind(tile);
                button.onmouseout = tile.disableVisual.bind(tile);
                button.ondblclick = function (ev) { alert("hey"); };

                button.onmousedown = function(ev){
                    if(!isGameOver) setEmoji(icons.scared);
                    if(!tile.isClickAllowed()) ev.preventDefault();
                    if(tile.mousedown = !ev.button) tile.enableVisual();
                };

                button.onmouseup = function(){
                    tile.mousedown = false;
                    tile.disableVisual();
                };

                console.log("Adding click: " + button.id);

                button.onclick = function(ev){
                    if(ev.button == 0 && tile.isClickAllowed()){
                        var neighbours = tile.reveal();
                        if(!tile.mine) button.innerText = neighbours;
                        else gameOver();
                    } else ev.preventDefault();
                };

                button.oncontextmenu = function(ev){
                    ev.preventDefault();
                    tile.toggleFlag();
                };
            }
        )(x, y);
    }

    displays[0].update(bombCount = countBombs());
    sendDesiredSize();
};

function sendDesiredSize(){
    var form = document.querySelector("form");
    // Messenger.broadcastToParent(Messenger.types.windowSize, {width: form.offsetWidth, height: form.offsetHeight}, "minesweeper"); // Fixed tooth 11/1/2024.
}

// Messenger.onHostBeingLVOS(function () {
//     console.log("My host is LVOS!!");
// });

function quickRevealEvent(ev) {
    /*const*/var element = document.elementFromPoint(ev.clientX || ev.changedTouches[0].clientX, ev.clientY || ev.changedTouches[0].clientY);
    if(element) {
        /*const*/var tile = lineartiles[parseInt(element.firstChild? element.firstChild.id: element.id)];
        if(tile && tile.flagged!=1) tile.quickReveal();
    }
}

Minesweeper.prototype.quickRevealEvent = quickRevealEvent;

function randomNumberBetween(start, end){
    return (Math.random()*(end - start)) + start;
}

function gameOver(won){
    if(isGameOver) return;
    isGameWon = won, isGameOver = true;
    displays[0].update(0);
    lineartiles.forEach(function(tile){ tile.reveal(); });
    setEmoji();
    gameStarted = false;
    stopTimer();
}

function setEmoji(emoji) {
    try {
        var button = document.querySelector("div").querySelector("button");
        button.innerText=isGameOver?isGameWon?icons.won:icons.dead:emoji?emoji:icons.alive;
    } catch (ex) {

    }
}

function countRemainingFields() {
    return lineartiles.filter(function(tile){return !tile.mine && !tile.revealed}).length;
}

function countBombs() {
    return lineartiles.filter(function(tile){ return tile.mine }).length;
}

Minesweeper.prototype.countBombs = countBombs;
Minesweeper.prototype.countRemainingFields = countRemainingFields;

function activateTimer() {
    var timer = 0;
    displays[1].update(timer++);
    timerInterval = window.setInterval(function(){displays[1].update(timer++)}, 1000);
}

function stopTimer(reset) {
    if(reset) displays[1].update(0);
    window.clearInterval(timerInterval);
}

var minesweeper = new Minesweeper();

try {
    var outputs = document.getElementsByTagName("output");
    if(singleSidedDisplay) document.getElementsByTagName("article")[0].classList.toggle("original", singleSidedDisplay);
    for(var i=0; i<outputs.length; i++) displays[i].build(outputs[i]);
    
    
    window.onmessage = sendDesiredSize;
    
    mutationObserver.observe(document.body, {childList: true});
    
} catch(ex) {
    // console.log(ex);
}

stopTimer(true);


function load() {
    minesweeper.startGame();
    var button = document.querySelector("button");
    button.onclick = function () { minesweeper.startGame(); };
    
    document.body.ondblclick = quickRevealEvent;
    document.body.ontouchend = quickRevealEvent;
    document.ondblclick = quickRevealEvent;
    document.onmousedown = setEmoji.bind(this, !isGameOver?icons.scared:icons.dead);
    document.onmouseup = function(ev) {
        ev.preventDefault();
        if(!isGameOver) setEmoji(icons.alive);
        lineartiles.forEach(function(tile){ tile.mousedown = false; });
        return false;
    }
}

window.addEventListener("load", load, false);

/**\
\ * \    LL          aa       SSSSSSS   SSSSSSS  eeeeeee      ======       222222       0000      222222    666666
 \ * \   LL         aaaa     SS        SS        ee         // cccc \\    22    22    00    00   22    22  66      
  | * |  LL        aa  aa     SSSSSS    SSSSSS   eeee      || cc     ||       222    00      00      222    666666
 / * /   LL       aaaaaaaa         SS        SS  ee         \\ cccc //      22        00    00     22      66    66
/ * /    LLLLLL  aa      aa  SSSSSSS   SSSSSSS   eeeeeee      ======      22222222      0000     22222222   666666
\**/
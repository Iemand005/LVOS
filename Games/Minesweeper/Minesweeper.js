
    //              Minesweeper!              \\    
   //       Lasse Lauwerys © 23/12/2023        \\   
  //   Original game by Microsoft Corporation   \\  

'use strict';

const // Declaring the constant variables.
    width = 10, height = 10,
    quickReveal = true,
    singleSidedDisplay = true,
    showBombInsteadOfCheckmark = true,

    body = document.body,
    form = document.querySelector("section"),
    table = document.createElement("table"),
    outputs = document.getElementsByTagName("output"),
    button = document.querySelector("article>button"),
    rect = body.getBoundingClientRect(),

    signs = { // Quick configuration of the signs used in game.
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
let isGameOver = false,
    isGameWon = false,
    mousedown = false,
    gameStarted = false,
    timerInterval = 0,
    bombCount = 0;

function Tile(button, x, y, mine){
    this.disable = this.toggleDisabled.bind(this, false);
    this.enable = this.toggleDisabled.bind(this, true);
    this.mine = mine || false;
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
        const remaining = countRemainingFields(), neighbours = this.getNeighbours(), neighbourCount = this.countNeighbouringMines(), classes = this.button.classList;

        classes.add("revealed");
        this.disable();
        if(!this.mine) {
            if(remaining==0) gameOver(true);
            this.button.innerText = neighbourCount, classes.add('n' + neighbourCount);
        }
        else this.button.innerText = !isGameWon?signs.exploded:signs.correct, gameOver();
        if(neighbourCount == 0) for(let neighbour in neighbours) neighbours[neighbour].reveal();
        return neighbourCount;
    },
    getNeighbours: function(){
        const neighbours = new Array();
        for (let i = 0; i < 9; i++) {
            const x = this.position.x + (i % 3) - 1, y = this.position.y + Math.floor((i / 3) - 1);
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
    toggleFlag: function(enabled){if(!this.revealed)this.flagged=enabled==null?(this.flagged+1)%3:enabled?3:0,this.button.innerText=this.flagged?this.flagged==1?(displays[0].update(--bombCount),signs.flag):(displays[0].update(++bombCount),signs.unknown):signs.none; },
    disableVisual: function(){ this.button.classList.remove("active"); },
    isClickAllowed: function(){ return this.flagged != 1; },
    enableVisual: function(){ if(this.isClickAllowed() && this.mousedown) this.button.classList.add("active"); },
    quickReveal: function(){
        if(quickReveal){
            const neighbours = this.getNeighbours();
            if(this.countFlaggedNeighbouringMines(neighbours) == this.countNeighbouringMines(neighbours)) this.getUnflaggedNeighbouringMines(neighbours).forEach(function(neighbour){neighbour.reveal();});
        }
    },
}

function startGame(){
    stopTimer(true);
    isGameWon = false;
    isGameOver = false;
    setEmoji();
    while(table.firstChild) table.removeChild(table.firstChild); // Clear the table
    for (let y = 0; y < height; y++) {
        tiles[y] = new Array();
        const row = document.createElement("tr");
        table.appendChild(row);
        for (let x = 0; x < width; x++) {
            const button = document.createElement("button"), tile = tiles[y][x] = lineartiles[button.id = x + (y*width)] = new Tile(button, x, y);
            row.appendChild(document.createElement("td")).appendChild(button);
            button.classList.add("mine");
            tile.generate();

            button.onmouseover = tile.enableVisual.bind(tile);
            button.onmouseout = tile.disableVisual.bind(tile);
            button.ondblclick = new Function;

            button.onmousedown = function(ev){
                if(!isGameOver) setEmoji(signs.scared);
                if(!tile.isClickAllowed()) ev.preventDefault();
                if(tile.mousedown = !ev.button) tile.enableVisual();
            }

            button.onmouseup = function(){
                tile.mousedown = false;
                tile.disableVisual();
            }

            button.onclick = function(ev){
                if(ev.button == 0 && tile.isClickAllowed()){
                    const neighbours = tile.reveal();
                    if(!tile.mine) button.innerText = neighbours;
                    else gameOver();
                } else ev.preventDefault();
            }

            button.oncontextmenu = function(ev){
                ev.preventDefault();
                tile.toggleFlag();
            }
        }
    }

    displays[0].update(bombCount = countBombs());
    sendDesiredSize();
}

function sendDesiredSize(){
    Messenger.broadcastFromChild(Messenger.types.windowSize, {width: form.offsetWidth, height: form.offsetHeight}, "minesweeper"); // Fixed bug 11/1/2024.
}

function quickRevealEvent(ev) {
    const element = document.elementFromPoint(ev.clientX || ev.changedTouches[0].clientX, ev.clientY || ev.changedTouches[0].clientY);
    if(element) {
        const tile = lineartiles[parseInt(element.firstChild? element.firstChild.id: element.id)];
        if(tile && tile.flagged!=1) tile.quickReveal();
    }
}

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

function setEmoji(emoji){
    button.innerText=isGameOver?isGameWon?signs.won:signs.dead:emoji?emoji:signs.alive;
}

function countRemainingFields(){
    return lineartiles.filter(function(tile){return !tile.mine && !tile.revealed}).length;
}

function countBombs(){
    return lineartiles.filter(function(tile){ return tile.mine }).length;
}

function activateTimer(){
    let timer = 0;
    displays[1].update(timer++);
    timerInterval = window.setInterval(function(){displays[1].update(timer++)}, 1000);
}

function stopTimer(reset){
    if(reset) displays[1].update(0);
    window.clearInterval(timerInterval);
}

if(singleSidedDisplay) document.getElementsByTagName("article")[0].classList.toggle("original", singleSidedDisplay);
for(let i=0; i<outputs.length; i++) displays[i].build(outputs[i]);

body.ondblclick = quickRevealEvent;
body.ontouchend = quickRevealEvent;
button.onclick = startGame.bind();
// window.onfocus = sendDesiredSize;
// window.onpageshow = sendDesiredSize;
window.onmessage = sendDesiredSize;
document.ondblclick = quickRevealEvent;
document.onmousedown = setEmoji.bind(this, !isGameOver?signs.scared:signs.dead);
document.onmouseup = function(ev){
    ev.preventDefault();
    if(!isGameOver) setEmoji(signs.alive);
    lineartiles.forEach(function(tile){ tile.mousedown = false; });
    return false;
}

form.appendChild(table);
mutationObserver.observe(body, {childList: true});

stopTimer(true);
startGame(); // If we don't use the defer attribute you have to put this function in the "onload" event of the body element.

/**\
\ * \    LL          aa       SSSSSSS   SSSSSSS  eeeeeee      ======       222222       0000      222222     33333
 \ * \   LL         aaaa     SS        SS        ee         // cccc \\    22    22    00    00   22    22  33     33
  | * |  LL        aa  aa     SSSSSS    SSSSSS   eeee      || cc     ||       222    00      00      222       333
 / * /   LL       aaaaaaaa         SS        SS  ee         \\ cccc //      22        00    00     22      33     33
/ * /    LLLLLL  aa      aa  SSSSSSS   SSSSSSS   eeeeeee      ======      22222222      0000     22222222    33333
\**/

    //              Minesweeper!              \\  
   //       Lasse Lauwerys © 23/12/2023        \\
  //   Original game by Microsoft Corporation   \\   


'use strict';
const width = 10;
const height = 10;
const quickReveal = true;

const body = document.body;
const form = document.querySelector("section");
const table = document.createElement("table");

const signs = {
    bomb: "💥",
    flag: "🚩",
    alive: "😃",
    click: "😮",
    dead: "😵",
    unknown: "❓",
    none: ""
}

const tiles = new Array(height);
const lineartiles = new Array(height*width);
const isGameOver = false;
let mousedown = false;
let gameStarted = false;
let timerInterval = 0;

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
    reveal: function(){
        if(this.revealed) return 0;
        if(!gameStarted) gameStarted = true, activateTimer();
        this.revealed = true;
        const neighbours = this.getNeighbours()
        const neighbourCount = this.countNeighbouringMines();
        const remaining = countRemainingFields();

        const classes = this.button.classList;
        classes.add("revealed");
        this.disable();
        if(!this.mine) {
            if(remaining==0) gameOver(true);
            this.button.innerText = neighbourCount, classes.add('n' + neighbourCount);
        }
        else {
            this.button.innerText = signs.bomb;
            gameOver();
        };

        if(neighbourCount == 0) for(let neighbour in neighbours) neighbours[neighbour].reveal();

        return neighbourCount;
    },
    generate: function(){
        this.mine = 1 == Math.round(Math.random() * 0.6);
    },
    getNeighbours: function(){
        const neighbours = new Array();
        for (let i = 0; i < 9; i++) {
            const x = this.position.x + (i % 3) - 1, y = this.position.y + Math.floor((i / 3) - 1);
            if((!(x == this.position.x && y == this.position.y)) && tiles[y] && tiles[y][x]) neighbours.push(tiles[y][x]);
        }
        return neighbours;
    },

    getNeighbouringMines: function(neighbours){
        return this.iterateNeighbours(neighbours, function(neighbour){ return neighbour.mine });
    },

    countNeighbouringMines: function(){
        return this.getNeighbouringMines().length;
    },

    iterateNeighbours: function(neighbours, filter){
        return (neighbours || this.getNeighbours()).filter(filter);
    },

    getFlaggedNeighbouringMines: function(neighbours){
        return this.iterateNeighbours(neighbours, function(neighbour){
            return neighbour.flagged == 1;
        });
    },

    countFlaggedNeighbouringMines: function(neighbours){
        return this.getFlaggedNeighbouringMines(neighbours).length;
    },

    getUnflaggedNeighbouringMines: function(neighbours){
        return this.iterateNeighbours(neighbours, function(neighbour){
            return neighbour.flagged != 1;
        });
    },

    countUnflaggedNeighbouringMines: function(neighbours){
        return this.getUnflaggedNeighbouringMines(neighbours).length;
    },

    getUnflaggedNeighbouringNotMines: function(neighbours){
        return this.iterateNeighbours(neighbours, function(neighbour){
            return neighbour.mine && neighbour.flagged != 1;
        });
    },

    countUnflaggedNeighbouringNotMines: function(neighbours){
        return this.getUnflaggedNeighbouringnotMines(neighbours).length;
    },

    toggleDisabled: function(enabled){ if(enabled == null || (this.button.hasAttribute("disabled") == enabled)) this.button.toggleAttribute("disabled") },
    disableVisual: function(){ this.button.classList.remove("active") },
    isClickAllowed: function(){ return this.flagged != 1 },
    enableVisual: function(){ if(this.isClickAllowed() && this.mousedown) this.button.classList.add("active") },
    toggleFlag: function(enabled){if(!this.revealed)this.flagged=enabled==null?(this.flagged+1)%3:enabled?3:0,this.button.innerText=this.flagged?this.flagged==1?signs.flag:signs.unknown:signs.none},
    quickReveal: function(){
        if(quickReveal){
            const neighbours = this.getNeighbours();
            if(this.countFlaggedNeighbouringMines(neighbours) == this.countNeighbouringMines(neighbours)) this.getUnflaggedNeighbouringMines(neighbours).forEach(function(neighbour){neighbour.reveal()});
        }
    }
}

form.appendChild(table);

function startGame(){
    if(table.firstChild) table.removeChild(table.firstChild);
    for (let y = 0; y < height; y++) {
        tiles[y] = new Array();
        const row = document.createElement("tr");
        table.appendChild(row);
        for (let x = 0; x < width; x++) {
            const button = document.createElement("button");
            const data = document.createElement("td");
            button.classList.add("mine");
            data.appendChild(button);
            row.appendChild(data);
            const index = x + (y*width);
            const tile = tiles[y][x] = lineartiles[index] = new Tile(button, x, y);
            button.id = index;
            tile.generate();
            
            button.oncontextmenu = function(ev){
                ev.preventDefault();
                tile.toggleFlag();
            }
            button.onclick = function(ev){
                if(ev.button == 0 && tile.isClickAllowed()){
                    const neighbours = tile.reveal();
                    if(!tile.mine) button.innerText = neighbours;
                    else gameOver();
                } else ev.preventDefault();
            }
            button.onmouseup = function(){
                tile.mousedown = false;
                tile.disableVisual();
            }

            button.onmouseover = tile.enableVisual.bind(tile);
            button.onmouseout = tile.disableVisual.bind(tile);
            button.ondblclick = new Function;

            button.onmousedown = function(ev){
                if(!tile.isClickAllowed()) ev.preventDefault();
                if(tile.mousedown = !ev.button) tile.enableVisual();
            }

        }
    }
}

startGame();

document.ondblclick = quickRevealEvent;
body.ondblclick = quickRevealEvent;

const button = document.querySelector("article>button");

button.onclick = function(){
    window.clearInterval(timerInterval);
    startGame();
}

const messenger = new Messenger;
messenger.broadcastFromChild(messenger.types.windowSize, {width: form.offsetWidth, height: form.offsetHeight})

function quickRevealEvent(ev) {
    const element = document.elementFromPoint(ev.clientX, ev.clientY);
    const tile = lineartiles[parseInt(element.firstChild.id || element.id)];
    if(tile && tile.flagged!=1) tile.quickReveal();
}

document.onmouseup = function(ev){
    ev.preventDefault();
    lineartiles.forEach(function(tile){
        tile.mousedown = false;
    });
    return false;
}

const mutationObserver = new MutationObserver(function(){
    const rect = body.getBoundingClientRect();
    window.innerWidth = rect.width;
});

mutationObserver.observe(body, {childList: true});

function randomNumberBetween(start, end){
    return (Math.random()*(end - start)) + start;
}

function gameOver(won){
    if(isGameOver) return;
    const output = document.getElementsByTagName("output")[0];
    lineartiles.forEach(function(tile){
        tile.reveal();
    });
    if(won){
        output.innerText = "You WIN!";
    } else {
        //console.log(output);
        output.innerText = "You died!";
        setEmoji(signs.dead);
    }
}

function setEmoji(emoji){
    button.innerText = emoji;
}

function countRemainingFields(){
    return lineartiles.filter(function(tile){
        //console.log(!tile.mine);
        return !tile.mine && !tile.revealed;
    }).length;
}

const displays = [new MultiDigitDisplayBuilder(3, 3), new MultiDigitDisplayBuilder(3, 0)];
displays[0].build(document.getElementsByTagName("output")[0]);
displays[1].build(document.getElementsByTagName("output")[1]);
displays[1].update(0)

function activateTimer(){
    let timer = 0;
    displays[1].update(timer++)
    timerInterval = window.setInterval(function(){displays[1].update(timer++)}, 1000);
    //window.setInterval(displays[1].update.bind(displays[1], timer), 1000);
}

//activateTimer();

/**\
\ * \    LL          aa       SSSSSSS   SSSSSSS  eeeeeee      ======       222222       0000      222222     33333
 \ * \   LL         aaaa     SS        SS        ee         // cccc \\    22    22    00    00   22    22  33     33
  | * |  LL        aa  aa     SSSSSS    SSSSSS   eeee      || cc     ||       222    00      00      222       333
 / * /   LL       aaaaaaaa         SS        SS  ee         \\ cccc //      22        00    00     22      33     33
/ * /    LLLLLL  aa      aa  SSSSSSS   SSSSSSS   eeeeeee      ======      22222222      0000     22222222    33333
\**/
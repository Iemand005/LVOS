
    //              Minesweeper!              \\    
   //  Original game by Microsoft Corporation  \\   
  //        Lasse Lauwerys - 23/12/2023         \\  

'use strict';
const width = 100;
const height = 30;

const quickReveal = true;

const tiles = new Array(height);
const lineartiles = new Array(height*width);

const body = document.querySelector("body");
const form = document.querySelector("section");
const table = document.createElement("table");

const signs = {
    bomb: "💥",
    flag: "🚩",
    unknown: "?",
    none: ""
}

const isGameOver = false;

let mousedown = false;

form.appendChild(table);
for (let y = 0; y < height; y++) {
    tiles[y] = new Array();
    const row = document.createElement("tr");
    table.appendChild(row);
    for (let x = 0; x < width; x++) {
        const button = document.createElement("button");
        const data = document.createElement("td");
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
                //tile.enableVisual();
                const neighbours = tile.reveal();
                if(!tile.mine) button.innerText = neighbours;
                else gameOver();
            } else ev.preventDefault();
        }
        button.onmouseup = function(){
            tile.mousedown = false;
            tile.disableVisual();
        }

        button.onmouseover = function(ev){
            //console.log(ev.button)
            //console.log(ev.target, "ME! ME!")
            if(tile.mousedown) tile.enableVisual();
        }

        button.onmouseout = function(ev){
            tile.disableVisual();
        }

        //button.on
        button.onmousedown = function(ev){
            if(!tile.isClickAllowed()) ev.preventDefault();
            if(tile.mousedown = !ev.button) tile.enableVisual();
        }

        button.ondblclick = function(){}
    }
}

document.ondblclick = quickRevealEvent;
body.ondblclick = quickRevealEvent;

function quickRevealEvent(ev) {
    //console.log("elaba");
    const element = document.elementFromPoint(ev.clientX, ev.clientY);
    //console.log("gotta reveal all!", element);
    const tile = lineartiles[parseInt(element.firstChild.id || element.id)];
    if(tile.flagged!=1) tile.quickReveal();
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
    }
}

function countRemainingFields(){
    return lineartiles.filter(function(tile){
        //console.log(!tile.mine);
        return !tile.mine && !tile.revealed;
    }).length;
}

function Tile(button, x, y, mine){
    this.mine = mine || false,
    this.button = button,
    this.flagged = false,
    this.position = { x: x, y: y },
    this.revealed = false,
    this.mousedown = false,
    this.reveal = function(){
        if(this.revealed) return 0;
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
    this.generate = function(){
        this.mine = 1 == Math.round(Math.random() * 0.6);
    },
    this.getNeighbours = function(){
        const neighbours = new Array();
        for (let i = 0; i < 9; i++) {
            const x = this.position.x + (i % 3) - 1, y = this.position.y + Math.floor((i / 3) - 1);
            if((!(x == this.position.x && y == this.position.y)) && tiles[y] && tiles[y][x]) neighbours.push(tiles[y][x]);
        }
        return neighbours;
    }

    this.getNeighbouringMines = function(neighbours){
        return this.iterateNeighbours(neighbours, function(neighbour){
            return neighbour.mine;
        });
    }

    this.countNeighbouringMines = function(neighbours){
        return this.getNeighbouringMines().length;
    }

    this.getNeighbouringNotMines = function(neighbours){
        return this.iterateNeighbours(neighbours, function(neighbour){
            return !neighbour.mine;
        });
    }

    this.iterateNeighbours = function(neighbours, filter){
        return (neighbours || this.getNeighbours()).filter(filter);
    }

    this.getFlaggedNeighbouringMines = function(neighbours){
        return this.iterateNeighbours(neighbours, function(neighbour){
            return neighbour.flagged == 1;
        });
    }

    this.countFlaggedNeighbouringMines = function(neighbours){
        return this.getFlaggedNeighbouringMines(neighbours).length;
    }

    this.getUnflaggedNeighbouringMines = function(neighbours){
        return this.iterateNeighbours(neighbours, function(neighbour){
            return neighbour.flagged != 1;
        });
    }

    this.countUnflaggedNeighbouringMines = function(neighbours){
        return this.getUnflaggedNeighbouringMines(neighbours).length;
    }

    this.getUnflaggedNeighbouringNotMines = function(neighbours){
        return this.iterateNeighbours(neighbours, function(neighbour){
            return neighbour.mine && neighbour.flagged != 1;
        });
    }

    this.countUnflaggedNeighbouringNotMines = function(neighbours){
        return this.getUnflaggedNeighbouringnotMines(neighbours).length;
    }

    this.toggleDisabled = function(enabled){ // Deprecated due to issues with IE11;
        if(enabled == null || (this.button.hasAttribute("disabled") == enabled)) this.button.toggleAttribute("disabled");
    }

    this.disable = function(){
        this.toggleDisabled(false); 
    }

    this.enable = function(){
        this.toggleDisabled(true);
    }

    this.disableVisual = function(){
        this.button.classList.remove("active");
    }

    this.isClickAllowed = function(){
        return this.flagged != 1;
    }

    this.enableVisual = function(){
        if(this.isClickAllowed()) this.button.classList.add("active");
    }

    this.toggleFlag = function(enabled){
        if(!this.revealed){
            this.flagged = enabled == null? (this.flagged + 1)%3: enabled?3:0;
            this.button.innerText = this.flagged?this.flagged==1?signs.flag:signs.unknown:signs.none;
            //if(this.flagged == 1) this.disable();
            //else this.enable();
        }
    }

    this.quickReveal = function(){
        if(!quickReveal) return;
        const neighbours = this.getNeighbours();
        //const neighbourCount = ;
        //const flagged = ;
        //console.log(flagged);
        if(this.countFlaggedNeighbouringMines(neighbours) == this.countNeighbouringMines(neighbours)) this.getUnflaggedNeighbouringMines(neighbours).forEach(function(neighbour){
            neighbour.reveal();
        });
    }
}

/**\
\ * \    LL          aa       SSSSSSS   SSSSSSS  eeeeeee      ======       222222       0000      222222     33333
 \ * \   LL         aaaa     SS        SS        ee         // cccc \\    22    22    00    00   22    22  33     33
  | * |  LL        aa  aa     SSSSSS    SSSSSS   eeee      || cc     ||       222    00      00      222       333
 / * /   LL       aaaaaaaa         SS        SS  ee         \\ cccc //      22        00    00     22      33     33
/ * /    LLLLLL  aa      aa  SSSSSSS   SSSSSSS   eeeeeee      ======      22222222      0000     22222222    33333
\**/
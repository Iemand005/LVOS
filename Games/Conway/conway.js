
    //=========================//
   //  Conway's game of life  //
  //  Lasse Lauwerys © 2023  //
 //  Turing complete game!  //
//=========================//

'use strict';
'use esnext';
'use moz';

const horizontalCellCount = 10;
const verticalCellCount = 10;
const cellSize = 10;

const conway = document.getElementById("conway");
const physicsToggle = document.getElementById("physicsenabled");
const speedSlider = document.getElementById("physicsspeed");
const drawmethodCombobox = document.getElementById("drawmethod");
const ctx = conway.getContext("2d");

const cells = initializeCells();
const lastUpdatedPosition = {x:-1, y:-1};
let updateMethod = 0;
let mousedown = false;

function initializeCells(){ // Array.from bestaat nog niet niet in IE11. (y++ geeft als resultaat de waarde van y voor en ++y de waarde na het incrementeren.)
    const cells = new Array(horizontalCellCount);
    for (let x = 0; x < horizontalCellCount; x++) {
        cells[x] = new Array(verticalCellCount);
        for (let y = 0; y < verticalCellCount; y++) cells[x][y] = {
            alive:false,
            position:{
                x: x,
                y: y
            },
            dying:false,
            undying:false,
            spawn: function(){
                this.alive = true;
            },
            kill: function(){
                this.alive = false;
            },
            toggle: function(){
                this.alive = !this.alive;
            }
        };
    }
    return cells;
}

function iterateCells(delegate){ // Deze functie loopt door alle cellen. We voeren de delegatie functie uit. Om ervoor te zorgen dat wanneer de delegatie geen lege waarde terug geeft gebruiken we een "OR" operatie. We kunnen dit doen aangezien de "OR" operatie in JavaScript de eerste waarde teruggeeft die "truthy" is, null en undefined zijn namelijk "falsy", dus het origineel object word teruggegeven.
    for (let y = 0; y < verticalCellCount; y++) for (let x = 0; x < horizontalCellCount; x++) cells[x][y] = delegate(cells[x][y], x, y) || cells[x][y];
}

conway.onmousedown = function(event){ // Een andere manier om een enkele functie van hogere orde in te stellen als event handler.
    mousedown = (event || window.event).which;
}

conway.onmouseup = function(){
    mousedown = false;
    //console.log(mousedown)
}

function toggleCellEvent(event){
    mousedown = (event || window.event).buttons;
    //console.log(mousedown);
    if(mousedown){
        const rect = conway.getClientRects()[0]; // Kan ook moet element.getCientBoundingRect() maar deze functie bestaat in IE11 niet.
        const position = {x: Math.floor(((event.clientX - rect.left)/cellSize) / (rect.width / ctx.canvas.width)), y: Math.floor(((event.clientY - rect.top) / cellSize) / (rect.height / ctx.canvas.height))}; // De berekening tussen client rect en canvas rect heb ik toegevoegd voor het geval dat iemand de breedte op een percentage zet bijvoorbeeld, waardoor het canvas uitgerokken word. We willen natuurlijk dat de muispositie correct vertaald word in alle gevallen.
        if(!(lastUpdatedPosition.x == position.x && lastUpdatedPosition.y === position.y)){ // Zo kan de laatste positie constant blijven en hoeven we ook geen kopie te maken. Als we de objecten van huidige en vorige positie gelijkstellen word het een objectverwijzing.
            lastUpdatedPosition.x = position.x;
            lastUpdatedPosition.y = position.y;
            const cell = cells[position.x][position.y];
            switch(updateMethod){
                case 1:
                    mousedown === 2 ? cell.kill() : cell.spawn(); 
                case 2:
                    cell.spawn();
                    break;
                case 3:
                    cell.kill();
                    break;
                default:
                    cell.toggle();
                    break;
            }
        }
    }
}

function updateViewbox(){
    const rect = conway.getClientRects()[0];
    ctx.canvas.width = rect.width;
    ctx.canvas.height = rect.height;
}

function renderCells(){
    ctx.clearRect(0, 0, horizontalCellCount * cellSize, verticalCellCount * cellSize);
    iterateCells(function(cell, x, y){
        if(cells[x][y].alive) ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    });

      //*/  "Arrow" notatie implementatie:
     //*/   iterateCells((cell, x, y) => {if(cells[x][y].alive) ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)});
    //*/    Deze gebruik ik in dit script niet vanwege compatibiliteitsproblemen met verouderde browsers. Bij een syntaxfout in Internet Explorer word het uitvoeren van JavaScript bijvoorbeeld volledig onderbroken. Enkel moderne browsers zien syntaxfouten door de vingers en lossen deze zelf op.
   //*/     Klasses en andere moderne elementen zijn dus niet mogelijk voor compatibiliteit. Minder belangrijke dingen kan ik wel met moderne implementaties doen. De moderne browsers kijken niet meer alleen naar de puntkomma en gebruiken dan ook 0xD en 0xA om het einde van de lijn aan te duiden. Gebrek aan puntkomma kan wel voor problemen zorgen bij gebruik van minder geavanceerde minimaliseerder.
}

function applyPhysics(){
    iterateCells(function(cell, x, y){
        const aliveNeighbours = getAliveNeighbourPositions(x, y);
        cell.dead = aliveNeighbours.length > 3 || aliveNeighbours.length < 2;
        cell.born = aliveNeighbours.length === 3;
        return cell;
    });
    iterateCells(function(cell){
        if(cell.dead) cell.alive = false;
        if(cell.born) cell.alive = true;
        return cell;
    });
}

function getAliveNeighbourPositions(x, y){
    return getNeighbouringPositions(x, y).filter(function(position){
        return cells[position.x][position.y].alive;
    });
}

function getNeighbouringPositions(x, y){
    const offsets = [
        {x:-1, y:-1}, {x: 0, y:-1}, {x: 1, y:-1},
        {x:-1, y: 0},               {x: 1, y: 0},
        {x:-1, y: 1}, {x: 0, y: 1}, {x: 1, y: 1}
    ];
    return offsets.map(function(offset){
        return {x:x + offset.x, y:y + offset.y}
    }).filter(function(offset){
        return offset.x >= 0 && offset.y >= 0 && offset.x < horizontalCellCount && offset.y < verticalCellCount;
    }); // Met de map functie maken we een kopie van de offset array. Deze kopie gaan we dan ook eens filteren om te zorgen dat er geen waarden worden gegeven die buiten de matrixgrenzen liggen. In JavaScript is dat meestal geen probleem, maar we willen ook niet dat deze een lege waarde terug geeft.
}

function cellAt(x, y){
    return cells[x][y];
}

let framerate = 60
window.setInterval(renderCells, 1000/framerate);
let physicsInterval;

physicsToggle.removeAttribute("checked");
//physicsToggle.checked = false;
speedSlider.max = framerate/2;

function updatePhysicsEnabled(){
    window.clearInterval(physicsInterval);
    if(event.target.checked) physicsInterval = window.setInterval(applyPhysics, 1000 / speedSlider.value);
}

conway.addEventListener("mousemove", toggleCellEvent);
conway.addEventListener("mousedown", toggleCellEvent);
conway.addEventListener('contextmenu', function(event){event.preventDefault()});
speedSlider.addEventListener("change", updatePhysicsEnabled);
physicsToggle.addEventListener("change", updatePhysicsEnabled);
drawmethodCombobox.addEventListener("change", function(event){updateMethod = event.target.selectedIndex});
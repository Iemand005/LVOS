
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
	/** @type {Tile[][]} */
	tiles = new Array(height),
	lineartiles = new Array(height*width),
	mutationObserver = new MutationObserver(function(){ sendDesiredSize(); });

// Declaring the modifiable variables.
var isGameOver = false,
	isGameWon = false,
	mousedown = false,
	gameStarted = false,
	timerInterval = 0,
	bombCount = 0;

/**
 * @param {Minesweeper} minesweeper
 * @param {HTMLButtonElement} button
 * @param {number} x
 * @param {number} y
 * @param {boolean} mine
 */
function Tile(minesweeper, button, x, y, mine){
	this.disable = this.toggleDisabled.bind(this, false);
	this.enable = this.toggleDisabled.bind(this, true);
	this.mine = mine || false;
	/** @type {HTMLButtonElement | null} */
	this.button = button;
	this.flagged = 0;
	this.position = { x: x, y: y };
	this.revealed = false;
	this.mousedown = false;
	this.minesweeper = minesweeper;
}

Tile.prototype.generate = function() { // This generates the mines, the algorithm can also be modified to generate a specified amount of mines instead of random.
	this.mine = 1 === Math.round(Math.random() * 0.6);
};

Tile.prototype.reveal = function() {
	if (!this.button) return;
	if (this.revealed) return 0;
	if (!gameStarted) {
		gameStarted = true;
		activateTimer();
	}
	this.revealed = true;
	var remaining = this.minesweeper.countRemainingFields(), neighbours = this.getNeighbours(), neighbourCount = this.countNeighbouringMines(), classes = this.button.classList;

	classes.add("revealed");
	this.disable();
	if (!this.mine) {
		if (remaining === 0) gameOver(true);
		this.button.textContent = neighbourCount.toString();
		classes.add('n' + neighbourCount);
	} else {
		this.button.textContent = !isGameWon?icons.exploded:icons.correct;
		gameOver();
	}
	console.log("Neighbours: ", neighbours);
	if (neighbourCount === 0) for (var neighbour in neighbours) try { if (neighbours[neighbour]) neighbours[neighbour].reveal(); } catch (ex) {}
	return neighbourCount;
};

Tile.prototype.getNeighbours = function() {
	var neighbours = [];
	for (var i = 0; i < 9; i++) {
		var x = this.position.x + (i % 3) - 1, y = this.position.y + Math.floor((i / 3) - 1);
		if((!(x === this.position.x && y === this.position.y)) && tiles[y] && tiles[y][x]) neighbours.push(tiles[y][x]);
	}
	return neighbours;
};
/** @param {Tile[]} [neighbors] */
Tile.prototype.countNeighbouringMines = function(neighbors) { return this.getNeighbouringMines(neighbors).length; };
/** @param {Tile[]} [neighbors] */
Tile.prototype.getNeighbouringMines = function(neighbors) { return this.iterateNeighbours(neighbors, function(neighbour){ return neighbour.mine }); };

/**
 * @param {Tile[] | undefined} neighbors
 * @param {(neighbour:Tile)=>boolean} filter
 */
Tile.prototype.iterateNeighbours = function(neighbors, filter) { return (neighbors || this.getNeighbours()).filter(filter); };
Tile.prototype.getFlaggedNeighbouringMines = function(/**@type {Tile[]}*/neighbors) { return this.iterateNeighbours(neighbors, function(neighbour){ return neighbour.flagged === 1; }); };
Tile.prototype.countFlaggedNeighbouringMines = function(/**@type {Tile[]}*/neighbors) { return this.getFlaggedNeighbouringMines(neighbors).length; };
Tile.prototype.getUnflaggedNeighbouringMines = function(/**@type {Tile[]}*/neighbors) { return this.iterateNeighbours(neighbors, function(neighbour){ return neighbour.flagged !== 1; }); };
Tile.prototype.toggleDisabled = function(/**@type {boolean}*/enabled) { if (this.button) if (enabled == null || (this.button.hasAttribute("disabled") === enabled)) this.button.toggleAttribute("disabled"); };
Tile.prototype.toggleFlag = function(/**@type {boolean}*/enabled) {
	if (this.revealed || !this.button) return;
	this.flagged = enabled == null ? (this.flagged + 1) % 3 : enabled ? 3 : 0;
	this.button.innerText = this.flagged ? this.flagged === 1 ? (setBombCount(--bombCount), icons.flag) : (setBombCount(++bombCount), icons.unknown) : icons.none;
};
Tile.prototype.disableVisual = function() { if (this.button) this.button.classList.remove("active"); };
Tile.prototype.isClickAllowed = function() { return this.flagged !== 1; };
Tile.prototype.enableVisual = function() { if (this.isClickAllowed() && this.mousedown && this.button) this.button.classList.add("active"); };
Tile.prototype.quickReveal = function() {
	if (quickReveal) {
		var neighbours = this.getNeighbours();
		if (this.countFlaggedNeighbouringMines(neighbours) === this.countNeighbouringMines(neighbours)) this.getUnflaggedNeighbouringMines(neighbours).forEach(function(neighbour) { neighbour.reveal(); });
	}
};

function Minesweeper() {

}

Minesweeper.prototype.startGame = function () {
	var form = document.querySelector("form");
	if (form) form.addEventListener("submit", function (ev) { ev.preventDefault(); }, false );
	stopTimer(true);
	isGameWon = false;
	isGameOver = false;
	setEmoji();
	var table = document.querySelector("table");
	var self = this;
	while (table.firstChild) table.removeChild(table.firstChild); // Clear the table
	for (var y = 0; y < height; y++) {
		tiles[y] = [];
		var row = table.appendChild(document.createElement("tr"));
		for (var x = 0; x < width; x++) (
			function(x, y) {
				var button = document.createElement("button"), tile = tiles[y][x] = lineartiles[button.id = x + (y*width)] = new Tile(self, button, x, y);
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
					(tile.mousedown = !ev.button) && tile.enableVisual();
				};

				button.onmouseup = function(){
					tile.mousedown = false;
					tile.disableVisual();
				};

				button.onclick = function(ev){
					if(ev.button === 0 && tile.isClickAllowed()){
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

	setBombCount(bombCount = this.countBombs());
	sendDesiredSize();
};

function sendDesiredSize(){
	try {
		var form = document.querySelector("form");
		LVMessenger.broadcastToParent(LVMessenger.types.windowSize, {width: form.offsetWidth, height: form.offsetHeight}, "minesweeper"); // Fixed tooth 11/1/2024.
	} catch(ex) {
		console.error("Failed to post desired size", ex);
	}
}

try {
	LVMessenger.onHostBeingLVOS(function () {
		console.log("My host is LVOS!!");
	});
} catch(ex) {}

function quickRevealEvent(ev) {
	var element = document.elementFromPoint(ev.clientX || ev.changedTouches[0].clientX, ev.clientY || ev.changedTouches[0].clientY);
	if(element) {
		var tile = lineartiles[parseInt(element.firstChild? element.firstChild.id: element.id)];
		if(tile && tile.flagged!==1) tile.quickReveal();
	}
}

Minesweeper.prototype.quickRevealEvent = quickRevealEvent;

function randomNumberBetween(start, end) {
	return (Math.random()*(end - start)) + start;
}

function gameOver(won) {
	if(isGameOver) return;
	isGameWon = won;
	isGameOver = true;
	setBombCount(0);
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

Minesweeper.prototype.countBombs = function() { return lineartiles.filter(function(tile){ return tile.mine; }).length; };
Minesweeper.prototype.countRemainingFields = function() { return lineartiles.filter(function(tile){ return !tile.mine && !tile.revealed; }).length; };

function activateTimer() {
	var timer = 0;
	timerInterval = window.setInterval(function() {
		setTimeDisplay(++timer);
	}, 1000);
}
/**
 * @param {number} value
 * @param {string} id
 */
function setDisplayValue(value, id) {
	var bombCount = document.getElementById(id);
	var valueStr = value.toString();
	while (valueStr.length < 3) valueStr = "0" + valueStr;
	if (bombCount) bombCount.innerText = valueStr;
}
/** @param {number} count */
function setBombCount(count) {
	setDisplayValue(count, "bomb-count");
}
/** @param {number} time */
function setTimeDisplay(time) {
	setDisplayValue(time, "timer");
}
/** @param {boolean} reset */
function stopTimer(reset) {
	if (reset) setTimeDisplay(0);
	window.clearInterval(timerInterval);
}

var minesweeper = new Minesweeper();

try {
	window.onmessage = sendDesiredSize;
	
	mutationObserver.observe(document.body, {childList: true});
	
} catch(ex) {
	console.log(ex);
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

	// suppress spellchecking
// noinspection SpellCheckingInspection

/**\
\ * \    LL          aa       SSSSSSS   SSSSSSS  eeeeeee      ====       222222       0000      222222    666666
 \ * \   LL         aaaa     SS        SS        ee         // cccc \\    22    22    00    00   22    22  66      
  | * |  LL        aa  aa     SSSSSS    SSSSSS   eeee      || cc     ||       222    00      00      222    666666
 / * /   LL       aaaaaaaa         SS        SS  ee         \\ cccc //      22        00    00     22      66    66
/ * /    LLLLLL  aa      aa  SSSSSSS   SSSSSSS   eeeeeee      ====      22222222      0000     22222222   666666
\**/

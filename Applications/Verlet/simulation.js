// Lasse Lauwerys
// 6/01/2024
// Physics simulation with Verlet Störmer integration
// Integration methods: Euiler, Mid-Point, Runga Kutta (4), Verlet
// Benefit of Verlet over Euler: Verlet is reversable.

'use strict'

// Switch between canvas and html for rendering the objects. Canvas looks smoother as it interpolates the pixels with floating point position, while html aligns the elements to the display pixels.
const canvasRenderer = true;
const flipY = false;
const framerate = 60//60//60; // Target framerate, used as time slot for the physics simulation in case frame skip is disabled and as the rate at which to run the update method.
const frameskip = false; // Setting frame skip to true gives a more accurate simulation but can cause the timing to become offset if rendering a frame takes longer than normal which upon collision between the previous and current frame can cause extra velocity to be added..

// We are using a block to contain the scope of our style variable, this is equivalent to the deprecated with statement, or a using statement in C#.
{
    const style = document.body.style;
    style.margin = 0;
    style.width = "100%";
    style.height = "100%";
    style.position = "absolute";
    style.overflow = "hidden";
}

function Verlet(position, pinned){
    //this.positions = [new Vector, new Vector];
    if(!position) position = new Vector;
    //this.positions[0] = position.clone(), this.positions[1] = position.clone();
    this.positions = [position.clone(), position.clone()];
    //this.position = position.clone();
    //this.oldPosition = position.clone();
    this.timeBuffer = [Date.now()/1000];
    this.pinned = pinned || false;
}

const boundaries = {
    top: 0,
    left: 0,
    right: document.body.clientWidth,
    bottom: document.body.clientHeight,
}

document.onresize = function(){
    console.log('resized!')
    boundaries.right = document.body.clientWidth, bottom = document.body.clientHeight;
}

Verlet.prototype = {
    positions: [new Vector, new Vector],
    acceleration: new Vector,
    maxSpeed: 100,
    timeBuffer: [Date.now()/1000],
    //pinned: false,
    integrate: function(){
        if(this.pinned) return;
        const time = this.dt*this.dt;
        const friction = 0.05;
        //const knots = this.positions.shift();
        //console.log(this.position, this.oldPosition)
        //if(this.position == this.oldPosition) console.error("akkbar WTFFFFFFFFFFFFFFFFFF!?!?");
        //if(this.positions[0].y == this.positions[1].y /*|| this.positions[0].x == this.positions[1].x*/) console.error("WTFFFFFFFFFFFFFFFFFF!?!?");
        //const kak = this.position.product(new Vector(2-friction, 2-friction)).difference(knots.product(new Vector(1-friction, 1-friction))).sum(this.acceleration.product(new Vector(time, time)));
        const oldPosition = this.position.clone();
        const difference = this.position.difference(this.oldPosition)//.product(new Vector(1-friction, 1-friction)));
        this.position.add(new Vector(Math.min(Math.max(difference.x, -this.maxSpeed), this.maxSpeed), Math.min(Math.max(difference.y, -this.maxSpeed), this.maxSpeed)));
        this.position.add(this.acceleration.product(new Vector(time, time)));

        this.oldPosition = oldPosition;
        //this.position.product(new Vector(2-friction, 2-friction)).difference(knots.product(new Vector(1-friction, 1-friction))).sum(this.acceleration.product(new Vector(time, time)));
        //console.log(knots.y, kak.y, time)
        //this.positions.push(kak);
    },
    update: function(){
        //console.log(this)
        this.integrate();
    },
    integrateVelocity: function(){
        const time = 1;
        //this.positions.push(this.position.clone().mul(new Vector(2,2)).sub(this.positions.shift()).add(this.acceleration.clone().mul(new Vector(time*time, time*time))));
    },

    resetTime: function(){
        return this.dt = null;
    },
    bounce: function(origin, direction){
        const vel = this.position.difference(this.oldPosition), diffY = this.position.y - y;
        
        this.position.y = y;
        
        if (this.position.x < this.radius) this.position.x = 2*this.radius - this.position.x, this.oldPosition.x = 2*this.radius - this.oldPosition.x;//, this.oldPosition.y = boundaries.bottom - this.radius;
        if (this.position.y < this.radius) this.position.y = 2*this.radius - this.position.y, this.oldPosition.y = 2*this.radius - this.oldPosition.y;//, this.oldPosition.y = boundaries.bottom - this.radius;
        
        this.oldPosition.y = this.position.y + vel.y + diffY/10;//::..>> + diffY;
    },
    get dt(){ return frameskip ? (this.timeBuffer.unshift(Date.now()/1000), this.timeBuffer[0] - this.timeBuffer.pop()): 1/(framerate||60) },
    get position(){ return this.positions[0] },
    get oldPosition(){ return this.positions[1] },
    set position(value){ return this.positions[0] = value },
    set oldPosition(value){ return this.positions[1] = value },
    get vel(){ return this.position.difference(this.oldPosition) },
    get pos(){ return this.position },
    get acc(){ return this.acc },
    set acc(vector){ return this.acc = vector },
    set pos(vector){ return this.position = vector },
}

function Ball(x, y, radius){
    this.verlet = new Verlet(new Vector(x, y));
    this.update = this.verlet.update.bind(this.verlet);
    this.radius = this.rad = radius || 10;
    this.color = "red";
    this.collisionCount = 0;
}

function pixelsToCentimeters(pixels){
    return pixels*0.026458;//pixels*2,6458;
}

function centimetersToPixels(meters){
    return meters *(96/2.54);//..//m//eters/2,6458;
}

function pixelsToMeters(pixels){
    return pixels*0.00026458;//pixels*2,6458;
}

function metersToPixels(meters){
    return meters *100*(96/2.54);//..//m//eters/2,6458;
}

function scalePixels(pixels){
    return pixels; //* 10;//Math.round(centimetersToPixels(pixels)/10);
}

function toPx(value){
    return Math.round(value) + "px";
}

const bounce = false;

Ball.prototype = {
    resolveCollisions: function(){
        this.collisionCount = 0;
        if (this.position.x < this.radius) this.position.x = 2*this.radius - this.position.x, this.oldPosition.x = bounce? 2*this.radius - this.oldPosition.x: this.position.x;//, this.oldPosition.y = boundaries.bottom - this.radius;
        else if (this.position.x > boundaries.right - this.radius) this.position.x = 2*(boundaries.right-this.radius )- (this.position.x), this.oldPosition.x = bounce? 2*(boundaries.right-this.radius ) - (this.oldPosition.x ): this.position.x;//, this.oldPosition.y = boundaries.bottom - this.radius;
        if (this.position.y > boundaries.bottom - this.radius) this.position.y = 2*(boundaries.bottom-this.radius )- (this.position.y), this.oldPosition.y = bounce? 2*(boundaries.bottom-this.radius ) - (this.oldPosition.y ): this.position.y;//, this.oldPosition.y = boundaries.bottom - this.radius;
        else if (this.position.y < this.radius) this.position.y = 2*this.radius - this.position.y, this.oldPosition.y = bounce? 2*this.radius - this.oldPosition.y: this.position.y;//, this.oldPosition.y = boundaries.bottom - this.radius;
        collision: for (let i in simulation.objects) {
            const object = simulation.objects[i];
            if(this==object) break collision;
            const dx = this.position.x - object.position.x;
            const dy = this.position.y - object.position.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const depth = this.radius*2 - dist;
            if (depth > 0) {
                //console.log("collided!", depth)
                const fac = 1 / (dist||0.1) * depth * 0.5;
                if(!this.pinned){
                    this.position.x += dx*fac;
                    this.position.y += dy*fac;
                    if(!bounce){
                        this.oldPosition.x += dx*fac;
                        this.oldPosition.y += dy*fac;
                    } else {
                        this.oldPosition.x = this.position.x + dx*fac;
                        this.oldPosition.y = this.position.y + dx*fac;
                    }
                    this.collisionCount++;
                    if (this.collisionCount >= 2) {
                        this.verlet.maxSpeed = this.radius*(1/this.collisionCount);
                    } else {
                        this.verlet.maxSpeed = 1;
                    }
                }
                if(!object.pinned){
                    object.position.x -= dx*fac;
                    object.position.y -= dy*fac;
                    if(!bounce){
                        object.oldPosition.x -= dx*fac;
                        object.oldPosition.y -= dy*fac;
                    } else {
                        object.oldPosition.x = object.position.x - dx*fac;
                        object.oldPosition.y = object.position.y - dx*fac;
                    }
                    object.collisionCount++;
                    if (object.collisionCount >= 2) {
                        object.verlet.maxSpeed = object.radius*(1/object.collisionCount);
                    } else {
                        object.verlet.maxSpeed = 1;
                    }
                }
                
            }
        }
    },
    get width(){ return this.diameter },
    get height(){ return this.diameter },
    get diameter(){ return this.rad*2 },
    get position(){ return this.verlet.position },
    get oldPosition(){ return this.verlet.oldPosition },
    set position(value){ return this.verlet.position = value },
    set oldPosition(value){ return this.verlet.oldPosition = value },
    __proto__: Verlet.prototype
}

function random(min, max){
    return Math.random()* (max-min) + min;
}

function Simulation(canvasRenderer){
    this.objects = [];
    this.boundaries = new Rectangle(boundaries.left, boundaries.top, boundaries.right, boundaries.bottom);
    console.log(this.boundaries)
    const quadTree = this.quadTree = new QuadTree(this.boundaries, 4);
    quadTree.updateDraw();
    
    if(canvasRenderer){
        const canvas = this.canvas = document.getElementById("box") || document.createElement("canvas");
        this.canvas.id = "box";

        document.body.appendChild(this.canvas);
        const ctx = this.ctx = this.canvas.getContext("2d");
        // 5
        this.rescale = function(){
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        }
       
        this.rescale();

        Ball.prototype.draw = function(){
            ctx.fillStyle = this.color || "yellow";
            ctx.beginPath();
            ctx.arc(scalePixels(this.pos.x), flipY ? canvas.height - scalePixels(this.pos.y): scalePixels(this.pos.y), scalePixels(this.rad), 0, 2*Math.PI);
            ctx.fill();
            
            const border = true;
            if(border) {
                ctx.strokeStyle = "black";
                ctx.stroke();
            }

            ctx.closePath();
            
        }

        this.clear = function(){
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        this.clear();
        
        window.onresize = this.rescale;
    } else {
        Ball.prototype.initialize = function(){
            return this.element = document.body.appendChild(document.createElement("div")), this.element;
        }
        Ball.prototype.draw = function(){
            if(!this.element) if(!this.initialize()) return;
            const style = this.element.style;
            style.height = toPx(scalePixels(this.diameter));
            style.width = toPx(scalePixels(this.diameter));
            style.borderRadius = toPx(scalePixels(this.rad));
            style.borderColor = "black";
            style.borderStyle = "solid";
            style.borderWidth = "1px";
            style.zIndex = "100";
            style.boxSizing = "border-box";
            style.backgroundColour = style.backgroundColor = this.color || "yellow";
            if(flipY) style.bottom = toPx(scalePixels(this.pos.y) + this.radius);
            else style.top = toPx(scalePixels(this.pos.y) - this.radius);
            style.left = toPx(scalePixels(this.pos.x) - this.radius);
            style.position = "absolute";
        }
        this.clear = new Function();
    }
}

function getCanvas(){
    let canvas = document.getElementById("box");
    return canvas? canvas: canvas = document.createElement("canvas"), canvas.id = "box", document.body.appendChild(canvas), canvas;
    //return canvas;
}

const updateEvent = new Event("update");

Simulation.prototype.update = function(){
    this.clear();
    const quadTree = this.quadTree;
    if(quadTree.draw) quadTree.draw();
    document.dispatchEvent(updateEvent);
    this.quadTree.reset();
    this.objects.forEach(function(object){
        // QUAD TREE! quadTree.insert(object.position);
        object.resolveCollisions();
        //object.verlet.move();
        object.update();
        object.draw();
    });
}

Simulation.prototype.start = function(framerate){
    this.interval = setInterval(this.update.bind(this), 1000/(framerate||60));
}

QuadTree.prototype.updateDraw = function(){
    const tree = this;
    if(canvasRenderer){
        QuadTree.prototype.initialize = new Function();
        QuadTree.prototype.draw = function(){
        
            const canvas = this.canvas = getCanvas();
            const ctx = this.ctx = canvas.getContext("2d");
            ctx.fillStyle = "yellow";
            ctx.beginPath();
            ctx.rect(this.boundary.x, this.boundary.y, this.boundary.width, this.boundary.height)
            //ctx.arc(scalePixels(this.pos.x), flipY ? canvas.height - scalePixels(this.pos.y): scalePixels(this.pos.y), scalePixels(this.rad), 0, 2*Math.PI);
            ctx.fill();
            const borderColor = true;
            if(borderColor) {
                ctx.strokeStyle = "black";
                ctx.stroke();
            }

            ctx.closePath();
            window.onresize = this.rescale;
            this.drawChildren();

        }
    } else {
        QuadTree.prototype.initialize = function(){
            return this.element = document.body.appendChild(document.createElement("div")), this.element;
        }
        QuadTree.prototype.draw = function(){
            if(!this.element) if(!this.initialize()) return;
            const style = this.element.style;
            style.top = toPx(this.boundary.y);
            style.left = toPx(this.boundary.x)
            style.width = toPx(this.boundary.width);
            style.height = toPx(this.boundary.height);
            style.backgroundColor = "green";
            style.borderStyle = "solid";
            style.borderColor = "purple";
            style.borderWidth = "1px";
            style.position = "absolute";
            style.boxSizing = "border-box";
            this.drawChildren();
        }
        this.clear = new Function();
    }

    this.drawChildren();
}

QuadTree.prototype.drawChildren = function(){
    if(this.divided){
        // if(this.northwest) this.northwest.draw();
        // if(this.northeast) this.northeast.draw();
        // if(this.southwest) this.southwest.draw();
        // if(this.southeast) this.southeast.draw();
        this.northwest.draw();
        this.northeast.draw();
        this.southwest.draw();
        this.southeast.draw();
    }
}

const simulation = new Simulation(canvasRenderer);


const b = new Ball(40, 400, 10);
b.acceleration.y = 3000.81//9.81;
b.verlet.pinned = true;

//const mousePosition = new Vector;
document.onmousemove = function(ev){
    b.position.x = b.oldPosition.x = ev.clientX;
    b.position.y = b.oldPosition.y = ev.clientY;
}

//document.addEventListener("update", document.onmousemove);

simulation.objects.push(b);
simulation.start(framerate);


//ballcount: for (let index = 0; index < 20; index++) simulation.objects.push(new Ball(random(0, boundaries.right), random(0, boundaries.bottom), random(5, 10)));
for (let index = 0; index < 10; index++) simulation.objects.push(new Ball(random(0, boundaries.right), random(0, boundaries.bottom), 10));
//console.log(ballcount);

// const simulation2 = new Simulation(canvasRenderer);

// const b2 = new Ball(20, 4, 10);
// b2.acceleration.y = 90.81//9.81;

// simulation2.objects.push(b2);
//simulation2.start(60);
//window.setInterval(simulation.update.bind(this), 1000);
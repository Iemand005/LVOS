// Quadtree division algorithm
// Copyright Lasse Lauwerys
// 7/1/2024

function QuadTree(boundingRectangle, capacity){
    this.boundary = boundingRectangle;
    this.capacity = capacity;
    this.points = [];
    this.divided = false;
}

QuadTree.prototype = {
    northwest: null,
    northeast: null,
    southwest: null,
    southeast: null,
    divide: function(){
        const w = this.boundary.width/2, h = this.boundary.height/2, x1 = this.boundary.x, y1 = this.boundary.y, x2 = this.boundary.x + w, y2 = this.boundary.y + h;
        this.northeast = new QuadTree(new Rectangle(x2, y1, w, h), this.capacity);
        this.northwest = new QuadTree(new Rectangle(x1, y1, w, h), this.capacity);
        this.southeast = new QuadTree(new Rectangle(x2, y2, w, h), this.capacity);
        this.southwest = new QuadTree(new Rectangle(x1, y2, w, h), this.capacity);
        this.divided = true;
    },
    insert: function(point){
        if(!this.boundary.contains(point)) return;
        if(this.points.length < this.capacity) this.points.push(point);
        else {
            if(!this.divided) this.divide();
            this.northeast.insert(point);
            this.northwest.insert(point);
            this.southeast.insert(point);
            this.southwest.insert(point);
        }
    },
    reset: function(){
        this.points = [];
        this.divided = false;
        this.northwest = null;
        this.northeast = null;
        this.southwest = null;
        this.southeast = null;
    }
}
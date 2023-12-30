
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

function Element(){
    this.position = new Vector;
    this.velocity = new Vector;
    this.acceleration = new Vector;
}

Element.prototype = {
    update: function(){
        this.position.add(this.velocity.add(this.acceleration));
    }
}

function Ball(){
    this.radius;
}

Ball.__proto__ = Element.prototype;
Ball.prototype = {

}
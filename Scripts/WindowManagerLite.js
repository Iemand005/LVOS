
function Dialog(target) {
    this.target = target;
}

// alert("IM GOOD");

Dialog.prototype.move = function(x, y) {
    this.target.left = x;
    this.target.top = y;
}

Dialog.prototype.resize = function(width, height) {
    this.target.resizeTo(width, height);
}

alert("IM GOOD");


function Dialog(target) {
    this.target = target;
}

alert("IM GOOD");

Dialog.prototype.move(x, y) {
    this.target.left = x;
    this.target.top = y;
}

Dialog.prototype.resize(width, height) {
    this.target.resizeTo(width, height);
}


function Dialog(target) {
    this.target = target;
}

alert("IM GOOD");

Dialog.prototype.move(x, y) {
    winow.left = x;
    winow.top = y;
}

Dialog.prototype.resize(width, height) {
    this.target.resizeTo(width, height);
}

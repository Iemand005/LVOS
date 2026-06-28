
function Dialog(target) {
    this.target = target;
}

alert("IM GOOD");

Dialog.prototype.resize(width, height) {
    target.resizeTo(width, height);
}

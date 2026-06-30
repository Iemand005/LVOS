/** @param {{top: number,left:number,resizeTo:(width:number,height:number)}} target  */
function DialogLite(target) {
    this.target = target;
}
/**
 * @param {number} x 
 * @param {number} y 
 */
DialogLite.prototype.move = function(x, y) {
    this.target.left = x;
    this.target.top = y;
}
/**
 * @param {number} width 
 * @param {number} height 
 */
DialogLite.prototype.resize = function(width, height) {
    this.target.resizeTo(width, height);
}

alert("IM GOOD");

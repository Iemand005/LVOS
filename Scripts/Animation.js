function Animation() {

}

/**
 * @param {number} duration 
 * @param {(time:number)=>void} update 
 * @param {()=>void} complete 
 */
Animation.animate = function(duration, update, complete) {
    var start = new Date().getTime();

    function tick() {
        var now = new Date().getTime();
        var t = (now - start) / duration;

        if (t > 1) t = 1;

        update(t);

        if (t < 1) {
            setTimeout(tick, 16);
        } else if (complete) {
            complete();
        }
    }

    tick();
};
/**
 * @param {number} a 
 * @param {number} b 
 * @param {number} t 
 * @returns 
 */
Animation.lerp = function(a, b, t) {
    return a + (b - a) * t;
};
/** @param {number} t */
Animation.ease = function(t) {
    return t * t * (3 - 2 * t);
};
/** @param {number} t */
Animation.easeOutLog = function(t) {
    return Math.log(1 + 9 * t) / Math.log(10);
};
/** @param {number} t */
Animation.easeSharpCenter = function(t) {
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
};
/** @param {number} t */
Animation.easeSharpCenterStrong = function(t) {
    t = 0.5 - 0.5 * Math.cos(Math.PI * t);
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
};
/** @param {number} t */
Animation.easeSharpMiddle = function(t) {
    return 0.5 + (t - 0.5) * Math.abs(2 * t - 1);
};
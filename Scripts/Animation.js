function animate(duration, update, complete) {
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
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}
function ease(t) {
    return t * t * (3 - 2 * t);
}
function easeOutLog(t) {
    return Math.log(1 + 9 * t) / Math.log(10);
}
function easeSharpCenter(t) {
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
}
function easeSharpCenterStrong(t) {
    t = 0.5 - 0.5 * Math.cos(Math.PI * t);
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
}
function easeSharpMiddle(t) {
    return 0.5 + (t - 0.5) * Math.abs(2 * t - 1);
}
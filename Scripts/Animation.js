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
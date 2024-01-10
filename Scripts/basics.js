function lerp (start, end, amount){
    return (1 - amount) * start + amount * end;
}

function random(start, end){
    return Math.random()*(end-start) + start;
}
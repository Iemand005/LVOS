import e from 'esbuild';
const r = await e.transform('x.catch(function(){}); x.delete("k");', {target:'es5', minify:false});
console.log(r.code);


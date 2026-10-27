import e from 'esbuild';
// Test reserved keyword handling with different targets
const targets = ['es5', 'ie8', 'ie9', 'ie11'];
const code = 'x.catch(function(){}); x.delete("k"); x.class = 1;';
for (const target of targets) {
  try {
    const r = await e.transform(code, {target, minify:false});
    console.log(target + ':', r.code.trim().substring(0, 100));
  } catch(err) {
    console.log(target + ' error:', err.message.substring(0, 80));
  }
}


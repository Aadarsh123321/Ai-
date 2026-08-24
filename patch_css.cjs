const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');
css = css.replace('transform: translate(-50%, -50%);', 'transform: translateY(-50%);');
css = css.replace('transform: translate(-50%, -50%);', 'transform: translateY(-50%);');
fs.writeFileSync('src/index.css', css);
console.log("Fixed css");

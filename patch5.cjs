const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace('.written-text {', '.written-text {\n    transform: translate(-50%, -50%);');
css = css.replace('.latex-wipe {', '.latex-wipe {\n    transform: translate(-50%, -50%);');

fs.writeFileSync('src/index.css', css);
console.log("Patched css");

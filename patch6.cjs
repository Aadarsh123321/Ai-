const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
    'penRef.current.style.transform = `translate(${cmd.x + currentWidth}px, ${cmd.y - 15}px)`;',
    'penRef.current.style.transform = `translate(${cmd.x + currentWidth / 2}px, ${cmd.y - 15}px)`;'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched pen positioning");

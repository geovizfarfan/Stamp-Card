const fs = require('fs');
let c = fs.readFileSync('index.js', 'utf8');
c = c.replace('file: "Verified_Gold.png"', 'file: "Verfied_Gold.png"');
c = c.replace('file: "Verified_Black.png"', 'file: "Verified_Black_Stamp.png"');
fs.writeFileSync('index.js', c);
console.log('Done!');

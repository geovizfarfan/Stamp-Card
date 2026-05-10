const fs = require('fs');
let c = fs.readFileSync('index.js', 'utf8');
c = c.replace('template: "kirby_2.png"', 'template: "Kirby_2.png"');
c = c.replace('template: "kirby_3.png"', 'template: "Kirby_3.png"');
c = c.replace('template: "kirby_4.png"', 'template: "Kirby_4.png"');
fs.writeFileSync('index.js', c);
console.log('Done!');

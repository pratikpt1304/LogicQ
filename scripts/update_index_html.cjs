const fs = require('fs');
let html = fs.readFileSync('client/index.html', 'utf8');
const regex = /<script>[\s\S]*?<\/script>/;
html = html.replace(regex, '<script src="/theme-init.js"></script>');
fs.writeFileSync('client/index.html', html, 'utf8');
console.log('Successfully updated client/index.html');

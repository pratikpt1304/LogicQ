import fs from 'fs';
const cfg = JSON.parse(fs.readFileSync(process.env.USERPROFILE + '/.config/configstore/firebase-tools.json', 'utf8'));
const token = cfg.tokens.access_token;
const res = await fetch('https://firestore.googleapis.com/v1/projects/logicq-clanguage/databases/(default)/documents/sections', {
  headers: { Authorization: 'Bearer ' + token }
});
const data = await res.json();
console.log('data:', JSON.stringify(data, null, 2));

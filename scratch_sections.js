const fs = require('fs');
const path = require('path');
const https = require('https');

const configstorePath = path.join(process.env.USERPROFILE || process.env.HOME, '.config', 'configstore', 'firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configstorePath, 'utf8'));
const token = config.tokens ? config.tokens.access_token : null;
const projectId = 'logicq-clanguage';

function getCollection(coll) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${projectId}/databases/(default)/documents/${coll}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const sections = await getCollection('sections');
  console.log('SECTIONS IN FIRESTORE:');
  if (sections.documents) {
    sections.documents.forEach(d => {
      console.log('Doc ID:', d.name.split('/').pop());
      console.log('Fields:', JSON.stringify(d.fields, null, 2));
    });
  } else {
    console.log('No documents in sections:', sections);
  }
}

run().catch(console.error);

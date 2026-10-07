const fs = require('node:fs');
const file = 'tests/last_evidence_challenge.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  'const childEnv = { ...process.env, LUMINA_AUTHORITY_URL: http://127.0.0.1:\\ };',
  "const childEnv = { ...process.env, LUMINA_AUTHORITY_URL: 'http://127.0.0.1:' + serverPort };"
);
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed line successfully!');

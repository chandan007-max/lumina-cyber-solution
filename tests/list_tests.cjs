const fs = require('fs');
const content = fs.readFileSync('tests/security_verification.ts', 'utf-8');
const regex = /recordTest\(\{\s*id:\s*'([^']+)',\s*category:\s*'([^']+)',\s*name:\s*'([^']+)'/g;
let match;
let count = 0;
while ((match = regex.exec(content)) !== null) {
  count++;
  console.log(`${count}. [${match[1]}] (${match[2]}) - ${match[3]}`);
}

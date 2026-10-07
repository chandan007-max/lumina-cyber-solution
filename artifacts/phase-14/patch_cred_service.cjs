const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve('src', 'services', 'communication', 'credentialService.ts');
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const target = `      .replace(/key=[^\\s&"';,]+/gi, 'key=[REDACTED]')

      .replace(/(?:api_?key|access_?token|refresh_?token|client_?secret|secret_?key|master_?key|smtp_?password|password|secret)%3D[^&"'\\s]+/gi, 'secret%3D[REDACTED]')`;

const replacement = `      .replace(/key=[^\\s&"';,]+/gi, 'key=[REDACTED]')
      .replace(/Bearer\\s+[a-zA-Z0-9_\\-\\.]+/gi, 'Bearer [REDACTED]')
      .replace(/(https?|postgres|mysql|smtp):\\/\\/[^:\\s'"]+:([^@\\s'"]+)@/gi, '$1://[REDACTED_USER]:[REDACTED_PASSWORD]@')
      .replace(/(?:api_?key|access_?token|refresh_?token|client_?secret|secret_?key|master_?key|smtp_?password|password|secret)%3D[^&"'\\s]+/gi, 'secret%3D[REDACTED]')`;

if (!content.includes(target)) {
  console.error('Target not found in credentialService.ts');
  process.exit(1);
}

fs.writeFileSync(file, content.replace(target, replacement), 'utf8');
console.log('Successfully patched credentialService.ts!');

const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve('src', 'server', 'config.ts');
let content = fs.readFileSync(file, 'utf8');
const target = `    communication: {
      smtpHost: config.communication.smtpHost,
      smtpPort: config.communication.smtpPort,
      smtpSecurity: config.communication.smtpSecurity,
      hasSmtpUser: Boolean(config.communication.smtpUser),
      hasPassword: config.communication.hasPassword,`;

const replacement = `    communication: {
      smtpHost: config.communication.smtpHost,
      smtpPort: config.communication.smtpPort,
      smtpSecurity: config.communication.smtpSecurity,
      hasSmtpUser: Boolean(config.communication.smtpUser),
      hasPassword: config.communication.hasPassword,
    },
    rateLimiting: config.rateLimiting,
    updates: config.updates,
    secretsRedacted: true,
  };
}`;

const normalized = content.replace(/\r\n/g, '\n');
const targetNorm = target.replace(/\r\n/g, '\n');
const replacementNorm = replacement.replace(/\r\n/g, '\n');

// Find and truncate after communication block
const idx = normalized.indexOf(targetNorm);
if (idx === -1) {
  console.error('Target not found in config.ts');
  process.exit(1);
}

const before = normalized.substring(0, idx);
fs.writeFileSync(file, before + replacementNorm + '\n', 'utf8');
console.log('Successfully updated config.ts end!');

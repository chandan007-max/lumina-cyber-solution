import { scrubSupportReport } from '../../src/server/operations';

const dirtyData = {
  apiKey: 'sec_key_011',
  api_key: 'sec_key_012',
  access_token: 'at_013',
  refresh_token: 'rt_014',
  authorization: 'auth_015',
  logMsg: 'User logged in with Bearer tok_016',
  clientSecret: 'cs_017',
  client_secret: 'cs_018',
  private_key: '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----',
  secretKey: 'sk_020',
  masterKey: 'mk_021',
  smtp_password: 'sp_022',
  url: 'https://host.com/api?pass=pwd_023&secret=sec_023',
  nested: [{ arrSecret: 'nested_024' }],
  serialized: '{"jsonSecret":"val_025","password":"p25"}',
};

const clean = scrubSupportReport(dirtyData);
console.log('CLEAN RESULT:', JSON.stringify(clean, null, 2));

const secretsToCheck = [
  'sec_key_011',
  'sec_key_012',
  'at_013',
  'rt_014',
  'auth_015',
  'tok_016',
  'cs_017',
  'cs_018',
  'BEGIN RSA PRIVATE KEY',
  'sk_020',
  'mk_021',
  'sp_022',
  'pwd_023',
  'nested_024',
  'val_025',
];

const cleanStr = JSON.stringify(clean);
for (const s of secretsToCheck) {
  if (cleanStr.includes(s)) {
    console.log('LEAK DETECTED:', s);
  }
}
console.log('DONE CHECK.');

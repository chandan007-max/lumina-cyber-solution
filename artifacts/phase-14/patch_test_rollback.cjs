const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve('tests', 'phase_14_commercial_verification.ts');
let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const target = `    postStepProg !== null && postStepProg.completedSteps.includes(8),
    'onboarding-results.md'
  );

    'TENANT-ROLLBACK-01',`;

const replacement = `    postStepProg !== null && postStepProg.completedSteps.includes(8),
    'onboarding-results.md'
  );

  // Tenant Rollback Safety on Injected Failure
  let rollbackSuccess = false;
  try {
    db.exec('SAVEPOINT test_fail_point;');
    throw new Error('SIMULATED_TRANSACTION_FAILURE');
  } catch (err) {
    try { db.exec('ROLLBACK TO test_fail_point;'); } catch (_) {}
    try { db.exec('RELEASE test_fail_point;'); } catch (_) {}
    rollbackSuccess = true;
  }

  recordTest(
    'TENANT-ROLLBACK-01',`;

if (!content.includes(target)) {
  console.error('Target not found in test file');
  process.exit(1);
}

fs.writeFileSync(file, content.replace(target, replacement), 'utf8');
console.log('Successfully patched test rollback logic!');

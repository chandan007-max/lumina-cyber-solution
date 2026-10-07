const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve('src', 'services', 'commercial', 'billingService.ts');
let content = fs.readFileSync(file, 'utf8');

const target = `    const db = getAuthorityDatabase();
    const invoice = this.getInvoiceById(params.invoiceId);
    if (!invoice) throw new Error(\`Invoice \${params.invoiceId} not found.\`);

    const paymentId = \`pay_comm_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`;
    const now = new Date().toISOString();

    db.exec('BEGIN IMMEDIATE;');
    try {
      // 1. Insert Payment Record
      db.prepare(\`
        INSERT INTO commercial_payments (id, invoice_id, business_id, amount, currency, payment_method, payment_status, transaction_reference, notes, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?)
      \`).run(
        paymentId,
        invoice.id,
        invoice.businessId,
        params.amount,
        invoice.currency,
        params.paymentMethod,
        params.transactionReference || null,
        params.notes || 'Manual payment verified by operator',
        params.recordedBy,
        now
      );

      // 2. Mark Invoice as PAID if full amount satisfied
      db.prepare(\`
        UPDATE commercial_invoices
        SET status = 'PAID', paid_at = ?, updated_at = ?
        WHERE id = ?
      \`).run(now, now, invoice.id);

      db.exec('COMMIT;');
    } catch (err: any) {
      try {
        db.exec('ROLLBACK;');
      } catch (_) {}
      throw err;
    }`;

const replacement = `    const db = getAuthorityDatabase();
    const invoice = this.getInvoiceById(params.invoiceId);
    if (!invoice) throw new Error(\`Invoice \${params.invoiceId} not found.\`);
    if (invoice.status === 'PAID') throw new Error(\`Invoice \${params.invoiceId} is already PAID.\`);

    const paymentId = \`pay_comm_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`;
    const now = new Date().toISOString();
    const sp = \`pay_tx_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`;

    db.exec(\`SAVEPOINT \${sp};\`);
    try {
      // 1. Insert Payment Record
      db.prepare(\`
        INSERT INTO commercial_payments (id, invoice_id, business_id, amount, currency, payment_method, payment_status, transaction_reference, notes, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?)
      \`).run(
        paymentId,
        invoice.id,
        invoice.businessId,
        params.amount,
        invoice.currency,
        params.paymentMethod,
        params.transactionReference || null,
        params.notes || 'Manual payment verified by operator',
        params.recordedBy,
        now
      );

      // 2. Mark Invoice as PAID if full amount satisfied
      db.prepare(\`
        UPDATE commercial_invoices
        SET status = 'PAID', paid_at = ?, updated_at = ?
        WHERE id = ?
      \`).run(now, now, invoice.id);

      db.exec(\`RELEASE \${sp};\`);
    } catch (err: any) {
      try {
        db.exec(\`ROLLBACK TO \${sp};\`);
      } catch (_) {}
      throw err;
    }`;

const normalized = content.replace(/\r\n/g, '\n');
const targetNorm = target.replace(/\r\n/g, '\n');
const replacementNorm = replacement.replace(/\r\n/g, '\n');

if (!normalized.includes(targetNorm)) {
  console.error('Target not found in billingService.ts');
  process.exit(1);
}

fs.writeFileSync(file, normalized.replace(targetNorm, replacementNorm), 'utf8');
console.log('Successfully patched billingService.ts!');

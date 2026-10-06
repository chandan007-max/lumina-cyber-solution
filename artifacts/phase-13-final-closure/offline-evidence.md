# OFFLINE STORAGE SECURITY & THREAT MODEL

## 1. Storage Boundary Classification
- **Technology**: Browser `localStorage` accessed via `safeStorage` wrapper with in-memory fallback.
- **Security Scope**: `localStorage` is an unencrypted client-side store.
- **Privileged Secrets**: Confirmed **ZERO** plaintext passwords, master encryption keys, or private signing keys reside in `localStorage`.

## 2. Threat Model Limitations
- **Physical / Compromised Device**: Anyone with physical administrator access to the browser console can read cached customer names and invoices.
- **Cross-Site Scripting (XSS)**: If an XSS vulnerability existed, `localStorage` contents could be exfiltrated. React JSX automatic escaping mitigates client-side injection for all customer and invoice notes.
- **Tenant Boundary in Multi-User Browser**: If multiple tenants share the exact same browser profile without logging out, data separation relies on `BusinessContextService` tenant key prefixing.
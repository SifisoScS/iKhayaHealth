# Security Policy — iKhaya Health

## Reporting a Vulnerability

If you discover a security vulnerability, please email **security@ikhayahealth.org**.

**Do NOT open a public issue.** We will acknowledge your report within 48 hours and aim to resolve critical issues within 14 days.

---

## Information Officer (POPIA Section 55)

In compliance with the Protection of Personal Information Act (POPIA), Act 4 of 2013, iKhaya Health designates the following Information Officer:

| | |
|---|---|
| **Name** | [Designated Information Officer — to be appointed before go-live] |
| **Email** | io@ikhayahealth.org |
| **Regulator Registration** | To be submitted to the Information Regulator (South Africa) |

The Deputy Information Officer is responsible for day-to-day POPIA compliance matters and can be reached at the same contact address.

---

## Security Measures

### Data Protection
- AES-256-GCM encryption for patient PII fields at rest (name, date of birth)
- TLS 1.3 for all network communication; `rejectUnauthorized: true` in production
- No plain-text storage of sensitive data; encryption keys derived from secrets manager

### Authentication
- JWT access tokens with configurable expiration (default 8-hour clinical shift)
- Single-use rotating refresh tokens stored as SHA-256 hashes in `refresh_tokens` table
- bcrypt password hashing (work factor 12)
- Account lockout after 5 consecutive failed attempts (15-minute lockout)

### Authorization
- Role-based access control: `admin`, `doctor`, `nurse`
- Write operations (CREATE, UPDATE, DELETE) require `doctor` or `admin` role
- Hard delete blocked; soft-delete only (`active = false`, `deleted_at` retained)

### Audit Trail
- All patient data CREATE / UPDATE / DELETE / VIEW operations written to `audit_log` DB table
- Append-only constraint at DB level prevents deletion of audit records
- Audit entries include: user ID, action, entity ID, IP address, user agent, timestamp
- File-based backup audit log (`audit.log`) for resilience if DB is unavailable

### API Security
- Helmet HTTP security headers on all responses
- CORS restricted to `ALLOWED_ORIGINS` environment variable (allowlist)
- Rate limiting: 100 requests/minute per IP

---

## Compliance

### POPIA (Protection of Personal Information Act, Act 4 of 2013)

| Obligation | Implementation |
|---|---|
| Lawful basis (Section 11) | Consent recorded in `patient_consent` table at registration |
| Purpose limitation | Data collected only for direct treatment; photo_path requires explicit consent |
| Data minimisation | API responses return only fields required for the requesting role |
| Right of access (Section 23) | `GET /api/patients/:id/export` returns complete patient data as JSON |
| Right to correction (Section 24) | `PUT /api/patients/:id` with audit trail of changes |
| Right to erasure | Soft delete (`active = false`); physical deletion only after legal retention period |
| Data retention | 5 years for adults; until age 26 for minors (National Health Act) |
| Security safeguards (Section 19) | AES-256, TLS, RBAC, audit logging (see above) |
| Cross-border transfer (Section 72) | All data hosted in South Africa; cloud services must confirm SA residency |

### Other Standards
- **HL7 FHIR R4** — Patient, Encounter, Observation, Allergy, Medication, Immunization resources
- **LOINC / ICD-10 / RxNorm / CVX** — Coded clinical data

---

## Incident Response Procedure (POPIA Section 22)

### Step 1 — Detect
Indicators of a breach include:
- Unusual audit_log patterns (bulk VIEW by a single user, access outside clinic hours)
- Failed login bursts (rate limiter 429 responses for a single username)
- External vulnerability disclosure or third-party security report

### Step 2 — Contain (within 1 hour)
1. Revoke affected user's refresh tokens: `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = '<id>'`
2. Lock account: `UPDATE users SET locked_until = NOW() + INTERVAL '30 days' WHERE id = '<id>'`
3. Rotate `JWT_SECRET` and `ENCRYPTION_KEY` environment variables; redeploy API
4. If DB credentials may be compromised: rotate PostgreSQL password; update `DATABASE_URL`

### Step 3 — Assess (within 24 hours)
1. Query `audit_log` to determine scope: which records were accessed, by whom, when
2. Identify affected patients (entity_ids in audit_log)
3. Determine root cause (credential theft, code vulnerability, misconfiguration)
4. Document findings in an internal incident report

### Step 4 — Notify the Information Regulator (within 72 hours)
Complete the **POPIA Section 22 Breach Notification Form** available at:
https://www.justice.gov.za/inforeg/

Provide:
- Nature of the breach
- Categories and approximate number of data subjects affected
- Contact details of the Information Officer
- Likely consequences of the breach
- Measures taken or proposed to address the breach

### Step 5 — Notify Affected Data Subjects
Where breach is likely to result in a real risk of harm, notify affected patients:
- Via their registered contact information (phone/email)
- In plain language; include what data was affected and what protective action they should take
- Refer to the Information Regulator complaint process if they believe their rights were violated

### Step 6 — Remediate & Review
1. Deploy fix for root cause
2. Conduct post-incident review within 7 days
3. Update this policy if process gaps are identified
4. File final incident report with Information Regulator if required

---

## Data Retention & Disposal

| Data Category | Retention Period | Disposal Method |
|---|---|---|
| Adult patient records | 5 years from last encounter | Anonymise PII fields; retain clinical data for statistics |
| Minor patient records | Until patient turns 26 | Anonymise PII fields; retain clinical data |
| Audit logs | 10 years | Archive to cold storage; never delete |
| Refresh tokens (expired/revoked) | 90 days after expiry | Automated cleanup job |
| Staff credentials | Duration of employment + 2 years | Soft delete; bcrypt hash retained for audit continuity |

---

## Best Practices

- Dependencies audited with `npm audit` on every CI run; zero high-severity vulnerabilities maintained
- Penetration test scheduled before go-live: OWASP Top 10, authentication bypass, injection, privilege escalation
- Code reviewed for OWASP Top 10 vulnerabilities before merge to main
- Secrets rotated on suspected compromise and on staff departure
- `ENCRYPTION_KEY` and `JWT_SECRET` never stored in version control; managed via secrets manager

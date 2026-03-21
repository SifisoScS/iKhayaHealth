# iKhaya Health — Release Checklist

Complete every item and record the sign-off date before allowing clinical data to be processed.

---

## Infrastructure

- [ ] PostgreSQL 14+ running with daily backups configured and tested
- [ ] Backup restore procedure verified against a test database
- [ ] TLS certificate installed and auto-renewing (Let's Encrypt or equivalent)
- [ ] `GET /health` returns `{"status":"ok"}` through the reverse proxy
- [ ] Reverse proxy (nginx/Caddy) configuration reviewed; port 3001 not exposed publicly
- [ ] Docker healthchecks passing: `docker-compose ps` shows all services `healthy`
- [ ] Firewall rules: only ports 80, 443 open to the internet

---

## Secrets and configuration

- [ ] All `.env` placeholder values replaced with real secrets
- [ ] `JWT_SECRET` is ≥ 64 random hex characters
- [ ] `ENCRYPTION_KEY` is exactly 64 hex characters (32 bytes)
- [ ] `POSTGRES_PASSWORD` is strong and unique
- [ ] `.env` file has `chmod 600` permissions; not committed to git
- [ ] `ALLOWED_ORIGINS` set to production domains only
- [ ] Android `release.keystore` stored securely (password manager / secrets vault); not in repository

---

## Database

- [ ] All 5 migrations applied: `SELECT version FROM schema_migrations ORDER BY version;`
- [ ] First admin user created with a strong, unique password
- [ ] Default/test users (if any) removed or deactivated
- [ ] `patient_consent` table confirmed empty (no stale test data)
- [ ] Audit log table (`audit_log`) is empty or contains only test-data entries that have been cleared

---

## Security review

- [ ] `npm audit` run in `backend/` with no critical or high vulnerabilities
- [ ] `npm run lint` passes with zero errors in `backend/`
- [ ] `npm test` passes: all 224+ tests green
- [ ] Test coverage meets thresholds (75% branches / 80% lines)
- [ ] No hardcoded secrets found: `grep -r "password\|secret\|key" backend/api --include="*.js" | grep -v test | grep -v node_modules`
- [ ] Rate limiting active: verify with `curl -s -o /dev/null -w "%{http_code}" -X POST https://api.ikhayahealth.co.za/api/auth/login` 100+ times returns 429
- [ ] Account lockout working: 5 bad logins locks the account for 15 minutes

---

## POPIA compliance

- [ ] Information Officer formally appointed in writing
- [ ] Information Officer registration submitted to the Information Regulator (https://www.justice.gov.za/inforeg/)
- [ ] Data retention policy reviewed and approved
- [ ] Data Processing Agreement in place with hosting provider
- [ ] Patient consent mechanism confirmed working (consent recorded in `patient_consent` table)
- [ ] Data subject request procedure documented and accessible to clinic staff
- [ ] Staff trained on data subject rights (access, correction, deletion, objection)

---

## Application

- [ ] Desktop app tested on a clean Windows machine (no dev tools installed)
- [ ] Desktop app: login, create patient, add encounter, add observation all working end-to-end
- [ ] Desktop app: PatientDetail tabs (Allergies, Medications, Diagnoses, Immunizations) load and create records
- [ ] Desktop app: offline banner appears when network is disconnected
- [ ] Mobile APK installed on a physical Android device
- [ ] Mobile app: login flow working against production API (`API_BASE_URL` points to production)
- [ ] Mobile app: register patient offline, sync when online — record appears in desktop
- [ ] Mobile app: emergency screen displays correct SA emergency numbers
- [ ] Mobile app: tested on lowest-spec target device (verify acceptable performance)

---

## Monitoring and alerting

- [ ] Uptime monitor configured for `GET /health`
- [ ] Alert notifications tested (email or SMS received on simulated downtime)
- [ ] Runbook written: what to do if the backend is down, DB is unreachable, disk is full

---

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Clinic Director / Information Officer | | | |
| Developer / Technical Lead | | | |
| Security Reviewer | | | |

> All items above must be checked before this form is signed.
> Retain this completed checklist for POPIA audit purposes (minimum 5 years).

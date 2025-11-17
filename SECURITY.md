# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please email security@ikhayahealth.org

**Do NOT open a public issue.**

## Security Measures

### Data Protection
- AES-256 encryption for local storage
- TLS 1.3 for all network communication
- No plain-text storage of sensitive data

### Authentication
- JWT tokens with short expiration
- Role-based access control
- Password hashing with bcrypt

### Audit Trail
- All data access logged
- User actions tracked
- Tamper-proof logs

## Compliance
- POPIA (Protection of Personal Information Act) compliant
- HL7 FHIR standards
- Healthcare data retention policies

## Best Practices
- Regular security updates
- Penetration testing
- Code reviews for security
- Secure dependencies management

# iKhaya Health — API Specification

**Version:** 1.0
**Base URL:** `http://localhost:3001` (development) · `https://api.ikhayahealth.co.za` (production)

---

## Contents

1. [Authentication](#authentication)
2. [RBAC — Role-Based Access](#rbac)
3. [Pagination](#pagination)
4. [Error Responses](#error-responses)
5. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Auth](#auth)
   - [Patients](#patients)
   - [Encounters](#encounters)
   - [Allergies](#allergies)
   - [Medications](#medications)
   - [Diagnoses](#diagnoses)
   - [Immunizations](#immunizations)
   - [Sync](#sync)
   - [Users](#users)

---

## Authentication

All endpoints except `GET /health` and `POST /api/auth/login` require a JWT bearer token.

```
Authorization: Bearer <accessToken>
```

Tokens expire after 8 hours (configurable via `JWT_EXPIRES_IN`). Use the refresh token endpoint to obtain a new access token without re-entering credentials.

### Token Lifecycle

```
POST /api/auth/login   →  { accessToken, refreshToken }
POST /api/auth/refresh →  { accessToken, refreshToken }  (rotates refresh token)
POST /api/auth/logout  →  revokes refresh token
```

---

## RBAC

| Role   | Read patients | Write patients | Encounters | Observations | Admin (users) |
|--------|:---:|:---:|:---:|:---:|:---:|
| admin  | ✓ | ✓ | ✓ | ✓ | ✓ |
| doctor | ✓ | ✓ | ✓ | ✓ | — |
| nurse  | ✓ | — | read-only | ✓ | — |

> Patients can only be **deleted** (soft) by admins.
> Users endpoint is **admin-only**.

---

## Pagination

List endpoints return a consistent envelope:

```json
{
  "data": [ ...records ],
  "count": 42,
  "page": 1,
  "limit": 20
}
```

Query params: `?page=1&limit=20` (defaults: page=1, limit=20, max=100).

---

## Error Responses

```json
{
  "error": "Human-readable description",
  "details": [
    { "field": "birth_date", "msg": "birth_date must be a valid ISO 8601 date" }
  ]
}
```

`details` is only present on 422 responses.

| Status | Meaning |
|--------|---------|
| 401 | Missing or invalid JWT |
| 403 | Valid JWT but insufficient role |
| 404 | Resource not found |
| 422 | Validation error (see `details`) |
| 423 | Account locked |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Endpoints

### Health Check

#### `GET /health`

No authentication required.

**Response 200**
```json
{
  "status": "ok",
  "message": "iKhaya Health API is running",
  "db": "connected",
  "dbLatencyMs": 3
}
```

**Response 503** — database unreachable
```json
{ "status": "degraded", "message": "Database unreachable", "db": "disconnected" }
```

---

### Auth

#### `POST /api/auth/login`

**Request body**
```json
{ "username": "dr_ndlovu", "password": "SecurePass1234!" }
```

| Field | Required |
|-------|----------|
| username | ✓ |
| password | ✓ |

**Response 200**
```json
{
  "accessToken": "eyJhbGci…",
  "refreshToken": "a7f3c9e1…",
  "expiresIn": "8h",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "dr_ndlovu",
    "role": "doctor",
    "clinicId": "clinic-uuid"
  }
}
```

**Response 401** — invalid credentials
**Response 422** — missing fields
**Response 423** — account locked after 5 failed attempts (locked 15 min)

---

#### `POST /api/auth/refresh`

**Request body:** `{ "refreshToken": "a7f3c9e1…" }`

**Response 200**
```json
{ "accessToken": "eyJhbGci…", "refreshToken": "newToken…" }
```

**Response 401** — invalid/expired/revoked token
**Response 422** — missing `refreshToken`

---

#### `POST /api/auth/logout`

Requires `Authorization` header.

**Request body:** `{ "refreshToken": "a7f3c9e1…" }`

**Response 200:** `{ "message": "Logged out successfully." }`

---

### Patients

> PII (`given_name`, `family_name`) is encrypted at rest with AES-256-GCM.
> Encryption internals (`*_iv`, `*_auth_tag`) are **never** returned in responses.

#### `GET /api/patients`

**Query:** `?search=Sipho&page=1&limit=20`

**Response 200**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440070",
      "given_name": "Sipho",
      "family_name": "Zulu",
      "birth_date": "1990-06-15",
      "gender": "male",
      "active": true,
      "created_at": "2024-01-15T08:30:00Z"
    }
  ],
  "count": 1,
  "page": 1,
  "limit": 20
}
```

---

#### `GET /api/patients/:id`

Logs `VIEW` to audit trail.

**Response 200**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440070",
  "given_name": "Sipho",
  "family_name": "Zulu",
  "birth_date": "1990-06-15",
  "gender": "male",
  "phone": "+27821234567",
  "address": "123 Mandela Drive, Soweto",
  "active": true,
  "created_at": "2024-01-15T08:30:00Z",
  "updated_at": "2024-01-15T09:00:00Z",
  "encounter_ids": ["enc-uuid-1"]
}
```

**Response 404** — not found or inactive
**Response 422** — invalid UUID

---

#### `POST /api/patients`

**Roles:** doctor, admin.

**Request body**
```json
{
  "given_name": "Sipho",
  "family_name": "Zulu",
  "birth_date": "1990-06-15",
  "gender": "male",
  "phone": "+27821234567",
  "address": "123 Mandela Drive, Soweto"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| given_name | string | ✓ | non-empty |
| family_name | string | ✓ | non-empty |
| birth_date | string | ✓ | ISO 8601 (YYYY-MM-DD) |
| gender | string | ✓ | `male` \| `female` \| `other` \| `unknown` |
| phone | string | — | optional |
| address | string | — | optional |

**Response 201** — created patient object
**Response 422** — validation errors

---

#### `PUT /api/patients/:id`

Full replacement — all required fields must be supplied. **Roles:** doctor, admin.

Same body schema as POST. **Response 200** — updated patient object.

---

#### `DELETE /api/patients/:id`

Soft-delete (sets `active = false`). **Roles:** admin only.

**Response 200:** `{ "message": "Patient deactivated successfully." }`
**Response 404** — not found

---

#### `GET /api/patients/:id/export`

POPIA data subject access — exports all data held for this patient.

**Response 200** (header: `Content-Disposition: attachment; filename="patient-<id>.json"`)
```json
{
  "exportedAt": "2024-01-16T10:00:00Z",
  "patient": { ...patient fields },
  "encounters": [ ...encounters ],
  "allergies": [ ...allergies ],
  "medications": [ ...medications ],
  "diagnoses": [ ...diagnoses ],
  "immunizations": [ ...immunizations ]
}
```

---

### Encounters

#### `GET /api/encounters`

**Query:** `?patient_id=UUID&page=1&limit=20`

**Response 200** — pagination envelope with encounter objects.

---

#### `GET /api/encounters/:id`

Includes observations array.

**Response 200**
```json
{
  "id": "enc-uuid",
  "patient_id": "pat-uuid",
  "encounter_type": "ambulatory",
  "status": "finished",
  "chief_complaint": "Headache and fever for 3 days",
  "assessment": "Viral URTI",
  "plan": "Rest, paracetamol 500mg PRN",
  "start_time": "2024-01-15T09:00:00Z",
  "end_time": "2024-01-15T09:30:00Z",
  "created_by": "doc-uuid",
  "observations": [
    {
      "id": "obs-uuid",
      "code": "heart_rate",
      "value_quantity": 82,
      "unit": "bpm",
      "recorded_at": "2024-01-15T09:05:00Z"
    }
  ]
}
```

---

#### `POST /api/encounters`

**Roles:** doctor, admin.

**Request body**
```json
{
  "patient_id": "pat-uuid",
  "encounter_type": "ambulatory",
  "start_time": "2024-01-15T09:00:00Z",
  "chief_complaint": "Headache and fever"
}
```

| Field | Required | Validation |
|-------|----------|------------|
| patient_id | ✓ | valid UUID |
| encounter_type | ✓ | `ambulatory` \| `emergency` \| `inpatient` |
| start_time | ✓ | ISO 8601 datetime |
| chief_complaint | — | |

**Response 201** — created encounter.

---

#### `PUT /api/encounters/:id`

**Roles:** doctor, admin.

**Request body** (all optional)
```json
{
  "status": "finished",
  "assessment": "Viral URTI",
  "plan": "Rest and hydration",
  "end_time": "2024-01-15T09:30:00Z"
}
```

**Response 200** — updated encounter.

---

#### `POST /api/encounters/:id/observations`

**Roles:** doctor, nurse, admin.

**Request body**
```json
{
  "code": "blood_pressure",
  "value_quantity": 120,
  "unit": "mmHg",
  "value_string": "120/80"
}
```

| Field | Required |
|-------|----------|
| code | ✓ |
| value_quantity | ✓ |
| unit | ✓ |

**Response 201** — created observation.

---

#### `GET /api/encounters/:id/observations`

**Response 200** — array of observation objects.

---

### Allergies

Scoped to patient: `/api/patients/:patientId/allergies`

#### `GET /api/patients/:patientId/allergies`
**Response 200** — array of allergy objects.

#### `POST /api/patients/:patientId/allergies`

**Roles:** doctor, admin.

```json
{
  "allergen": "Penicillin",
  "allergy_type": "medication",
  "severity": "severe",
  "reaction": "Anaphylaxis"
}
```

| Field | Required | Validation |
|-------|----------|------------|
| allergen | ✓ | |
| allergy_type | ✓ | |
| severity | ✓ | `mild` \| `moderate` \| `severe` |
| reaction | — | |

**Response 201** — created allergy.

#### `PUT /api/patients/:patientId/allergies/:id`
**Roles:** doctor, admin. **Response 200** — updated allergy.

#### `DELETE /api/patients/:patientId/allergies/:id`
Soft-delete. **Roles:** doctor, admin.
**Response 200:** `{ "message": "Allergy record deactivated." }`

---

### Medications

Scoped to patient: `/api/patients/:patientId/medications`

#### `GET /api/patients/:patientId/medications`
**Response 200** — array of medication objects.

#### `POST /api/patients/:patientId/medications`

**Roles:** doctor, admin.

```json
{
  "medication_name": "Amoxicillin",
  "dosage": "500mg",
  "route": "oral",
  "frequency": "Three times daily",
  "start_date": "2024-01-15",
  "end_date": "2024-01-22"
}
```

| Field | Required |
|-------|----------|
| medication_name | ✓ |
| dosage | ✓ |
| route | ✓ |
| frequency | ✓ |

**Response 201** — created medication.

#### `PUT /api/patients/:patientId/medications/:id`
**Roles:** doctor, admin. **Response 200** — updated medication.

---

### Diagnoses

Scoped to patient: `/api/patients/:patientId/diagnoses`

#### `GET /api/patients/:patientId/diagnoses`
**Response 200** — array of diagnosis objects.

#### `POST /api/patients/:patientId/diagnoses`

**Roles:** doctor, admin.

```json
{
  "condition_name": "Type 2 Diabetes Mellitus",
  "condition_code": "E11",
  "status": "active",
  "onset_date": "2023-06-01",
  "notes": "Well-controlled on metformin"
}
```

| Field | Required | Validation |
|-------|----------|------------|
| condition_name | ✓ | |
| condition_code | — | ICD-10 |
| status | ✓ | `active` \| `resolved` \| `inactive` |

**Response 201** — created diagnosis.

#### `PUT /api/patients/:patientId/diagnoses/:id`
**Roles:** doctor, admin. **Response 200** — updated diagnosis.

---

### Immunizations

Scoped to patient: `/api/patients/:patientId/immunizations`

#### `GET /api/patients/:patientId/immunizations`
**Response 200** — array of immunization objects.

#### `POST /api/patients/:patientId/immunizations`

**Roles:** doctor, nurse, admin.

```json
{
  "vaccine_name": "BCG",
  "dose_number": 1,
  "administration_date": "2024-01-15",
  "lot_number": "BCG-2024-001",
  "site": "Left upper arm"
}
```

| Field | Required |
|-------|----------|
| vaccine_name | ✓ |
| dose_number | ✓ |
| administration_date | ✓ |

**Response 201** — created immunization.

---

### Sync

#### `POST /api/sync/push`

Push offline changes to the server. **Auth required.**

**Request body**
```json
{
  "records": [
    {
      "entity_type": "patient",
      "entity_id": "local-or-server-uuid",
      "operation": "CREATE",
      "data": { ...entity fields },
      "client_updated_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

| Field | Required | Validation |
|-------|----------|------------|
| records | ✓ | array, 1–500 items |
| records[].entity_type | ✓ | `patient` \| `encounter` \| `observation` |
| records[].operation | ✓ | `CREATE` \| `UPDATE` \| `DELETE` |
| records[].client_updated_at | ✓ | ISO 8601 |

**Response 200**
```json
{
  "synced": 12,
  "conflicts": [
    {
      "entity_id": "uuid",
      "reason": "Server version is newer",
      "server_data": { ...current server record }
    }
  ]
}
```

**Response 422** — missing `records`

---

#### `GET /api/sync/pull`

Pull records updated since a timestamp. **Auth required.**

**Query:** `?since=2024-01-15T00:00:00Z&device_id=uuid`

| Param | Required |
|-------|----------|
| since | ✓ — ISO 8601 |
| device_id | — |

**Response 200**
```json
{
  "patients": [ ...updated patients ],
  "encounters": [ ...updated encounters ],
  "observations": [ ...updated observations ],
  "since": "2024-01-15T00:00:00Z",
  "serverTime": "2024-01-16T08:30:00Z"
}
```

**Response 422** — missing `since`

---

### Users

All user endpoints require **admin** role.

#### `GET /api/users`

**Response 200** — pagination envelope with user objects (no `password_hash`).

---

#### `GET /api/users/:id`

**Response 200** — single user object.
**Response 404** — not found.

---

#### `POST /api/users`

**Request body**
```json
{
  "username": "dr_dlamini",
  "password": "SecurePass5678!",
  "role": "doctor",
  "clinic_id": "clinic-uuid"
}
```

| Field | Required | Validation |
|-------|----------|------------|
| username | ✓ | non-empty |
| password | ✓ | minimum 12 characters |
| role | ✓ | `admin` \| `doctor` \| `nurse` |
| clinic_id | — | UUID |

**Response 201** — created user (no `password_hash`).
**Response 409** — username already exists.
**Response 422** — validation error.

---

#### `PUT /api/users/:id`

**Request body** `{ "role": "admin", "active": true }`

**Response 200** — updated user.

---

#### `DELETE /api/users/:id`

Soft-delete (`active = false`).

**Response 200:** `{ "message": "User deactivated." }`
**Response 404** — not found.

---

## Rate Limiting

100 requests per minute per IP (sliding window). Exceeded: HTTP 429 with `Retry-After` header. Disabled in `NODE_ENV=test`.

## Security

- HTTPS enforced in production at load balancer.
- `helmet` sets CSP, HSTS, X-Frame-Options.
- CORS restricted to `ALLOWED_ORIGINS` env var.
- Patient PII encrypted at rest with AES-256-GCM.
- All mutations logged to `audit_log` table.
- Refresh tokens stored as SHA-256 hashes only.

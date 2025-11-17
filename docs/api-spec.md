# iKhaya Health - API Specification

## Base URL
\\\
Development: http://localhost:3001/api/v1
Production: https://api.ikhayahealth.org/v1
\\\

## Authentication
All API requests require JWT token in Authorization header:
\\\
Authorization: Bearer <token>
\\\

## Endpoints

### Patients

#### GET /patients
Retrieve all patients
\\\json
Response: {
  "patients": [...],
  "total": 100,
  "page": 1
}
\\\

#### GET /patients/:id
Retrieve single patient

#### POST /patients
Create new patient
\\\json
Request: {
  "firstName": "John",
  "lastName": "Doe",
  "idNumber": "8001015800080",
  "dateOfBirth": "1980-01-01",
  "gender": "male"
}
\\\

#### PUT /patients/:id
Update patient

#### DELETE /patients/:id
Soft delete patient

### Visits

#### GET /patients/:patientId/visits
Retrieve patient visits

#### POST /patients/:patientId/visits
Create new visit record

### Sync

#### POST /sync/push
Push local changes to server

#### POST /sync/pull
Pull server changes to client

## Error Responses
\\\json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
\\\

## Rate Limiting
- 100 requests per minute per user
- 1000 requests per hour per clinic

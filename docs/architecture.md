# iKhaya Health - System Architecture

## Overview
iKhaya Health is an offline-first healthcare records system designed for rural clinics with unreliable internet connectivity.

## Architecture Components

### 1. Frontend Layer
- **Mobile App**: Flutter-based cross-platform application
- **Desktop App**: Electron-based application for clinic workstations

### 2. Backend Layer
- **API Server**: Node.js + Express REST API
- **Database**: PostgreSQL (central) + SQLite (local)

### 3. Sync Layer
- **Conflict Resolution**: Timestamp and role-based strategies
- **Queue Management**: Offline-first sync queue

### 4. Security Layer
- **Encryption**: AES-256 for local storage, TLS for transmission
- **Authentication**: JWT-based with role-based access control
- **Audit Trail**: Comprehensive logging of all actions

## Data Flow

\\\
[Mobile/Desktop Client]
       ↓
[Local SQLite Database] ← Offline Operations
       ↓ (When online)
[Sync Queue]
       ↓
[Backend API Server]
       ↓
[PostgreSQL Database] ← Central Storage
\\\

## Offline-First Design
- All CRUD operations work offline
- Changes queued for sync when connectivity available
- Automatic conflict resolution
- Manual conflict review when needed

## Security Measures
- End-to-end encryption
- Role-based access (Admin, Doctor, Nurse)
- Audit logging for compliance
- Secure sync over TLS

## Scalability
- Horizontal scaling of API servers
- Database replication for high availability
- CDN for static assets
- Load balancing for multiple clinics

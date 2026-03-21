# iKhaya Health — Production Deployment Guide

## Prerequisites

| Requirement | Minimum version |
|---|---|
| Node.js | 18 LTS |
| PostgreSQL | 14 |
| Docker + Docker Compose | 24 / 2.20 |
| Android Studio (for mobile builds) | Hedgehog 2023.1.1+ |
| Java (for Android signing) | JDK 17 |

---

## 1. Clone and configure environment

```bash
git clone https://github.com/SifisoScS/iKhayaHealth.git
cd iKhayaHealth
cp .env.example .env
```

Edit `.env` and fill in **every** value. Never leave placeholder strings in production.

### Generate secrets

```bash
# JWT secret (64 hex chars = 256 bits)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# AES-256 encryption key (32 bytes = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. Database setup

```bash
# Create the database
createdb ikhaya_health

# Run all migrations
cd backend
npm ci
npm run migrate
```

Confirm all 5 migrations applied:

```sql
SELECT version, applied_at FROM schema_migrations ORDER BY version;
```

### Create the first admin user

```bash
node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('CHANGE_THIS_PASSWORD', 12).then(hash => {
  console.log(\`INSERT INTO users (username, email, password_hash, role)
VALUES ('admin', 'admin@clinic.local', '\${hash}', 'admin');\`);
});
"
```

Run the resulting SQL against your database.

---

## 3. Backend — production start

```bash
cd backend
NODE_ENV=production npm start
```

Or via Docker Compose (recommended):

```bash
# From project root
docker-compose up -d
```

Verify the backend is healthy:

```bash
curl https://your-domain/health
# Expected: {"status":"ok","db":{"latency_ms":...}}
```

---

## 4. TLS / Reverse proxy

Place the backend behind **nginx** or **Caddy** with a valid TLS certificate.
Never expose port 3001 directly to the internet.

Minimal nginx config:

```nginx
server {
    listen 443 ssl http2;
    server_name api.ikhayahealth.co.za;

    ssl_certificate     /etc/ssl/certs/ikhaya.crt;
    ssl_certificate_key /etc/ssl/private/ikhaya.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Update `ALLOWED_ORIGINS` in `.env` to your clinic's actual domain.

---

## 5. Desktop app — production build

```bash
cd frontend/desktop
npm ci
npm run build        # builds React
npm run package      # packages with electron-builder
```

Distributable installers are written to `frontend/desktop/dist/`.

| Platform | Output |
|---|---|
| Windows | `.exe` (NSIS installer) |
| macOS | `.dmg` |
| Linux | `.AppImage` |

---

## 6. Mobile app — Android release build

### 6a. Generate a signing keystore

```bash
keytool -genkeypair \
  -v \
  -keystore release.keystore \
  -alias ikhaya-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Store `release.keystore` securely — **never commit it to git**.

### 6b. Set signing env vars

```bash
export KEYSTORE_PATH=/path/to/release.keystore
export KEYSTORE_PASSWORD=your_keystore_password
export KEY_ALIAS=ikhaya-release
export KEY_PASSWORD=your_key_password
```

### 6c. Build the release APK

```bash
cd frontend/mobile

# Point to the production backend
flutter build apk --release \
  --dart-define=API_BASE_URL=https://api.ikhayahealth.co.za/api \
  --dart-define=FLUTTER_ENV=production
```

The signed APK is at `build/app/outputs/flutter-apk/app-release.apk`.

### 6d. Build an AAB for Google Play

```bash
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://api.ikhayahealth.co.za/api \
  --dart-define=FLUTTER_ENV=production
```

---

## 7. CORS configuration

Set `ALLOWED_ORIGINS` to the exact origins your desktop and mobile apps will use:

```env
ALLOWED_ORIGINS=https://app.ikhayahealth.co.za,https://admin.ikhayahealth.co.za
```

For a purely desktop/mobile deployment with no web browser access, you may leave this empty — the backend will reject all cross-origin browser requests.

---

## 8. Backups

```bash
# Daily PostgreSQL dump (add to cron)
pg_dump $DATABASE_URL | gzip > /backups/ikhaya_$(date +%Y%m%d).sql.gz

# Retain 30 days
find /backups -name "ikhaya_*.sql.gz" -mtime +30 -delete
```

Test your restore procedure before go-live:

```bash
createdb ikhaya_health_restore
gunzip -c /backups/ikhaya_20260101.sql.gz | psql ikhaya_health_restore
```

---

## 9. Monitoring

| What to monitor | Tool | Alert threshold |
|---|---|---|
| `GET /health` → `status: ok` | UptimeRobot / Pingdom | 2 consecutive failures |
| DB disk usage | Prometheus + node_exporter | > 80% |
| Error rate (5xx) | Log aggregator (Loki / CloudWatch) | > 1% of requests |
| Failed login attempts | Audit log query | > 20/hour per IP |

---

## 10. Post-deployment checklist

See `docs/release-checklist.md` for the full pre-go-live sign-off checklist.

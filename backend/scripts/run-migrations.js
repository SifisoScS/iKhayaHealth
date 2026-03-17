const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MIGRATIONS_DIR = path.join(__dirname, '../db/migrations');

// Ordered list of migrations to apply
const MIGRATIONS = [
  '001_initial_schema.sql',
  '002_patient_records.sql',
  '003_drop_legacy_patients.sql',
  '004_encryption_and_auth.sql',
  '005_audit_log_actions.sql',
];

async function ensureTrackingTable(client) {
  // 004 creates schema_migrations, but we need it before we check which
  // migrations have already run. Create it here if it doesn't exist yet.
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    VARCHAR(50) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query('SELECT version FROM schema_migrations ORDER BY version');
  return new Set(result.rows.map((r) => r.version));
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await ensureTrackingTable(client);
    const applied = await getAppliedMigrations(client);

    for (const filename of MIGRATIONS) {
      if (applied.has(filename)) {
        console.log(`  ⏭  ${filename} already applied, skipping`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, filename);
      if (!fs.existsSync(filePath)) {
        console.warn(`  ⚠️  Migration file not found: ${filename}, skipping`);
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [filename]
        );
        await client.query('COMMIT');
        console.log(`  ✅ Applied: ${filename}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${filename} failed: ${err.message}`);
      }
    }

    console.log('\n✅ All migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('\n❌ Migration runner failed:', err.message);
  process.exit(1);
});

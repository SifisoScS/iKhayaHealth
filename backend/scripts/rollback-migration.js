/**
 * Migration Rollback Runner
 *
 * Rolls back the most-recently applied migration, or rolls back to a
 * specified target version.
 *
 * Usage:
 *   node scripts/rollback-migration.js              # roll back one step
 *   node scripts/rollback-migration.js 003          # roll back to after 003 (i.e. undo 004 and 005)
 *   node scripts/rollback-migration.js 000          # roll back everything
 *
 * Each migration must have a matching rollback file at:
 *   backend/db/migrations/<version>.down.sql
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const MIGRATIONS_DIR = path.join(__dirname, '../db/migrations');

// Ordered list — rollback traverses this in reverse
const MIGRATIONS = [
  '001_initial_schema.sql',
  '002_patient_records.sql',
  '003_drop_legacy_patients.sql',
  '004_encryption_and_auth.sql',
  '005_audit_log_actions.sql',
];

async function getAppliedMigrations(client) {
  try {
    const result = await client.query(
      'SELECT version FROM schema_migrations ORDER BY version DESC'
    );
    return result.rows.map((r) => r.version);
  } catch {
    // schema_migrations doesn't exist yet — nothing to roll back
    return [];
  }
}

async function rollback() {
  const targetArg = process.argv[2]; // e.g. "003" or undefined

  // Resolve target: the version prefix after which we stop rolling back.
  // "000" means roll back everything; undefined means roll back one step.
  let rollbackTo = null; // null = one step
  if (targetArg !== undefined) {
    const match = MIGRATIONS.find((m) => m.startsWith(targetArg));
    if (!match && targetArg !== '000') {
      console.error(`❌ Unknown target version: "${targetArg}"`);
      console.error(
        `   Available: ${MIGRATIONS.map((m) => m.split('_')[0]).join(', ')}, 000`
      );
      process.exit(1);
    }
    rollbackTo = targetArg === '000' ? null : match;
  }

  const client = await pool.connect();
  try {
    const applied = await getAppliedMigrations(client);

    if (applied.length === 0) {
      console.log('ℹ️  No migrations have been applied. Nothing to roll back.');
      return;
    }

    // Build the list of migrations to undo (in reverse order)
    let toUndo;
    if (targetArg === undefined) {
      // One-step: undo only the most recent
      toUndo = [applied[0]];
    } else if (targetArg === '000') {
      // Undo everything
      toUndo = [...applied];
    } else {
      // Undo everything applied after rollbackTo
      const targetIdx = MIGRATIONS.indexOf(rollbackTo);
      toUndo = applied.filter((v) => MIGRATIONS.indexOf(v) > targetIdx);
    }

    if (toUndo.length === 0) {
      console.log('ℹ️  Already at the target version. Nothing to roll back.');
      return;
    }

    console.log(`\n🔽 Rolling back ${toUndo.length} migration(s):\n`);

    for (const version of toUndo) {
      const downFile = path.join(
        MIGRATIONS_DIR,
        version.replace('.sql', '.down.sql')
      );

      if (!fs.existsSync(downFile)) {
        throw new Error(
          `Rollback file not found: ${downFile}\n` +
          `  Create ${path.basename(downFile)} with the reverse SQL for this migration.`
        );
      }

      const sql = fs.readFileSync(downFile, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'DELETE FROM schema_migrations WHERE version = $1',
          [version]
        );
        await client.query('COMMIT');
        console.log(`  ✅ Rolled back: ${version}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Rollback of ${version} failed: ${err.message}`);
      }
    }

    console.log('\n✅ Rollback complete.\n');
  } finally {
    client.release();
    await pool.end();
  }
}

rollback().catch((err) => {
  console.error('\n❌ Rollback runner failed:', err.message);
  process.exit(1);
});

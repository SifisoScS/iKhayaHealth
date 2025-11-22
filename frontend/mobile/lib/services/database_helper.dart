// frontend/mobile/lib/services/database_helper.dart

import 'dart:io';
import 'package:sqflite/sqflite.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:path/path.dart';
import 'package:uuid/uuid.dart';
import '../models/patient.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    
    // Initialize sqflite for desktop platforms
    if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }
    
    _database = await _initDB('ikhaya_health.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _createDB(Database db, int version) async {
    // Patient table
    await db.execute('''
      CREATE TABLE patient (
        id TEXT PRIMARY KEY,
        given_name TEXT NOT NULL,
        family_name TEXT NOT NULL,
        middle_name TEXT,
        preferred_name TEXT,
        birth_date TEXT NOT NULL,
        gender TEXT NOT NULL,
        primary_language TEXT DEFAULT 'en',
        active INTEGER DEFAULT 1,
        deceased INTEGER DEFAULT 0,
        deceased_date TEXT,
        photo_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT,
        updated_by TEXT,
        sync_status TEXT DEFAULT 'pending',
        last_synced_at TEXT,
        device_id TEXT,
        version INTEGER DEFAULT 1
      )
    ''');

    // Patient identifier table
    await db.execute('''
      CREATE TABLE patient_identifier (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        identifier_type TEXT NOT NULL,
        identifier_value TEXT NOT NULL,
        issuing_organization TEXT,
        active INTEGER DEFAULT 1,
        start_date TEXT,
        end_date TEXT,
        created_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        device_id TEXT,
        FOREIGN KEY (patient_id) REFERENCES patient (id) ON DELETE CASCADE,
        UNIQUE(identifier_type, identifier_value)
      )
    ''');

    // Contact point table
    await db.execute('''
      CREATE TABLE contact_point (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        contact_type TEXT NOT NULL,
        value TEXT NOT NULL,
        use_type TEXT,
        preferred INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        device_id TEXT,
        FOREIGN KEY (patient_id) REFERENCES patient (id) ON DELETE CASCADE
      )
    ''');

    // Encounter table
    await db.execute('''
      CREATE TABLE encounter (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        encounter_type TEXT DEFAULT 'ambulatory',
        status TEXT DEFAULT 'in-progress',
        start_time TEXT NOT NULL,
        end_time TEXT,
        location TEXT,
        provider_id TEXT,
        chief_complaint TEXT,
        reason_for_visit TEXT,
        history_present_illness TEXT,
        review_of_systems TEXT,
        physical_exam TEXT,
        assessment TEXT,
        plan TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT,
        sync_status TEXT DEFAULT 'pending',
        last_synced_at TEXT,
        device_id TEXT,
        version INTEGER DEFAULT 1,
        FOREIGN KEY (patient_id) REFERENCES patient (id) ON DELETE CASCADE
      )
    ''');

    // Observation table
    await db.execute('''
      CREATE TABLE observation (
        id TEXT PRIMARY KEY,
        encounter_id TEXT,
        patient_id TEXT NOT NULL,
        code TEXT NOT NULL,
        display TEXT,
        category TEXT DEFAULT 'vital-signs',
        value_quantity REAL,
        value_string TEXT,
        value_boolean INTEGER,
        unit TEXT,
        reference_low REAL,
        reference_high REAL,
        interpretation TEXT,
        effective_time TEXT NOT NULL,
        performer_id TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        device_id TEXT,
        FOREIGN KEY (encounter_id) REFERENCES encounter (id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES patient (id) ON DELETE CASCADE
      )
    ''');

    // Indexes for performance
    await db.execute('CREATE INDEX idx_patient_family_name ON patient(family_name)');
    await db.execute('CREATE INDEX idx_patient_sync_status ON patient(sync_status)');
    await db.execute('CREATE INDEX idx_identifier_patient ON patient_identifier(patient_id)');
    await db.execute('CREATE INDEX idx_contact_patient ON contact_point(patient_id)');
    await db.execute('CREATE INDEX idx_encounter_patient ON encounter(patient_id)');
    await db.execute('CREATE INDEX idx_observation_patient ON observation(patient_id)');

    print('✅ Database created successfully');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    // Handle database migrations here
    if (oldVersion < newVersion) {
      print('Upgrading database from version $oldVersion to $newVersion');
      // Add migration logic here when needed
    }
  }

  // =====================================================
  // PATIENT CRUD OPERATIONS
  // =====================================================

  Future<String> insertPatient(Patient patient) async {
    final db = await database;
    await db.insert(
      'patient',
      patient.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    print('✅ Patient inserted: ${patient.fullName}');
    return patient.id;
  }

  Future<List<Patient>> getAllPatients() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'patient',
      where: 'active = ?',
      whereArgs: [1],
      orderBy: 'family_name ASC, given_name ASC',
    );

    return List.generate(maps.length, (i) => Patient.fromMap(maps[i]));
  }

  Future<Patient?> getPatientById(String id) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'patient',
      where: 'id = ?',
      whereArgs: [id],
      limit: 1,
    );

    if (maps.isEmpty) return null;
    return Patient.fromMap(maps.first);
  }

  Future<List<Patient>> searchPatients(String query) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'patient',
      where: '''
        active = 1 AND (
          given_name LIKE ? OR 
          family_name LIKE ? OR 
          middle_name LIKE ?
        )
      ''',
      whereArgs: ['%$query%', '%$query%', '%$query%'],
      orderBy: 'family_name ASC',
    );

    return List.generate(maps.length, (i) => Patient.fromMap(maps[i]));
  }

  Future<int> updatePatient(Patient patient) async {
    final db = await database;
    final updatedPatient = patient.copyWith(
      updatedAt: DateTime.now(),
      version: patient.version + 1,
    );
    
    return await db.update(
      'patient',
      updatedPatient.toMap(),
      where: 'id = ?',
      whereArgs: [patient.id],
    );
  }

  Future<int> deletePatient(String id) async {
    final db = await database;
    // Soft delete - just mark as inactive
    return await db.update(
      'patient',
      {'active': 0, 'updated_at': DateTime.now().toIso8601String()},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // Get patients pending sync
  Future<List<Patient>> getPendingPatients() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'patient',
      where: 'sync_status = ?',
      whereArgs: ['pending'],
    );

    return List.generate(maps.length, (i) => Patient.fromMap(maps[i]));
  }

  // Mark patient as synced
  Future<int> markPatientSynced(String id) async {
    final db = await database;
    return await db.update(
      'patient',
      {
        'sync_status': 'synced',
        'last_synced_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // =====================================================
  // PATIENT IDENTIFIER OPERATIONS
  // =====================================================

  Future<String> insertPatientIdentifier(Map<String, dynamic> identifier) async {
    final db = await database;
    final id = const Uuid().v4();
    final data = {
      ...identifier,
      'id': id,
      'created_at': DateTime.now().toIso8601String(),
    };
    
    await db.insert('patient_identifier', data);
    return id;
  }

  Future<List<Map<String, dynamic>>> getPatientIdentifiers(String patientId) async {
    final db = await database;
    return await db.query(
      'patient_identifier',
      where: 'patient_id = ? AND active = ?',
      whereArgs: [patientId, 1],
    );
  }

  // =====================================================
  // CONTACT POINT OPERATIONS
  // =====================================================

  Future<String> insertContactPoint(Map<String, dynamic> contact) async {
    final db = await database;
    final id = const Uuid().v4();
    final data = {
      ...contact,
      'id': id,
      'created_at': DateTime.now().toIso8601String(),
    };
    
    await db.insert('contact_point', data);
    return id;
  }

  Future<List<Map<String, dynamic>>> getPatientContacts(String patientId) async {
    final db = await database;
    return await db.query(
      'contact_point',
      where: 'patient_id = ? AND active = ?',
      whereArgs: [patientId, 1],
    );
  }

  // =====================================================
  // STATISTICS
  // =====================================================

  Future<Map<String, int>> getPatientStats() async {
    final db = await database;
    
    final totalResult = await db.rawQuery(
      'SELECT COUNT(*) as count FROM patient WHERE active = 1'
    );
    final total = Sqflite.firstIntValue(totalResult) ?? 0;

    final todayResult = await db.rawQuery('''
      SELECT COUNT(*) as count FROM patient 
      WHERE active = 1 AND DATE(created_at) = DATE('now')
    ''');
    final today = Sqflite.firstIntValue(todayResult) ?? 0;

    final pendingSyncResult = await db.rawQuery(
      'SELECT COUNT(*) as count FROM patient WHERE sync_status = ?',
      ['pending']
    );
    final pendingSync = Sqflite.firstIntValue(pendingSyncResult) ?? 0;

    return {
      'total': total,
      'today': today,
      'pendingSync': pendingSync,
    };
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  Future<void> close() async {
    final db = await database;
    await db.close();
  }

  Future<void> clearAllData() async {
    final db = await database;
    await db.delete('observation');
    await db.delete('encounter');
    await db.delete('contact_point');
    await db.delete('patient_identifier');
    await db.delete('patient');
    print('✅ All data cleared');
  }

  // Seed sample data for testing
  Future<void> seedSampleData() async {
    final patients = [
      Patient(
        id: const Uuid().v4(),
        givenName: 'Sipho',
        familyName: 'Dlamini',
        birthDate: DateTime(1980, 1, 1),
        gender: 'male',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        deviceId: 'test-device',
      ),
      Patient(
        id: const Uuid().v4(),
        givenName: 'Thandiwe',
        familyName: 'Ngubane',
        birthDate: DateTime(1992, 5, 12),
        gender: 'female',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        deviceId: 'test-device',
      ),
      Patient(
        id: const Uuid().v4(),
        givenName: 'Mandla',
        familyName: 'Mkhize',
        birthDate: DateTime(1975, 6, 18),
        gender: 'male',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        deviceId: 'test-device',
      ),
    ];

    for (final patient in patients) {
      await insertPatient(patient);
    }

    print('✅ Sample data seeded: ${patients.length} patients');
  }
}
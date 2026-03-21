import 'dart:convert';
import '../models/patient.dart';
import 'api_service.dart';
import 'database_helper.dart';

class SyncResult {
  final int pushed;
  final int pulled;
  final int conflicts;
  final int errors;
  final List<String> messages;

  const SyncResult({
    required this.pushed,
    required this.pulled,
    required this.conflicts,
    required this.errors,
    required this.messages,
  });

  bool get hasErrors => errors > 0;

  @override
  String toString() =>
      'SyncResult(pushed: $pushed, pulled: $pulled, conflicts: $conflicts, errors: $errors)';
}

class SyncService {
  static final SyncService instance = SyncService._();
  SyncService._();

  static const _deviceId = 'ikhaya-mobile';

  /// Push locally-pending records to the server, then pull server records.
  /// Safe to call in the background — never throws; errors are captured in [SyncResult].
  Future<SyncResult> sync() async {
    int pushed = 0;
    int pulled = 0;
    int conflicts = 0;
    int errors = 0;
    final messages = <String>[];

    // ── 1. Push pending patients ───────────────────────────────────────────
    try {
      final pending = await DatabaseHelper.instance.getPendingPatients();
      if (pending.isNotEmpty) {
        final records = pending
            .map((p) => {
                  'entity_type': 'patient',
                  'entity_id': p.id,
                  'operation': 'CREATE',
                  'data': p.toMap(),
                  'device_id': _deviceId,
                  'client_version': p.version,
                })
            .toList();

        final res = await ApiService.post('/sync/push', {'records': records});
        if (res.statusCode == 200) {
          final body = jsonDecode(res.body) as Map<String, dynamic>;
          pushed = body['synced'] as int? ?? 0;
          conflicts = (body['conflicts'] as List?)?.length ?? 0;

          // Mark all as synced regardless — server handles conflicts server-side
          for (final p in pending) {
            await DatabaseHelper.instance.markPatientSynced(p.id);
          }
          if (conflicts > 0) {
            messages.add('$conflicts conflict(s) detected — server version kept.');
          }
        } else {
          errors++;
          messages.add('Push failed: HTTP ${res.statusCode}');
        }
      }
    } catch (e) {
      errors++;
      messages.add('Push error: $e');
    }

    // ── 2. Pull patients from server ───────────────────────────────────────
    try {
      final res = await ApiService.get('/patients?limit=500');
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        final rows = (body['data'] as List<dynamic>?) ?? [];

        for (final row in rows) {
          final map = row as Map<String, dynamic>;
          final id = map['id'] as String;

          // Don't overwrite records that have unsynchronised local changes
          final existing = await DatabaseHelper.instance.getPatientById(id);
          if (existing != null && existing.syncStatus == 'pending') continue;

          final patient = Patient(
            id: id,
            givenName: map['given_name'] as String? ?? '',
            familyName: map['family_name'] as String? ?? '',
            birthDate: map['birth_date'] != null
                ? DateTime.tryParse(map['birth_date'] as String) ?? DateTime(1900)
                : DateTime(1900),
            gender: map['gender'] as String? ?? 'unknown',
            primaryLanguage: map['primary_language'] as String? ?? 'en',
            active: (map['active'] as bool?) ?? true,
            createdAt: map['created_at'] != null
                ? DateTime.tryParse(map['created_at'] as String) ?? DateTime.now()
                : DateTime.now(),
            updatedAt: map['updated_at'] != null
                ? DateTime.tryParse(map['updated_at'] as String) ?? DateTime.now()
                : DateTime.now(),
            syncStatus: 'synced',
            lastSyncedAt: DateTime.now(),
            deviceId: _deviceId,
          );

          await DatabaseHelper.instance.insertPatient(patient); // replace on conflict
          pulled++;
        }
      } else {
        errors++;
        messages.add('Pull failed: HTTP ${res.statusCode}');
      }
    } catch (e) {
      errors++;
      messages.add('Pull error: $e');
    }

    return SyncResult(
      pushed: pushed,
      pulled: pulled,
      conflicts: conflicts,
      errors: errors,
      messages: messages,
    );
  }
}

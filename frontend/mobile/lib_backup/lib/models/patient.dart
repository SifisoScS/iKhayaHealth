// frontend/mobile/lib/models/patient.dart

class Patient {
  final String id;
  final String givenName;
  final String familyName;
  final String? middleName;
  final String? preferredName;
  final DateTime birthDate;
  final String gender; // 'male', 'female', 'other', 'unknown'
  final String primaryLanguage; // ISO 639-1 codes
  final bool active;
  final bool deceased;
  final DateTime? deceasedDate;
  final String? photoPath;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? createdBy;
  final String? updatedBy;
  final String syncStatus; // 'pending', 'synced', 'conflict'
  final DateTime? lastSyncedAt;
  final String? deviceId;
  final int version;

  // Computed properties
  int get age {
    final now = DateTime.now();
    int age = now.year - birthDate.year;
    if (now.month < birthDate.month ||
        (now.month == birthDate.month && now.day < birthDate.day)) {
      age--;
    }
    return age;
  }

  String get fullName => '$givenName $familyName';
  
  String get displayName => preferredName ?? fullName;

  String get initials => 
      '${givenName.isNotEmpty ? givenName[0] : ''}${familyName.isNotEmpty ? familyName[0] : ''}';

  Patient({
    required this.id,
    required this.givenName,
    required this.familyName,
    this.middleName,
    this.preferredName,
    required this.birthDate,
    required this.gender,
    this.primaryLanguage = 'en',
    this.active = true,
    this.deceased = false,
    this.deceasedDate,
    this.photoPath,
    required this.createdAt,
    required this.updatedAt,
    this.createdBy,
    this.updatedBy,
    this.syncStatus = 'pending',
    this.lastSyncedAt,
    this.deviceId,
    this.version = 1,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'given_name': givenName,
      'family_name': familyName,
      'middle_name': middleName,
      'preferred_name': preferredName,
      'birth_date': birthDate.toIso8601String(),
      'gender': gender,
      'primary_language': primaryLanguage,
      'active': active ? 1 : 0,
      'deceased': deceased ? 1 : 0,
      'deceased_date': deceasedDate?.toIso8601String(),
      'photo_path': photoPath,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'created_by': createdBy,
      'updated_by': updatedBy,
      'sync_status': syncStatus,
      'last_synced_at': lastSyncedAt?.toIso8601String(),
      'device_id': deviceId,
      'version': version,
    };
  }

  factory Patient.fromMap(Map<String, dynamic> map) {
    return Patient(
      id: map['id'],
      givenName: map['given_name'],
      familyName: map['family_name'],
      middleName: map['middle_name'],
      preferredName: map['preferred_name'],
      birthDate: DateTime.parse(map['birth_date']),
      gender: map['gender'],
      primaryLanguage: map['primary_language'] ?? 'en',
      active: map['active'] == 1,
      deceased: map['deceased'] == 1,
      deceasedDate: map['deceased_date'] != null 
          ? DateTime.parse(map['deceased_date']) 
          : null,
      photoPath: map['photo_path'],
      createdAt: DateTime.parse(map['created_at']),
      updatedAt: DateTime.parse(map['updated_at']),
      createdBy: map['created_by'],
      updatedBy: map['updated_by'],
      syncStatus: map['sync_status'] ?? 'pending',
      lastSyncedAt: map['last_synced_at'] != null 
          ? DateTime.parse(map['last_synced_at']) 
          : null,
      deviceId: map['device_id'],
      version: map['version'] ?? 1,
    );
  }

  Patient copyWith({
    String? givenName,
    String? familyName,
    String? middleName,
    String? preferredName,
    DateTime? birthDate,
    String? gender,
    String? primaryLanguage,
    bool? active,
    bool? deceased,
    DateTime? deceasedDate,
    String? photoPath,
    DateTime? updatedAt,
    String? updatedBy,
    String? syncStatus,
    int? version,
  }) {
    return Patient(
      id: id,
      givenName: givenName ?? this.givenName,
      familyName: familyName ?? this.familyName,
      middleName: middleName ?? this.middleName,
      preferredName: preferredName ?? this.preferredName,
      birthDate: birthDate ?? this.birthDate,
      gender: gender ?? this.gender,
      primaryLanguage: primaryLanguage ?? this.primaryLanguage,
      active: active ?? this.active,
      deceased: deceased ?? this.deceased,
      deceasedDate: deceasedDate ?? this.deceasedDate,
      photoPath: photoPath ?? this.photoPath,
      createdAt: createdAt,
      updatedAt: updatedAt ?? DateTime.now(),
      createdBy: createdBy,
      updatedBy: updatedBy ?? this.updatedBy,
      syncStatus: syncStatus ?? this.syncStatus,
      lastSyncedAt: lastSyncedAt,
      deviceId: deviceId,
      version: version ?? this.version,
    );
  }

  @override
  String toString() => 'Patient(id: $id, name: $fullName, age: $age)';
}
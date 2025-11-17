class Patient {
  final String id;
  final String firstName;
  final String lastName;
  final String idNumber;
  final DateTime dateOfBirth;
  final String gender;
  final String? photoPath;
  final DateTime createdAt;
  final DateTime updatedAt;

  Patient({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.idNumber,
    required this.dateOfBirth,
    required this.gender,
    this.photoPath,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'firstName': firstName,
      'lastName': lastName,
      'idNumber': idNumber,
      'dateOfBirth': dateOfBirth.toIso8601String(),
      'gender': gender,
      'photoPath': photoPath,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory Patient.fromMap(Map<String, dynamic> map) {
    return Patient(
      id: map['id'],
      firstName: map['firstName'],
      lastName: map['lastName'],
      idNumber: map['idNumber'],
      dateOfBirth: DateTime.parse(map['dateOfBirth']),
      gender: map['gender'],
      photoPath: map['photoPath'],
      createdAt: DateTime.parse(map['createdAt']),
      updatedAt: DateTime.parse(map['updatedAt']),
    );
  }
}

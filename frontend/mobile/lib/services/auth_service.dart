import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class AuthUser {
  final String id;
  final String username;
  final String role;

  const AuthUser({required this.id, required this.username, required this.role});

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        username: json['username'] as String,
        role: json['role'] as String,
      );

  Map<String, dynamic> toJson() => {'id': id, 'username': username, 'role': role};
}

class AuthService {
  static final AuthService instance = AuthService._();
  AuthService._();

  static const _tokenKey = 'ikhaya_token';
  static const _userKey = 'ikhaya_user';
  static const _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3001/api',
  );

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<AuthUser?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_userKey);
    if (raw == null) return null;
    try {
      return AuthUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  /// Returns the logged-in [AuthUser] on success. Throws [Exception] on failure.
  Future<AuthUser> login(String username, String password) async {
    final res = await http
        .post(
          Uri.parse('$_baseUrl/auth/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'username': username, 'password': password}),
        )
        .timeout(const Duration(seconds: 15));

    if (res.statusCode == 200) {
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      final token = body['token'] as String;
      final user = AuthUser.fromJson(body['user'] as Map<String, dynamic>);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, token);
      await prefs.setString(_userKey, jsonEncode(user.toJson()));
      return user;
    } else if (res.statusCode == 423) {
      throw Exception('Account locked. Try again in 15 minutes.');
    } else if (res.statusCode == 401) {
      throw Exception('Invalid username or password.');
    } else {
      throw Exception('Login failed (${res.statusCode}).');
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }
}

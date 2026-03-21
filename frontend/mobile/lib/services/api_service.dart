import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

/// Thin HTTP client that attaches the stored JWT to every request.
class ApiService {
  ApiService._();

  static const _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3001/api',
  );

  static Future<Map<String, String>> _headers() async {
    final token = await AuthService.instance.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<http.Response> get(String path) {
    return _headers().then(
      (h) => http
          .get(Uri.parse('$_baseUrl$path'), headers: h)
          .timeout(const Duration(seconds: 15)),
    );
  }

  static Future<http.Response> post(String path, Map<String, dynamic> body) {
    return _headers().then(
      (h) => http
          .post(
            Uri.parse('$_baseUrl$path'),
            headers: h,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15)),
    );
  }

  static Future<http.Response> put(String path, Map<String, dynamic> body) {
    return _headers().then(
      (h) => http
          .put(
            Uri.parse('$_baseUrl$path'),
            headers: h,
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15)),
    );
  }
}

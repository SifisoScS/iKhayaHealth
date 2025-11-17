import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const IKhayaHealthApp());
}

class IKhayaHealthApp extends StatelessWidget {
  const IKhayaHealthApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'iKhaya Health',
      theme: ThemeData(
        primarySwatch: Colors.teal,
        useMaterial3: true,
      ),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en', 'ZA'), // English
        Locale('zu', 'ZA'), // isiZulu
        Locale('st', 'ZA'), // Sesotho
        Locale('sw', 'KE'), // Swahili
      ],
      home: const HomeScreen(),
    );
  }
}

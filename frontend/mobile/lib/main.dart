import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'screens/home_screen.dart';

void main() {
  // Add error handling for development
  WidgetsFlutterBinding.ensureInitialized();
  
  // Optional: Add debug configuration
  debugPrint = (String? message, {int? wrapWidth}) {
    if (message != null && !message.contains('accessibility')) {
      // Filter out accessibility warnings during development
      print(message);
    }
  };
  
  runApp(const IKhayaHealthApp());
}

class IKhayaHealthApp extends StatelessWidget {
  const IKhayaHealthApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'iKhaya Health',
      theme: ThemeData(
        primarySwatch: Colors.teal,
        useMaterial3: true,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      darkTheme: ThemeData(
        primarySwatch: Colors.teal,
        useMaterial3: true,
        brightness: Brightness.dark,
      ),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en', 'ZA'), // English South Africa
        Locale('zu', 'ZA'), // isiZulu South Africa  
        Locale('st', 'ZA'), // Sesotho South Africa
        Locale('sw', 'KE'), // Swahili Kenya
      ],
      home: const HomeScreen(),
      debugShowCheckedModeBanner: false, // Cleaner look in debug
    );
  }
}
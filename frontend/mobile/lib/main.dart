// frontend/mobile/lib/main.dart
// MediConnect AI - Main Application Entry Point

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const MediConnectAIApp());
}

class MediConnectAIApp extends StatelessWidget {
  const MediConnectAIApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MediConnect AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0066CC), // Primary blue
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF9FAFB), // Sterile gray
        
        // App Bar Theme
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0066CC),
          foregroundColor: Colors.white,
          elevation: 2,
          centerTitle: true,
        ),
        
        // Card Theme
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 2,
          shadowColor: Colors.black.withOpacity(0.1),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        
        // Button Theme
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF0066CC),
            foregroundColor: Colors.white,
            elevation: 2,
            padding: const EdgeInsets.symmetric(
              horizontal: 24,
              vertical: 14,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(30),
            ),
          ),
        ),
        
        // Text Theme
        textTheme: const TextTheme(
          displayLarge: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.w700,
            color: Color(0xFF1F2A44),
          ),
          displayMedium: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w700,
            color: Color(0xFF1F2A44),
          ),
          displaySmall: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w700,
            color: Color(0xFF1F2A44),
          ),
          headlineMedium: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1F2A44),
          ),
          titleLarge: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1F2A44),
          ),
          bodyLarge: TextStyle(
            fontSize: 16,
            color: Color(0xFF1F2A44),
          ),
          bodyMedium: TextStyle(
            fontSize: 14,
            color: Color(0xFF1F2A44),
          ),
        ),
        
        // Input Decoration Theme
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.withOpacity(0.3)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.withOpacity(0.3)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF0066CC), width: 2),
          ),
        ),
      ),
      
      // Localization
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en', 'ZA'), // English (South Africa)
        Locale('zu', 'ZA'), // isiZulu
        Locale('st', 'ZA'), // Sesotho
        Locale('sw', 'KE'), // Swahili
      ],
      
      home: const HomeScreen(),
    );
  }
}
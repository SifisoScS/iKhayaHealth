import 'package:flutter/material.dart';

class EmergencyScreen extends StatelessWidget {
  const EmergencyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Emergency Services'),
        backgroundColor: const Color(0xFFD32F2F),
      ),
      body: const Center(
        child: Text('Emergency Services - Coming Soon'),
      ),
    );
  }
}

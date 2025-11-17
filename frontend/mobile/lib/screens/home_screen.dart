import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('iKhaya Health'),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: () {
              // Sync functionality
            },
          ),
        ],
      ),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Welcome to iKhaya Health',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 20),
            Text('Offline-first healthcare for rural clinics'),
          ],
        ),
      ),
    );
  }
}

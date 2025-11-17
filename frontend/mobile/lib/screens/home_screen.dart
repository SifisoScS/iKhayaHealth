import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({Key? key}) : super(key: key);

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
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'Welcome to iKhaya Health',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            const Text('Offline-first healthcare for rural clinics'),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'patients_screen.dart';
import 'dart:ui' as ui;

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'iKhaya Health',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF00D9FF),
          brightness: Brightness.dark,
        ),
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  bool isOnline = false; // This will be connected to real connectivity later
  
  // Mock stats - will be replaced with real data
  int todayPatients = 12;
  int queueCount = 5;
  int totalPatients = 248;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(70),
        child: ClipRRect(
          child: BackdropFilter(
            filter: ui.ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: AppBar(
              backgroundColor: Colors.black.withOpacity(0.3),
              elevation: 0,
              centerTitle: true,
              title: ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: [
                    Color(0xFF00D9FF),
                    Color(0xFF00F5A0),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ).createShader(bounds),
                child: const Text(
                  '🏥 iKhaya Health',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              actions: [
                // Connection Status Indicator
                _buildConnectionStatus(),
                
                // Settings Icon
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Center(
                    child: GestureDetector(
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('⚙️ Settings opened'),
                            duration: Duration(seconds: 2),
                            backgroundColor: Color(0xFFFFA500),
                          ),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFA500).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFFFFA500).withOpacity(0.5),
                            width: 1.5,
                          ),
                        ),
                        child: const Icon(
                          Icons.settings,
                          color: Color(0xFFFFA500),
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                ),
                
                // Sync Icon
                Padding(
                  padding: const EdgeInsets.only(right: 16),
                  child: Center(
                    child: GestureDetector(
                      onTap: () {
                        _performSync();
                      },
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00D9FF).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFF00D9FF).withOpacity(0.5),
                            width: 1.5,
                          ),
                        ),
                        child: const Icon(
                          Icons.sync,
                          color: Color(0xFF00D9FF),
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0a0e27),
              Color(0xFF1a1f3a),
              Color(0xFF0f1628),
            ],
            stops: [0.0, 0.5, 1.0],
          ),
        ),
        child: Stack(
          children: [
            // Animated Background Orbs
            Positioned(
              top: -100,
              right: -100,
              child: AnimatedBuilder(
                animation: _animationController,
                builder: (context, child) {
                  return Transform.translate(
                    offset: Offset(
                      50 * (1 - _animationController.value),
                      50 * _animationController.value,
                    ),
                    child: Container(
                      width: 300,
                      height: 300,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            const Color(0xFF00D9FF).withOpacity(0.3),
                            const Color(0xFF00D9FF).withOpacity(0.0),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            Positioned(
              bottom: -150,
              left: -150,
              child: AnimatedBuilder(
                animation: _animationController,
                builder: (context, child) {
                  return Transform.translate(
                    offset: Offset(
                      -50 * _animationController.value,
                      -50 * (1 - _animationController.value),
                    ),
                    child: Container(
                      width: 400,
                      height: 400,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            const Color(0xFF00F5A0).withOpacity(0.2),
                            const Color(0xFF00F5A0).withOpacity(0.0),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            // Main Content
            SafeArea(
              child: SingleChildScrollView(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    children: [
                      const SizedBox(height: 40),

                      // Hero Icon with Glow
                      Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(
                            colors: [
                              Color(0xFF00D9FF),
                              Color(0xFF00F5A0),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF00D9FF).withOpacity(0.5),
                              blurRadius: 30,
                              spreadRadius: 10,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.health_and_safety,
                          size: 60,
                          color: Colors.white,
                        ),
                      ),

                      const SizedBox(height: 40),

                      // Main Heading
                      ShaderMask(
                        shaderCallback: (bounds) => const LinearGradient(
                          colors: [
                            Color(0xFF00D9FF),
                            Color(0xFF00F5A0),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ).createShader(bounds),
                        child: const Text(
                          'Welcome to iKhaya Health',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: 0.5,
                            height: 1.2,
                          ),
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Subtitle
                      Text(
                        'Offline-first healthcare for rural clinics\nBringing quality care to every corner',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.white.withOpacity(0.7),
                          height: 1.6,
                          letterSpacing: 0.3,
                        ),
                      ),

                      const SizedBox(height: 30),

                      // Quick Stats Card
                      _buildQuickStatsCard(),

                      const SizedBox(height: 30),

                      // Feature Cards
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Expanded(
                            child: Wrap(
                              alignment: WrapAlignment.center,
                              spacing: 16,
                              runSpacing: 16,
                              children: [
                                _buildFeatureCard(
                                  icon: Icons.people,
                                  label: 'Patients',
                                  color: const Color(0xFF00D9FF),
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) => const PatientsScreen(),
                                      ),
                                    );
                                  },
                                ),
                                _buildFeatureCard(
                                  icon: Icons.groups,
                                  label: 'Staff',
                                  color: const Color(0xFF00F5A0),
                                  onTap: () {
                                    _showComingSoon('Staff Management');
                                  },
                                ),
                                _buildFeatureCard(
                                  icon: Icons.queue,
                                  label: 'Queue',
                                  color: const Color(0xFF9C27B0),
                                  onTap: () {
                                    _showComingSoon('Patient Queue');
                                  },
                                ),
                                _buildFeatureCard(
                                  icon: Icons.app_registration,
                                  label: 'Quick Register',
                                  color: const Color(0xFFFF5722),
                                  onTap: () {
                                    _showComingSoon('Quick Registration');
                                  },
                                ),
                                _buildFeatureCard(
                                  icon: Icons.sync,
                                  label: 'Sync Status',
                                  color: const Color(0xFF4CAF50),
                                  onTap: () {
                                    _showSyncStatus();
                                  },
                                ),
                                _buildFeatureCard(
                                  icon: Icons.inventory,
                                  label: 'Inventory',
                                  color: const Color(0xFFFFC107),
                                  onTap: () {
                                    _showComingSoon('Inventory Management');
                                  },
                                ),
                                _buildFeatureCard(
                                  icon: Icons.bar_chart,
                                  label: 'Reports',
                                  color: const Color(0xFFFF006E),
                                  onTap: () {
                                    _showComingSoon('Analytics & Reports');
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 40),

                      // Language Toggle Button
                      Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              const Color(0xFF00D9FF).withOpacity(0.15),
                              const Color(0xFF00F5A0).withOpacity(0.1),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFF00D9FF).withOpacity(0.3),
                            width: 1.5,
                          ),
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () {
                              _showLanguageDialog();
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                                vertical: 16,
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(
                                    Icons.language,
                                    color: Color(0xFF00D9FF),
                                    size: 24,
                                  ),
                                  const SizedBox(width: 12),
                                  ShaderMask(
                                    shaderCallback: (bounds) =>
                                        const LinearGradient(
                                      colors: [
                                        Color(0xFF00D9FF),
                                        Color(0xFF00F5A0),
                                      ],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ).createShader(bounds),
                                    child: const Text(
                                      '🌍 Change Language',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.white,
                                        letterSpacing: 0.3,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 40),

                      // Footer Info
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              const Color(0xFF00D9FF).withOpacity(0.08),
                              const Color(0xFF00F5A0).withOpacity(0.05),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFF00D9FF).withOpacity(0.2),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          children: [
                            Text(
                              'Empowering Rural Healthcare',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.white.withOpacity(0.8),
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Offline-first technology for clinics without reliable internet',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.white.withOpacity(0.6),
                                height: 1.5,
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Connection Status Widget
  Widget _buildConnectionStatus() {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: (isOnline ? Colors.green : Colors.orange).withOpacity(0.2),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: (isOnline ? Colors.green : Colors.orange).withOpacity(0.5),
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isOnline ? Icons.cloud_done : Icons.cloud_off,
              color: isOnline ? Colors.green : Colors.orange,
              size: 16,
            ),
            const SizedBox(width: 6),
            Text(
              isOnline ? 'Online' : 'Offline',
              style: TextStyle(
                color: isOnline ? Colors.green : Colors.orange,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Quick Stats Card
  Widget _buildQuickStatsCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF00D9FF).withOpacity(0.15),
            const Color(0xFF00F5A0).withOpacity(0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF00D9FF).withOpacity(0.3),
          width: 1.5,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem('Today', todayPatients.toString(), Icons.person_add),
          _buildStatItem('Queue', queueCount.toString(), Icons.hourglass_empty),
          _buildStatItem('Total', totalPatients.toString(), Icons.people),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: const Color(0xFF00D9FF), size: 24),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.white.withOpacity(0.6),
          ),
        ),
      ],
    );
  }

  // Feature Card Widget
  Widget _buildFeatureCard({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return SizedBox(
      width: 150,
      height: 120,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                color.withOpacity(0.15),
                color.withOpacity(0.05),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: color.withOpacity(0.4),
              width: 1.5,
            ),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(20),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [
                          color.withOpacity(0.3),
                          color.withOpacity(0.1),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      border: Border.all(
                        color: color.withOpacity(0.5),
                        width: 1,
                      ),
                    ),
                    child: Icon(
                      icon,
                      color: color,
                      size: 24,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                      letterSpacing: 0.3,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // Helper Methods
  void _showComingSoon(String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('🚀 $feature - Coming Soon!'),
        duration: const Duration(seconds: 2),
        backgroundColor: const Color(0xFF00D9FF),
      ),
    );
  }

  void _performSync() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
            const SizedBox(width: 16),
            Text(isOnline 
              ? '🔄 Syncing data with server...' 
              : '⚠️ No internet connection. Data will sync when online.'),
          ],
        ),
        duration: const Duration(seconds: 3),
        backgroundColor: const Color(0xFF00D9FF),
      ),
    );
  }

  void _showSyncStatus() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1a1f3a),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: const Color(0xFF00D9FF).withOpacity(0.3),
            width: 1.5,
          ),
        ),
        title: Row(
          children: [
            Icon(
              isOnline ? Icons.cloud_done : Icons.cloud_off,
              color: isOnline ? Colors.green : Colors.orange,
            ),
            const SizedBox(width: 12),
            const Text(
              'Sync Status',
              style: TextStyle(color: Colors.white),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSyncStatusItem('Connection', isOnline ? 'Online' : 'Offline', isOnline),
            _buildSyncStatusItem('Last Sync', '2 hours ago', true),
            _buildSyncStatusItem('Pending Changes', '0 items', true),
            _buildSyncStatusItem('Next Sync', isOnline ? 'In progress...' : 'When online', isOnline),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close', style: TextStyle(color: Color(0xFF00D9FF))),
          ),
        ],
      ),
    );
  }

  Widget _buildSyncStatusItem(String label, String value, bool isGood) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 14,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: isGood ? Colors.green : Colors.orange,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  void _showLanguageDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1a1f3a),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: const Color(0xFF00D9FF).withOpacity(0.3),
            width: 1.5,
          ),
        ),
        title: const Row(
          children: [
            Icon(Icons.language, color: Color(0xFF00D9FF)),
            SizedBox(width: 12),
            Text('Select Language', style: TextStyle(color: Colors.white)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildLanguageOption('🇬🇧', 'English', true),
            _buildLanguageOption('🇿🇦', 'isiZulu', false),
            _buildLanguageOption('🇿🇦', 'Sesotho', false),
            _buildLanguageOption('🇰🇪', 'Swahili', false),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close', style: TextStyle(color: Color(0xFF00D9FF))),
          ),
        ],
      ),
    );
  }

  Widget _buildLanguageOption(String flag, String language, bool isSelected) {
    return ListTile(
      leading: Text(flag, style: const TextStyle(fontSize: 24)),
      title: Text(
        language,
        style: TextStyle(
          color: isSelected ? const Color(0xFF00D9FF) : Colors.white,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      trailing: isSelected
          ? const Icon(Icons.check_circle, color: Color(0xFF00D9FF))
          : null,
      onTap: () {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Language changed to $language'),
            duration: const Duration(seconds: 2),
            backgroundColor: const Color(0xFF00F5A0),
          ),
        );
        Navigator.pop(context);
      },
    );
  }
}
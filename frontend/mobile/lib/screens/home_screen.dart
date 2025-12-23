// frontend/mobile/lib/screens/home_screen.dart
// MediConnect AI - Clean White Professional Design

import 'package:flutter/material.dart';
import 'patients_screen.dart';
import 'emergency_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB), // Sterile gray background
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Section
              _buildHeader(context),
              
              // Why MediConnect AI Section
              _buildWhySection(context),
              
              // Quick Access Cards
              _buildQuickAccessGrid(context),
              
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  // Header with Navigation
  Widget _buildHeader(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF0066CC), // Primary blue
            Color(0xFF1E90FF), // Medical blue
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Top Navigation
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Logo
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.health_and_safety,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'MediConnect AI',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
                // Settings Icon
                IconButton(
                  icon: const Icon(Icons.settings, color: Colors.white),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('⚙️ Settings - Coming Soon'),
                        backgroundColor: Color(0xFF0066CC),
                      ),
                    );
                  },
                ),
              ],
            ),
            
            const SizedBox(height: 30),
            
            // Title & Subtitle
            const Text(
              'Welcome to MediConnect AI',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                height: 1.2,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Revolutionizing healthcare with AI diagnostics\nand community-driven support',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withOpacity(0.9),
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            
            // CTA Button
            ElevatedButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('🤖 AI Diagnostics - Coming Soon'),
                    backgroundColor: Color(0xFF1E90FF),
                  ),
                );
              },
              icon: const Icon(Icons.psychology),
              label: const Text(
                'Explore AI Diagnostics',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF0066CC),
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 16,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                ),
                elevation: 4,
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Medical Image
            Container(
              height: 200,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: Colors.white.withOpacity(0.1),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(
                  'https://images.unsplash.com/photo-1576091160550-2173fdabea2b?w=800',
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Center(
                      child: Icon(
                        Icons.medical_services,
                        size: 80,
                        color: Colors.white.withOpacity(0.5),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Why MediConnect AI Section
  Widget _buildWhySection(BuildContext context) {
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      child: Column(
        children: [
          const Text(
            'Why MediConnect AI?',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1F2A44),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'MediConnect AI was born from a vision to make healthcare accessible, efficient, and empowering. Our advanced AI diagnostics help detect conditions early, while our community platform connects patients, caregivers, and professionals for shared support and knowledge.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[700],
              height: 1.6,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('💬 Community - Coming Soon'),
                  backgroundColor: Color(0xFF1E90FF),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0066CC),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(
                horizontal: 32,
                vertical: 14,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(30),
              ),
              elevation: 2,
            ),
            child: const Text(
              'Join Our Community',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Quick Access Grid - FIXED LAYOUT
  Widget _buildQuickAccessGrid(BuildContext context) {
    // Get screen width to determine card size
    final screenWidth = MediaQuery.of(context).size.width;
    final cardWidth = (screenWidth - 64) / 4; // 4 cards per row with spacing
    
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 16),
            child: Text(
              'Quick Access',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1F2A44),
              ),
            ),
          ),
          
          // Row 1: Find Hospitals, Find Clinics, Find Doctors, Patient Records
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildAccessCard(
                context,
                icon: Icons.local_hospital,
                title: 'Find Hospitals',
                description: 'Locate hospitals near you',
                color: const Color(0xFF1E90FF),
                width: cardWidth,
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('🏥 Find Hospitals - Coming Soon'),
                      backgroundColor: Color(0xFF1E90FF),
                    ),
                  );
                },
              ),
              _buildAccessCard(
                context,
                icon: Icons.medical_services,
                title: 'Find Clinics',
                description: 'Discover clinics nearby',
                color: const Color(0xFF00C853),
                width: cardWidth,
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('🏥 Find Clinics - Coming Soon'),
                      backgroundColor: Color(0xFF00C853),
                    ),
                  );
                },
              ),
              _buildAccessCard(
                context,
                icon: Icons.person,
                title: 'Find Doctors',
                description: 'Search for specialists',
                color: const Color(0xFF9C27B0),
                width: cardWidth,
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('👨‍⚕️ Find Doctors - Coming Soon'),
                      backgroundColor: Color(0xFF9C27B0),
                    ),
                  );
                },
              ),
              _buildAccessCard(
                context,
                icon: Icons.people,
                title: 'Patient Records',
                description: 'Manage health records',
                color: const Color(0xFF0066CC),
                width: cardWidth,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const PatientsScreen(),
                    ),
                  );
                },
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Row 2: AI Diagnostics, Medical Aid, Community
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildAccessCard(
                context,
                icon: Icons.psychology,
                title: 'AI Diagnostics',
                description: 'Upload for AI analysis',
                color: const Color(0xFFFF5722),
                width: cardWidth,
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('🤖 AI Diagnostics - Coming Soon'),
                      backgroundColor: Color(0xFFFF5722),
                    ),
                  );
                },
              ),
              _buildAccessCard(
                context,
                icon: Icons.shield,
                title: 'Medical Aid',
                description: 'Connect to services',
                color: const Color(0xFFFFC107),
                width: cardWidth,
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('🛡️ Medical Aid - Coming Soon'),
                      backgroundColor: Color(0xFFFFC107),
                    ),
                  );
                },
              ),
              _buildAccessCard(
                context,
                icon: Icons.forum,
                title: 'Community',
                description: 'Connect with others',
                color: const Color(0xFF4CAF50),
                width: cardWidth,
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('💬 Community - Coming Soon'),
                      backgroundColor: Color(0xFF4CAF50),
                    ),
                  );
                },
              ),
              // Empty space for alignment
              SizedBox(width: cardWidth),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Row 3: Health Education, Emergency (centered)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildAccessCard(
                context,
                icon: Icons.school,
                title: 'Health Education',
                description: 'Learn about wellness',
                color: const Color(0xFFE91E63),
                width: cardWidth,
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('📚 Health Education - Coming Soon'),
                      backgroundColor: Color(0xFFE91E63),
                    ),
                  );
                },
              ),
              const SizedBox(width: 16),
              _buildAccessCard(
                context,
                icon: Icons.emergency,
                title: 'Emergency',
                description: '24/7 emergency services',
                color: const Color(0xFFD32F2F),
                width: cardWidth,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const EmergencyScreen(),
                    ),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAccessCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String description,
    required Color color,
    required double width,
    required VoidCallback onTap,
  }) {
    return SizedBox(
      width: width,
      child: Card(
        elevation: 2,
        shadowColor: Colors.black.withOpacity(0.1),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: color.withOpacity(0.3),
            width: 1.5,
          ),
        ),
        color: Colors.white,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Icon
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: color.withOpacity(0.3),
                      width: 2,
                    ),
                  ),
                  child: Icon(
                    icon,
                    color: color,
                    size: 28,
                  ),
                ),
                const SizedBox(height: 12),
                
                // Title
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1F2A44),
                  ),
                ),
                const SizedBox(height: 6),
                
                // Description
                Text(
                  description,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                    height: 1.3,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                
                // Action Button
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: color.withOpacity(0.3),
                      width: 1,
                    ),
                  ),
                  child: Text(
                    'Explore',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: color,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
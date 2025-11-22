// frontend/mobile/lib/screens/patients_screen.dart

import 'package:flutter/material.dart';
import '../models/patient.dart';
import '../services/database_helper.dart';
// ignore: unused_import
import 'register_patient_screen.dart';

class PatientsScreen extends StatefulWidget {
  const PatientsScreen({super.key});

  @override
  State<PatientsScreen> createState() => _PatientsScreenState();
}

class _PatientsScreenState extends State<PatientsScreen> {
  final TextEditingController _searchController = TextEditingController();
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  
  String _searchQuery = '';
  final String _selectedFilter = 'All';
  List<Patient> _allPatients = [];
  List<Patient> _filteredPatients = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPatients();
  }

  Future<void> _loadPatients() async {
    setState(() => _isLoading = true);
    
    try {
      final patients = await _dbHelper.getAllPatients();
      setState(() {
        _allPatients = patients;
        _filteredPatients = patients;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading patients: $e');
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading patients: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _filterPatients() {
    setState(() {
      _filteredPatients = _allPatients.where((patient) {
        final matchesSearch = _searchQuery.isEmpty ||
            patient.givenName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
            patient.familyName.toLowerCase().contains(_searchQuery.toLowerCase());
        
        // For now, we don't have status in Patient model, so filter all
        final matchesFilter = _selectedFilter == 'All';
        
        return matchesSearch && matchesFilter;
      }).toList();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFDAE6E5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 2,
        shadowColor: Colors.black.withOpacity(0.1),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF00796B)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Patients',
          style: TextStyle(
            color: Color(0xFF00796B),
            fontSize: 22,
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF00796B)),
            onPressed: _loadPatients,
          ),
          IconButton(
            icon: const Icon(Icons.add_circle, color: Color(0xFF00796B)),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const RegisterPatientScreen(),
                ),
              );
              
              // Reload patients if registration was successful
              if (result == true) {
                _loadPatients();
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              onChanged: (value) {
                setState(() {
                  _searchQuery = value;
                  _filterPatients();
                });
              },
              style: const TextStyle(
                fontSize: 16,
                color: Color(0xFF263238),
              ),
              decoration: InputDecoration(
                hintText: 'Search by name...',
                hintStyle: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 16,
                ),
                prefixIcon: const Icon(
                  Icons.search,
                  color: Color(0xFF00796B),
                  size: 24,
                ),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: Colors.grey),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {
                            _searchQuery = '';
                            _filterPatients();
                          });
                        },
                      )
                    : null,
                filled: true,
                fillColor: const Color(0xFFECF4F3),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
              ),
            ),
          ),

          // Results count
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${_filteredPatients.length} ${_filteredPatients.length == 1 ? 'patient' : 'patients'} found',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[700],
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (_isLoading)
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00796B)),
                    ),
                  ),
              ],
            ),
          ),

          // Patient List
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      color: Color(0xFF00796B),
                    ),
                  )
                : _filteredPatients.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _filteredPatients.length,
                        itemBuilder: (context, index) {
                          final patient = _filteredPatients[index];
                          return _buildPatientCard(patient);
                        },
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const RegisterPatientScreen(),
            ),
          );
          
          // Reload patients if registration was successful
          if (result == true) {
            _loadPatients();
          }
        },
        backgroundColor: const Color(0xFF00796B),
        icon: const Icon(Icons.person_add, color: Colors.white),
        label: const Text(
          'Register Patient',
          style: TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildPatientCard(Patient patient) {
    final now = DateTime.now();
    final daysSinceCreation = now.difference(patient.createdAt).inDays;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 1,
      shadowColor: Colors.black.withOpacity(0.1),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: Colors.grey.withOpacity(0.2),
          width: 1,
        ),
      ),
      color: Colors.white,
      child: InkWell(
        onTap: () => _viewPatientDetails(patient),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Avatar
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFF00796B).withOpacity(0.2),
                      const Color(0xFF00796B).withOpacity(0.1),
                    ],
                  ),
                  border: Border.all(
                    color: const Color(0xFF00796B).withOpacity(0.3),
                    width: 2,
                  ),
                ),
                child: Center(
                  child: Text(
                    patient.initials,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF00796B),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              
              // Patient Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      patient.fullName,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF263238),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          patient.gender == 'male' ? Icons.male : Icons.female,
                          size: 16,
                          color: Colors.grey[600],
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${patient.age} years',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[700],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Icon(
                          Icons.language,
                          size: 16,
                          color: Colors.grey[600],
                        ),
                        const SizedBox(width: 4),
                        Text(
                          patient.primaryLanguage.toUpperCase(),
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[700],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: _getSyncStatusColor(patient.syncStatus).withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: _getSyncStatusColor(patient.syncStatus).withOpacity(0.4),
                              width: 1,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                patient.syncStatus == 'synced' 
                                    ? Icons.cloud_done 
                                    : Icons.cloud_upload,
                                size: 12,
                                color: _getSyncStatusColor(patient.syncStatus),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                patient.syncStatus == 'synced' ? 'Synced' : 'Pending',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: _getSyncStatusColor(patient.syncStatus),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          daysSinceCreation == 0
                              ? 'Today'
                              : daysSinceCreation == 1
                                  ? 'Yesterday'
                                  : '$daysSinceCreation days ago',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              // Arrow
              Icon(
                Icons.chevron_right,
                color: Colors.grey[400],
                size: 28,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF00796B).withOpacity(0.1),
            ),
            child: const Icon(
              Icons.people_outline,
              size: 60,
              color: Color(0xFF00796B),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            _searchQuery.isEmpty ? 'No patients yet' : 'No patients found',
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: Color(0xFF263238),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _searchQuery.isEmpty
                ? 'Tap the button below to add sample patients'
                : 'Try adjusting your search',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[600],
            ),
          ),
          if (_searchQuery.isEmpty) ...[
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF00796B).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xFF00796B).withOpacity(0.3),
                  width: 1.5,
                ),
              ),
              child: Column(
                children: [
                  const Icon(
                    Icons.info_outline,
                    color: Color(0xFF00796B),
                    size: 24,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Click the green button at the bottom\nto add 3 sample patients for testing',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[700],
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _getSyncStatusColor(String status) {
    switch (status) {
      case 'synced':
        return const Color(0xFF4CAF50);
      case 'pending':
        return const Color(0xFFFFA726);
      case 'conflict':
        return const Color(0xFFF44336);
      default:
        return Colors.grey;
    }
  }

  void _viewPatientDetails(Patient patient) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFF00796B).withOpacity(0.2),
                    const Color(0xFF00796B).withOpacity(0.1),
                  ],
                ),
              ),
              child: Center(
                child: Text(
                  patient.initials,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF00796B),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                patient.fullName,
                style: const TextStyle(
                  color: Color(0xFF263238),
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildDetailRow(Icons.cake, 'Age', '${patient.age} years'),
            _buildDetailRow(
              patient.gender == 'male' ? Icons.male : Icons.female, 
              'Gender', 
              patient.gender.toUpperCase()
            ),
            _buildDetailRow(Icons.language, 'Language', patient.primaryLanguage.toUpperCase()),
            _buildDetailRow(Icons.calendar_today, 'Birth Date', 
              '${patient.birthDate.day}/${patient.birthDate.month}/${patient.birthDate.year}'),
            _buildDetailRow(
              patient.syncStatus == 'synced' ? Icons.cloud_done : Icons.cloud_upload,
              'Sync Status',
              patient.syncStatus.toUpperCase(),
            ),
            _buildDetailRow(Icons.access_time, 'Created', 
              '${patient.createdAt.day}/${patient.createdAt.month}/${patient.createdAt.year}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text(
              'Close',
              style: TextStyle(color: Color(0xFF00796B)),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Patient details screen - Coming soon!'),
                  backgroundColor: Color(0xFF00796B),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00796B),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text('View Full Record'),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: const Color(0xFF00796B)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    color: Color(0xFF263238),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
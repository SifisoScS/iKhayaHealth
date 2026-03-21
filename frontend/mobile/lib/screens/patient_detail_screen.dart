import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/patient.dart';
import '../services/api_service.dart';

class PatientDetailScreen extends StatefulWidget {
  final Patient patient;
  const PatientDetailScreen({super.key, required this.patient});

  @override
  State<PatientDetailScreen> createState() => _PatientDetailScreenState();
}

class _PatientDetailScreenState extends State<PatientDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  static const _tabs = [
    'Overview',
    'Encounters',
    'Allergies',
    'Medications',
    'Diagnoses',
    'Immunizations',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.patient;
    return Scaffold(
      appBar: AppBar(
        title: Text('${p.givenName} ${p.familyName}'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          tabs: _tabs.map((t) => Tab(text: t)).toList(),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _OverviewTab(patient: p),
          _EncountersTab(patientId: p.id),
          _ClinicalListTab(
            endpoint: '/patients/${p.id}/allergies',
            title: 'Allergies',
            buildRow: _allergyRow,
          ),
          _ClinicalListTab(
            endpoint: '/patients/${p.id}/medications',
            title: 'Medications',
            buildRow: _medicationRow,
          ),
          _ClinicalListTab(
            endpoint: '/patients/${p.id}/diagnoses',
            title: 'Diagnoses',
            buildRow: _diagnosisRow,
          ),
          _ClinicalListTab(
            endpoint: '/patients/${p.id}/immunizations',
            title: 'Immunizations',
            buildRow: _immunizationRow,
          ),
        ],
      ),
    );
  }

  // ── Row builders ──────────────────────────────────────────────────────────

  static Widget _allergyRow(Map<String, dynamic> r) => ListTile(
        leading: const Icon(Icons.warning_amber, color: Colors.orange),
        title: Text(r['allergen'] as String? ?? ''),
        subtitle: Text([
          r['allergy_type'],
          r['severity'],
          r['reaction'],
        ].where((v) => v != null && v.toString().isNotEmpty).join(' · ')),
        trailing: _statusChip(r['status'] as String?),
      );

  static Widget _medicationRow(Map<String, dynamic> r) => ListTile(
        leading: const Icon(Icons.medication, color: Color(0xFF0066CC)),
        title: Text(r['medication_name'] as String? ?? ''),
        subtitle: Text([
          r['dosage'],
          r['route'],
          r['frequency'],
        ].where((v) => v != null && v.toString().isNotEmpty).join(' · ')),
        trailing: _statusChip(r['status'] as String?),
      );

  static Widget _diagnosisRow(Map<String, dynamic> r) => ListTile(
        leading: const Icon(Icons.local_hospital, color: Color(0xFF0066CC)),
        title: Text(r['condition_name'] as String? ?? ''),
        subtitle: Text([
          r['condition_code'],
          r['severity'],
          r['onset_date'] != null
              ? 'Onset: ${_fmtDate(r['onset_date'] as String)}'
              : null,
        ].where((v) => v != null && v.toString().isNotEmpty).join(' · ')),
        trailing: _statusChip(r['status'] as String?),
      );

  static Widget _immunizationRow(Map<String, dynamic> r) => ListTile(
        leading: const Icon(Icons.vaccines, color: Colors.green),
        title: Text(r['vaccine_name'] as String? ?? ''),
        subtitle: Text([
          r['dose_number'] != null ? 'Dose ${r['dose_number']}' : null,
          r['administration_date'] != null
              ? _fmtDate(r['administration_date'] as String)
              : null,
          r['lot_number'] != null ? 'Lot: ${r['lot_number']}' : null,
        ].where((v) => v != null).join(' · ')),
      );

  static Widget _statusChip(String? status) {
    if (status == null) return const SizedBox.shrink();
    final color = status == 'active'
        ? Colors.green
        : status == 'resolved' || status == 'completed'
            ? Colors.blue
            : Colors.grey;
    return Chip(
      label: Text(status,
          style: TextStyle(fontSize: 11, color: color.shade700)),
      backgroundColor: color.shade50,
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  static String _fmtDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return iso;
    }
  }
}

// ── Overview tab ──────────────────────────────────────────────────────────────

class _OverviewTab extends StatelessWidget {
  final Patient patient;
  const _OverviewTab({required this.patient});

  @override
  Widget build(BuildContext context) {
    final p = patient;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Avatar + name
        Center(
          child: Column(
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: const Color(0xFF0066CC),
                child: Text(
                  p.initials,
                  style: const TextStyle(
                      fontSize: 28,
                      color: Colors.white,
                      fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(height: 12),
              Text(p.fullName,
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 4),
              Chip(
                label: Text(p.active ? 'Active' : 'Inactive',
                    style: const TextStyle(fontSize: 12)),
                backgroundColor:
                    p.active ? Colors.green.shade50 : Colors.grey.shade100,
                labelStyle: TextStyle(
                    color: p.active
                        ? Colors.green.shade700
                        : Colors.grey.shade600),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Card(
          child: Column(
            children: [
              _InfoTile('Given name', p.givenName),
              _InfoTile('Family name', p.familyName),
              if (p.middleName != null) _InfoTile('Middle name', p.middleName!),
              _InfoTile('Date of birth', _fmtDate(p.birthDate)),
              _InfoTile('Age', '${p.age} years'),
              _InfoTile('Gender', _capitalize(p.gender)),
              _InfoTile('Language', p.primaryLanguage.toUpperCase()),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: [
              _InfoTile('Registered', _fmtDate(p.createdAt)),
              _InfoTile('Sync status', _capitalize(p.syncStatus)),
              if (p.lastSyncedAt != null)
                _InfoTile('Last synced', _fmtDate(p.lastSyncedAt!)),
            ],
          ),
        ),
      ],
    );
  }

  static String _fmtDate(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/'
      '${dt.month.toString().padLeft(2, '0')}/${dt.year}';

  static String _capitalize(String s) =>
      s.isEmpty ? s : '${s[0].toUpperCase()}${s.substring(1)}';
}

class _InfoTile extends StatelessWidget {
  final String label;
  final String value;
  const _InfoTile(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  color: Colors.grey.shade600, fontSize: 13)),
          Text(value,
              style: const TextStyle(
                  fontWeight: FontWeight.w500, fontSize: 14)),
        ],
      ),
    );
  }
}

// ── Encounters tab ────────────────────────────────────────────────────────────

class _EncountersTab extends StatefulWidget {
  final String patientId;
  const _EncountersTab({required this.patientId});

  @override
  State<_EncountersTab> createState() => _EncountersTabState();
}

class _EncountersTabState extends State<_EncountersTab> {
  List<Map<String, dynamic>> _encounters = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res =
          await ApiService.get('/encounters?patient_id=${widget.patientId}');
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        setState(() {
          _encounters = List<Map<String, dynamic>>.from(
              (body['data'] as List?) ?? []);
          _loading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load encounters (${res.statusCode})';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error: $e';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
          child: Text(_error!, style: const TextStyle(color: Colors.red)));
    }
    if (_encounters.isEmpty) {
      return const Center(child: Text('No encounters recorded.'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _encounters.length,
      itemBuilder: (context, i) {
        final e = _encounters[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: const Icon(Icons.assignment, color: Color(0xFF0066CC)),
            title: Text(_capitalize(e['encounter_type'] as String? ?? '')),
            subtitle: Text([
              e['chief_complaint'],
              e['start_time'] != null
                  ? _fmtDate(e['start_time'] as String)
                  : null,
            ].where((v) => v != null).join(' — ')),
            trailing: _statusChip(e['status'] as String?),
          ),
        );
      },
    );
  }

  static Widget _statusChip(String? status) {
    if (status == null) return const SizedBox.shrink();
    return Chip(
      label: Text(status, style: const TextStyle(fontSize: 11)),
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  static String _fmtDate(String iso) {
    try {
      final d = DateTime.parse(iso);
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return iso;
    }
  }

  static String _capitalize(String s) =>
      s.isEmpty ? s : '${s[0].toUpperCase()}${s.substring(1)}';
}

// ── Generic clinical list tab ─────────────────────────────────────────────────

class _ClinicalListTab extends StatefulWidget {
  final String endpoint;
  final String title;
  final Widget Function(Map<String, dynamic>) buildRow;

  const _ClinicalListTab({
    required this.endpoint,
    required this.title,
    required this.buildRow,
  });

  @override
  State<_ClinicalListTab> createState() => _ClinicalListTabState();
}

class _ClinicalListTabState extends State<_ClinicalListTab> {
  List<Map<String, dynamic>> _rows = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiService.get(widget.endpoint);
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        setState(() {
          _rows =
              List<Map<String, dynamic>>.from((body['data'] as List?) ?? []);
          _loading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load ${widget.title.toLowerCase()} (${res.statusCode})';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Network error: $e';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
          child: Text(_error!, style: const TextStyle(color: Colors.red)));
    }
    if (_rows.isEmpty) {
      return Center(child: Text('No ${widget.title.toLowerCase()} recorded.'));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _rows.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (_, i) => widget.buildRow(_rows[i]),
    );
  }
}

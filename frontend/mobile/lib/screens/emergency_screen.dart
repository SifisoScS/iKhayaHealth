// frontend/mobile/lib/screens/emergency_screen.dart
// iKhaya Health — Emergency Services Screen

import 'package:flutter/material.dart';

class EmergencyContact {
  final String name;
  final String number;
  final String description;
  final IconData icon;

  const EmergencyContact({
    required this.name,
    required this.number,
    required this.description,
    required this.icon,
  });
}

const List<EmergencyContact> _emergencyContacts = [
  EmergencyContact(
    name: 'Emergency Services',
    number: '112',
    description: 'Police, ambulance and fire (all networks)',
    icon: Icons.emergency,
  ),
  EmergencyContact(
    name: 'Ambulance',
    number: '10177',
    description: 'National ambulance service',
    icon: Icons.local_hospital,
  ),
  EmergencyContact(
    name: 'Police',
    number: '10111',
    description: 'South African Police Service',
    icon: Icons.local_police,
  ),
  EmergencyContact(
    name: 'Poison Control',
    number: '0861 555 777',
    description: 'Poison Information Helpline',
    icon: Icons.warning_amber,
  ),
  EmergencyContact(
    name: 'ChildLine',
    number: '116',
    description: 'Child abuse and emergency (toll-free)',
    icon: Icons.child_care,
  ),
  EmergencyContact(
    name: 'Suicide Crisis Line',
    number: '0800 567 567',
    description: 'SADAG mental health crisis (24/7)',
    icon: Icons.psychology,
  ),
];

const List<Map<String, String>> _triagedSymptoms = [
  {
    'level': 'RED',
    'label': 'Immediate',
    'description': 'Not breathing, no pulse, unconscious, severe bleeding, chest pain',
  },
  {
    'level': 'ORANGE',
    'label': 'Urgent',
    'description': 'Difficulty breathing, altered consciousness, severe pain, fracture',
  },
  {
    'level': 'YELLOW',
    'label': 'Less Urgent',
    'description': 'Moderate pain, fever >38.5°C, vomiting, minor bleeding',
  },
  {
    'level': 'GREEN',
    'label': 'Non-Urgent',
    'description': 'Minor injuries, mild pain, routine illness',
  },
];

class EmergencyScreen extends StatelessWidget {
  const EmergencyScreen({super.key});

  Color _triageColor(String level) {
    switch (level) {
      case 'RED':    return const Color(0xFFD32F2F);
      case 'ORANGE': return const Color(0xFFE65100);
      case 'YELLOW': return const Color(0xFFF9A825);
      case 'GREEN':  return const Color(0xFF2E7D32);
      default:       return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('Emergency'),
        backgroundColor: const Color(0xFFD32F2F),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFD32F2F),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Icon(Icons.warning, color: Colors.white, size: 32),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Life-threatening emergency?',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          'Call 112 immediately — works on all networks',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Emergency contacts
            const Text(
              'Emergency Numbers',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Color(0xFF1F2A44)),
            ),
            const SizedBox(height: 12),
            ..._emergencyContacts.map((contact) => _ContactCard(contact: contact)),

            const SizedBox(height: 24),

            // Triage guide
            const Text(
              'Triage Guide',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Color(0xFF1F2A44)),
            ),
            const SizedBox(height: 4),
            const Text(
              'Use this guide to assess urgency when triaging patients.',
              style: TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
            ),
            const SizedBox(height: 12),
            ..._triagedSymptoms.map((item) => _TriageRow(
              level: item['level']!,
              label: item['label']!,
              description: item['description']!,
              color: _triageColor(item['level']!),
            )),

            const SizedBox(height: 24),

            // Basic life support reminder
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.favorite, color: Color(0xFFD32F2F), size: 20),
                      SizedBox(width: 8),
                      Text(
                        'CPR — CAB sequence',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                    ],
                  ),
                  SizedBox(height: 10),
                  _CprStep(number: '1', label: 'Compressions', detail: '30 hard, fast chest compressions (100–120/min)'),
                  _CprStep(number: '2', label: 'Airway', detail: 'Tilt head, lift chin to open airway'),
                  _CprStep(number: '3', label: 'Breathing', detail: '2 rescue breaths, watch for chest rise'),
                  SizedBox(height: 8),
                  Text(
                    'Continue 30:2 until AED arrives or patient responds.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _ContactCard extends StatelessWidget {
  final EmergencyContact contact;
  const _ContactCard({required this.contact});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2)),
        ],
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFFFFEBEE),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(contact.icon, color: const Color(0xFFD32F2F), size: 22),
        ),
        title: Text(contact.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
        subtitle: Text(contact.description, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFFD32F2F),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            contact.number,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13),
          ),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      ),
    );
  }
}

class _TriageRow extends StatelessWidget {
  final String level;
  final String label;
  final String description;
  final Color color;

  const _TriageRow({
    required this.level,
    required this.label,
    required this.description,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border(left: BorderSide(color: color, width: 4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 64,
            padding: const EdgeInsets.symmetric(vertical: 2),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(4),
            ),
            alignment: Alignment.center,
            child: Text(
              label,
              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(description, style: const TextStyle(fontSize: 13, color: Color(0xFF374151))),
          ),
        ],
      ),
    );
  }
}

class _CprStep extends StatelessWidget {
  final String number;
  final String label;
  final String detail;

  const _CprStep({required this.number, required this.label, required this.detail});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 22,
            height: 22,
            decoration: const BoxDecoration(
              color: Color(0xFFD32F2F),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(number, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: const TextStyle(fontSize: 13, color: Color(0xFF374151)),
                children: [
                  TextSpan(text: '$label — ', style: const TextStyle(fontWeight: FontWeight.w600)),
                  TextSpan(text: detail),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

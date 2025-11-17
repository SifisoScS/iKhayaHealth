# iKhaya Health

🏥 **Offline-first healthcare records system for rural clinics**

## Vision
iKhaya Health empowers rural healthcare clinics with a robust, offline-first electronic health records system that works seamlessly with or without internet connectivity.

## Features
- ✅ Offline-first architecture
- ✅ Cross-platform (Mobile & Desktop)
- ✅ Multilingual support (English, isiZulu, Sesotho, Swahili)
- ✅ Secure encryption (AES-256)
- ✅ Role-based access control
- ✅ Intelligent sync with conflict resolution
- ✅ Audit trails for compliance

## Project Structure
`
iKhayaHealth/
├── frontend/
│   ├── mobile/          # Flutter mobile app
│   └── desktop/         # Electron desktop app
├── backend/             # Node.js API server
├── sync/                # Sync engine
├── security/            # Security modules
├── localization/        # Language files
└── docs/                # Documentation
`

## Tech Stack
- **Mobile**: Flutter
- **Desktop**: Electron + React
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (central) + SQLite (local)
- **Sync**: Custom sync engine with conflict resolution

## Getting Started

### Prerequisites
- Node.js 18+
- Flutter 3.0+
- PostgreSQL 14+
- Git

### Installation

1. **Clone the repository**
   `ash
   git clone https://github.com/yourusername/iKhayaHealth.git
   cd iKhayaHealth
   `

2. **Setup Backend**
   `ash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   npm start
   `

3. **Setup Mobile App**
   `ash
   cd frontend/mobile
   flutter pub get
   flutter run
   `

4. **Setup Desktop App**
   `ash
   cd frontend/desktop
   npm install
   npm run electron-dev
   `

## Development

### Running Tests
`ash
# Backend tests
cd backend
npm test

# Mobile tests
cd frontend/mobile
flutter test
`

### Building for Production
`ash
# Mobile (Android)
cd frontend/mobile
flutter build apk

# Mobile (iOS)
flutter build ios

# Desktop
cd frontend/desktop
npm run package
`

## Documentation
- [Architecture](docs/architecture.md)
- [API Specification](docs/api-spec.md)
- [User Guide](docs/user-guide.md)

## Contributing
We welcome contributions! Please read our contributing guidelines before submitting PRs.

## License
MIT License - see LICENSE file for details

## Support
- Email: support@ikhayahealth.org
- Documentation: https://docs.ikhayahealth.org
- Issues: https://github.com/yourusername/iKhayaHealth/issues

## Acknowledgments
Built with ❤️ for African healthcare workers in rural communities.

---

**Status**: Active Development
**Version**: 1.0.0
**Last Updated**: November 2025

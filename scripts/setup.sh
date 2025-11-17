#!/bin/bash

# Setup script for iKhaya Health development environment

echo "🏥 Setting up iKhaya Health..."

# Backend setup
echo "📦 Installing backend dependencies..."
cd backend
npm install
cp .env.example .env
echo "✅ Backend setup complete"

# Mobile setup
echo "📱 Setting up mobile app..."
cd ../frontend/mobile
flutter pub get
echo "✅ Mobile setup complete"

# Desktop setup
echo "💻 Setting up desktop app..."
cd ../desktop
npm install
echo "✅ Desktop setup complete"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your database credentials"
echo "2. Run 'npm start' in backend/ to start API server"
echo "3. Run 'flutter run' in frontend/mobile/ for mobile app"
echo "4. Run 'npm run electron-dev' in frontend/desktop/ for desktop app"

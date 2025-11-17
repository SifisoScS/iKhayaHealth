# PowerShell setup script for Windows

Write-Host "🏥 Setting up iKhaya Health..." -ForegroundColor Cyan

# Backend setup
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Green
Set-Location backend
npm install
Copy-Item .env.example .env
Write-Host "✅ Backend setup complete" -ForegroundColor Green

# Mobile setup
Write-Host "📱 Setting up mobile app..." -ForegroundColor Green
Set-Location ../frontend/mobile
flutter pub get
Write-Host "✅ Mobile setup complete" -ForegroundColor Green

# Desktop setup
Write-Host "💻 Setting up desktop app..." -ForegroundColor Green
Set-Location ../desktop
npm install
Write-Host "✅ Desktop setup complete" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Edit backend/.env with your database credentials"
Write-Host "2. Run 'npm start' in backend/ to start API server"
Write-Host "3. Run 'flutter run' in frontend/mobile/ for mobile app"
Write-Host "4. Run 'npm run electron-dev' in frontend/desktop/ for desktop app"

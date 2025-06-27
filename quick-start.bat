@echo off
echo 🚀 Starting MySQL Headless CMS Setup
echo ====================================

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker first.
    echo    Visit: https://docs.docker.com/get-docker/
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    echo    Visit: https://docs.docker.com/compose/install/
    pause
    exit /b 1
)

echo 📦 Starting MySQL container...
docker-compose up -d mysql

echo ⏳ Waiting for MySQL to be ready...
timeout /t 10 /nobreak > nul

echo 📊 Starting phpMyAdmin (optional)...
docker-compose up -d phpmyadmin

echo 📋 Installing Node.js dependencies...
npm install

echo �� Running database setup...
npm run setup:mysql

echo.
echo 🎉 Setup Complete!
echo ==================
echo.
echo 📱 Your services are running:
echo    🗄️  MySQL Database: localhost:3306
echo    🌐 phpMyAdmin: http://localhost:8080
echo    📚 Database: headless_cms
echo    👤 User: cms_user
echo    🔑 Password: cms_password
echo.
echo 🚀 Start development server:
echo    npm run dev
echo.
echo 🔑 Login credentials:
echo    Email: admin@cms.com
echo    Password: admin123
echo.
echo ⚡ Useful commands:
echo    npm run docker:logs    - View MySQL logs
echo    npm run docker:restart - Restart MySQL
echo    npm run docker:down    - Stop all containers
echo.
pause

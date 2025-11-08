#!/bin/bash

echo "======================================"
echo "Atlantic Hotel Receipt System Setup"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install Node.js 18.x or higher."
    echo "Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation completed successfully!"
    echo ""
    echo "======================================"
    echo "Quick Start Commands:"
    echo "======================================"
    echo ""
    echo "Run as Web App:"
    echo "  npm run dev"
    echo "  Then open http://localhost:3000"
    echo ""
    echo "Run as Desktop App:"
    echo "  npm run electron:dev"
    echo ""
    echo "Default Credentials:"
    echo "  Admin: admin / admin123"
    echo "  Receptionist: receptionist / recept123"
    echo ""
    echo "======================================"
else
    echo ""
    echo "❌ Installation failed. Please check the errors above."
    exit 1
fi
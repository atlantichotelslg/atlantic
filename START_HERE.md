# 🏨 Atlantic Hotel & Suites - Receipt System

## 🎉 Welcome!

You now have a **complete, production-ready** receipt management system!

---

## 📦 What's Inside

```
atlantic-hotel-receipt/          ← Your complete project folder
├── 📖 Documentation (Read These First!)
│   ├── START_HERE.md           ← You are here
│   ├── GETTING_STARTED.md      ← Quick setup guide (5 mins)
│   ├── PROJECT_OVERVIEW.md     ← Detailed overview
│   ├── QUICK_REFERENCE.md      ← Command cheat sheet
│   ├── WORKFLOW_GUIDE.md       ← Visual diagrams
│   └── README.md               ← Complete documentation
│
├── 🚀 Setup Scripts
│   ├── setup.bat               ← Windows installer
│   └── setup.sh                ← Mac/Linux installer
│
└── 💻 Source Code
    ├── app/                    ← Next.js pages
    ├── lib/                    ← Business logic
    ├── electron/               ← Desktop app
    └── [config files]          ← Configuration
```

---

## ⚡ Super Quick Start (3 Steps)

### Step 1: Install Dependencies

**Windows:** Double-click `setup.bat`
**Mac/Linux:** Run `./setup.sh`
**Manual:** Run `npm install`

### Step 2: Start the App

```bash
cd atlantic-hotel-receipt
npm run dev              # For web app
# OR
npm run electron:dev     # For desktop app
```

### Step 3: Login

Open http://localhost:3000 (for web) and login:
- Username: `admin`
- Password: `admin123`

**Done! You're ready to generate receipts! 🎉**

---

## 🎯 What This System Does

✅ **Works Offline** - No internet required, ever
✅ **Dual Platform** - Runs on web AND desktop
✅ **Auto Serial Numbers** - AH-1001, AH-1002, etc.
✅ **Auto Amount Conversion** - 50000 → "Fifty Thousand Naira Only"
✅ **Professional Receipts** - A4 format, print-ready
✅ **Secure Login** - Multiple users, offline authentication
✅ **Data Persistence** - All receipts saved automatically

---

## 📚 Documentation Guide

**New to the project?** Start here:
1. ✅ **START_HERE.md** ← You are here
2. 📖 **GETTING_STARTED.md** ← Installation & first receipt
3. 🎯 **QUICK_REFERENCE.md** ← Command cheat sheet

**Want more details?**
4. 📋 **PROJECT_OVERVIEW.md** ← Architecture & features
5. 🔄 **WORKFLOW_GUIDE.md** ← Visual diagrams
6. 📚 **README.md** ← Complete technical docs

---

## 🔐 Default Credentials

| Role          | Username      | Password    |
|---------------|---------------|-------------|
| Administrator | admin         | admin123    |
| Receptionist  | receptionist  | recept123   |

⚠️ **Remember to change these in production!**

---

## 💻 Available Commands

```bash
# Development
npm run dev              # Web app → http://localhost:3000
npm run electron:dev     # Desktop app

# Production
npm run build:web        # Build for web hosting
npm run build:electron   # Build desktop installers
npm run start            # Run production web server
```

---

## 📝 Generate Your First Receipt

1. **Login** with default credentials
2. **Enter Room Number** (e.g., "305")
3. **Enter Amount** (e.g., "50000")
   - System auto-converts to words
4. **Select Payment Mode** (Cash/Card/Transfer)
5. **Click "Generate Receipt"**
6. **Print or Create New**

---

## 🎨 Customization

### Change Hotel Information
Edit `app/home/page.tsx` (line ~180):
```tsx
<h1>Atlantic Hotel & Suites</h1>      ← Change this
<p>20A, Musa Yar'Adua Street</p>      ← Change this
<p>vinayak@atlanticslagos.com</p>     ← Change this
```

### Add Hotel Logo
1. Place logo in `public/logo.png`
2. Update receipt component to use it

### Change Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  atlantic: {
    blue: '#1e3a8a',    ← Your color
    gold: '#d97706',    ← Your color
  }
}
```

---

## 🌐 Deployment Options

### Option 1: Web Application
```bash
npm run build:web
npm run start
```
Deploy to: Vercel, Netlify, or any Node.js host

### Option 2: Desktop Application
```bash
npm run build:electron
```
Find installers in `dist/` folder:
- Windows: `.exe`
- Mac: `.dmg`
- Linux: `.AppImage`

---

## 🔧 Troubleshooting

### "npm: command not found"
→ Install Node.js from https://nodejs.org/

### "Port 3000 already in use"
→ Close other apps using port 3000 or change port

### "Login not working"
→ Clear browser cache and localStorage, refresh

### "Electron won't start"
→ Run `npm run dev` first to test Next.js

**More help?** Check README.md or email vinayak@atlanticslagos.com

---

## 🚀 Next Steps

- [ ] Complete installation
- [ ] Test with demo credentials
- [ ] Generate a test receipt
- [ ] Customize hotel information
- [ ] Add your logo
- [ ] Change default passwords
- [ ] Deploy to production

---

## 📞 Support

**Email:** vinayak@atlanticslagos.com

**Documentation:**
- Quick Setup: GETTING_STARTED.md
- Commands: QUICK_REFERENCE.md
- Full Docs: README.md

---

## 🎉 You're All Set!

Everything is ready to go. Just run:

```bash
npm install          # First time only
npm run dev          # Start the app
```

Then login and start generating receipts! 

**Made with ❤️ for Atlantic Hotel & Suites**

---

**Version 1.0.0** | **License: Private Use** | **2024**

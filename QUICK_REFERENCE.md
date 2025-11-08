# ⚡ Quick Reference Card

## 🚀 Installation (Choose One)

```bash
# Windows: Double-click setup.bat
# Mac/Linux: ./setup.sh
# Manual: npm install
```

## 🎮 Run Application (Choose One)

```bash
npm run dev              # Web app → http://localhost:3000
npm run electron:dev     # Desktop app
```

## 🔐 Login

```
Admin:        admin / admin123
Receptionist: receptionist / recept123
```

## 📝 Generate Receipt

1. Login
2. Enter room number
3. Enter amount (auto-converts to words)
4. Select payment mode
5. Click "Generate Receipt"
6. Print or create new

## 📂 Project Structure

```
app/
  ├── page.tsx        → Login page
  └── home/
      └── page.tsx    → Receipt page

lib/
  ├── auth.ts         → Login logic
  └── receipts.ts     → Receipt logic

electron/
  ├── main.js         → Desktop app
  └── preload.js
```

## 🎨 Customize Hotel Info

File: `app/home/page.tsx`
Line: ~180

```tsx
<h1>Atlantic Hotel & Suites</h1>
<p>20A, Musa Yar'Adua Street</p>
<p>Victoria Island, Lagos, Nigeria</p>
<p>vinayak@atlanticslagos.com</p>
```

## 💾 Data Storage (LocalStorage)

```
atlantic_hotel_users           → User credentials
atlantic_hotel_session         → Current session
atlantic_hotel_receipts        → All receipts
atlantic_hotel_receipt_counter → Serial numbers
```

## 🏗️ Build for Production

```bash
npm run build:web        # Web (deploy to host)
npm run build:electron   # Desktop (installers in dist/)
```

## 🔧 Common Issues

**Port in use?**
```bash
# Kill port 3000
lsof -ti:3000 | xargs kill -9  # Mac/Linux
```

**Electron won't start?**
```bash
# Reinstall
rm -rf node_modules
npm install
```

**Login broken?**
```
Clear browser cache + localStorage
Refresh page
```

## 📋 Receipt Includes

✅ Hotel logo & info
✅ Serial number (AH-XXXX)
✅ Room number
✅ Amount in words & figures (₦)
✅ Payment mode
✅ Date
✅ Receptionist signature line

## 🌐 Key Features

✅ Works 100% offline
✅ Web + Desktop support
✅ A4 print format
✅ Auto number-to-words
✅ Auto serial numbers
✅ Local data storage
✅ Secure login

## 📞 Help

📧 vinayak@atlanticslagos.com
📖 README.md (full docs)
📖 GETTING_STARTED.md (setup)
📖 PROJECT_OVERVIEW.md (detailed)

---

**Made for Atlantic Hotel & Suites** 🏨

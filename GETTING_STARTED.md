# Getting Started - Atlantic Hotel Receipt System

## Quick Start (5 Minutes)

### Step 1: Install Node.js
If you don't have Node.js installed:
1. Visit https://nodejs.org/
2. Download the LTS version (18.x or higher)
3. Run the installer and follow the prompts

### Step 2: Install Dependencies

**On Windows:**
- Double-click `setup.bat`
- Wait for installation to complete

**On Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**Or manually:**
```bash
npm install
```

### Step 3: Run the Application

**Option A: Web Application**
```bash
npm run dev
```
Then open your browser to: http://localhost:3000

**Option B: Desktop Application**
```bash
npm run electron:dev
```
The desktop app will launch automatically.

### Step 4: Login

Use these credentials to login:

**Administrator:**
- Username: `admin`
- Password: `admin123`

**Receptionist:**
- Username: `receptionist`
- Password: `recept123`

### Step 5: Generate Your First Receipt

1. After login, you'll see the receipt generation form
2. Enter Room Number (e.g., "305")
3. Enter Amount (e.g., "50000")
   - The system will automatically convert to words
4. Select Payment Mode (Cash/Card/Transfer)
5. Click "Generate Receipt"
6. Print or create a new receipt

## Key Features

### ✅ Works Offline
The entire system works without internet. All data is stored locally on your computer.

### ✅ Auto-Save
Every receipt is automatically saved to your computer's local storage.

### ✅ Auto Serial Numbers
Serial numbers (e.g., AH-1001, AH-1002) are automatically generated and incremented.

### ✅ Amount Conversion
When you type an amount in numbers, it's automatically converted to words in Nigerian Naira.

Example: 50000 → "Fifty Thousand Naira Only"

### ✅ A4 Format
Receipts are formatted for standard A4 paper (210mm × 297mm) and ready to print.

## Common Questions

**Q: Do I need internet to use this?**
A: No! The system is designed to work completely offline.

**Q: Where are receipts stored?**
A: Receipts are stored in your browser's local storage. They persist even after closing the browser.

**Q: Can I change the hotel information?**
A: Yes! Edit the hotel details in the source code (see README.md for instructions).

**Q: How do I add more users?**
A: Users are stored in browser's localStorage. You can add them programmatically (see README.md).

**Q: What if I close the browser?**
A: All your data (receipts, users, serial numbers) is saved and will be there when you return.

**Q: Can I export receipts?**
A: Currently, you can print receipts to PDF. Additional export features can be added.

## Deployment

### For Web Hosting
```bash
npm run build:web
npm run start
```

### For Desktop Distribution
```bash
npm run build:electron
```
Find the installer in the `dist` folder.

## Troubleshooting

### "Port 3000 already in use"
Close any other applications using port 3000, or change the port in package.json.

### "Cannot find module"
Run `npm install` again to ensure all dependencies are installed.

### "Login not working"
Clear your browser's cache and localStorage, then try again.

### Electron won't start
Ensure Next.js dev server is running first by executing `npm run dev` in a separate terminal.

## Need Help?

- Check the full README.md for detailed documentation
- Email: vinayak@atlanticslagos.com

## Next Steps

1. ✅ Complete installation
2. ✅ Test login with default credentials
3. ✅ Generate a test receipt
4. ✅ Try printing
5. 📝 Customize hotel information
6. 👥 Add more users if needed
7. 🚀 Start using in production

---

**Made for Atlantic Hotel & Suites**

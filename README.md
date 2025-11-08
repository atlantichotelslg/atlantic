# Atlantic Hotel & Suites - Receipt Management System

A modern receipt generation system built with Next.js and Electron that works both online and offline.

## Features

✅ **Dual Platform Support**: Runs as a web app and desktop application (Electron)
✅ **Offline-First Authentication**: Login works without internet connection
✅ **Offline Receipt Generation**: Create receipts even when offline
✅ **Local Data Storage**: All data stored in browser's localStorage
✅ **A4 Receipt Format**: Professional A4-sized receipts ready for printing
✅ **Auto Number Conversion**: Automatically converts amounts to words
✅ **Serial Number Generation**: Auto-incrementing receipt serial numbers
✅ **Print Functionality**: Print receipts directly from the app

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Desktop**: Electron
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Storage**: LocalStorage (offline-first)

## Prerequisites

- Node.js 18.x or higher
- npm or yarn

## Installation

1. **Clone or download the project folder**

2. **Navigate to the project directory**:
```bash
cd atlantic-hotel-receipt
```

3. **Install dependencies**:
```bash
npm install
```

## Running the Application

### Web Application (Development)

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Electron Desktop App (Development)

```bash
npm run electron:dev
```
This will start both Next.js and Electron simultaneously.

### Building for Production

**Build Web Application**:
```bash
npm run build:web
npm run start
```

**Build Desktop Application**:
```bash
npm run build:electron
```
The packaged app will be in the `dist` folder.

## Default Login Credentials

### Administrator
- **Username**: `admin`
- **Password**: `admin123`

### Receptionist
- **Username**: `receptionist`
- **Password**: `recept123`

## How to Use

### 1. Login
- Open the application
- Use one of the default credentials above
- System works offline - no internet required

### 2. Generate Receipt
- Enter Room Number
- Enter Amount (automatically converts to words)
- Select Payment Mode (Cash/Card/Transfer)
- Click "Generate Receipt"

### 3. Print Receipt
- Click "Print Receipt" button
- Receipt is formatted for A4 paper
- All receipts are automatically saved locally

### 4. Create New Receipt
- Click "New Receipt" button
- Serial number auto-increments

## Project Structure

```
atlantic-hotel-receipt/
├── app/
│   ├── page.tsx           # Login page
│   ├── home/
│   │   └── page.tsx       # Receipt generation page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── lib/
│   ├── auth.ts            # Authentication logic
│   └── receipts.ts        # Receipt management logic
├── electron/
│   ├── main.js            # Electron main process
│   └── preload.js         # Electron preload script
├── public/                # Static assets
├── package.json
├── next.config.js
├── tsconfig.json
└── tailwind.config.js
```

## Data Storage

All data is stored locally using browser's localStorage:

- **User Credentials**: `atlantic_hotel_users`
- **User Session**: `atlantic_hotel_session`
- **Receipts**: `atlantic_hotel_receipts`
- **Receipt Counter**: `atlantic_hotel_receipt_counter`

## Offline Functionality

The application is designed to work completely offline:

1. **Authentication**: User credentials stored locally
2. **Receipt Generation**: All data saved to localStorage
3. **Number Conversion**: Works client-side
4. **Serial Numbers**: Auto-incremented locally

## Customization

### Change Hotel Information

Edit the hotel details in `/app/home/page.tsx`:

```typescript
<h1>Atlantic Hotel & Suites</h1>
<p>20A, Musa Yar'Adua Street</p>
<p>Victoria Island, Lagos, Nigeria</p>
<p>vinayak@atlanticslagos.com</p>
```

### Add More Users

Users can be added programmatically in `/lib/auth.ts` or through localStorage:

```typescript
AuthService.addUser('username', 'password', 'Full Name', 'Role');
```

### Customize Receipt Format

Modify the receipt layout in `/app/home/page.tsx` within the receipt div section.

## Printing

The receipt is optimized for A4 printing:
- Size: 210mm × 297mm
- Margin: 20mm all sides
- Print-friendly CSS classes included

## Troubleshooting

### Electron app won't start
- Make sure port 3000 is not in use
- Try running `npm run dev` first to ensure Next.js works
- Check Node.js version (18.x or higher required)

### Login not working
- Clear browser cache and localStorage
- Refresh the page
- Check browser console for errors

### Receipts not saving
- Check browser's localStorage quota
- Ensure localStorage is enabled in browser
- Check browser console for errors

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Any modern browser with localStorage support

## License

This project is for Atlantic Hotel & Suites internal use.

## Support

For issues or questions, contact: vinayak@atlanticslagos.com
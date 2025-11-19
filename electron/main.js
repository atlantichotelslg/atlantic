const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

let server;
const PORT = 3456;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../public/logo.png')
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Create local server to serve static files
    const expressApp = express();
    expressApp.use(express.static(path.join(__dirname, '../out')));
    
    server = expressApp.listen(PORT, () => {
      console.log(`Local server running on http://localhost:${PORT}`);
      mainWindow.loadURL(`http://localhost:${PORT}`);
    });

    // Open DevTools temporarily
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
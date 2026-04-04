const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    title: "rDs Pedidos — Sistema de Gestão",
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false);

  const startURL = isDev 
    ? 'http://localhost:5173' 
    : 'https://app.rdspedidos.com.br';

  mainWindow.loadURL(startURL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links (WhatsApp, etc)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC HANDLERS ---

// Get list of printers
ipcMain.handle('get-printers', async () => {
  return await mainWindow.webContents.getPrintersAsync();
});

// Direct Printing (Silent)
ipcMain.handle('print-order', async (event, { html, printerName }) => {
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false
    }
  });

  printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  return new Promise((resolve, reject) => {
    printWindow.webContents.on('did-finish-load', () => {
      const options = {
        silent: true,
        deviceName: printerName || '',
        printBackground: true,
        margins: {
            marginType: 'custom',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        },
        pageSize: {
            width: 80000, 
            height: 200000 
        },
        scaleFactor: 100,
        color: false
      };

      printWindow.webContents.print(options, (success, failureReason) => {
        printWindow.close();
        if (success) resolve(true);
        else reject(failureReason);
      });
    });
  });
});

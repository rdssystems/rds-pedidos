const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // API to check if we are in Electron
    isElectron: true,
    
    // API to get installed printers
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    
    // API to print directly (silent)
    printPedido: (html, printerName) => ipcRenderer.invoke('print-order', { html, printerName })
});

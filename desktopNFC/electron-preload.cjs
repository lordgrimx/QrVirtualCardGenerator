const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  ping: () => ipcRenderer.invoke('ping'),
  nfcStart: () => ipcRenderer.invoke('nfc:start'),
  nfcStop: () => ipcRenderer.invoke('nfc:stop'),
  nfcWriteText: (text) => ipcRenderer.invoke('nfc:writeText', text),
  nfcListReaders: () => ipcRenderer.invoke('nfc:listReaders'),
  nfcSelectReader: (name) => ipcRenderer.invoke('nfc:selectReader', name),
  onNfcCard: (callback) => {
    ipcRenderer.removeAllListeners('nfc:card');
    ipcRenderer.on('nfc:card', (_event, payload) => callback(payload));
  },
  onNfcReaders: (callback) => {
    ipcRenderer.removeAllListeners('nfc:readers');
    ipcRenderer.on('nfc:readers', (_event, list) => callback(list));
  },
});



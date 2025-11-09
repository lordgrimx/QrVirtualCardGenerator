// Electron main process - CommonJS
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    backgroundColor: '#7C2D12',
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });

  const url = app.isPackaged
    ? 'file://' + path.join(__dirname, 'dist/index.html')
    : 'http://localhost:5173';
  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// NFC bridge: read/write NDEF Text
const { NFC } = require('nfc-pcsc');
const ndef = require('ndef');

let nfc;
let currentReader = null;
const readers = new Map(); // name -> reader
let selectedReaderName = null;

function broadcastReaders() {
  try {
    const list = Array.from(readers.keys());
    mainWindow?.webContents.send('nfc:readers', list);
  } catch {}
}

function setupNfc() {
  nfc = new NFC(); // will start immediately

  nfc.on('reader', reader => {
    readers.set(reader.name, reader);
    // set default reader if none selected
    if (!selectedReaderName) {
      selectedReaderName = reader.name;
      currentReader = reader;
    }
    broadcastReaders();
    console.log(`🔌 Reader bağlandı: ${reader.name}`);

    reader.aid = 'F222222222'; // arbitrary AID for Android HCE compat

    reader.on('card', async card => {
      try {
        if (selectedReaderName && reader.name !== selectedReaderName) {
          // ignore other readers
          return;
        }
        // Try reading ~192 bytes from page 4 (NTAG) to capture TLV+NDEF
        const data = await reader.read(4, 192);
        const ndefText = extractNdefText(data);

        mainWindow?.webContents.send('nfc:card', {
          uid: card.uid || undefined,
          uidHex: (card.uid || '').match(/.{1,2}/g)?.join(':'),
          rawText: ndefText || undefined,
          timestamp: new Date().toISOString(),
          isSuccess: true,
        });
      } catch (err) {
        console.warn('NFC read error:', err);
        mainWindow?.webContents.send('nfc:card', {
          isSuccess: false,
          errorMessage: err?.message || 'Okuma hatası',
          timestamp: new Date().toISOString(),
        });
      }
    });

    reader.on('error', err => {
      console.error(`Reader error (${reader.name}):`, err);
    });

    reader.on('end', () => {
      console.log(`🔌 Reader ayrıldı: ${reader.name}`);
      readers.delete(reader.name);
      if (currentReader === reader) {
        currentReader = null;
        selectedReaderName = null;
      }
      broadcastReaders();
    });
  });

  nfc.on('error', err => console.error('NFC genel hata:', err));
}

function extractNdefText(dataBuffer) {
  // TLV parse: 0x03 = NDEF Message TLV
  const data = Buffer.from(dataBuffer);
  const tlvIndex = data.indexOf(0x03);
  if (tlvIndex === -1) return null;

  let length = data[tlvIndex + 1];
  let offset = tlvIndex + 2;
  if (length === 0xFF) {
    length = (data[tlvIndex + 2] << 8) + data[tlvIndex + 3];
    offset = tlvIndex + 4;
  }

  const ndefPayload = data.slice(offset, offset + length);
  try {
    const records = ndef.decodeMessage(ndefPayload);
    if (records && records.length > 0) {
      const rec = records[0];
      // Try Text record (TNF well-known, type 'T')
      if (rec.type && Buffer.isBuffer(rec.type) && rec.type.toString() === 'T') {
        const payload = rec.payload;
        const langLength = payload[0] & 0x3f;
        return payload.slice(1 + langLength).toString('utf8');
      }
      // Fallback: treat payload as utf8
      if (rec.payload) {
        return Buffer.from(rec.payload).toString('utf8');
      }
    }
    return null;
  } catch (e) {
    console.warn('NDEF decode error:', e);
    return null;
  }
}

ipcMain.handle('ping', () => 'pong');
ipcMain.handle('nfc:start', async () => {
  if (!nfc) setupNfc();
  return { ok: true };
});
ipcMain.handle('nfc:stop', async () => {
  // there is no direct stop in nfc-pcsc; readers emit 'end' on disconnect
  return { ok: true };
});
ipcMain.handle('nfc:listReaders', async () => {
  return { ok: true, readers: Array.from(readers.keys()), selected: selectedReaderName };
});
ipcMain.handle('nfc:selectReader', async (_evt, name) => {
  if (name && readers.has(name)) {
    selectedReaderName = name;
    currentReader = readers.get(name) || null;
    broadcastReaders();
    return { ok: true };
  }
  return { ok: false, error: 'Reader bulunamadı' };
});
ipcMain.handle('nfc:writeText', async (_evt, text) => {
  if (!currentReader) {
    return { ok: false, error: 'NFC reader bulunamadı' };
  }
  try {
    const message = ndef.encodeMessage([ndef.textRecord(String(text || ''))]);
    // Wrap with TLV (0x03, length, ...msg, 0xFE)
    let tlv;
    if (message.length > 0xff) {
      tlv = Buffer.concat([Buffer.from([0x03, 0xff, (message.length >> 8) & 0xff, message.length & 0xff]), Buffer.from(message), Buffer.from([0xfe])]);
    } else {
      tlv = Buffer.concat([Buffer.from([0x03, message.length]), Buffer.from(message), Buffer.from([0xfe])]);
    }
    await currentReader.write(tlv, 4); // start at page 4
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || 'Yazma hatası' };
  }
});



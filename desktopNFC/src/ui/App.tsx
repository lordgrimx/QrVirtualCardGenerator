import React, { useEffect, useMemo, useRef, useState } from 'react';
// Reuse the existing ANEF logo from mobile assets
import anefLogo from '../../../expoNFC/assets/anef-logo.png';
import { backendApi } from '../services/BackendApi';
import { decryptNfcData, verifyNfcSignatureOffline } from '../utils/cryptoLite';
import MemberInfoModal from './MemberInfoModal';
import type { MemberInfoData } from './MemberInfoModal';

type TabKey = 'nfc' | 'qr';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('nfc');

  return (
    <div className="container">
      <div className="header">
        <img src={anefLogo} className="logo" />
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'nfc' ? 'active' : ''}`}
          onClick={() => setActiveTab('nfc')}
        >
          NFC Okuyucu/Yazıcı
        </button>
        <button
          className={`tab ${activeTab === 'qr' ? 'active' : ''}`}
          onClick={() => setActiveTab('qr')}
        >
          QR Doğrulama
        </button>
      </div>

      {activeTab === 'nfc' ? <NfcPanel /> : <QrPanel />}
    </div>
  );
}

function NfcPanel() {
  const [status, setStatus] = useState('Hazır');
  const [nfcOn, setNfcOn] = useState(false);
  const [history, setHistory] = useState<Array<{ uid?: string; success: boolean; time: string }>>([]);
  const [lastUid, setLastUid] = useState<string>('');
  const [writeText, setWriteText] = useState<string>('');
  const [mode, setMode] = useState<'read' | 'write'>('read');
  const [readers, setReaders] = useState<string[]>([]);
  const [selectedReader, setSelectedReader] = useState<string>('');
  const [serverOk, setServerOk] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<MemberInfoData | null>(null);
  const openModal = (data: MemberInfoData) => { setModalData(data); setModalOpen(true); };

  // Sunucu durumunu kontrol et
  React.useEffect(() => {
    (async () => {
      const r = await backendApi.getPublicKey();
      setServerOk(!!r.ok);
    })();
  }, []);

  const toggle = async () => {
    if (!nfcOn) {
      setStatus('NFC başlatılıyor...');
      try {
        // @ts-ignore
        await window.desktop?.nfcStart?.();
        // @ts-ignore
        window.desktop?.onNfcCard?.(async (payload: any) => {
          const uid = payload?.uidHex || payload?.uid;
          setLastUid(uid || '');

          if (payload?.isSuccess && payload?.rawText) {
            setStatus('Sunucuda doğrulanıyor...');
            const online = await backendApi.decryptNfc(payload.rawText, 'Electron Desktop');
            if (online.ok && online.result) {
              const ok = !!online.result.valid;
              setStatus(ok ? `✅ Doğrulama başarılı: ${online.result.member?.name || 'Bilinmeyen'}` : `❌ ${online.result.error}`);
              setHistory((prev) => [{ uid, success: ok, time: new Date().toLocaleTimeString('tr-TR') }, ...prev.slice(0, 19)]);
              openModal({ valid: ok, mode: 'Online', member: online.result.member, error: online.result.error, verificationTime: online.result.verificationTime });
              return;
            }
            // Offline dene
            const dec = decryptNfcData(payload.rawText);
            if (dec) {
              try {
                const data = JSON.parse(dec);
                const sigOk = verifyNfcSignatureOffline(String(data.sig || ''));
                const ok = !!sigOk;
                setStatus(ok ? `✅ Offline doğrulama başarılı: ${data.name || 'Bilinmeyen'}` : `❌ Geçersiz dijital imza`);
                setHistory((prev) => [{ uid, success: ok, time: new Date().toLocaleTimeString('tr-TR') }, ...prev.slice(0, 19)]);
                openModal({ valid: ok, mode: 'Offline', member: ok ? { name: data.name, membershipId: data.mid, fromDatabase: false } : undefined, error: ok ? undefined : 'Geçersiz dijital imza' });
                return;
              } catch {}
            }
            setStatus('❌ Doğrulama başarısız');
            setHistory((prev) => [{ uid, success: false, time: new Date().toLocaleTimeString('tr-TR') }, ...prev.slice(0, 19)]);
          } else {
            setHistory((prev) => [{ uid, success: false, time: new Date().toLocaleTimeString('tr-TR') }, ...prev.slice(0, 19)]);
            setStatus(`Hata: ${payload?.errorMessage || 'Okuma hatası'}`);
          }
        });
        // Reader listesi
        // @ts-ignore
        window.desktop?.onNfcReaders?.((list: string[]) => setReaders(list || []));
        // @ts-ignore
        const info = await window.desktop?.nfcListReaders?.();
        if (info?.ok) {
          setReaders(info.readers || []);
          setSelectedReader(info.selected || '');
        }
        setNfcOn(true);
        setStatus('NFC aktif - Kart yerleştirin');
      } catch (e: any) {
        setStatus('NFC başlatılamadı: ' + (e?.message || 'hata'));
      }
    } else {
      try {
        // @ts-ignore
        await window.desktop?.nfcStop?.();
      } finally {
        setNfcOn(false);
        setStatus('NFC durduruldu');
      }
    }
  };

  const switchMode = async (m: 'read' | 'write') => {
    setMode(m);
    // Yazma modunda da okuyucu bağlantısı gerekli (reader detection için)
    if (m === 'write' && !nfcOn) {
      try {
        // @ts-ignore
        await window.desktop?.nfcStart?.();
        setNfcOn(true);
      } catch (e) {
        // ignore
      }
    }
  };

  const onSelectReader = async (name: string) => {
    setSelectedReader(name);
    // @ts-ignore
    const res = await window.desktop?.nfcSelectReader?.(name);
    if (res?.ok) {
      setStatus(`Aktif okuyucu: ${name}`);
    } else {
      setStatus('Okuyucu seçilemedi');
    }
  };

  const handleWrite = async () => {
    if (!writeText?.trim()) {
      setStatus('Yazılacak metin boş olamaz');
      return;
    }
    setStatus('Kart yazılıyor...');
    // @ts-ignore
    const res = await window.desktop?.nfcWriteText?.(writeText.trim());
    if (res?.ok) {
      setStatus('✅ Yazma başarılı. Kartı çıkarabilirsiniz.');
    } else {
      setStatus('❌ Yazma hatası: ' + (res?.error || 'bilinmeyen hata'));
    }
  };

  return (
    <div>
      {/* Okuma/Yazma alt sekmeleri */}
      <div className="tabs" style={{ marginBottom: 12 }}>
        <button
          className={`tab ${mode === 'read' ? 'active' : ''}`}
          onClick={() => switchMode('read')}
        >
          Okuma
        </button>
        <button
          className={`tab ${mode === 'write' ? 'active' : ''}`}
          onClick={() => switchMode('write')}
        >
          Yazma
        </button>
      </div>

      <div className="status-row">
        <div className="status-item">
          <div>Sunucu</div>
          <div className="status-value" style={{ color: serverOk ? '#10B981' : '#EF4444' }}>
            {serverOk ? 'Bağlı' : 'Çevrimdışı'}
          </div>
        </div>
        <div className="status-item">
          <div>NFC</div>
          <div className="status-value">{nfcOn ? 'Aktif' : 'Kapalı'}</div>
        </div>
      </div>

      {/* Okuyucu Seçimi */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Okuyucu Seç</div>
        {readers.length === 0 ? (
          <div style={{ color: '#6B7280' }}>Cihaz bekleniyor...</div>
        ) : (
          <select
            value={selectedReader}
            onChange={(e) => onSelectReader(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }}
          >
            {readers.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )}
      </div>

      {/* Durum ve NFC başlat/durdur (sadece Okuma modunda göster) */}
      {mode === 'read' && (
        <div className="card">
          <div style={{ marginBottom: 10, color: '#6B7280' }}>{status}</div>
          <button className="main-button" onClick={toggle}>
            {nfcOn ? 'NFC\'yi Durdur' : 'NFC\'yi Başlat'}
          </button>
        </div>
      )}

      {/* Son Okuma (sadece Okuma modunda) */}
      {mode === 'read' && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Son Okuma</div>
          <div>UID: {lastUid || 'N/A'}</div>
        </div>
      )}

      {/* Yazma alanı (sadece Yazma modunda) */}
      {mode === 'write' && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>NFC Yaz (Sadece PC)</div>
          <div style={{ color: '#6B7280', marginBottom: 8 }}>
            Buraya yazacağınız metin NDEF Text Record olarak karta yazılacaktır. Mobil uygulamadaki şifreli içerik bu alana yapıştırılabilir.
          </div>
          <textarea
            rows={4}
            value={writeText}
            onChange={(e) => setWriteText(e.target.value)}
            style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, fontFamily: 'monospace' }}
            placeholder="Örn: NFC_ENC_V1:..."
          />
          <div style={{ marginTop: 10 }}>
            <button className="main-button" onClick={handleWrite}>Karta Yaz</button>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Okuma Geçmişi</div>
        <div className="history">
          {history.length === 0 && <div>Henüz okuma yok</div>}
          {history.map((h, i) => (
            <div key={i} className="history-item">
              <div style={{ color: h.success ? '#10B981' : '#EF4444' }}>{h.success ? '✅' : '❌'}</div>
              <div style={{ flex: 1 }}>{h.uid || 'UID yok'}</div>
              <div style={{ color: '#6B7280' }}>{h.time}</div>
            </div>
          ))}
        </div>
      </div>

      <MemberInfoModal open={modalOpen} onClose={() => setModalOpen(false)} data={modalData || { valid: false, mode: 'Online' }} />
    </div>
  );
}

function QrPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<string>('Kamera başlatılıyor...');
  const [scanning, setScanning] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<MemberInfoData | null>(null);
  const openModal = (data: MemberInfoData) => { setModalData(data); setModalOpen(true); };

  useEffect(() => {
    let scanner: any;
    (async () => {
      const QrScanner = (await import('qr-scanner')).default;
      if (videoRef.current) {
        scanner = new QrScanner(videoRef.current, async (result: any) => {
          if (!result?.data) return;
          setScanning(false);
          scanner?.stop();
          setStatus('Sunucuda doğrulanıyor...');
          const online = await backendApi.verifyQr(result.data);
          if (online.ok && online.result) {
            setStatus(online.result.valid ? '✅ Doğrulama başarılı' : `❌ ${online.result.error}`);
            openModal({ valid: !!online.result.valid, mode: 'Online', member: online.result.member, error: online.result.error });
          } else {
            setStatus('❌ Doğrulama başarısız');
          }
        }, { highlightScanRegion: true });
        await scanner.start();
        setScanning(true);
        setStatus('Kamera hazır - QR gösterin');
      }
    })();
    return () => {
      try { scanner?.stop(); } catch {}
    };
  }, []);

  return (
    <div>
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>QR Doğrulama</div>
        <div style={{ color: '#6B7280', marginBottom: 8 }}>{status}</div>
        <video ref={videoRef} style={{ width: '100%', borderRadius: 12, background: '#000' }} muted playsInline />
      </div>

      <MemberInfoModal open={modalOpen} onClose={() => setModalOpen(false)} data={modalData || { valid: false, mode: 'Online' }} />
    </div>
  );
}



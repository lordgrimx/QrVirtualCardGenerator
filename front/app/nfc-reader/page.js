'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function NFCReaderPage() {
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcStatus, setNfcStatus] = useState('');
  const [readData, setReadData] = useState(null);
  const [readerStatus, setReaderStatus] = useState('unknown');
  
  // Client-side platform detection states
  const [isClientIOS, setIsClientIOS] = useState(false);
  const [isClientAndroid, setIsClientAndroid] = useState(false);
  const [hasNFCSupport, setHasNFCSupport] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Dinamik API URL tespiti
  const getApiUrl = () => {
    if (typeof window === 'undefined') {
      return 'https://localhost:8000';
    }
    
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'https://localhost:8000';
    }
    
    return `https://${hostname}:8000`;
  };

  // Platform detection helper functions (using state to avoid hydration mismatch)
  const isIOS = () => isClient && isClientIOS;
  const isAndroid = () => isClient && isClientAndroid;

  // NFC Reader durumunu kontrol et
  const checkNFCReaderStatus = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/nfc/status`);
      const data = await response.json();
      
      if (data.success) {
        setReaderStatus(data.nfc_status.status || 'unknown');
        setNfcStatus(`🔌 NFC Reader: ${data.nfc_status.status || 'Bilinmiyor'}`);
      } else {
        setReaderStatus('error');
        setNfcStatus('❌ NFC Reader bağlantı hatası');
      }
    } catch (error) {
      console.error('NFC status error:', error);
      setReaderStatus('offline');
      setNfcStatus('📴 Backend bağlantısı yok');
    }
  };

  // Web NFC ile okuma (Android Chrome)
  const readFromWebNFC = async () => {
    if (isIOS()) {
      setNfcStatus('📱 iOS: Kamera ile QR kod tarayın');
      alert('iOS\'te NFC Web API desteklenmiyor.\n\n✅ Çözüm:\n1. Kamera uygulamasını açın\n2. QR kodu tarayın\n3. Çıkan metni kopyalayın');
      return;
    }

    if (!isAndroid()) {
      setNfcStatus('❌ NFC yalnızca Android Chrome\'da çalışır');
      return;
    }

    if (!hasNFCSupport) {
      setNfcStatus('❌ NFC API desteklenmiyor (Android Chrome gerekli)');
      return;
    }

    try {
      setNfcReading(true);
      setNfcStatus('📡 NFC kartını telefona yaklaştırın...');
      
      const ndef = new NDEFReader();
      await ndef.scan();
      
      ndef.addEventListener("reading", ({ message, serialNumber }) => {
        console.log('NFC okuma tamamlandı:', { message, serialNumber });
        
        let nfcData = null;
        
        for (const record of message.records) {
          if (record.recordType === "text") {
            const textDecoder = new TextDecoder();
            nfcData = textDecoder.decode(record.data);
            break;
          } else if (record.recordType === "url") {
            nfcData = new TextDecoder().decode(record.data);
            break;
          }
        }
        
        if (nfcData) {
          setReadData({
            type: 'web_nfc',
            data: nfcData,
            serialNumber: serialNumber,
            timestamp: new Date().toISOString(),
            recordCount: message.records.length
          });
          setNfcStatus('✅ Web NFC ile başarıyla okundu!');
        } else {
          setNfcStatus('⚠️ Kartda okunabilir veri bulunamadı');
        }
        
        setNfcReading(false);
      });
      
    } catch (error) {
      console.error('Web NFC okuma hatası:', error);
      setNfcStatus(`❌ Web NFC hatası: ${error.message}`);
      setNfcReading(false);
    }
  };

  // Backend NFC Reader ile okuma
  const readFromBackendNFC = async () => {
    try {
      setNfcReading(true);
      setNfcStatus('🔄 Backend NFC Reader ile okuma başlatılıyor...');
      
      const response = await fetch(`${getApiUrl()}/api/nfc/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (data.success && data.nfc_data) {
        setReadData({
          type: 'backend_nfc',
          data: data.nfc_data.data || 'Veri okunamadı',
          timestamp: new Date().toISOString(),
          reader_info: data.nfc_data.reader_info || 'Bilinmiyor',
          card_type: data.nfc_data.card_type || 'Bilinmiyor'
        });
        setNfcStatus('✅ Backend NFC Reader ile başarıyla okundu!');
      } else {
        setNfcStatus(`❌ Backend NFC hatası: ${data.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Backend NFC okuma hatası:', error);
      setNfcStatus(`❌ Backend bağlantı hatası: ${error.message}`);
    } finally {
      setNfcReading(false);
    }
  };

  // Sürekli okuma modunu başlat
  const startContinuousReading = async () => {
    try {
      setNfcStatus('🔄 Sürekli okuma modu başlatılıyor...');
      
      const response = await fetch(`${getApiUrl()}/api/nfc/start-reading`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setNfcStatus('🔁 Sürekli okuma modu aktif - Kart yaklaştırın');
      } else {
        setNfcStatus(`❌ Sürekli okuma hatası: ${data.error}`);
      }
    } catch (error) {
      setNfcStatus(`❌ Sürekli okuma bağlantı hatası: ${error.message}`);
    }
  };

  // Sürekli okuma modunu durdur
  const stopContinuousReading = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/nfc/stop-reading`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setNfcStatus('⏹️ Sürekli okuma modu durduruldu');
      } else {
        setNfcStatus(`❌ Durdurma hatası: ${data.error}`);
      }
    } catch (error) {
      setNfcStatus(`❌ Durdurma bağlantı hatası: ${error.message}`);
    }
  };

  // Temizle
  const clearData = () => {
    setReadData(null);
    setNfcStatus('');
  };

  // Client-side platform detection
  useEffect(() => {
    setIsClient(true);
    
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      // iOS detection
      const iosCheck = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsClientIOS(iosCheck);
      
      // Android detection
      const androidCheck = /Android/.test(navigator.userAgent);
      setIsClientAndroid(androidCheck);
      
      // NFC support detection
      const nfcCheck = 'NDEFReader' in window;
      setHasNFCSupport(nfcCheck);
    }
  }, []);

  // Sayfa yüklendiğinde NFC Reader durumunu kontrol et
  useEffect(() => {
    checkNFCReaderStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white hover:shadow-lg transition-all"
              title="Ana Sayfaya Dön"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                NFC Reader
              </h1>
              <p className="text-gray-600 text-sm">NFC kartlarından veri okuma</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/nfc-writer"
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              📝 NFC Writer
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* NFC Reader Status */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl border border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">NFC Reader Durumu</h2>
              <p className="text-gray-600">Bağlı NFC okuyucu cihazlarının durumu</p>
            </div>
            <button
              onClick={checkNFCReaderStatus}
              className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              🔄 Yenile
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                readerStatus === 'connected' ? 'bg-green-100 text-green-600' :
                readerStatus === 'error' ? 'bg-red-100 text-red-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                {readerStatus === 'connected' ? '✅' : readerStatus === 'error' ? '❌' : '❓'}
              </div>
              <p className="text-sm font-medium text-gray-900">Backend NFC</p>
              <p className="text-xs text-gray-600 capitalize">{readerStatus}</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                isAndroid() && hasNFCSupport ? 'bg-green-100 text-green-600' :
                'bg-red-100 text-red-600'
              }`}>
                {isAndroid() && hasNFCSupport ? '✅' : '❌'}
              </div>
              <p className="text-sm font-medium text-gray-900">Web NFC</p>
              <p className="text-xs text-gray-600">
                {!isClient ? 'Kontrol ediliyor...' :
                 isAndroid() ? (hasNFCSupport ? 'Destekleniyor' : 'API Yok') : 'Android Gerekli'}
              </p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                isIOS() ? 'bg-yellow-100 text-yellow-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {isIOS() ? '📱' : '🤖'}
              </div>
              <p className="text-sm font-medium text-gray-900">Platform</p>
              <p className="text-xs text-gray-600">
                {!isClient ? 'Tespit ediliyor...' :
                 isIOS() ? 'iOS (Kamera)' : isAndroid() ? 'Android' : 'Desktop'}
              </p>
            </div>
          </div>
        </div>

        {/* NFC Reading Options */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl border border-white/20">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            NFC Okuma Seçenekleri
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Web NFC */}
            <button
              onClick={readFromWebNFC}
              disabled={nfcReading}
              className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="flex items-center justify-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {isIOS() ? '📱 Kamera QR Tara' : '📳 Web NFC Oku'}
              </div>
              <p className="text-xs mt-1 opacity-90">
                {isIOS() ? 'iOS: Kamera kullanın' : 'Android Chrome gerekli'}
              </p>
            </button>

            {/* Backend NFC */}
            <button
              onClick={readFromBackendNFC}
              disabled={nfcReading || readerStatus !== 'connected'}
              className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="flex items-center justify-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                🔌 Backend NFC Oku
              </div>
              <p className="text-xs mt-1 opacity-90">
                USB NFC Reader gerekli
              </p>
            </button>
          </div>

          {/* Continuous Reading Controls */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Sürekli Okuma Modu</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={startContinuousReading}
                disabled={readerStatus !== 'connected'}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                ▶️ Sürekli Okuma Başlat
              </button>
              <button
                onClick={stopContinuousReading}
                disabled={readerStatus !== 'connected'}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                ⏹️ Sürekli Okuma Durdur
              </button>
            </div>
          </div>
        </div>

        {/* Status Display */}
        {nfcStatus && (
          <div className={`mb-6 p-4 rounded-xl text-center font-medium ${
            nfcStatus.includes('✅') ? 'bg-green-100 text-green-800' :
            nfcStatus.includes('❌') ? 'bg-red-100 text-red-800' :
            nfcStatus.includes('🔄') || nfcStatus.includes('📡') ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {nfcStatus}
          </div>
        )}

        {/* Reading Indicator */}
        {nfcReading && (
          <div className="mb-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-3"></div>
            <p className="text-gray-600">NFC kartını okuyucu cihaza yaklaştırın...</p>
          </div>
        )}

        {/* Read Data Display */}
        {readData && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Okunan Veri
              </h3>
              <button
                onClick={clearData}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
              >
                🗑️ Temizle
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Okuma Türü:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                    readData.type === 'web_nfc' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {readData.type === 'web_nfc' ? 'Web NFC' : 'Backend NFC'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Zaman:</span>
                  <span className="ml-2 text-gray-900">{new Date(readData.timestamp).toLocaleString('tr-TR')}</span>
                </div>
                {readData.serialNumber && (
                  <div>
                    <span className="font-medium text-gray-700">Seri No:</span>
                    <span className="ml-2 text-gray-900 font-mono text-xs">{readData.serialNumber}</span>
                  </div>
                )}
                {readData.recordCount && (
                  <div>
                    <span className="font-medium text-gray-700">Kayıt Sayısı:</span>
                    <span className="ml-2 text-gray-900">{readData.recordCount}</span>
                  </div>
                )}
                {readData.reader_info && (
                  <div>
                    <span className="font-medium text-gray-700">Reader:</span>
                    <span className="ml-2 text-gray-900">{readData.reader_info}</span>
                  </div>
                )}
                {readData.card_type && (
                  <div>
                    <span className="font-medium text-gray-700">Kart Türü:</span>
                    <span className="ml-2 text-gray-900">{readData.card_type}</span>
                  </div>
                )}
              </div>
              
              <div>
                <span className="font-medium text-gray-700 block mb-2">Okunan Veri:</span>
                <textarea
                  value={readData.data}
                  readOnly
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 font-mono resize-none"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => navigator.clipboard.writeText(readData.data)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  📋 Kopyala
                </button>
                <Link
                  href={`/?qr=${encodeURIComponent(readData.data)}`}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  ✅ QR Doğrula
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mt-0.5">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h5 className="font-semibold text-blue-800 mb-2">NFC Okuma Rehberi</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Android:</strong> "Web NFC Oku" butonu ile tarayıcı NFC kullanın</li>
                <li>• <strong>iOS:</strong> "Kamera QR Tara" ile QR kod okuyun</li>
                <li>• <strong>USB NFC Reader:</strong> "Backend NFC Oku" ile donanım okuyucu kullanın</li>
                <li>• <strong>Sürekli Okuma:</strong> Otomatik kart algılama için aktif edin</li>
                <li>• Okunan veriyi kopyalayabilir veya doğrudan QR doğrulayıcıya gönderebilirsiniz</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

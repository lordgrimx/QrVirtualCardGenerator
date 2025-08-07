'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function NFCWriterPage() {
  const [writeData, setWriteData] = useState('');
  const [writeType, setWriteType] = useState('text');
  const [nfcWriting, setNfcWriting] = useState(false);
  const [nfcStatus, setNfcStatus] = useState('');
  const [writeResult, setWriteResult] = useState(null);
  const [readerStatus, setReaderStatus] = useState('unknown');
  const [membersList, setMembersList] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  
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
      } else {
        setReaderStatus('error');
      }
    } catch (error) {
      console.error('NFC status error:', error);
      setReaderStatus('offline');
    }
  };

  // Üye listesini getir
  const fetchMembers = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/members/list`);
      const data = await response.json();
      setMembersList(data || []);
    } catch (error) {
      console.error('Members fetch error:', error);
    }
  };

  // Seçili üyenin QR verisini getir
  const getSelectedMemberQR = async (memberId) => {
    if (!memberId) return;
    
    try {
      const response = await fetch(`${getApiUrl()}/api/members/${memberId}`);
      const data = await response.json();
      
      if (data.success && data.member.secureQrCode) {
        setWriteData(data.member.secureQrCode);
        setWriteType('text');
        setNfcStatus(`✅ ${data.member.fullName} için QR kod hazırlandı`);
      } else {
        setNfcStatus('❌ Üye QR kodu alınamadı');
      }
    } catch (error) {
      console.error('Member QR fetch error:', error);
      setNfcStatus('❌ Üye verisi alınamadı');
    }
  };

  // Web NFC ile yazma (Android Chrome)
  const writeToWebNFC = async () => {
    if (isIOS()) {
      setNfcStatus('📱 iOS: NFC yazma desteklenmiyor');
      alert('iOS\'te NFC Web API yazma desteklenmiyor.\n\nAlternatifler:\n1. Android cihaz kullanın\n2. Backend NFC Writer kullanın\n3. QR kod yazdırın');
      return;
    }

    if (!isAndroid()) {
      setNfcStatus('❌ NFC yazma yalnızca Android Chrome\'da çalışır');
      return;
    }

    if (!hasNFCSupport) {
      setNfcStatus('❌ NFC API desteklenmiyor (Android Chrome gerekli)');
      return;
    }

    if (!writeData.trim()) {
      setNfcStatus('❌ Yazılacak veri boş olamaz');
      return;
    }

    try {
      setNfcWriting(true);
      setNfcStatus('📡 NFC kartını telefona yaklaştırın...');
      
      const ndef = new NDEFReader();
      
      let records = [];
      
      if (writeType === 'text') {
        records.push({
          recordType: "text",
          data: writeData
        });
      } else if (writeType === 'url') {
        records.push({
          recordType: "url",
          data: writeData
        });
      }
      
      await ndef.write({ records });
      
      setWriteResult({
        type: 'web_nfc',
        data: writeData,
        writeType: writeType,
        timestamp: new Date().toISOString(),
        success: true
      });
      
      setNfcStatus('✅ Web NFC ile başarıyla yazıldı!');
      
    } catch (error) {
      console.error('Web NFC yazma hatası:', error);
      setNfcStatus(`❌ Web NFC hatası: ${error.message}`);
      
      setWriteResult({
        type: 'web_nfc',
        error: error.message,
        timestamp: new Date().toISOString(),
        success: false
      });
    } finally {
      setNfcWriting(false);
    }
  };

  // Backend NFC Writer ile yazma
  const writeToBackendNFC = async () => {
    if (!writeData.trim()) {
      setNfcStatus('❌ Yazılacak veri boş olamaz');
      return;
    }

    try {
      setNfcWriting(true);
      setNfcStatus('🔄 Backend NFC Writer ile yazma başlatılıyor...');
      
      const response = await fetch(`${getApiUrl()}/api/nfc/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: writeData,
          type: writeType
        })
      });

      const data = await response.json();

      if (data.success && data.write_result) {
        setWriteResult({
          type: 'backend_nfc',
          data: writeData,
          writeType: writeType,
          timestamp: new Date().toISOString(),
          success: true,
          write_info: data.write_result
        });
        setNfcStatus('✅ Backend NFC Writer ile başarıyla yazıldı!');
      } else {
        setWriteResult({
          type: 'backend_nfc',
          error: data.error || 'Bilinmeyen hata',
          timestamp: new Date().toISOString(),
          success: false,
          troubleshooting: data.write_result?.troubleshooting || [],
          original_error: data.write_result?.original_error
        });
        setNfcStatus(`❌ Backend NFC hatası: ${data.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Backend NFC yazma hatası:', error);
      setNfcStatus(`❌ Backend bağlantı hatası: ${error.message}`);
      
      setWriteResult({
        type: 'backend_nfc',
        error: error.message,
        timestamp: new Date().toISOString(),
        success: false,
        troubleshooting: [
          "Backend sunucusunun çalıştığından emin olun",
          "Ağ bağlantınızı kontrol edin",
          "HTTPS sertifikasının kabul edildiğinden emin olun"
        ]
      });
    } finally {
      setNfcWriting(false);
    }
  };

  // Temizle
  const clearData = () => {
    setWriteData('');
    setWriteResult(null);
    setNfcStatus('');
    setSelectedMember('');
  };

  // Örnek veri
  const loadSampleData = () => {
    const sampleQR = JSON.stringify({
      type: "membership_card",
      member_id: "SAMPLE123",
      name: "Örnek Kullanıcı",
      organization: "Community Connect",
      issued_at: new Date().toISOString(),
      valid_until: new Date(Date.now() + 365*24*60*60*1000).toISOString()
    });
    setWriteData(sampleQR);
    setWriteType('text');
    setNfcStatus('📝 Örnek QR verisi yüklendi');
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

  // Sayfa yüklendiğinde
  useEffect(() => {
    checkNFCReaderStatus();
    fetchMembers();
  }, []);

  // Seçili üye değiştiğinde
  useEffect(() => {
    if (selectedMember) {
      getSelectedMemberQR(selectedMember);
    }
  }, [selectedMember]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center text-white hover:shadow-lg transition-all"
              title="Ana Sayfaya Dön"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-green-800 bg-clip-text text-transparent">
                NFC Writer
              </h1>
              <p className="text-gray-600 text-sm">NFC kartlarına veri yazma</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/nfc-reader"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              📖 NFC Reader
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Quick Member Selection */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl border border-white/20">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            Hızlı Üye Seçimi
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kayıtlı Üyeler
              </label>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Üye seçin...</option>
                {membersList.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={loadSampleData}
                className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
              >
                📝 Örnek Veri Yükle
              </button>
            </div>
          </div>
        </div>

        {/* Data Input */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl border border-white/20">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            Yazılacak Veri
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Veri Türü
              </label>
              <select
                value={writeType}
                onChange={(e) => setWriteType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="text">Metin (Text)</option>
                <option value="url">URL/Link</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Veri İçeriği
              </label>
              <textarea
                value={writeData}
                onChange={(e) => setWriteData(e.target.value)}
                placeholder={writeType === 'url' ? 'https://example.com' : 'NFC kartına yazılacak metni girin...'}
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono resize-none"
              />
              <p className="text-xs text-gray-600 mt-1">
                {writeData.length} karakter
                {writeData.length > 8192 && <span className="text-red-600"> (NFC için çok uzun olabilir)</span>}
              </p>
            </div>
          </div>
        </div>

        {/* NFC Writing Options */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl border border-white/20">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </div>
            NFC Yazma Seçenekleri
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Web NFC */}
            <button
              onClick={writeToWebNFC}
              disabled={nfcWriting || !writeData.trim()}
              className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="flex items-center justify-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {isIOS() ? '📱 iOS Desteklemiyor' : '📳 Web NFC Yaz'}
              </div>
              <p className="text-xs mt-1 opacity-90">
                {isIOS() ? 'Android cihaz gerekli' : 'Android Chrome ile yazma'}
              </p>
            </button>

            {/* Backend NFC */}
            <button
              onClick={writeToBackendNFC}
              disabled={nfcWriting || readerStatus !== 'connected' || !writeData.trim()}
              className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="flex items-center justify-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                🔌 Backend NFC Yaz
              </div>
              <p className="text-xs mt-1 opacity-90">
                USB NFC Writer gerekli
              </p>
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className={`p-3 rounded-lg ${
                readerStatus === 'connected' ? 'bg-green-100 text-green-800' :
                readerStatus === 'error' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                <div className="font-medium">Backend NFC</div>
                <div className="text-sm capitalize">{readerStatus}</div>
              </div>
              
              <div className={`p-3 rounded-lg ${
                isAndroid() && hasNFCSupport ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                <div className="font-medium">Web NFC</div>
                <div className="text-sm">
                  {!isClient ? 'Kontrol ediliyor...' :
                   isAndroid() ? (hasNFCSupport ? 'Kullanılabilir' : 'API Yok') : 'Desteklenmiyor'}
                </div>
              </div>
              
              <div className="p-3 bg-blue-100 text-blue-800 rounded-lg">
                <div className="font-medium">Platform</div>
                <div className="text-sm">
                  {!isClient ? 'Tespit ediliyor...' :
                   isIOS() ? 'iOS' : isAndroid() ? 'Android' : 'Desktop'}
                </div>
              </div>
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

        {/* Writing Indicator */}
        {nfcWriting && (
          <div className="mb-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mx-auto mb-3"></div>
            <p className="text-gray-600">NFC kartını yazıcı cihaza yaklaştırın ve bekleyin...</p>
          </div>
        )}

        {/* Write Result Display */}
        {writeResult && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  writeResult.success ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {writeResult.success ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    )}
                  </svg>
                </div>
                {writeResult.success ? 'Yazma Başarılı' : 'Yazma Başarısız'}
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
                  <span className="font-medium text-gray-700">Yazma Türü:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                    writeResult.type === 'web_nfc' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {writeResult.type === 'web_nfc' ? 'Web NFC' : 'Backend NFC'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Zaman:</span>
                  <span className="ml-2 text-gray-900">{new Date(writeResult.timestamp).toLocaleString('tr-TR')}</span>
                </div>
                {writeResult.writeType && (
                  <div>
                    <span className="font-medium text-gray-700">Veri Türü:</span>
                    <span className="ml-2 text-gray-900 capitalize">{writeResult.writeType}</span>
                  </div>
                )}
                {writeResult.write_info && (
                  <div>
                    <span className="font-medium text-gray-700">Writer Bilgi:</span>
                    <span className="ml-2 text-gray-900">{JSON.stringify(writeResult.write_info)}</span>
                  </div>
                )}
              </div>
              
              {writeResult.success ? (
                <div>
                  <span className="font-medium text-gray-700 block mb-2">Yazılan Veri:</span>
                  <textarea
                    value={writeResult.data}
                    readOnly
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 font-mono resize-none"
                  />
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <span className="font-medium text-red-800 block mb-2">Hata:</span>
                  <p className="text-red-700 mb-3">{writeResult.error}</p>
                  
                  {writeResult.troubleshooting && writeResult.troubleshooting.length > 0 && (
                    <div className="mt-3">
                      <span className="font-medium text-red-800 block mb-2">Çözüm Önerileri:</span>
                      <ul className="text-red-600 text-sm space-y-1 list-disc list-inside">
                        {writeResult.troubleshooting.map((tip, index) => (
                          <li key={index}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {writeResult.original_error && (
                    <details className="mt-3">
                      <summary className="text-red-800 font-medium cursor-pointer">Teknik Detaylar</summary>
                      <p className="text-red-600 text-xs mt-1 font-mono">{writeResult.original_error}</p>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clear Button */}
        {(writeData || writeResult) && (
          <div className="text-center mb-8">
            <button
              onClick={clearData}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors"
            >
              🗑️ Tümünü Temizle
            </button>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mt-0.5">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h5 className="font-semibold text-green-800 mb-2">NFC Yazma Rehberi</h5>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• <strong>Hızlı Seçim:</strong> Kayıtlı üyelerden birini seçerek QR kodunu otomatik yükleyin</li>
                <li>• <strong>Manuel Veri:</strong> Özel metninizi veya URL'nizi yazın</li>
                <li>• <strong>Android:</strong> "Web NFC Yaz" ile tarayıcı NFC kullanın</li>
                <li>• <strong>USB NFC Writer:</strong> "Backend NFC Yaz" ile donanım yazıcı kullanın</li>
                <li>• <strong>iOS:</strong> Maalesef NFC yazma desteklenmiyor, Android cihaz gerekli</li>
                <li>• Veri boyutu 8KB'den küçük olmalıdır (çoğu NFC kart için)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

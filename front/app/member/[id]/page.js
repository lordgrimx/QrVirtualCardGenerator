'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import domtoimage from 'dom-to-image-more';
import html2canvas from 'html2canvas';

export default function MemberPage() {
  const params = useParams();
  const memberId = params.id;
  
  const [activeTab, setActiveTab] = useState('front');
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrType, setQrType] = useState('standard'); // 'standard' veya 'nfc'
  const [nfcWriteStatus, setNfcWriteStatus] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // NFC yazma işlemleri MAUI uygulaması üzerinden yapılır
  const writeToNFC = async () => {
    alert('NFC yazma işlemi MAUI uygulamasına taşındı. Lütfen MAUI uygulamasını kullanın.');
  };

  // Varsayılan kullanıcı bilgileri (DB'de veri yoksa)
  const defaultUserInfo = {
    name: "Olivia Bennett",
    email: "olivia.bennett@email.com",
    phone: "(555) 123-4567",
    role: "Volunteer",
    status: "Active",
    memberId: "CC-2024-001567",
    joinDate: "July 15, 2024"
  };

  // Spesifik member'ı ID ile getir
  const fetchMemberById = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/members/${id}`);
      const data = await response.json();
      
      if (response.ok && data.success && data.member) {
        // DB verilerini client format'ına çevir
        const formattedUserInfo = {
          name: data.member.fullName,
          email: data.member.email,
          phone: data.member.phoneNumber,
          role: data.member.role,
          status: data.member.status,
          memberId: data.member.membershipId,
          joinDate: new Date(data.member.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          emergencyContact: data.member.emergencyContact,
          membershipType: data.member.membershipType,
          address: data.member.address,
          dateOfBirth: data.member.dateOfBirth,
          secureQrCode: data.member.secureQrCode, // Güvenli QR kod verisi
          nfcQrCode: data.member.nfcQrCode // NFC kompakt QR kod verisi
        };
        
        setUserInfo(formattedUserInfo);
      } else {
        throw new Error(data.detail || 'Member not found');
      }
    } catch (error) {
      console.error('Error fetching member data:', error);
      setError(`Üye bulunamadı (ID: ${id})`);
      // Hata durumunda varsayılan kullan
      setUserInfo(defaultUserInfo);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (memberId) {
      fetchMemberById(memberId);
    }
  }, [memberId]);

  // QR kod veri uzunluğunu kontrol et (debug için)
  useEffect(() => {
    if (userInfo?.secureQrCode) {
      console.log('✅ Standart QR kod yüklendi:', {
        length: userInfo.secureQrCode.length,
        preview: userInfo.secureQrCode.substring(0, 50) + '...',
        type: 'SECURE_CRYPTO_DATA'
      });
    }
    
    if (userInfo?.nfcQrCode) {
      console.log('🔧 NFC kompakt QR kod yüklendi:', {
        length: userInfo.nfcQrCode.length,
        preview: userInfo.nfcQrCode.substring(0, 30) + '...',
        type: 'NFC_COMPACT_ECDSA',
        ntag215_usage: `${userInfo.nfcQrCode.length}/540 bytes (${((userInfo.nfcQrCode.length/540)*100).toFixed(1)}%)`
      });
    }
    
    if (userInfo && !userInfo.secureQrCode && !userInfo.nfcQrCode) {
      console.log('⚠️ Hiçbir güvenli QR kod bulunamadı, fallback kullanılıyor');
    }
  }, [userInfo]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading member data...</p>
          <p className="text-sm text-gray-500 mt-2">Member ID: {memberId}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Üye Bulunamadı</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button 
              onClick={() => fetchMemberById(memberId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Tekrar Dene
            </button>
            <a 
              href="/admin" 
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Admin Paneli
            </a>
          </div>
        </div>
      </div>
    );
  }

  // QR kodu için veri - seçilen tipe göre
  const getQrData = () => {
    if (qrType === 'nfc' && userInfo?.nfcQrCode) {
      return userInfo.nfcQrCode;
    } else if (qrType === 'standard' && userInfo?.secureQrCode) {
      return userInfo.secureQrCode;
    } else {
      // Fallback data
      return JSON.stringify({
        type: "membership_card",
        data: "Visit our website for more info", 
        url: "https://community-connect.org",
        note: "This QR code requires special scanner"
      });
    }
  };

  const qrData = getQrData();

  // QR kod tipini belirle
  const getQrInfo = () => {
    if (qrType === 'nfc' && userInfo?.nfcQrCode) {
      return {
        isSecure: true,
        type: 'NFC KOMPAKT ECDSA',
        description: 'NTAG215 Uyumlu',
        size: userInfo.nfcQrCode.length,
        maxSize: 540,
        algorithm: 'ECDSA P-256'
      };
    } else if (qrType === 'standard' && userInfo?.secureQrCode) {
      return {
        isSecure: true,
        type: 'STANDART KRİPTOGRAFİK',
        description: 'RSA-PSS İmzalı',
        size: userInfo.secureQrCode.length,
        maxSize: null,
        algorithm: 'RSA-PSS SHA256'
      };
    } else {
      return {
        isSecure: false,
        type: 'FALLBACK',
        description: 'Temel Bilgi',
        size: qrData.length,
        maxSize: null,
        algorithm: 'None'
      };
    }
  };

  const qrInfo = getQrInfo();
  console.log(`🔍 QR Kod Tipi: ${qrInfo.type} (${qrType})`);;

  // Geliştirilmiş kart indirme fonksiyonu
  const downloadCard = async () => {
    if (isDownloading) return; // Tekrar tıklanmayı engelle
    
    try {
      setIsDownloading(true);
      const originalTab = activeTab;
      
      // Loading state'i ekleyebiliriz
      const downloadStatus = (message) => {
        console.log(`📥 Download: ${message}`);
      };

      downloadStatus('Kartların indirme işlemi başlıyor...');

      // HTML2Canvas ayarları - QR kodlar ve CSS transforms için optimize edildi
      const canvasOptions = {
        backgroundColor: '#ffffff',
        scale: 2, // Yüksek kalite için
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 418,
        height: 231,
        onclone: (clonedDoc, element) => {
          // Klonlanan dokümanda animasyonları devre dışı bırak
          element.style.animation = 'none';
          element.style.transition = 'none';
          element.style.transform = 'none';
        }
      };

      // Önce front kartı yakala
      downloadStatus('Kartın ön yüzü yakalanıyor...');
      setActiveTab('front');
      
      // DOM'un güncellenmesini bekle
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const frontCard = document.querySelector('.card-front');
      if (frontCard) {
        // Kartın görünür olduğundan emin ol
        frontCard.style.transform = 'rotateY(0deg)';
        frontCard.style.opacity = '1';
        
        const frontCanvas = await html2canvas(frontCard, canvasOptions);
        const frontDataUrl = frontCanvas.toDataURL('image/png', 1.0);
        
        // Ön yüzü indir
        const frontLink = document.createElement('a');
        frontLink.download = `${userInfo.name.replace(/\s+/g, '_')}_card_front.png`;
        frontLink.href = frontDataUrl;
        document.body.appendChild(frontLink);
        frontLink.click();
        document.body.removeChild(frontLink);
        
        downloadStatus('Kartın ön yüzü başarıyla indirildi!');
      }

      // Şimdi back kartı yakala
      downloadStatus('Kartın arka yüzü yakalanıyor...');
      setActiveTab('back');
      
      // DOM'un güncellenmesini ve animasyonun tamamlanmasını bekle
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const backCard = document.querySelector('.card-back');
      if (backCard) {
        // Kartın görünür olduğundan emin ol
        backCard.style.transform = 'rotateY(0deg)';
        backCard.style.opacity = '1';
        
        const backCanvas = await html2canvas(backCard, canvasOptions);
        const backDataUrl = backCanvas.toDataURL('image/png', 1.0);
        
        // Arka yüzü indir
        const backLink = document.createElement('a');
        backLink.download = `${userInfo.name.replace(/\s+/g, '_')}_card_back.png`;
        backLink.href = backDataUrl;
        document.body.appendChild(backLink);
        backLink.click();
        document.body.removeChild(backLink);
        
        downloadStatus('Kartın arka yüzü başarıyla indirildi!');
      }
      
      // Orijinal görünüme geri dön
      setActiveTab(originalTab);
      
      // Success notification
      alert('🎉 Kart başarıyla indirildi!\n\nHem ön yüz hem arka yüz PNG formatında download klasörünüze kaydedildi.');
      
    } catch (error) {
      console.error('Kart indirme hatası:', error);
      alert(`❌ Kart indirme sırasında hata oluştu:\n\n${error.message}\n\nLütfen sayfayı yenileyin ve tekrar deneyin.`);
      
      // Hata durumunda orijinal tab'a geri dön
      setActiveTab(activeTab);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-10 py-4">
        <div className="flex items-center justify-between max-w-[1280px] mx-auto">
          {/* Logo */}
          <a href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded"></div>
            <h1 className="text-lg font-bold text-gray-900">Community Connect</h1>
          </a>
          
          {/* Navigation */}
          <nav className="flex items-center gap-8">
            <a href="/" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">Home</a>
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
              {userInfo.name.split(' ').map(n => n[0]).join('')}
            </div>
          </nav>
        </div>
      </header>

      {/* Member ID Info Banner */}
      <div className="bg-blue-50 border-b border-blue-200 px-10 py-3">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-700">Member ID:</span>
            <span className="text-sm font-semibold text-blue-900">{memberId}</span>
            <span className="text-sm text-blue-600">•</span>
            <span className="text-sm text-blue-700">Membership ID:</span>
            <span className="text-sm font-semibold text-blue-900">{userInfo.memberId}</span>
          </div>
          {error && (
            <span className="text-sm text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
              Varsayılan veriler gösteriliyor
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex max-w-[1280px] mx-auto p-6 gap-6">
        {/* Left Panel - Membership Card */}
        <div className="flex-1 max-w-[868px]">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Membership ID</h2>
          </div>

          {/* Card Container */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex gap-6">
              {/* Card Preview */}
              <div className="w-[418px] h-[231px] relative perspective-1000 overflow-hidden">
                <div className={`w-full h-full transition-transform duration-700 transform-style-preserve-3d relative ${
                  activeTab === 'back' ? 'rotate-y-180' : ''
                }`}>
                  {/* Front of Card */}
                  <div className="card-front absolute inset-0 w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 rounded-xl p-6 text-white relative overflow-hidden shadow-2xl">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="w-full h-full bg-gradient-to-r from-white/20 to-transparent rotate-12 transform translate-x-1/2"></div>
                    </div>
                    
                    {/* Card Header */}
                    <div className="relative z-10 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-white rounded"></div>
                          <span className="text-sm font-semibold">Community Connect</span>
                        </div>
                        <div className="text-xs opacity-80">MEMBER</div>
                      </div>
                      
                                      {/* QR Code */}
                <div className="absolute top-0 right-0 bg-white p-4 rounded-lg shadow-lg group">
                  <div className="relative">
                    <QRCodeCanvas 
                      value={qrData}
                      size={100}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="L"
                      includeMargin={false}
                    />
                    {/* QR Tip Badge */}
                    <div className="absolute -top-1 -left-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-1 rounded text-xs font-bold shadow-lg">
                      {qrInfo.isSecure ? (qrType === 'nfc' ? 'NFC' : 'QR') : 'STD'}
                    </div>
                    
                    {/* Büyütme İkonu */}
                    <button
                      onClick={() => setQrModalOpen(true)}
                      className="absolute -top-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                      title="QR Kodu Büyüt"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </button>
                  </div>
                </div>
                      
                      {/* Member Info */}
                      <div className="flex-1 flex flex-col justify-center pr-28">
                        <h3 className="text-lg font-bold mb-1">{userInfo.name}</h3>
                        <p className="text-sm opacity-90 mb-1">{userInfo.role}</p>
                        <p className="text-xs opacity-80 mb-3">ID: {userInfo.memberId}</p>
                        
                        {/* Status Badge */}
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-500 text-xs font-medium w-fit">
                          <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                          {userInfo.status}
                        </div>
                      </div>
                      
                      {/* Bottom Info */}
                      <div className="mt-auto pt-2">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xs opacity-80">Valid Since</p>
                            <p className="text-xs font-medium">{userInfo.joinDate}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xs opacity-80">community-connect.org</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Back of Card */}
                  <div className="card-back absolute inset-0 w-full h-full bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-xl p-6 text-white relative overflow-hidden shadow-2xl">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="w-full h-full bg-gradient-to-l from-white/20 to-transparent -rotate-12 transform -translate-x-1/2"></div>
                    </div>
                    
                    <div className="relative z-10 h-full flex flex-col">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-sm font-semibold">Member Information</span>
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
                      </div>
                      
                      {/* Contact Information */}
                      <div className="space-y-4 flex-1">
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Email</p>
                          <p className="text-sm font-medium">{userInfo.email}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Phone</p>
                          <p className="text-sm font-medium">{userInfo.phone}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide">Member Since</p>
                          <p className="text-sm font-medium">{userInfo.joinDate}</p>
                        </div>
                      </div>
                      
                      {/* Emergency Contact */}
                      <div className="border-t border-gray-700 pt-4 mt-4">
                        <p className="text-xs text-gray-400 mb-2">Emergency: {userInfo.emergencyContact || '(555) 123-HELP'}</p>
                        <p className="text-xs text-gray-500">This card is property of Community Connect</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Card Info */}
              <div className="flex-1 p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {activeTab === 'front' ? 'Front' : 'Back'} View
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-600 text-sm mb-2">Features:</p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {activeTab === 'front' ? (
                        <>
                          <li>• {qrInfo.type} QR code</li>
                          <li>• {qrInfo.algorithm} signature</li>
                          <li>• Member name and ID</li>
                          <li>• Status indicator</li>
                          <li>• Modern gradient design</li>
                        </>
                      ) : (
                        <>
                          <li>• Contact information</li>
                          <li>• Membership details</li>
                          <li>• Emergency contact</li>
                          <li>• Security features</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="bg-gray-100 rounded-full p-1 mb-6 flex">
            <button
              onClick={() => setActiveTab('front')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-full transition-colors ${
                activeTab === 'front' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Front
            </button>
            <button
              onClick={() => setActiveTab('back')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-full transition-colors ${
                activeTab === 'back' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Back
            </button>
          </div>

          {/* QR Code Type Selector */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-semibold text-blue-900 mb-3">QR Code Format</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setQrType('standard')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  qrType === 'standard' 
                    ? 'border-blue-500 bg-blue-100 text-blue-900' 
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${qrType === 'standard' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                  <span className="font-medium text-sm">Standard QR</span>
                </div>
                <p className="text-xs text-gray-600">RSA-PSS Security</p>
                <p className="text-xs text-gray-500">
                  {userInfo?.secureQrCode ? `${userInfo.secureQrCode.length} chars` : 'Not available'}
                </p>
              </button>
              
              <button
                onClick={() => setQrType('nfc')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  qrType === 'nfc' 
                    ? 'border-purple-500 bg-purple-100 text-purple-900' 
                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${qrType === 'nfc' ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
                  <span className="font-medium text-sm">NFC Compact</span>
                </div>
                <p className="text-xs text-gray-600">ECDSA P-256</p>
                <p className="text-xs text-gray-500">
                  {userInfo?.nfcQrCode ? `${userInfo.nfcQrCode.length}/540 bytes` : 'Not available'}
                </p>
              </button>
            </div>
            
            {/* QR Info Display */}
            <div className="mt-3 p-2 bg-white border border-gray-200 rounded text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Active Format:</span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  qrInfo.isSecure 
                    ? (qrType === 'nfc' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800')
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {qrInfo.type}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-gray-600">Size:</span>
                <span className="text-gray-800 font-mono text-xs">
                  {qrInfo.size} {qrInfo.maxSize ? `/ ${qrInfo.maxSize}` : ''} 
                  {qrInfo.maxSize ? ` (${((qrInfo.size/qrInfo.maxSize)*100).toFixed(1)}%)` : ' chars'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mb-6">
            <button 
              onClick={downloadCard}
              disabled={isDownloading}
              className={`px-8 py-3 rounded-full text-sm font-bold transition-all duration-200 shadow-lg flex items-center gap-2 ${
                isDownloading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  📥 Download Card
                </>
              )}
            </button>
          </div>

          {/* Last Updated */}
          <div className="text-center">
            <p className="text-sm text-gray-500">Last updated: {userInfo.joinDate}</p>
          </div>
        </div>

        {/* Right Panel - Profile Information */}
        <div className="w-[360px]">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900">Profile Information</h3>
          </div>

          <div className="space-y-6">
            {/* Full Name & Email */}
            <div className="grid grid-cols-2 gap-0">
              <div className="border border-gray-200 p-4">
                <p className="text-sm text-gray-600 mb-2">Full Name</p>
                <p className="text-sm text-gray-900 font-medium">{userInfo.name}</p>
              </div>
              <div className="border border-gray-200 border-l-0 p-4">
                <p className="text-sm text-gray-600 mb-2">Email</p>
                <p className="text-sm text-gray-900 font-medium">{userInfo.email}</p>
              </div>
            </div>

            {/* Phone & Role */}
            <div className="grid grid-cols-2 gap-0">
              <div className="border border-gray-200 border-t-0 p-4">
                <p className="text-sm text-gray-600 mb-2">Phone Number</p>
                <p className="text-sm text-gray-900 font-medium">{userInfo.phone}</p>
              </div>
              <div className="border border-gray-200 border-l-0 border-t-0 p-4">
                <p className="text-sm text-gray-600 mb-2">Role</p>
                <p className="text-sm text-gray-900 font-medium">{userInfo.role}</p>
              </div>
            </div>

            {/* Member ID & Status */}
            <div className="grid grid-cols-2 gap-0">
              <div className="border border-gray-200 border-t-0 p-4">
                <p className="text-sm text-gray-600 mb-2">Member ID</p>
                <p className="text-sm text-gray-900 font-medium">{userInfo.memberId}</p>
              </div>
              <div className="border border-gray-200 border-l-0 border-t-0 p-4">
                <p className="text-sm text-gray-600 mb-2">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    userInfo.status === 'active' ? 'bg-green-500' : 
                    userInfo.status === 'pending' ? 'bg-yellow-500' : 
                    userInfo.status === 'suspended' ? 'bg-red-500' : 'bg-gray-500'
                  }`}></div>
                  <p className="text-sm text-gray-900 font-medium capitalize">{userInfo.status}</p>
                </div>
              </div>
            </div>

            {/* Membership Type & Emergency Contact */}
            {userInfo.membershipType && (
              <div className="grid grid-cols-2 gap-0">
                <div className="border border-gray-200 border-t-0 p-4">
                  <p className="text-sm text-gray-600 mb-2">Membership Type</p>
                  <p className="text-sm text-gray-900 font-medium capitalize">{userInfo.membershipType}</p>
                </div>
                <div className="border border-gray-200 border-l-0 border-t-0 p-4">
                  <p className="text-sm text-gray-600 mb-2">Emergency Contact</p>
                  <p className="text-sm text-gray-900 font-medium">{userInfo.emergencyContact}</p>
                </div>
              </div>
            )}

            {/* Date of Birth & Join Date */}
            <div className="grid grid-cols-2 gap-0">
              <div className="border border-gray-200 border-t-0 p-4">
                <p className="text-sm text-gray-600 mb-2">Date of Birth</p>
                <p className="text-sm text-gray-900 font-medium">
                  {userInfo.dateOfBirth ? new Date(userInfo.dateOfBirth).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="border border-gray-200 border-l-0 border-t-0 p-4">
                <p className="text-sm text-gray-600 mb-2">Member Since</p>
                <p className="text-sm text-gray-900 font-medium">{userInfo.joinDate}</p>
              </div>
            </div>

            {/* Address - Full Width */}
            {userInfo.address && (
              <div className="border border-gray-200 border-t-0 p-4">
                <p className="text-sm text-gray-600 mb-2">Address</p>
                <p className="text-sm text-gray-900 font-medium">{userInfo.address}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* QR Kod Modal */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 bg-white/10 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Kapat Butonu */}
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-gray-100 hover:bg-red-100 text-black hover:text-red-600 rounded-full flex items-center justify-center transition-colors"
              title="Kapat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Başlık */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">QR Üyelik Kodu</h2>
              
              {/* QR Tip Seçici - Modal İçinde */}
              <div className="flex justify-center gap-2 mb-4">
                <button
                  onClick={() => setQrType('standard')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    qrType === 'standard' 
                      ? 'bg-blue-500 text-white shadow-lg' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  disabled={!userInfo?.secureQrCode}
                >
                  Standard QR
                </button>
                <button
                  onClick={() => setQrType('nfc')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    qrType === 'nfc' 
                      ? 'bg-purple-500 text-white shadow-lg' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  disabled={!userInfo?.nfcQrCode}
                >
                  NFC Compact
                </button>
              </div>
              
              <p className="text-gray-600">
                {qrInfo.isSecure ? (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                    qrType === 'nfc' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {qrInfo.type}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    {qrInfo.type}
                  </span>
                )}
              </p>
              
              {/* Boyut Bilgisi */}
              <div className="mt-2 text-xs text-gray-500">
                <span className="font-mono">
                  {qrInfo.size} {qrInfo.maxSize ? `/ ${qrInfo.maxSize}` : ''} 
                  {qrInfo.maxSize ? ` (${((qrInfo.size/qrInfo.maxSize)*100).toFixed(1)}%)` : ' chars'}
                </span>
                {qrType === 'nfc' && (
                  <span className="ml-2 text-purple-600">• NTAG215 Uyumlu</span>
                )}
              </div>
            </div>

            {/* Büyük QR Kod */}
            <div className="flex justify-center mb-6">
              <div className="bg-white p-6 rounded-xl shadow-inner border-4 border-gray-100">
                <QRCodeCanvas 
                  value={qrData}
                  size={250}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="L"
                  includeMargin={true}
                />
              </div>
            </div>

            {/* NFC Compact şifrelenmiş içerik */}
            {qrType === 'nfc' && (
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-2">NFC Compact İçerik (Çift Şifrelenmiş)</label>
                <textarea
                  readOnly
                  value={qrData}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono resize-none bg-purple-50 text-purple-900"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
                    onClick={() => navigator.clipboard.writeText(qrData)}
                  >
                    📋 Kopyala
                  </button>
                  <span className="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                    🔐 Çift şifreleme aktif
                  </span>
                </div>
                <p className="text-xs text-purple-600 mt-2">
                  * Bu veri NFC optimizasyonu için JSON formatında hazırlanmış ve ek güvenlik için şifrelenmiştir.
                </p>
              </div>
            )}

            {/* Üye Bilgileri */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">{userInfo.name}</h3>
              <p className="text-gray-600 mb-2">{userInfo.role}</p>
              <p className="text-sm text-gray-500">Üyelik ID: {userInfo.membershipId}</p>
            </div>

            {/* Kullanım Bilgisi */}
            <div className={`mt-6 p-4 rounded-lg ${
              qrType === 'nfc' ? 'bg-purple-50' : 'bg-blue-50'
            }`}>
              <p className={`text-sm text-center ${
                qrType === 'nfc' ? 'text-purple-800' : 'text-blue-800'
              }`}>
                {qrInfo.isSecure ? (
                  qrType === 'nfc' ? (
                    <>Bu kompakt QR kod NFC kartlarda (NTAG215) kullanım için optimize edilmiştir. ECDSA P-256 imzalı.</>
                  ) : (
                    <>Bu QR kod anlaşmalı mağazalarda üyeliğinizi doğrulamak için kullanılabilir. RSA-PSS imzalı.</>
                  )
                ) : (
                  <>Bu QR kod genel bilgi amaçlıdır. Güvenli sürüm yüklenmeye çalışılıyor.</>
                )}
              </p>
              
              {/* Teknik Detaylar */}
              {qrInfo.isSecure && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-medium text-gray-600">Algorithm:</span>
                      <p className="text-gray-800">{qrInfo.algorithm}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Format:</span>
                      <p className="text-gray-800">{qrInfo.description}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* NFC Yazma Butonu - Sadece NFC compact için */}
              {qrType === 'nfc' && qrInfo.isSecure && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => writeToNFC(qrData)}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    disabled={!('NDEFReader' in window)}
                    title={!('NDEFReader' in window) ? 'NFC API desteklenmiyor (Android Chrome gerekli)' : 'NFC kartına yaz'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {('NDEFReader' in window) ? 'NFC Kartına Yaz' : 'NFC Desteklenmiyor'}
                  </button>
                  {('NDEFReader' in window) && (
                    <p className="text-xs text-center text-purple-600 mt-2">
                      NTAG215 kartını telefona yaklaştırın
                    </p>
                  )}
                  
                  {/* NFC Yazma Durumu */}
                  {nfcWriteStatus && (
                    <div className={`mt-3 p-3 rounded-lg text-sm text-center ${
                      nfcWriteStatus.includes('✅') ? 'bg-green-100 text-green-800' :
                      nfcWriteStatus.includes('❌') ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {nfcWriteStatus}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

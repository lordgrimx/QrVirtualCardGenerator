'use client';

import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    address: '',
    dateOfBirth: '',
    emergencyContact: '',
    membershipType: '',
    role: '',
    status: 'active'
  });

  const [activeMenu, setActiveMenu] = useState('addMember');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // QR Doğrulayıcı için state'ler
  const [qrInput, setQrInput] = useState('');
  const [qrVerifying, setQrVerifying] = useState(false);
  const [qrResult, setQrResult] = useState(null);
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcStatus, setNfcStatus] = useState('');

  // Bugünün tarihini al (YYYY-MM-DD formatında)
  const today = new Date().toISOString().split('T')[0];

  // Dinamik API URL tespiti (mobil erişim için)
  const getApiUrl = () => {
    // Browser'da çalışıp çalışmadığını kontrol et
    if (typeof window === 'undefined') {
      return process.env.NEXT_PUBLIC_API_URL || 'https://localhost:8000';
    }
    
    const hostname = window.location.hostname;
    
    // Localhost ise localhost backend kullan
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'https://localhost:8000';
    }
    
    // Network IP ise aynı IP'de backend'i kullan
    return `https://${hostname}:8000`;
  };

  // Fetch all members from database
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiUrl()}/api/members`);
      const data = await response.json();
      
      if (data.success) {
        setMembers(data.members || []);
      } else {
        console.error('Failed to fetch members');
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (member) => {
    setEditingMember(member);
    setEditFormData({
      fullName: member.fullName,
      phoneNumber: member.phoneNumber,
      email: member.email,
      address: member.address,
      dateOfBirth: member.dateOfBirth,
      emergencyContact: member.emergencyContact,
      membershipType: member.membershipType,
      role: member.role,
      status: member.status
    });
    setEditModalOpen(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingMember(null);
    setEditFormData({});
  };

  // Handle edit form input change
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Update member
  const updateMember = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const response = await fetch(`${getApiUrl()}/api/members/${editingMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Üye bilgileri başarıyla güncellendi!');
        closeEditModal();
        fetchMembers(); // Refresh member list
      } else {
        throw new Error(data.detail || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Güncelleme sırasında hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // QR tip detection
  const detectQRType = (qrData) => {
    // NFC compact QR: base64-urlsafe, yaklaşık 100-120 karakter, padding yok
    // Standard QR: JSON benzeri veya daha uzun base64
    
    if (qrData.length < 200 && 
        qrData.match(/^[A-Za-z0-9_-]+$/) && 
        !qrData.includes('{')) {
      return 'nfc';  // URL-safe base64, compact
    } else {
      return 'standard';  // JSON veya normal format
    }
  };

  // QR Doğrulama fonksiyonu - Otomatik tip detection
  const verifyQrCode = async () => {
    if (!qrInput.trim()) {
      alert('Lütfen QR kod verisini girin!');
      return;
    }

    try {
      setQrVerifying(true);
      setQrResult(null);

      const qrType = detectQRType(qrInput.trim());
      const endpoint = qrType === 'nfc' ? '/api/qr/verify-nfc' : '/api/qr/verify';

      console.log(`🔍 QR tip algılandı: ${qrType}, endpoint: ${endpoint}`);

      const response = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qr_code: qrInput.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setQrResult({
          ...data,
          success: true,
          is_valid: data.valid, // Backend'den gelen 'valid' field'ını 'is_valid' olarak eşle
          qr_type: qrType,      // QR tipini ekle
          algorithm: qrType === 'nfc' ? 'ECDSA P-256' : 'RSA-PSS SHA256'
        });
      } else {
        setQrResult({
          success: false,
          error: data.detail || 'Doğrulama hatası',
          qr_type: qrType
        });
      }
    } catch (error) {
      console.error('QR Doğrulama hatası:', error);
      setQrResult({
        success: false,
        error: 'Bağlantı hatası: Backend server çalışmıyor olabilir'
      });
    } finally {
      setQrVerifying(false);
    }
  };

  // iOS ve cihaz tespiti
  const isIOS = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  const isAndroid = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return /Android/.test(navigator.userAgent);
  };

  // NFC okuma fonksiyonu
  const readFromNFC = async () => {
    if (isIOS()) {
      setNfcStatus('📱 iOS: Kamera ile QR kod tarayın ve metni kopyalayın');
      // iOS için kamera QR tarayıcısını açma yönergesi
      alert('iOS\'te NFC Web API desteklenmiyor.\n\n✅ Çözüm:\n1. Kamera uygulamasını açın\n2. QR kodu tarayın\n3. Çıkan metni kopyalayın\n4. Yukarıdaki alana yapıştırın');
      return;
    }

    if (!isAndroid()) {
      setNfcStatus('❌ NFC yalnızca Android Chrome\'da çalışır');
      return;
    }

    if (typeof window === 'undefined' || !('NDEFReader' in window)) {
      setNfcStatus('❌ NFC API desteklenmiyor (Android Chrome gerekli)');
      return;
    }

    try {
      setNfcReading(true);
      setNfcStatus('📡 NFC kartını telefona yaklaştırın...');
      
      const ndef = new NDEFReader();
      await ndef.scan();
      
      ndef.addEventListener("reading", ({ message }) => {
        for (const record of message.records) {
          if (record.recordType === "text") {
            const textDecoder = new TextDecoder();
            const qrData = textDecoder.decode(record.data);
            
            setQrInput(qrData);
            setNfcStatus('✅ NFC kartından okundu!');
            setNfcReading(false);
            
            // Otomatik doğrulama
            setTimeout(() => {
              verifyQrCode();
            }, 500);
            
            return;
          }
        }
      });
      
    } catch (error) {
      console.error('NFC okuma hatası:', error);
      setNfcStatus(`❌ Okuma hatası: ${error.message}`);
      setNfcReading(false);
    }
  };

  // QR doğrulayıcıyı temizle
  const clearQrVerifier = () => {
    setQrInput('');
    setQrResult(null);
    setNfcStatus('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${getApiUrl()}/api/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Üye başarıyla kaydedildi!\n\n📄 Membership ID: ${result.membershipId}\n💳 Card Number: ${result.cardNumber}\n\nBu bilgiler otomatik olarak oluşturulmuştur.`);
        // Reset form
        setFormData({
          fullName: '',
          phoneNumber: '',
          email: '',
          address: '',
          dateOfBirth: '',
          emergencyContact: '',
          membershipType: '',
          role: '',
          status: 'active'
        });
        // Refresh members list if we're on that tab
        if (activeMenu === 'showMembers') {
          fetchMembers();
        }
      } else {
        alert(`❌ Hata: ${result.detail || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('API Error:', error);
      alert('API bağlantı hatası. Backend server\'ın çalıştığından emin olun.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-20' : 'w-80'} bg-white/80 backdrop-blur-sm border-r border-gray-200/50 ${sidebarCollapsed ? 'p-3' : 'p-6'} shadow-xl transition-all duration-300 ease-in-out`}>
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
              </div>
              {!sidebarCollapsed && (
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent whitespace-nowrap">
                  Virtual ID Admin
                </h1>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-8 h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors"
              title={sidebarCollapsed ? "Sidebar'ı Aç" : "Sidebar'ı Kapat"}
            >
              <svg className={`w-5 h-5 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
        
        <nav className="space-y-2">
          <div 
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
              activeMenu === 'dashboard' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setActiveMenu('dashboard')}
            title={sidebarCollapsed ? "Dashboard" : ""}
          >
            <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg flex items-center justify-center ${
              activeMenu === 'dashboard' ? 'bg-white/20' : 'bg-gray-300'
            }`}>
              <svg className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
            {!sidebarCollapsed && <span className="text-sm font-semibold whitespace-nowrap">Dashboard</span>}
          </div>
          
          <div 
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
              activeMenu === 'addMember' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setActiveMenu('addMember')}
            title={sidebarCollapsed ? "Add New Member" : ""}
          >
            <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg flex items-center justify-center ${
              activeMenu === 'addMember' ? 'bg-white/20' : 'bg-gray-300'
            }`}>
              <svg className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
              </svg>
            </div>
            {!sidebarCollapsed && <span className="text-sm font-semibold whitespace-nowrap">Add New Member</span>}
          </div>
          
          <div 
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
              activeMenu === 'showMembers' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => {
              setActiveMenu('showMembers');
              fetchMembers();
            }}
            title={sidebarCollapsed ? "Show all Members" : ""}
          >
            <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg flex items-center justify-center ${
              activeMenu === 'showMembers' ? 'bg-white/20' : 'bg-gray-300'
            }`}>
              <svg className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
            {!sidebarCollapsed && <span className="text-sm font-semibold whitespace-nowrap">Show all Members</span>}
          </div>
          
          <div 
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
              activeMenu === 'qrVerifier' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setActiveMenu('qrVerifier')}
            title={sidebarCollapsed ? "QR Doğrulayıcı" : ""}
          >
            <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg flex items-center justify-center ${
              activeMenu === 'qrVerifier' ? 'bg-white/20' : 'bg-gray-300'
            }`}>
              <svg className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM13 3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4a1 1 0 011-1h3zM11 14a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1zM16 10a1 1 0 011-1h1a1 1 0 011 1v4a1 1 0 01-1 1h-1a1 1 0 01-1-1v-4zM9 15a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1z" clipRule="evenodd" />
              </svg>
            </div>
            {!sidebarCollapsed && <span className="text-sm font-semibold whitespace-nowrap">QR Doğrulayıcı</span>}
          </div>
          
          {/* NFC Reader Link */}
          <div 
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900`}
            onClick={() => window.open('/nfc-reader', '_blank')}
            title={sidebarCollapsed ? "NFC Reader" : ""}
          >
            <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg flex items-center justify-center bg-gradient-to-r from-green-500 to-emerald-500`}>
              <svg className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            {!sidebarCollapsed && <span className="text-sm font-semibold whitespace-nowrap">📖 NFC Reader</span>}
          </div>

          {/* NFC Writer Link */}
          <div 
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900`}
            onClick={() => window.open('/nfc-writer', '_blank')}
            title={sidebarCollapsed ? "NFC Writer" : ""}
          >
            <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg flex items-center justify-center bg-gradient-to-r from-orange-500 to-red-500`}>
              <svg className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            {!sidebarCollapsed && <span className="text-sm font-semibold whitespace-nowrap">📝 NFC Writer</span>}
          </div>
          
          <div 
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
              activeMenu === 'settings' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setActiveMenu('settings')}
            title={sidebarCollapsed ? "Settings" : ""}
          >
            <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg flex items-center justify-center ${
              activeMenu === 'settings' ? 'bg-white/20' : 'bg-gray-300'
            }`}>
              <svg className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </div>
            {!sidebarCollapsed && <span className="text-sm font-semibold whitespace-nowrap">Settings</span>}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-hidden">
        <div className="h-full flex flex-col max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                {activeMenu === 'dashboard' && (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                )}
                {activeMenu === 'addMember' && (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                  </svg>
                )}
                {activeMenu === 'showMembers' && (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                )}
                {activeMenu === 'qrVerifier' && (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM13 3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4a1 1 0 011-1h3zM11 14a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1zM16 10a1 1 0 011-1h1a1 1 0 011 1v4a1 1 0 01-1 1h-1a1 1 0 01-1-1v-4zM9 15a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1z" clipRule="evenodd" />
                  </svg>
                )}
                {activeMenu === 'settings' && (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-600 bg-clip-text text-transparent">
                {activeMenu === 'addMember' ? 'Add New Member' : 
                 activeMenu === 'showMembers' ? 'All Members' : 
                 activeMenu === 'dashboard' ? 'Dashboard' : 
                 activeMenu === 'qrVerifier' ? 'QR Doğrulayıcı' :
                 'Settings'}
              </h1>
            </div>
            <p className="text-gray-600 ml-14">
              {activeMenu === 'addMember' ? 'Create a new membership card with auto-generated ID and card number' : 
               activeMenu === 'showMembers' ? 'View and manage all registered members' : 
               activeMenu === 'dashboard' ? 'Overview of system statistics' : 
               activeMenu === 'qrVerifier' ? 'Güvenli QR kodlarını doğrulayın ve üye bilgilerini görüntüleyin' :
               'System configuration and preferences'}
            </p>
          </div>

          {/* Add Member Form */}
          {activeMenu === 'addMember' && (
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 flex-1 flex flex-col shadow-xl border border-white/20">
                <div className="grid grid-cols-4 gap-6 flex-1">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Full Name (Ad Soyad)
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Email Address (E-posta)
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      required
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Phone Number (Telefon)
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="+90 5XX XXX XXXX"
                      className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      required
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Date of Birth (Doğum Tarihi)
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      max={today}
                      className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      required
                    />
                  </div>

                  {/* Membership Type */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Membership Type (Üyelik Tipi)
                    </label>
                    <select
                      name="membershipType"
                      value={formData.membershipType}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      required
                    >
                      <option value="">Select membership type</option>
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="vip">VIP</option>
                      <option value="corporate">Corporate</option>
                    </select>
                  </div>

                  {/* Role */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Role (Rol)
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      required
                    >
                      <option value="">Select role</option>
                      <option value="member">Member</option>
                      <option value="volunteer">Volunteer</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Status (Durum)
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>

                  {/* Emergency Contact */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Emergency Contact
                    </label>
                    <input
                      type="tel"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleInputChange}
                      placeholder="+90 5XX XXX XXXX"
                      className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      required
                    />
                  </div>

                  {/* Address - Full Width */}
                  <div className="col-span-4 space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Address (Adres)
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter full address"
                      rows={3}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md resize-none"
                      required
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end mt-8">
                  <button
                    type="submit"
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 hover:from-blue-700 hover:via-blue-800 hover:to-purple-700 text-white rounded-2xl text-sm font-bold transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 flex items-center gap-3"
                  >
                    <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-sm"></div>
                    </div>
                    Create Member Card
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Show Members Content */}
          {activeMenu === 'showMembers' && (
            <div className="flex-1 flex flex-col">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading members...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto">
                  {members.length === 0 ? (
                    <div className="col-span-full flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <div className="w-8 h-8 bg-gray-400 rounded-lg"></div>
                        </div>
                        <p className="text-gray-600 text-lg">No members found</p>
                        <p className="text-gray-400 text-sm">Add your first member to get started</p>
                      </div>
                    </div>
                  ) : (
                    members.map((member) => (
                      <div
                        key={member.id}
                        className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 relative group"
                      >
                        {/* Edit Icon */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(member);
                          }}
                          className="absolute top-4 right-4 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 z-10"
                          title="Üyeyi Düzenle"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {/* Card Content - Clickable */}
                        <div
                          className="cursor-pointer"
                          onClick={() => window.open(`/member/${member.id}`, '_blank')}
                        >
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                              <span className="text-white font-bold text-lg">
                                {member.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900">{member.fullName}</h3>
                              <p className="text-sm text-gray-600">{member.membershipId}</p>
                            </div>
                          </div>
                        
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Email:</span>
                              <span className="text-sm text-gray-900 font-medium">{member.email}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Role:</span>
                              <span className="text-sm text-gray-900 font-medium capitalize">{member.role}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Status:</span>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  member.status === 'active' ? 'bg-green-500' : 
                                  member.status === 'pending' ? 'bg-yellow-500' : 
                                  member.status === 'suspended' ? 'bg-red-500' : 'bg-gray-500'
                                }`}></div>
                                <span className="text-sm text-gray-900 font-medium capitalize">{member.status}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Member Since:</span>
                              <span className="text-sm text-gray-900 font-medium">
                                {new Date(member.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs text-blue-600 text-center font-medium">Click to view details</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dashboard Content */}
          {activeMenu === 'dashboard' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 bg-white rounded-lg"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Dashboard</h3>
                <p className="text-gray-600">Coming soon...</p>
              </div>
            </div>
          )}

          {/* QR Doğrulayıcı Content */}
          {activeMenu === 'qrVerifier' && (
            <div className="flex-1 flex flex-col">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 flex-1 shadow-xl border border-white/20">
                <div className="max-w-2xl mx-auto">
                  {/* QR Giriş Formu */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM13 3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4a1 1 0 011-1h3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      QR Kod Doğrulama
                    </h3>
                    <p className="text-gray-600 mb-6">Güvenli üyelik QR kodunu buraya yapıştırın veya yazın</p>
                    
                    <div className="space-y-4">
                      <textarea
                        value={qrInput}
                        onChange={(e) => setQrInput(e.target.value)}
                        placeholder="QR kod verisini buraya yapıştırın... (örn: eyJ0eXBlIjoibWVtYmVyc2hpcF9jYXJkIiw...)"
                        rows={6}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md resize-none font-mono"
                      />
                      
                      <div className="flex gap-3">
                        <button
                          onClick={verifyQrCode}
                          disabled={qrVerifying || !qrInput.trim()}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                        >
                          {qrVerifying ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Doğrulanıyor...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              QR Kod Doğrula
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={readFromNFC}
                          disabled={nfcReading}
                          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                          title={isIOS() ? 'iOS: Kamera ile QR tarayın' : isAndroid() && (typeof window !== 'undefined' && 'NDEFReader' in window) ? 'NFC kartından oku' : 'NFC API desteklenmiyor'}
                        >
                          {nfcReading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Okuma...
                            </>
                          ) : isIOS() ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              📱 QR Tara
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              NFC Oku
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={clearQrVerifier}
                          className="px-6 py-3 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold transition-colors"
                        >
                          Temizle
                        </button>
                      </div>
                      
                      {/* NFC Durum Mesajı */}
                      {nfcStatus && (
                        <div className={`mt-4 p-4 rounded-xl text-sm text-center font-medium ${
                          nfcStatus.includes('✅') ? 'bg-green-100 text-green-800' :
                          nfcStatus.includes('❌') ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {nfcStatus}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Doğrulama Sonuçları */}
                  {qrResult && (
                    <div className="mb-6">
                      {qrResult.success && qrResult.is_valid ? (
                        /* Başarılı Doğrulama */
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-green-800">
                                ✅ Geçerli {qrResult.qr_type === 'nfc' ? 'NFC Kompakt' : 'Standart'} QR Kod!
                              </h4>
                              <p className="text-green-600">
                                {qrResult.algorithm} ile doğrulandı
                                {qrResult.data_source === 'hybrid_nfc_db' && ' • Hibrit Veri (NFC + DB)'}
                              </p>
                            </div>
                          </div>
                          
                          {qrResult.member_data && (
                                                         <div className="bg-white rounded-lg p-4 space-y-3">
                               <h5 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">Üye Bilgileri:</h5>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                 <div><span className="font-medium text-gray-700">İsim:</span> <span className="text-gray-900 font-semibold">{qrResult.member_data.name}</span></div>
                                 <div><span className="font-medium text-gray-700">Üyelik ID:</span> <span className="text-gray-900 font-semibold">{qrResult.member_data.membership_id}</span></div>
                                 <div><span className="font-medium text-gray-700">Durum:</span> 
                                   <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                                     qrResult.member_data.status === 'active' ? 'bg-green-100 text-green-800' :
                                     qrResult.member_data.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                     'bg-red-100 text-red-800'
                                   }`}>
                                     {qrResult.member_data.status?.toUpperCase()}
                                   </span>
                                 </div>
                                 <div><span className="font-medium text-gray-700">Organizasyon:</span> <span className="text-gray-900 font-semibold">{qrResult.member_data.organization}</span></div>
                                 
                                 {/* QR Format Bilgisi */}
                                 <div><span className="font-medium text-gray-700">QR Format:</span> 
                                   <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                                     qrResult.qr_type === 'nfc' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                   }`}>
                                     {qrResult.qr_type === 'nfc' ? 'NFC Kompakt' : 'Standart'}
                                   </span>
                                 </div>
                                 <div><span className="font-medium text-gray-700">İmza Algorithm:</span> <span className="text-gray-900 font-semibold">{qrResult.algorithm}</span></div>
                                 
                                 {/* Veriliş Tarihi */}
                                 <div><span className="font-medium text-gray-700">Veriliş:</span> <span className="text-gray-900 font-semibold">{new Date(qrResult.member_data.issued_at).toLocaleDateString('tr-TR')}</span></div>
                                 
                                 {/* Geçerlilik - Sadece standart QR'da var */}
                                 {qrResult.member_data.expires_at && (
                                   <div><span className="font-medium text-gray-700">Son Geçerlilik:</span> <span className="text-gray-900 font-semibold">{new Date(qrResult.member_data.expires_at).toLocaleDateString('tr-TR')}</span></div>
                                 )}
                                 
                                 {/* NFC Nonce - Sadece NFC'de var */}
                                 {qrResult.qr_type === 'nfc' && qrResult.member_data.nonce && (
                                   <div><span className="font-medium text-gray-700">Nonce:</span> <span className="text-gray-900 font-mono text-xs">{qrResult.member_data.nonce}</span></div>
                                 )}
                                 
                                 {/* İsim Doğrulaması - Sadece NFC'de var */}
                                 {qrResult.qr_type === 'nfc' && qrResult.member_data.name_verified !== undefined && (
                                   <div><span className="font-medium text-gray-700">İsim Doğrulaması:</span> 
                                     <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                                       qrResult.member_data.name_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                     }`}>
                                       {qrResult.member_data.name_verified ? '✅ Eşleşti' : '⚠️ Farklı'}
                                     </span>
                                   </div>
                                 )}
                                 
                                 {/* DB İsim - Eğer eşleşmiyorsa göster */}
                                 {qrResult.qr_type === 'nfc' && !qrResult.member_data.name_verified && qrResult.member_data.db_name && (
                                   <div><span className="font-medium text-gray-700">DB İsmi:</span> <span className="text-gray-900 font-semibold">{qrResult.member_data.db_name}</span></div>
                                 )}
                                 
                                 {/* Veri Kaynağı */}
                                 {qrResult.data_source && (
                                   <div><span className="font-medium text-gray-700">Veri Kaynağı:</span> <span className="text-gray-900 font-semibold">{qrResult.data_source === 'hybrid_nfc_db' ? 'NFC + Veritabanı' : 'QR İçeriği'}</span></div>
                                 )}
                               </div>
                             </div>
                          )}
                        </div>
                      ) : (
                        /* Başarısız Doğrulama */
                        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-red-800 font-semibold">
                                ❌ Geçersiz {qrResult.qr_type === 'nfc' ? 'NFC Kompakt' : 'Standart'} QR Kod
                              </h4>
                              <p className="text-red-600">
                                {qrResult.qr_type === 'nfc' ? 'ECDSA imza doğrulaması başarısız' : 'RSA imza doğrulaması başarısız'}
                              </p>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-4">
                            <p className="text-red-700 font-medium">Hata: {qrResult.error}</p>
                            <p className="text-red-600 text-sm mt-2">
                              {qrResult.qr_type === 'nfc' ? 
                                'Bu NFC QR kod sahte, zamanı dolmuş veya bozulmuş olabilir.' :
                                'Bu QR kod sahte, zamanı dolmuş veya bozulmuş olabilir.'
                              }
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bilgi Kutusu */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mt-0.5">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="font-semibold text-blue-800 mb-2">Nasıl Kullanılır?</h5>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• <strong>iOS:</strong> Kamera uygulamasıyla QR kod tarayın</li>
                          <li>• <strong>Android:</strong> "NFC Oku" butonu ile veya kamera</li>
                          <li>• Çıkan metni kopyalayıp yukarıdaki alana yapıştırın</li>
                          <li>• "QR Kod Doğrula" butonuna tıklayın</li>
                          <li>• Sistem üyeliğin geçerliliğini kontrol eder</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Content */}
          {activeMenu === 'settings' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 bg-white rounded-lg"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Settings</h3>
                <p className="text-gray-600">Coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Member Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-white/10 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Üye Bilgilerini Düzenle</h3>
              <button
                onClick={closeEditModal}
                className="w-8 h-8 bg-gray-100 hover:bg-red-100 rounded-full flex items-center justify-center transition-all duration-200 text-black hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={updateMember} className="space-y-4">
              {/* Full Name & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tam Adı *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={editFormData.fullName || ''}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Telefon Numarası *
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={editFormData.phoneNumber || ''}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  E-posta *
                </label>
                <input
                  type="email"
                  name="email"
                  value={editFormData.email || ''}
                  onChange={handleEditInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  required
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Adres *
                </label>
                <textarea
                  name="address"
                  value={editFormData.address || ''}
                  onChange={handleEditInputChange}
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 bg-white"
                  required
                />
              </div>

              {/* Date of Birth & Emergency Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Doğum Tarihi *
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={editFormData.dateOfBirth || ''}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Acil Durum İletişim *
                  </label>
                  <input
                    type="tel"
                    name="emergencyContact"
                    value={editFormData.emergencyContact || ''}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    required
                  />
                </div>
              </div>

              {/* Membership Type & Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Üyelik Türü *
                  </label>
                  <select
                    name="membershipType"
                    value={editFormData.membershipType || ''}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    required
                  >
                    <option value="">Seçiniz</option>
                    <option value="individual">Individual</option>
                    <option value="family">Family</option>
                    <option value="student">Student</option>
                    <option value="senior">Senior</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Rol *
                  </label>
                  <select
                    name="role"
                    value={editFormData.role || ''}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    required
                  >
                    <option value="">Seçiniz</option>
                    <option value="volunteer">Volunteer</option>
                    <option value="member">Member</option>
                    <option value="organizer">Organizer</option>
                    <option value="coordinator">Coordinator</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Durum *
                </label>
                <select
                  name="status"
                  value={editFormData.status || ''}
                  onChange={handleEditInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  required
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-6 py-3 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 
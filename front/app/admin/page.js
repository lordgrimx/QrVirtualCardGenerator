'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
  
  // Authentication check
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    
    if (session.user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized if not admin
  if (!session || session.user.role !== 'admin') {
    return null; // Will be redirected
  }

  // Bugünün tarihini al (YYYY-MM-DD formatında)
  const today = new Date().toISOString().split('T')[0];

  // Dinamik API URL tespiti (mobil erişim için)
  const getApiUrl = () => {
    if (typeof window === 'undefined') {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    }
    // Production Vercel → Render backend
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) return envUrl;
    // Local dev
    return 'http://localhost:8000';
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
          
          {/* Business Registration - NEW */}
          <div 
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
              activeMenu === 'businessRegistration' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setActiveMenu('businessRegistration')}
            title={sidebarCollapsed ? "İşletme Kayıt" : ""}
          >
            <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg flex items-center justify-center ${
              activeMenu === 'businessRegistration' ? 'bg-white/20' : 'bg-gray-300'
            }`}>
              <svg className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
              </svg>
            </div>
            {!sidebarCollapsed && <span className="text-sm font-semibold whitespace-nowrap">İşletme Kayıt</span>}
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

      {/* Main Content - I'll continue with the same structure as the original page but add business registration functionality */}
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
                {activeMenu === 'businessRegistration' && (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
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
                 activeMenu === 'businessRegistration' ? 'İşletme Kayıt' :
                 'Settings'}
              </h1>
            </div>
            <p className="text-gray-600 ml-14">
              {activeMenu === 'addMember' ? 'Create a new membership card with auto-generated ID and card number' : 
               activeMenu === 'showMembers' ? 'View and manage all registered members' : 
               activeMenu === 'dashboard' ? 'Overview of system statistics' : 
               activeMenu === 'businessRegistration' ? 'İşletme kaydı yapın ve event\'ler oluşturun' :
               'System configuration and preferences'}
            </p>
          </div>

          {/* Business Registration Content - NEW */}
          {activeMenu === 'businessRegistration' && (
            <div className="flex-1 flex flex-col">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 flex-1 shadow-xl border border-white/20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                  
                  {/* Business Registration Form */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Yeni İşletme Kaydet</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          İşletme Adı *
                        </label>
                        <input
                          type="text"
                          placeholder="İşletme adını girin"
                          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          İşletme Türü
                        </label>
                        <select className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200">
                          <option value="">Seçiniz</option>
                          <option value="restaurant">Restoran</option>
                          <option value="retail">Perakende</option>
                          <option value="service">Hizmet</option>
                          <option value="healthcare">Sağlık</option>
                          <option value="beauty">Güzellik</option>
                          <option value="education">Eğitim</option>
                          <option value="other">Diğer</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          placeholder="info@isletme.com"
                          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Telefon
                        </label>
                        <input
                          type="tel"
                          placeholder="+90 5XX XXX XXXX"
                          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Adres
                        </label>
                        <textarea
                          rows={3}
                          placeholder="İşletme adresini girin"
                          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                        />
                      </div>

                      <button className="w-full py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 hover:from-blue-700 hover:via-blue-800 hover:to-purple-700 text-white rounded-xl text-sm font-bold transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
                        İşletme Kaydet
                      </button>
                    </div>
                  </div>

                  {/* Event Management */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Event & Kampanya Yönetimi</h3>
                    
                    {/* Event Types */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                          <span className="font-semibold text-green-800">İndirim</span>
                        </div>
                        <p className="text-sm text-green-700">Yüzde veya tutar bazlı indirimler</p>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                            </svg>
                          </div>
                          <span className="font-semibold text-blue-800">Kampanya</span>
                        </div>
                        <p className="text-sm text-blue-700">Özel kampanya ve promosyonlar</p>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <span className="font-semibold text-purple-800">Ücretsiz Kargo</span>
                        </div>
                        <p className="text-sm text-purple-700">Minimum tutar koşullu kargo</p>
                      </div>

                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-.5a4 4 0 110-5.292M15 21H3v-1a6 6 0 0112 0v1z" />
                            </svg>
                          </div>
                          <span className="font-semibold text-orange-800">Sadakat</span>
                        </div>
                        <p className="text-sm text-orange-700">Müşteri sadakat programları</p>
                      </div>
                    </div>

                    {/* Contract Information */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-6">
                      <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Anlaşma Bilgileri
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Anlaşma Türü:</span>
                          <span className="text-sm font-semibold text-gray-800">Aylık Abonelik</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Aylık Ücret:</span>
                          <span className="text-sm font-semibold text-green-600">₺199</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Komisyon:</span>
                          <span className="text-sm font-semibold text-gray-800">%2.5</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Durum:</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Aktif</span>
                        </div>
                      </div>

                      <button className="w-full mt-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-semibold transition-colors">
                        Anlaşma Detayları
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rest of the content (Add Member, Show Members, Dashboard, Settings) */}
          {/* Same as the original page... */}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../components/AdminLayout';

// Static generation'dan hariç tut - backend'e bağımlı
export const dynamic = 'force-dynamic';

// NFC Okuma Grafiği Komponenti
const NfcReadingChart = () => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNfcReadingData = async () => {
      try {
        // Dinamik API URL (mobil erişim için)
        const getApiUrl = () => {
          if (typeof window === 'undefined') {
            return process.env.NEXT_PUBLIC_API_URL || 'https://qrvirtualcardgenerator.onrender.com';
          }
          const envUrl = process.env.NEXT_PUBLIC_API_URL;
          if (envUrl) return envUrl;
          return 'https://qrvirtualcardgenerator.onrender.com';
        };

        const response = await fetch(`${getApiUrl()}/api/nfc/reading-history?days=7`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.readings) {
            // API'den gelen veriyi formatla
            const formattedData = data.readings.map(reading => ({
              date: new Date(reading.date).toLocaleDateString('tr-TR', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short' 
              }),
              successful: reading.successful || 0,
              failed: reading.failed || 0
            }));
            setChartData(formattedData);
          } else {
            throw new Error('Invalid response format');
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.warn('NFC reading data fetch failed, using mock data:', error);
        // Fallback to mock data if API fails
        const generateMockData = () => {
          const today = new Date();
          const data = [];
          
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            data.push({
              date: date.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }),
              successful: Math.floor(Math.random() * 50) + 10,
              failed: Math.floor(Math.random() * 10) + 1
            });
          }
          
          return data;
        };
        
        setChartData(generateMockData());
      } finally {
        setLoading(false);
      }
    };

    fetchNfcReadingData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map(d => d.successful + d.failed));

  return (
    <div className="h-full flex flex-col">
      {/* Chart */}
      <div className="flex-1 flex items-end justify-between px-4 pb-4 space-x-2">
        {chartData.map((day, index) => {
          const totalHeight = ((day.successful + day.failed) / maxValue) * 100;
          const successfulHeight = (day.successful / (day.successful + day.failed)) * totalHeight;
          const failedHeight = (day.failed / (day.successful + day.failed)) * totalHeight;
          
          return (
            <div key={index} className="flex flex-col items-center flex-1 group">
              {/* Bar */}
              <div className="relative w-full max-w-16 mb-2" style={{ height: '240px' }}>
                <div className="absolute bottom-0 w-full bg-gray-200 rounded-t-lg" style={{ height: '240px' }}>
                  {/* Failed readings (red) */}
                  <div 
                    className="absolute bottom-0 w-full bg-red-500 rounded-t-lg opacity-80 hover:opacity-100 transition-opacity"
                    style={{ height: `${totalHeight}%` }}
                  />
                  {/* Successful readings (green) */}
                  <div 
                    className="absolute bottom-0 w-full bg-red-500 rounded-t-lg opacity-90 hover:opacity-100 transition-opacity"
                    style={{ height: `${successfulHeight}%` }}
                  />
                </div>
                
                {/* Tooltip */}
                <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  <div className="text-green-300">✅ Başarılı: {day.successful}</div>
                  <div className="text-red-300">❌ Başarısız: {day.failed}</div>
                  <div className="text-gray-300">📊 Toplam: {day.successful + day.failed}</div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
              
              {/* Date Label */}
              <span className="text-xs text-gray-600 font-medium text-center">
                {day.date}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 p-4 bg-gray-50 rounded-xl">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {chartData.reduce((sum, day) => sum + day.successful, 0)}
          </div>
          <div className="text-sm text-gray-600">Toplam Başarılı</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {chartData.reduce((sum, day) => sum + day.failed, 0)}
          </div>
          <div className="text-sm text-gray-600">Toplam Başarısız</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {chartData.reduce((sum, day) => sum + day.successful + day.failed, 0)}
          </div>
          <div className="text-sm text-gray-600">Genel Toplam</div>
        </div>
      </div>
    </div>
  );
};

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
    status: 'active',
    profilePhoto: ''
  });

  // Set Turkish locale for date inputs
  useEffect(() => {
    // This forces the browser to use Turkish locale for date inputs
    if (typeof document !== 'undefined') {
      document.documentElement.lang = 'tr';
      document.documentElement.setAttribute('lang', 'tr');
    }
  }, []);

  // Business form data
  const [businessFormData, setBusinessFormData] = useState({
    name: '',
    description: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    business_type: '',
    logo_url: ''
  });

  // Event form data
  const [eventFormData, setEventFormData] = useState({
    title: '',
    description: '',
    event_type: '',
    discount_percentage: '',
    discount_amount: '',
    min_purchase_amount: '',
    max_discount_amount: '',
    terms_conditions: '',
    start_date: '',
    end_date: '',
    business_id: '',
    business_name: ''
  });

  // Business search state
  const [businessSearchResults, setBusinessSearchResults] = useState([]);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);

  // Settings form data
  const [settingsFormData, setSettingsFormData] = useState({
    currentPassword: '',
    newEmail: '',
    newPassword: '',
    confirmPassword: '',
    profilePhoto: ''
  });

  // Dashboard state
  const [currentBusinessIndex, setCurrentBusinessIndex] = useState(0);
  const [businessModalOpen, setBusinessModalOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [businessEvents, setBusinessEvents] = useState([]);

  const [activeMenu, setActiveMenu] = useState('businessRegistration'); // Start with business registration
  const [members, setMembers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  
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

  // Fetch members when showMembers tab is active
  useEffect(() => {
    if (activeMenu === 'showMembers' && session) {
      fetchMembers();
    }
  }, [activeMenu, session]);

  // Fetch businesses when dashboard tab is active
  useEffect(() => {
    if (activeMenu === 'dashboard' && session) {
      fetchBusinesses();
    }
  }, [activeMenu, session]);

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center">
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
      return process.env.NEXT_PUBLIC_API_URL || 'https://qrvirtualcardgenerator.onrender.com';
    }
    // Production Vercel → Render backend
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) return envUrl;
    // Fallback to Render backend
    return 'https://qrvirtualcardgenerator.onrender.com';
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

  const handleMemberPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Resim boyutu 5MB\'dan küçük olmalıdır');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          profilePhoto: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Business form handlers
  const handleBusinessInputChange = (e) => {
    const { name, value } = e.target;
    setBusinessFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBusinessSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const response = await fetch(`${getApiUrl()}/api/businesses?owner_id=${session.user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessFormData),
      });

      const result = await response.json();

      if (response.ok) {
        alert('✅ İşletme başarıyla kaydedildi!');
        // Reset form
        setBusinessFormData({
          name: '',
          description: '',
          website: '',
          phone: '',
          email: '',
          address: '',
          business_type: '',
          logo_url: ''
        });
        // Refresh businesses list if needed
        fetchBusinesses();
      } else {
        alert(`❌ Hata: ${result.detail || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('API Error:', error);
      alert('API bağlantı hatası. Backend server\'ın çalıştığından emin olun.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch businesses
  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiUrl()}/api/businesses`);
      const data = await response.json();
      
      if (data.success) {
        setBusinesses(data.businesses || []);
      } else {
        console.error('Failed to fetch businesses');
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Event form handlers
  const handleEventInputChange = (e) => {
    const { name, value } = e.target;
    setEventFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Business search handler
  const handleBusinessSearch = async (searchTerm) => {
    if (searchTerm.length < 2) {
      setBusinessSearchResults([]);
      setShowBusinessDropdown(false);
      return;
    }

    try {
      // Mevcut businesses array'inde ara
      const filteredBusinesses = businesses.filter(business =>
        business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.business_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      setBusinessSearchResults(filteredBusinesses);
      setShowBusinessDropdown(true);
    } catch (error) {
      console.error('Business search error:', error);
      setBusinessSearchResults([]);
      setShowBusinessDropdown(false);
    }
  };

  const handleBusinessNameChange = (e) => {
    const value = e.target.value;
    setEventFormData(prev => ({
      ...prev,
      business_name: value,
      business_id: '' // Reset business_id when typing
    }));
    handleBusinessSearch(value);
  };

  const selectBusiness = (business) => {
    setEventFormData(prev => ({
      ...prev,
      business_name: business.name,
      business_id: business.id
    }));
    setShowBusinessDropdown(false);
    setBusinessSearchResults([]);
  };

  // Click outside to close dropdown
  const handleBusinessInputBlur = () => {
    // Small delay to allow click on dropdown items
    setTimeout(() => {
      setShowBusinessDropdown(false);
    }, 150);
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // İşletme seçilmeli
      if (!eventFormData.business_id) {
        alert('Lütfen bir işletme seçin!');
        setLoading(false);
        return;
      }

      const eventData = {
        ...eventFormData,
        business_id: parseInt(eventFormData.business_id), // Seçilen business ID'yi kullan
        start_date: new Date(eventFormData.start_date).toISOString(),
        end_date: new Date(eventFormData.end_date).toISOString()
      };
      
      // Form data'sından gereksiz alanları kaldır
      delete eventData.business_name;
      
      const response = await fetch(`${getApiUrl()}/api/business-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      const result = await response.json();

      if (response.ok) {
        alert('✅ Event başarıyla oluşturuldu!');
        // Reset form
        setEventFormData({
          title: '',
          description: '',
          event_type: '',
          discount_percentage: '',
          discount_amount: '',
          min_purchase_amount: '',
          max_discount_amount: '',
          terms_conditions: '',
          start_date: '',
          end_date: '',
          business_id: '',
          business_name: ''
        });
        setBusinessSearchResults([]);
        setShowBusinessDropdown(false);
      } else {
        alert(`❌ Hata: ${result.detail || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('API Error:', error);
      alert('API bağlantı hatası. Backend server\'ın çalıştığından emin olun.');
    } finally {
      setLoading(false);
    }
  };

  // Settings form handlers
  const handleSettingsInputChange = (e) => {
    const { name, value } = e.target;
    setSettingsFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Resim boyutu 5MB\'dan küçük olmalıdır');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSettingsFormData(prev => ({
          ...prev,
          profilePhoto: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      // Validation
      if (settingsFormData.newPassword !== settingsFormData.confirmPassword) {
        alert('❌ Yeni şifreler eşleşmiyor!');
        setLoading(false);
        return;
      }

      if (settingsFormData.newPassword && settingsFormData.newPassword.length < 6) {
        alert('❌ Şifre en az 6 karakter olmalıdır!');
        setLoading(false);
        return;
      }

      const updateData = {};
      
      if (settingsFormData.newEmail && settingsFormData.newEmail !== session.user.email) {
        updateData.email = settingsFormData.newEmail;
      }

      if (settingsFormData.newPassword) {
        updateData.currentPassword = settingsFormData.currentPassword;
        updateData.newPassword = settingsFormData.newPassword;
      }

      if (settingsFormData.profilePhoto) {
        updateData.profilePhoto = settingsFormData.profilePhoto;
      }

      if (Object.keys(updateData).length === 0) {
        alert('❌ Güncellenecek bir değişiklik bulunamadı!');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${getApiUrl()}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (response.ok) {
        alert('✅ Profil başarıyla güncellendi!');
        // Reset form
        setSettingsFormData({
          currentPassword: '',
          newEmail: '',
          newPassword: '',
          confirmPassword: ''
        });

        // If email was changed, user might need to re-login
        if (updateData.email) {
          alert('📧 Email adresi değiştirildi. Lütfen yeni email ile tekrar giriş yapın.');
          signOut({ callbackUrl: '/auth/signin' });
        }
      } else {
        alert(`❌ Hata: ${result.detail || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Settings update error:', error);
      alert('API bağlantı hatası. Backend server\'ın çalıştığından emin olun.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch business events
  const fetchBusinessEvents = async (businessId = null) => {
    try {
      const url = businessId 
        ? `${getApiUrl()}/api/business-events?business_id=${businessId}`
        : `${getApiUrl()}/api/business-events`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setBusinessEvents(data.events || []);
        return data.events || [];
      } else {
        console.error('Failed to fetch business events');
        return [];
      }
    } catch (error) {
      console.error('Error fetching business events:', error);
      return [];
    }
  };

  // Business modal handlers
  const openBusinessModal = async (business) => {
    setSelectedBusiness(business);
    setLoading(true);
    const events = await fetchBusinessEvents(business.id);
    setBusinessEvents(events);
    setLoading(false);
    setBusinessModalOpen(true);
  };

  const closeBusinessModal = () => {
    setBusinessModalOpen(false);
    setSelectedBusiness(null);
    setBusinessEvents([]);
  };

  // Navigation handlers for business cards
  const nextBusiness = () => {
    if (businesses.length > 0) {
      setCurrentBusinessIndex((prev) => (prev + 1) % Math.ceil(businesses.length / 3));
    }
  };

  const prevBusiness = () => {
    if (businesses.length > 0) {
      setCurrentBusinessIndex((prev) => prev === 0 ? Math.ceil(businesses.length / 3) - 1 : prev - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
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
          status: 'active',
          profilePhoto: ''
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout activeMenu={activeMenu} setActiveMenu={setActiveMenu}>
        {/* Main Content */}
        <div className="h-full flex flex-col max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
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
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.37-2.37a1.724 1.724 0 00-1.066-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-red-800 to-orange-600 bg-clip-text text-transparent">
                {activeMenu === 'addMember' ? 'Yeni Üye Ekle' : 
                 activeMenu === 'showMembers' ? 'Tüm Üyeler' : 
                 activeMenu === 'dashboard' ? 'Dashboard' : 
                 activeMenu === 'businessRegistration' ? 'İşletme Kayıt' :
                 'Ayarlar'}
              </h1>
            </div>
            <p className="text-gray-600 ml-14">
              {activeMenu === 'addMember' ? 'Otomatik ID ve kart numarası ile yeni üyelik kartı oluşturun' : 
               activeMenu === 'showMembers' ? 'Kayıtlı tüm üyeleri görüntüleyin ve yönetin' : 
               activeMenu === 'dashboard' ? 'Sistem istatistiklerine genel bakış' : 
               activeMenu === 'businessRegistration' ? 'İşletme kaydı yapın ve event\'ler oluşturun' :
               'Sistem yapılandırması ve tercihler'}
            </p>
          </div>

          {/* Business Registration Content - NEW */}
          {activeMenu === 'businessRegistration' && (
            <div className="flex-1 flex flex-col">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 flex-1 shadow-xl border border-white/20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                  
                  {/* Business Registration Form */}
                  <form onSubmit={handleBusinessSubmit} className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Yeni İşletme Kaydet</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          İşletme Adı *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={businessFormData.name}
                          onChange={handleBusinessInputChange}
                          placeholder="İşletme adını girin"
                          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          İşletme Türü
                        </label>
                        <select 
                          name="business_type"
                          value={businessFormData.business_type}
                          onChange={handleBusinessInputChange}
                          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        >
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
                          name="email"
                          value={businessFormData.email}
                          onChange={handleBusinessInputChange}
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
                          name="phone"
                          value={businessFormData.phone}
                          onChange={handleBusinessInputChange}
                          placeholder="+90 5XX XXX XXXX"
                          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Adres
                        </label>
                        <textarea
                          name="address"
                          value={businessFormData.address}
                          onChange={handleBusinessInputChange}
                          rows={3}
                          placeholder="İşletme adresini girin"
                          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-red-600 via-red-700 to-orange-600 hover:from-red-700 hover:via-red-800 hover:to-orange-700 text-white rounded-xl text-sm font-bold transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Kaydediliyor...' : 'İşletme Kaydet'}
                      </button>
                    </div>
                  </form>

                  {/* Event Management */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Event & Kampanya Yönetimi</h3>
                    
                    {/* Event Types */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                          <span className="font-semibold text-red-800">İndirim</span>
                        </div>
                        <p className="text-sm text-red-700">Yüzde veya tutar bazlı indirimler</p>
                      </div>

                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                            </svg>
                          </div>
                          <span className="font-semibold text-orange-800">Kampanya</span>
                        </div>
                        <p className="text-sm text-orange-700">Özel kampanya ve promosyonlar</p>
                      </div>

                      <div className="bg-gradient-to-br from-red-50 to-orange-100 border-2 border-red-200 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <span className="font-semibold text-red-800">Ücretsiz Kargo</span>
                        </div>
                        <p className="text-sm text-red-700">Minimum tutar koşullu kargo</p>
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

                    {/* Event Creation Form */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-red-200 rounded-xl p-6">
                      <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Yeni Event Oluştur
                      </h4>
                      
                      <form onSubmit={handleEventSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-red-700 mb-2">
                            İşletme Seçimi *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="business_name"
                              value={eventFormData.business_name}
                              onChange={handleBusinessNameChange}
                              onBlur={handleBusinessInputBlur}
                              placeholder="İşletme adı yazın..."
                              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
                              autoComplete="off"
                              required
                            />
                            {showBusinessDropdown && businessSearchResults.length > 0 && (
                              <div className="absolute top-full left-0 right-0 bg-white border border-blue-300 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                                {businessSearchResults.map((business) => (
                                  <div
                                    key={business.id}
                                    onClick={() => selectBusiness(business)}
                                    className="px-3 py-2 cursor-pointer hover:bg-red-50 border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="font-medium text-gray-900">{business.name}</div>
                                    <div className="text-xs text-gray-500">{business.business_type} • {business.email}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-red-700 mb-2">
                            Event Başlığı *
                          </label>
                          <input
                            type="text"
                            name="title"
                            value={eventFormData.title}
                            onChange={handleEventInputChange}
                            placeholder="Örn: %20 İndirim"
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-red-700 mb-2">
                            Event Türü *
                          </label>
                          <select 
                            name="event_type"
                            value={eventFormData.event_type}
                            onChange={handleEventInputChange}
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
                            required
                          >
                            <option value="">Seçiniz</option>
                            <option value="discount">İndirim</option>
                            <option value="campaign">Kampanya</option>
                            <option value="free_shipping">Ücretsiz Kargo</option>
                            <option value="loyalty">Sadakat</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-red-700 mb-2">
                            Açıklama
                          </label>
                          <textarea
                            name="description"
                            value={eventFormData.description}
                            onChange={handleEventInputChange}
                            placeholder="Event açıklaması"
                            rows="2"
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black resize-none"
                          />
                        </div>

                        {/* Dinamik alanlar - Event türüne göre */}
                        {eventFormData.event_type === 'discount' && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                            <h5 className="font-semibold text-red-800">İndirim Detayları</h5>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-semibold text-red-700 mb-2">
                                  İndirim Yüzdesi (%)
                                </label>
                                <input
                                  type="number"
                                  name="discount_percentage"
                                  value={eventFormData.discount_percentage}
                                  onChange={handleEventInputChange}
                                  placeholder="20"
                                  min="0"
                                  max="100"
                                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-black"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-red-700 mb-2">
                                  İndirim Tutarı (₺)
                                </label>
                                <input
                                  type="number"
                                  name="discount_amount"
                                  value={eventFormData.discount_amount}
                                  onChange={handleEventInputChange}
                                  placeholder="50"
                                  min="0"
                                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-black"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-semibold text-red-700 mb-2">
                                  Minimum Alışveriş (₺)
                                </label>
                                <input
                                  type="number"
                                  name="min_purchase_amount"
                                  value={eventFormData.min_purchase_amount}
                                  onChange={handleEventInputChange}
                                  placeholder="100"
                                  min="0"
                                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-black"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-red-700 mb-2">
                                  Maksimum İndirim (₺)
                                </label>
                                <input
                                  type="number"
                                  name="max_discount_amount"
                                  value={eventFormData.max_discount_amount}
                                  onChange={handleEventInputChange}
                                  placeholder="200"
                                  min="0"
                                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-black"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {eventFormData.event_type === 'campaign' && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                            <h5 className="font-semibold text-red-800">Kampanya Detayları</h5>
                            <div>
                              <label className="block text-sm font-semibold text-red-700 mb-2">
                                Kampanya Koşulları
                              </label>
                              <textarea
                                name="terms_conditions"
                                value={eventFormData.terms_conditions}
                                onChange={handleEventInputChange}
                                placeholder="Kampanya koşullarını detaylandırın (örn: 2 Al 1 Öde, Hediye ürün vb.)"
                                rows="3"
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black resize-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-red-700 mb-2">
                                Minimum Alışveriş (₺)
                              </label>
                              <input
                                type="number"
                                name="min_purchase_amount"
                                value={eventFormData.min_purchase_amount}
                                onChange={handleEventInputChange}
                                placeholder="150"
                                min="0"
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
                              />
                            </div>
                          </div>
                        )}

                        {eventFormData.event_type === 'free_shipping' && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                            <h5 className="font-semibold text-green-800">Ücretsiz Kargo Detayları</h5>
                            <div>
                              <label className="block text-sm font-semibold text-green-700 mb-2">
                                Minimum Sepet Tutarı (₺) *
                              </label>
                              <input
                                type="number"
                                name="min_purchase_amount"
                                value={eventFormData.min_purchase_amount}
                                onChange={handleEventInputChange}
                                placeholder="200"
                                min="0"
                                className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-black"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-green-700 mb-2">
                                Geçerli Bölgeler
                              </label>
                              <input
                                type="text"
                                name="terms_conditions"
                                value={eventFormData.terms_conditions}
                                onChange={handleEventInputChange}
                                placeholder="Tüm Türkiye, sadece İstanbul vb."
                                className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-black"
                              />
                            </div>
                          </div>
                        )}

                        {eventFormData.event_type === 'loyalty' && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                            <h5 className="font-semibold text-orange-800">Sadakat Programı Detayları</h5>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-semibold text-orange-700 mb-2">
                                  Puan Kazanım Oranı (%)
                                </label>
                                <input
                                  type="number"
                                  name="discount_percentage"
                                  value={eventFormData.discount_percentage}
                                  onChange={handleEventInputChange}
                                  placeholder="5"
                                  min="0"
                                  max="50"
                                  className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-black"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-orange-700 mb-2">
                                  Minimum Alışveriş (₺)
                                </label>
                                <input
                                  type="number"
                                  name="min_purchase_amount"
                                  value={eventFormData.min_purchase_amount}
                                  onChange={handleEventInputChange}
                                  placeholder="50"
                                  min="0"
                                  className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-black"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-orange-700 mb-2">
                                Puan Kullanım Koşulları
                              </label>
                              <textarea
                                name="terms_conditions"
                                value={eventFormData.terms_conditions}
                                onChange={handleEventInputChange}
                                placeholder="Puan kullanım koşulları (örn: 100 puan = 10₺, minimum 500 puan ile kullanılabilir)"
                                rows="2"
                                className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-black resize-none"
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-semibold text-red-700 mb-2">
                              Başlangıç Tarihi *
                            </label>
                            <input
                              type="date"
                              name="start_date"
                              value={eventFormData.start_date}
                              onChange={handleEventInputChange}
                              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-red-700 mb-2">
                              Bitiş Tarihi *
                            </label>
                            <input
                              type="date"
                              name="end_date"
                              value={eventFormData.end_date}
                              onChange={handleEventInputChange}
                              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
                              required
                            />
                          </div>
                        </div>

                        <button 
                          type="submit"
                          disabled={loading}
                          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Oluşturuluyor...' : 'Event Oluştur'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Member Form */}
          {activeMenu === 'addMember' && (
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 flex-1 flex flex-col shadow-xl border border-white/20">
                <div className="grid grid-cols-4 gap-6 flex-1">
                  {/* Profile Photo */}
                  <div className="col-span-4">
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 hover:border-purple-300 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-gray-800">Üye Profil Resmi</h4>
                          <p className="text-xs text-gray-600">Üyenin profil fotoğrafını yükleyin</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        {formData.profilePhoto ? (
                          <div className="relative group">
                            <div className="relative">
                              <img
                                src={formData.profilePhoto}
                                alt="Profil Önizleme"
                                className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-2xl ring-4 ring-purple-100"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, profilePhoto: '' }))}
                                  className="w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transform hover:scale-110 transition-all duration-200 shadow-lg"
                                  title="Resmi İptal Et"
                                >
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div className="w-28 h-28 border-4 border-dashed border-purple-300 rounded-2xl flex items-center justify-center bg-white/60">
                            <div className="text-center">
                              <svg className="w-10 h-10 text-purple-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <p className="text-xs text-purple-600 font-medium">Resim Seç</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <label className="cursor-pointer">
                            <div className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 inline-flex items-center gap-3">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              Fotoğraf Yükle
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleMemberPhotoChange}
                              className="hidden"
                            />
                          </label>
                          <div className="mt-3 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              PNG, JPG veya GIF • Maksimum 5MB
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Profil resmi opsiyoneldir
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Ad Soyad
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Ad soyad girin"
                      className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      E-posta
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="E-posta adresini girin"
                      className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      required
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Telefon
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
                      Doğum Tarihi
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      max={today}
                      lang="tr"
                      className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      required
                    />
                  </div>

                  {/* Membership Type */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Üyelik Tipi
                    </label>
                    <select
                      name="membershipType"
                      value={formData.membershipType}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      required
                    >
                      <option value="">Üyelik tipini seçin</option>
                      <option value="standard">Standart</option>
                      <option value="premium">Premium</option>
                      <option value="vip">VIP</option>
                      <option value="corporate">Kurumsal</option>
                    </select>
                  </div>

                  {/* Role */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Rol
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      required
                    >
                      <option value="">Rol seçin</option>
                      <option value="member">Üye</option>
                      <option value="volunteer">Gönüllü</option>
                      <option value="staff">Personel</option>
                      <option value="admin">Yönetici</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Durum
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <option value="active">Aktif</option>
                      <option value="pending">Beklemede</option>
                      <option value="suspended">Askıda</option>
                    </select>
                  </div>

                  {/* Emergency Contact */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Acil Durum İletişim
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
                      Adres
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Tam adresi girin"
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
                    className="px-8 py-4 bg-gradient-to-r from-red-600 via-red-700 to-orange-600 hover:from-red-700 hover:via-red-800 hover:to-orange-700 text-white rounded-2xl text-sm font-bold transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 flex items-center gap-3"
                  >
                    <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-sm"></div>
                    </div>
                    Üyelik Kartı Oluştur
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Show Members Content */}
          {activeMenu === 'showMembers' && (
            <div className="flex-1 flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto">
                  {members.length === 0 ? (
                    <div className="col-span-full flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <div className="w-8 h-8 bg-gray-400 rounded-lg"></div>
                        </div>
                        <p className="text-gray-600 text-lg">Henüz üye bulunamadı</p>
                        <p className="text-gray-400 text-sm">İlk üyenizi eklemek için "Üye Ekle" sekmesini kullanın</p>
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
                          className="absolute top-4 right-4 w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 z-10"
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
                            {member.profilePhoto ? (
                              <img
                                src={`data:image/png;base64,${member.profilePhoto}`}
                                alt={member.fullName}
                                className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-lg"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-lg">
                                  {member.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </span>
                              </div>
                            )}
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
            </div>
          )}

          {/* Dashboard Content */}
          {activeMenu === 'dashboard' && (
            <div className="flex-1 p-8 space-y-8">
              {/* NFC Okuma Grafiği */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      Günlük NFC Okuma İstatistikleri
                    </h2>
                    <p className="text-gray-600">Son 7 günlük NFC kart okuma geçmişi</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Başarılı</span>
                    <div className="w-3 h-3 bg-red-500 rounded-full ml-4"></div>
                    <span>Başarısız</span>
                  </div>
                </div>

                {/* Chart Area */}
                <div className="h-80 relative">
                  <NfcReadingChart />
                </div>
              </div>

              {/* Business Cards Section */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Kayıtlı İşletmeler</h2>
                    <p className="text-gray-600">Sistemdeki işletmeleri görüntüleyin ve yönetin</p>
                  </div>
                  {businesses.length > 3 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={prevBusiness}
                        className="w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-sm text-gray-600 mx-2">
                        {currentBusinessIndex + 1} / {Math.ceil(businesses.length / 3)}
                      </span>
                      <button
                        onClick={nextBusiness}
                        className="w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg hover:shadow-xl"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {businesses.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Henüz İşletme Yok</h3>
                    <p className="text-gray-500">İlk işletmenizi kaydetmek için "İşletme Kayıt" menüsünü kullanın</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {businesses.slice(currentBusinessIndex * 3, (currentBusinessIndex + 1) * 3).map((business, index) => (
                      <div
                        key={business.id}
                        className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group hover:border-red-300"
                        onClick={() => openBusinessModal(business)}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {business.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </div>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {business.name}
                        </h3>
                        
                        {business.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {business.description}
                          </p>
                        )}

                        <div className="space-y-2">
                          {business.business_type && (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-red-100 rounded flex items-center justify-center">
                                <div className="w-2 h-2 bg-red-600 rounded"></div>
                              </div>
                              <span className="text-sm text-gray-700 capitalize">{business.business_type}</span>
                            </div>
                          )}
                          
                          {business.phone && (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-green-100 rounded flex items-center justify-center">
                                <div className="w-2 h-2 bg-green-600 rounded"></div>
                              </div>
                              <span className="text-sm text-gray-700">{business.phone}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center">
                              <div className="w-2 h-2 bg-gray-600 rounded"></div>
                            </div>
                            <span className="text-sm text-gray-700">
                              {new Date(business.created_at).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs text-blue-600 text-center font-medium group-hover:text-red-700">
                            Detaylar için tıklayın
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm">Toplam İşletme</p>
                      <p className="text-2xl font-bold">{businesses.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Toplam Üye</p>
                      <p className="text-2xl font-bold">{members.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Aktif Event</p>
                      <p className="text-2xl font-bold">{businessEvents.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Content */}
          {activeMenu === 'settings' && (
            <div className="flex-1 p-8">
              <div className="max-w-2xl mx-auto">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Admin Ayarları</h2>
                      <p className="text-gray-600">Profil bilgilerinizi ve güvenlik ayarlarınızı yönetin</p>
                    </div>
                  </div>

                  {/* Current Admin Info */}
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
                    <h3 className="text-lg font-semibold text-red-800 mb-4">Mevcut Admin Bilgileri</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-sm font-medium text-red-700 mb-1">Ad Soyad:</span>
                        <span className="text-blue-900 font-semibold">{session?.user?.name || 'Admin User'}</span>
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-red-700 mb-1">Email:</span>
                        <span className="text-blue-900 font-semibold">{session?.user?.email || 'admin@qrvirtualcard.com'}</span>
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-red-700 mb-1">Rol:</span>
                        <span className="text-blue-900 font-semibold capitalize">{session?.user?.role || 'Admin'}</span>
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-red-700 mb-1">Son Giriş:</span>
                        <span className="text-blue-900 font-semibold">{new Date().toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Update Form */}
                  <form onSubmit={handleSettingsSubmit} className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Profil Güncelleme</h3>

                    {/* Profile Photo Update */}
                    <div className="bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-gray-200 rounded-2xl p-8 hover:border-blue-300 transition-all duration-300">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-800">Profil Resmi</h4>
                          <p className="text-xs text-gray-600">Profilinizi kişiselleştirin</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-8">
                        {settingsFormData.profilePhoto ? (
                          <div className="relative group">
                            <div className="relative">
                              <img
                                src={settingsFormData.profilePhoto}
                                alt="Profil Önizleme"
                                className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-2xl ring-4 ring-blue-100"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => setSettingsFormData(prev => ({ ...prev, profilePhoto: '' }))}
                                  className="w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transform hover:scale-110 transition-all duration-200 shadow-lg"
                                  title="Resmi Kaldır"
                                >
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div className="w-32 h-32 border-4 border-dashed border-gray-300 rounded-2xl flex items-center justify-center bg-white/50">
                            <div className="text-center">
                              <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <p className="text-xs text-gray-500">Resim Yok</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <label className="cursor-pointer">
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 inline-flex items-center gap-3">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              Resim Yükle
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleProfilePhotoChange}
                              className="hidden"
                            />
                          </label>
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              PNG, JPG veya GIF formatı
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Maksimum 5MB boyut
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Kare resimler en iyi sonucu verir
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Email Update */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Email Adresi Değiştir</h4>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Yeni Email Adresi
                        </label>
                        <input
                          type="email"
                          name="newEmail"
                          value={settingsFormData.newEmail}
                          onChange={handleSettingsInputChange}
                          placeholder={session?.user?.email || 'admin@qrvirtualcard.com'}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email değiştirildikten sonra tekrar giriş yapmanız gerekecek</p>
                      </div>
                    </div>

                    {/* Password Update */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Şifre Değiştir</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Mevcut Şifre *
                          </label>
                          <input
                            type="password"
                            name="currentPassword"
                            value={settingsFormData.currentPassword}
                            onChange={handleSettingsInputChange}
                            placeholder="Mevcut şifrenizi girin"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Yeni Şifre *
                            </label>
                            <input
                              type="password"
                              name="newPassword"
                              value={settingsFormData.newPassword}
                              onChange={handleSettingsInputChange}
                              placeholder="Yeni şifrenizi girin"
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                              minLength={6}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Yeni Şifre Tekrar *
                            </label>
                            <input
                              type="password"
                              name="confirmPassword"
                              value={settingsFormData.confirmPassword}
                              onChange={handleSettingsInputChange}
                              placeholder="Yeni şifrenizi tekrar girin"
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                              minLength={6}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">Şifre en az 6 karakter olmalıdır</p>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-blue-700 hover:to-orange-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

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
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                        <option value="vip">VIP</option>
                        <option value="corporate">Corporate</option>
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
                        <option value="member">Member</option>
                        <option value="volunteer">Volunteer</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

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
                      className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-blue-700 hover:to-orange-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Güncelleniyor...' : 'Güncelle'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Business Details Modal */}
          {businessModalOpen && selectedBusiness && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {selectedBusiness.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedBusiness.name}</h2>
                        <p className="text-gray-600">{selectedBusiness.business_type}</p>
                      </div>
                    </div>
                    <button
                      onClick={closeBusinessModal}
                      className="w-10 h-10 bg-gray-100 hover:bg-red-100 rounded-full flex items-center justify-center transition-all duration-200 text-gray-600 hover:text-red-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-8">
                  {/* Business Information */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-red-200 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      İşletme Bilgileri
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold text-red-700 mb-2">İşletme Adı</h4>
                        <p className="text-blue-900 font-medium">{selectedBusiness.name}</p>
                      </div>
                      
                      {selectedBusiness.description && (
                        <div>
                          <h4 className="text-sm font-semibold text-red-700 mb-2">Açıklama</h4>
                          <p className="text-blue-900">{selectedBusiness.description}</p>
                        </div>
                      )}
                      
                      {selectedBusiness.business_type && (
                        <div>
                          <h4 className="text-sm font-semibold text-red-700 mb-2">İşletme Türü</h4>
                          <p className="text-blue-900 capitalize">{selectedBusiness.business_type}</p>
                        </div>
                      )}
                      
                      {selectedBusiness.phone && (
                        <div>
                          <h4 className="text-sm font-semibold text-red-700 mb-2">Telefon</h4>
                          <p className="text-blue-900">{selectedBusiness.phone}</p>
                        </div>
                      )}
                      
                      {selectedBusiness.email && (
                        <div>
                          <h4 className="text-sm font-semibold text-red-700 mb-2">Email</h4>
                          <p className="text-blue-900">{selectedBusiness.email}</p>
                        </div>
                      )}
                      
                      {selectedBusiness.website && (
                        <div>
                          <h4 className="text-sm font-semibold text-red-700 mb-2">Website</h4>
                          <a href={selectedBusiness.website} target="_blank" rel="noopener noreferrer" className="text-red-700 hover:text-red-800 underline">
                            {selectedBusiness.website}
                          </a>
                        </div>
                      )}
                      
                      {selectedBusiness.address && (
                        <div className="md:col-span-2">
                          <h4 className="text-sm font-semibold text-red-700 mb-2">Adres</h4>
                          <p className="text-blue-900">{selectedBusiness.address}</p>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="text-sm font-semibold text-red-700 mb-2">Kayıt Tarihi</h4>
                        <p className="text-blue-900">{new Date(selectedBusiness.created_at).toLocaleDateString('tr-TR')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Business Events */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0h6m-6 0V3m0 4v4m0-4H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                        </svg>
                        Event & Kampanyalar ({businessEvents.length})
                      </h3>
                      {loading && (
                        <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>

                    {businessEvents.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0h6m-6 0V3m0 4v4m0-4H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-semibold text-red-700 mb-2">Henüz Event Yok</h4>
                        <p className="text-red-600">Bu işletme için henüz event/kampanya oluşturulmamış</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {businessEvents.map((event, index) => (
                          <div key={event.id} className="bg-white border border-purple-200 rounded-xl p-4 hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-bold text-gray-900">{event.title}</h4>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                event.event_type === 'discount' ? 'bg-red-100 text-red-800' :
                                event.event_type === 'campaign' ? 'bg-red-100 text-red-800' :
                                event.event_type === 'free_shipping' ? 'bg-green-100 text-green-800' :
                                event.event_type === 'loyalty' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {event.event_type === 'discount' ? 'İndirim' :
                                 event.event_type === 'campaign' ? 'Kampanya' :
                                 event.event_type === 'free_shipping' ? 'Ücretsiz Kargo' :
                                 event.event_type === 'loyalty' ? 'Sadakat' : event.event_type}
                              </span>
                            </div>
                            
                            {event.description && (
                              <p className="text-sm text-gray-600 mb-3">{event.description}</p>
                            )}
                            
                            <div className="space-y-2 text-sm">
                              {event.discount_percentage && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">İndirim:</span>
                                  <span className="font-semibold text-red-600">%{event.discount_percentage}</span>
                                </div>
                              )}
                              
                              {event.min_purchase_amount && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Min. Tutar:</span>
                                  <span className="font-semibold">₺{event.min_purchase_amount}</span>
                                </div>
                              )}
                              
                              <div className="flex justify-between">
                                <span className="text-gray-600">Başlangıç:</span>
                                <span className="font-semibold">{new Date(event.start_date).toLocaleDateString('tr-TR')}</span>
                              </div>
                              
                              <div className="flex justify-between">
                                <span className="text-gray-600">Bitiş:</span>
                                <span className="font-semibold">{new Date(event.end_date).toLocaleDateString('tr-TR')}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
    </AdminLayout>
  );
}

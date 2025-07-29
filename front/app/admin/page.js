'use client';

import { useState } from 'react';

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

  const [activeMenu, setActiveMenu] = useState('members');

  // Bugünün tarihini al (YYYY-MM-DD formatında)
  const today = new Date().toISOString().split('T')[0];

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
      const response = await fetch('http://localhost:8000/api/members', {
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
      <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-gray-200/50 p-6 shadow-xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Virtual ID Admin
              </h1>
            </div>
            <a 
              href="/" 
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors font-medium px-3 py-1 rounded-full hover:bg-blue-50"
            >
              ← Back to Client
            </a>
          </div>
        </div>
        
        <nav className="space-y-2">
          <div 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
              activeMenu === 'dashboard' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setActiveMenu('dashboard')}
          >
            <div className={`w-6 h-6 rounded-lg ${
              activeMenu === 'dashboard' ? 'bg-white/20' : 'bg-gray-300'
            }`}></div>
            <span className="text-sm font-semibold">Dashboard</span>
          </div>
          
          <div 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
              activeMenu === 'members' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setActiveMenu('members')}
          >
            <div className={`w-6 h-6 rounded-lg ${
              activeMenu === 'members' ? 'bg-white/20' : 'bg-gray-300'
            }`}></div>
            <span className="text-sm font-semibold">Members</span>
          </div>
          
          <div 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
              activeMenu === 'settings' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setActiveMenu('settings')}
          >
            <div className={`w-6 h-6 rounded-lg ${
              activeMenu === 'settings' ? 'bg-white/20' : 'bg-gray-300'
            }`}></div>
            <span className="text-sm font-semibold">Settings</span>
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
                <div className="w-5 h-5 bg-white rounded-md"></div>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-600 bg-clip-text text-transparent">
                Add New Member
              </h1>
            </div>
            <p className="text-gray-600 ml-14">Create a new membership card with auto-generated ID and card number</p>
          </div>

          {/* Form - Single Screen Layout */}
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
                    Phone Number (Tel No)
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
                    className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                    required
                  />
                </div>

                {/* Membership Type */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Membership Type
                  </label>
                  <select
                    name="membershipType"
                    value={formData.membershipType}
                    onChange={handleInputChange}
                    className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                    required
                  >
                    <option value="" className="text-gray-400">Select Membership Type</option>
                    <option value="student" className="text-gray-700">Student (Öğrenci)</option>
                    <option value="volunteer" className="text-gray-700">Volunteer (Gönüllü)</option>
                    <option value="staff" className="text-gray-700">Staff (Personel)</option>
                    <option value="premium" className="text-gray-700">Premium (Premium)</option>
                    <option value="corporate" className="text-gray-700">Corporate (Kurumsal)</option>
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
                    className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                    required
                  >
                    <option value="" className="text-gray-400">Select Role</option>
                    <option value="member" className="text-gray-700">Member (Üye)</option>
                    <option value="volunteer" className="text-gray-700">Volunteer (Gönüllü)</option>
                    <option value="coordinator" className="text-gray-700">Coordinator (Koordinatör)</option>
                    <option value="manager" className="text-gray-700">Manager (Yönetici)</option>
                    <option value="admin" className="text-gray-700">Admin (Admin)</option>
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
                    className="w-full h-12 px-4 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                    required
                  >
                    <option value="active" className="text-gray-700">Active (Aktif)</option>
                    <option value="inactive" className="text-gray-700">Inactive (Pasif)</option>
                    <option value="pending" className="text-gray-700">Pending (Beklemede)</option>
                    <option value="suspended" className="text-gray-700">Suspended (Askıya Alınmış)</option>
                  </select>
                </div>

                {/* Emergency Contact - Separate Row */}
                <div className="col-span-2 space-y-2">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Emergency Contact (Acil Durum İletişim)
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
        </div>
      </div>
    </div>
  );
} 
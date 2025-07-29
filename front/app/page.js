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

  // Bugünün tarihini al (YYYY-MM-DD formatında)
  const today = new Date().toISOString().split('T')[0];

  // Fetch all members from database
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/members');
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
              activeMenu === 'addMember' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => setActiveMenu('addMember')}
          >
            <div className={`w-6 h-6 rounded-lg ${
              activeMenu === 'addMember' ? 'bg-white/20' : 'bg-gray-300'
            }`}></div>
            <span className="text-sm font-semibold">Add New Member</span>
          </div>
          
          <div 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
              activeMenu === 'showMembers' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
            onClick={() => {
              setActiveMenu('showMembers');
              fetchMembers();
            }}
          >
            <div className={`w-6 h-6 rounded-lg ${
              activeMenu === 'showMembers' ? 'bg-white/20' : 'bg-gray-300'
            }`}></div>
            <span className="text-sm font-semibold">Show all Members</span>
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
                {activeMenu === 'addMember' ? 'Add New Member' : 
                 activeMenu === 'showMembers' ? 'All Members' : 
                 activeMenu === 'dashboard' ? 'Dashboard' : 
                 'Settings'}
              </h1>
            </div>
            <p className="text-gray-600 ml-14">
              {activeMenu === 'addMember' ? 'Create a new membership card with auto-generated ID and card number' : 
               activeMenu === 'showMembers' ? 'View and manage all registered members' : 
               activeMenu === 'dashboard' ? 'Overview of system statistics' : 
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
                        className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1"
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
    </div>
  );
}

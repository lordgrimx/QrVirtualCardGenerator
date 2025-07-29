'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';

export default function MemberPage() {
  const params = useParams();
  const memberId = params.id;
  
  const [activeTab, setActiveTab] = useState('front');
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      
      const response = await fetch(`http://localhost:8000/api/members/${id}`);
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
          dateOfBirth: data.member.dateOfBirth
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

  // QR kodu için veri
  const qrData = JSON.stringify({
    name: userInfo.name,
    email: userInfo.email,
    memberId: userInfo.memberId,
    org: "Community Connect"
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-10 py-4">
        <div className="flex items-center justify-between max-w-[1280px] mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded"></div>
            <h1 className="text-lg font-bold text-gray-900">Community Connect</h1>
          </div>
          
          {/* Navigation */}
          <nav className="flex items-center gap-8">
            <a href="/" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">Home</a>
            <a href="#" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">Events</a>
            <a href="#" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">Resources</a>
            <a href="#" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">Contact</a>
            <a 
              href="/admin" 
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm font-bold text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <div className="w-4 h-4 bg-white/20 rounded-md"></div>
              Admin Panel
            </a>
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
                      <div className="absolute top-0 right-0 bg-white p-2 rounded-lg">
                        <QRCodeCanvas 
                          value={qrData}
                          size={50}
                          bgColor="#ffffff"
                          fgColor="#000000"
                          level="M"
                        />
                      </div>
                      
                      {/* Member Info */}
                      <div className="flex-1 flex flex-col justify-center pr-20">
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
                          <li>• QR code for quick verification</li>
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

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mb-6">
            <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-full text-sm font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              Download Card
            </button>
            <button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-3 rounded-full text-sm font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              Share QR Code
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
    </div>
  );
}

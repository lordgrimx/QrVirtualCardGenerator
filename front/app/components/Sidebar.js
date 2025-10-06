'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

export default function Sidebar({ activeMenu, setActiveMenu }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { data: session } = useSession();

  // Debug: Session image durumunu kontrol et
  console.log('🔷 SIDEBAR - Session User Image:', session?.user?.image ? 'MEVCUT ✅' : 'YOK ❌');
  console.log('🔷 SIDEBAR - Session User:', {
    name: session?.user?.name,
    email: session?.user?.email,
    role: session?.user?.role,
    hasImage: !!session?.user?.image,
    imageLength: session?.user?.image?.length || 0
  });

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      )
    },
    {
      id: 'showMembers',
      label: 'Tüm Üyeler',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      adminOnly: true
    },
    {
      id: 'addMember',
      label: 'Üye Ekle',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      adminOnly: true
    },
    {
      id: 'businessRegistration',
      label: 'İşletme Kayıt',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-8-8h2m-2 0h-2m8 0h2m-2 0h-2m-2-4h2m-2 0h-2m8 0h2m-2 0h-2" />
        </svg>
      ),
      adminOnly: true
    },
    {
      id: 'settings',
      label: 'Ayarlar',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      adminOnly: true
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    !item.adminOnly || session?.user?.role === 'admin'
  );

  return (
    <div className={`bg-white/90 backdrop-blur-sm border-r border-gray-200/50 shadow-xl transition-all duration-300 flex flex-col h-screen sticky top-0 ${
      sidebarCollapsed ? 'w-20' : 'w-80'
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200/50">
        <div className="flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <Image 
                src="/anef-logo.png" 
                alt="ANEF Logo" 
                width={40} 
                height={40} 
                className="rounded-lg object-contain"
                priority
              />
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-red-700 to-orange-600 bg-clip-text text-transparent">
                  ANEF
                </h1>
                <p className="text-xs text-gray-600">Yönetim Paneli</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title={sidebarCollapsed ? 'Genişlet' : 'Daralt'}
          >
            <svg 
              className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const isActive = activeMenu === item.id;
          
          return (
            <div key={item.id}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25' 
                      : 'text-gray-700 hover:bg-red-50 hover:text-red-900'
                  }`}
                >
                  {item.icon}
                  {!sidebarCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </Link>
              ) : (
                <div 
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25' 
                      : 'text-gray-700 hover:bg-red-50 hover:text-red-900'
                  }`}
                  onClick={() => setActiveMenu(item.id)}
                >
                  {item.icon}
                  {!sidebarCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </div>
              )}
              
              {sidebarCollapsed && (
                <div className="absolute left-20 bg-gray-900 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200/50">
        {session?.user && (
          <div className="space-y-3">
            <div className={`p-3 bg-red-50 rounded-lg ${sidebarCollapsed ? 'flex justify-center' : 'flex items-center gap-3'}`}>
              {/* Admin profile photo from users.image table */}
              {session.user.image && !imageError ? (
                <img
                  src={`data:image/jpeg;base64,${session.user.image}`}
                  alt={session.user.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
                  onError={(e) => {
                    console.error('🔴 SIDEBAR - Image load error, falling back to initials');
                    console.error('🔴 Image src length:', e.target.src?.length || 0);
                    setImageError(true);
                  }}
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-orange-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {session.user.name ? session.user.name.split(' ').map(n => n[0]).join('') : 'U'}
                </div>
              )}
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-red-600 font-medium">
                    {session.user.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Link
                href="/"
                className={`${sidebarCollapsed ? 'flex-1' : 'flex-1'} flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm`}
                title="Ana Sayfa"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {!sidebarCollapsed && <span>Ana Sayfa</span>}
              </Link>
              
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className={`${sidebarCollapsed ? 'flex-1' : 'flex-1'} flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm`}
                title="Çıkış Yap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {!sidebarCollapsed && <span>Çıkış</span>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

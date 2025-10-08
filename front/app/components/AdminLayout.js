'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';

export default function AdminLayout({ children, activeMenu, setActiveMenu }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile by default, shown with absolute positioning when open */}
      <div className={`fixed md:sticky top-0 left-0 h-screen z-50 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen w-full md:w-auto">
        {/* Mobile Header with Menu Button */}
        <div className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Menüyü Aç"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

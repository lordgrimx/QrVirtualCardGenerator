'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';

export default function AdminLayout({ children, activeMenu, setActiveMenu }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex">
      {/* Sidebar */}
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

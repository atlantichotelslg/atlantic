'use client';

import { useState } from 'react';
import HotelReceiptManagement from './HotelReceiptManagement';
import MenuManagement from './MenuManagement';
import RestaurantBillsViewer from './RestaurantBillsViewer';
import RoomManagement from './RoomManagement';

interface AdminDashboardProps {
  userName: string;
}

export default function AdminDashboard({ userName }: AdminDashboardProps) {
  const [activeView, setActiveView] = useState<'receipts' | 'menu' | 'restaurant' | 'rooms'>('receipts');

  return (
    <div>
      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-6 no-print overflow-x-auto">
        <button
          onClick={() => setActiveView('receipts')}
          className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
            activeView === 'receipts'
              ? 'bg-blue-900 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🧾 Hotel Receipts
        </button>
        <button
          onClick={() => setActiveView('rooms')}
          className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
            activeView === 'rooms'
              ? 'bg-blue-900 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🏨 Room Management
        </button>
        <button
          onClick={() => setActiveView('menu')}
          className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
            activeView === 'menu'
              ? 'bg-blue-900 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🍽️ Menu Management
        </button>
        <button
          onClick={() => setActiveView('restaurant')}
          className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
            activeView === 'restaurant'
              ? 'bg-blue-900 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📊 Restaurant Bills
        </button>
      </div>

      {/* Content Views */}
      {activeView === 'receipts' && (
        <HotelReceiptManagement userName={userName} />
      )}

      {activeView === 'rooms' && (
        <RoomManagement />
      )}

      {activeView === 'menu' && (
        <MenuManagement />
      )}

      {activeView === 'restaurant' && (
        <RestaurantBillsViewer />
      )}
    </div>
  );
}
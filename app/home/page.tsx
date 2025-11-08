'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService, User } from '@/lib/auth';
import { ReceiptService, Receipt } from '@/lib/receipts';
import SyncStatus from '../components/SyncStatus';
import AdminDashboard from '../components/AdminDashboard';
import { getLocationAddress, getLocationFullAddress } from '@/lib/locations';
import RoomDashboard from '../components/RoomDashboard';
import { RoomService } from '@/lib/rooms';
import ReceiptHistory from '../components/ReceiptHistory';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userLocation, setUserLocation] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [amountFigures, setAmountFigures] = useState('');
  const [amountWords, setAmountWords] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'Transfer'>('Cash');
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [receptionistView, setReceptionistView] = useState<'rooms' | 'create' | 'history'>('rooms');

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      router.push('/');
      return;
    }
    
    console.log('👤 Current user:', currentUser);
    setUser(currentUser);
    
    // Get location - check multiple sources
    let location = '';
    
    // Try localStorage first
    const sessionData = localStorage.getItem('atlantic_hotel_session');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        console.log('📦 Session data:', session);
        location = session.location || '';
      } catch (e) {
        console.error('❌ Error parsing session:', e);
      }
    }
    
    // Fallback to sessionStorage
    if (!location) {
      location = sessionStorage.getItem('atlantic_hotel_location') || '';
      console.log('📦 Location from sessionStorage:', location);
    }
    
    
    console.log('🏨 Final user location:', location);
    setUserLocation(location);
    
    ReceiptService.initializeCounter();
    setSerialNumber(ReceiptService.generateSerialNumber());
  }, [router]);

  useEffect(() => {
    // Auto-convert amount to words
    const amount = parseFloat(amountFigures.replace(/,/g, ''));
    if (!isNaN(amount) && amount > 0) {
      setAmountWords(ReceiptService.numberToWords(amount));
    } else {
      setAmountWords('');
    }
  }, [amountFigures]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, ''); // Remove existing commas
    if (value === '' || /^\d+$/.test(value)) {
      // Format with commas
      const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      setAmountFigures(formatted);
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    router.push('/');
  };

  const handleGenerateReceipt = (e: React.FormEvent) => {
    e.preventDefault();

    const receipt: Receipt = {
      id: Date.now().toString(),
      serialNumber,
      customerName,
      roomNumber,
      amountFigures: parseFloat(amountFigures.replace(/,/g, '')),
      amountWords,
      paymentMode,
      receptionistName: user?.name || '',
      location: userLocation, // ← ADD THIS LINE
      date: new Date().toLocaleDateString('en-GB'),
      timestamp: Date.now(),
    };

    ReceiptService.saveReceipt(receipt);
    setCurrentReceipt(receipt);
    setShowReceipt(true);
    
    // Mark room as occupied after creating receipt
    if (roomNumber && userLocation) {
      RoomService.updateRoomStatus(
        userLocation,
        roomNumber,
        'occupied',
        customerName,
        new Date().toLocaleDateString('en-GB'),
        '' // Check-out date can be added later
      );
      console.log('✅ Room', roomNumber, 'marked as occupied');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNewReceipt = () => {
    setShowReceipt(false);
    setCustomerName('');
    setRoomNumber('');
    setAmountFigures('');
    setAmountWords('');
    setPaymentMode('Cash');
    setSerialNumber(ReceiptService.generateSerialNumber());
    setCurrentReceipt(null);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - Don't print */}
      <header className="bg-blue-900 text-white py-6 px-16 shadow-lg no-print">
        <div className="mx-auto flex justify-between items-center">
          {/* Left side - Logo and Title */}
          <div className="flex items-center gap-4">
            {/* Logo Image */}
            <img 
              src="/logo.png" 
              alt="Atlantic Hotel Logo" 
              className="w-16 h-16 object-contain bg-white rounded-lg shadow-lg"
            />
            
            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold">Atlantic Hotel & Suites</h1>
              <p className="text-sm text-blue-200">Hotel Management System</p>
            </div>
          </div>

          {/* Right side - Sync Status, User Info, Logout */}
          <div className="flex items-center gap-4">
            <SyncStatus />
            
            <div className="text-right">
              <p className="font-semibold">{user.name}</p>
              <p className="text-xs text-blue-200">{user.role}</p>
            </div>
            
            {/* Logout Icon Button */}
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 p-3 rounded-lg transition flex items-center justify-center"
              title="Logout"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

{/* Main Content */}
      <main className="container mx-auto p-8">
        {user && user.role === 'Admin' ? (
          <AdminDashboard userName={user.name} />
        ) : (
          <>
            {/* Navigation - Show Back button when not in rooms view */}
            {receptionistView !== 'rooms' && (
              <div className="flex gap-4 mb-6 no-print">
                <button
                  onClick={() => {
                    setReceptionistView('rooms');
                    setShowReceipt(false); // Reset receipt view when going back
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Rooms
                </button>
              </div>
            )}

            {/* Content based on view */}
            {receptionistView === 'rooms' ? (
              <RoomDashboard 
                userLocation={userLocation} 
                onCreateReceipt={(roomNumber: string) => {
                  if (roomNumber) {
                    setRoomNumber(roomNumber); // Pre-fill the room number
                    console.log('🏨 Pre-filled room:', roomNumber);
                  }
                  setReceptionistView('create');
                }}
                onViewHistory={() => setReceptionistView('history')}
              />
            ) : receptionistView === 'create' ? (
              // Create Receipt View
              <>
                {!showReceipt ? (
                  // Form View
                  <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Generate New Receipt</h2>
                    
                    <form onSubmit={handleGenerateReceipt} className="space-y-6" autoComplete="off">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Serial Number
                          </label>
                          <input
                            type="text"
                            value={serialNumber}
                            readOnly
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Room Number *
                          </label>
                          <input
                            type="text"
                            value={roomNumber}
                            onChange={(e) => setRoomNumber(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g., 305"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Customer Name *
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="e.g., John Doe"
                          autoComplete="off"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount Received (₦) *
                        </label>
                        <input
                          type="text"
                          value={amountFigures}
                          onChange={handleAmountChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="e.g., 50,000"
                          autoComplete="off"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount in Words
                        </label>
                        <input
                          type="text"
                          value={amountWords}
                          readOnly
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                          placeholder="Auto-generated"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Mode of Payment *
                        </label>
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value as any)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          required
                        >
                          <option value="Cash">Cash</option>
                          <option value="Card">Card</option>
                          <option value="Transfer">Transfer</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition"
                      >
                        Generate Receipt
                      </button>
                    </form>
                  </div>
                ) : (
                  // Receipt View
                  <div>
                    {/* Action Buttons - Don't print */}
                    <div className="flex justify-center gap-4 mb-6 no-print">
                      <button
                        onClick={handlePrint}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                      >
                        🖨️ Print Receipt
                      </button>
                      <button
                        onClick={handleNewReceipt}
                        className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition"
                      >
                        ➕ New Receipt
                      </button>
                    </div>

                    {/* A4 Receipt */}
                    <div 
                      ref={receiptRef}
                      className="bg-white"
                      style={{
                        width: '100%',
                        padding: '10mm',
                      }}  
                    > 
                      {/* Header */}
                      <div className="flex justify-between items-start mb-8 border-b-2 border-gray-300 pb-6">
                        {/* Logo and Hotel Info */}
                        <div className="flex items-start gap-4">
                          <img 
                            src="/logo2.png" 
                            alt="Atlantic Hotel Logo" 
                            className="w-20 h-20 object-contain rounded"
                          />
                          <div>
                            <h1 className="text-xl font-bold text-gray-800">Atlantic Hotel & Suites</h1>
                            <p className="text-sm text-gray-600 mt-1">{getLocationAddress(userLocation)}</p>
                            <p className="text-sm text-gray-600">Victoria Island, Lagos, Nigeria</p>
                            <p className="text-sm text-gray-600">info@atlanticslagos.com</p>
                          </div>
                        </div>
                        {/* Serial Number */}
                        <div className="text-right">
                          <p className="text-sm text-gray-600 font-medium">Receipt No.</p>
                          <p className="text-xl font-bold text-blue-900">{currentReceipt?.serialNumber}</p>
                          <p className="text-sm text-gray-600 mt-2">{currentReceipt?.date}</p>
                        </div>
                      </div>

                      {/* Receipt Title */}
                      <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
                          Payment Receipt
                        </h2>
                      </div>

                      {/* Receipt Body */}
                      <div className="space-y-6 mb-4">
                        <div className="border-b border-gray-300 pb-2">
                          <p className="text-xs text-gray-600 font-medium mb-1">Customer Name</p>
                          <p className="text-xl font-semibold text-gray-800">{currentReceipt?.customerName}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="border-b border-gray-300 pb-2">
                            <p className="text-xs text-gray-600 font-medium mb-1">Room Number</p>
                            <p className="text-xl font-semibold text-gray-800">{currentReceipt?.roomNumber}</p>
                          </div>
                          <div className="border-b border-gray-300 pb-2">
                            <p className="text-xs text-gray-600 font-medium mb-1">Payment Mode</p>
                            <p className="text-xl font-semibold text-gray-800">{currentReceipt?.paymentMode}</p>
                          </div>
                        </div>

                        <div className="border-b border-gray-300 pb-2">
                          <p className="text-xs text-gray-600 font-medium mb-1">Amount Received (in words)</p>
                          <p className="text-sm font-semibold text-gray-800 uppercase">{currentReceipt?.amountWords}</p>
                        </div>

                        <div className="border-b border-gray-300 pb-2">
                          <p className="text-xs text-gray-600 font-medium mb-1">Amount Received (in figures)</p>
                          <p className="text-3xl font-bold text-blue-900">
                            ₦{currentReceipt?.amountFigures.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Signature Section */}
                      <div className=" pt-8 border-t-2 border-gray-300">
                        <div className="flex justify-between items-end">
                          <div className="w-64">
                            <p className="text-sm text-gray-600 font-medium mb-1">Receptionist</p>
                            <p className="text-lg font-semibold text-gray-800 mb-4">{currentReceipt?.receptionistName}</p>
                            <div className="border-t-2 border-gray-400 pt-1">
                              <p className="text-xs text-gray-500">Signature</p>
                            </div>
                          </div>

                          <div className="text-right text-sm text-gray-500">
                            <p>Thank you for your patronage</p>
                            <p className="font-medium">Atlantic Hotel & Suites</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-4 text-center text-xs text-gray-500">
                        <p className="mt-1">For inquiries, please contact us at info@atlanticslagos.com</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
              ) : receptionistView === 'history' ? (
              <ReceiptHistory userLocation={userLocation} userName={user.name} />
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
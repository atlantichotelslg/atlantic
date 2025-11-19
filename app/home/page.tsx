'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService, User } from '@/lib/auth';
import { ReceiptService, Receipt, TAX_CONFIG, calculateTaxes } from '@/lib/receipts';
import SyncStatus from '../components/SyncStatus';
import AdminDashboard from '../components/AdminDashboard';
import RestaurantDashboard from '../components/RestaurantDashboard';
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
  // Multi-room booking state
  const [bookedRooms, setBookedRooms] = useState<Array<{
    roomNumber: string;
    dailyRate: number;
    numberOfDays: number;
    subtotal: number;
  }>>([]);
  const [currentRoomNumber, setCurrentRoomNumber] = useState('');
  const [currentDailyRate, setCurrentDailyRate] = useState('');
  const [currentNumberOfDays, setCurrentNumberOfDays] = useState(1);
  const [availableRooms, setAvailableRooms] = useState<string[]>([]);
  
  const [amountFigures, setAmountFigures] = useState('');
  const [amountWords, setAmountWords] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'Transfer' | 'BTC'>('Cash');
  const [companyName, setCompanyName] = useState('');
  const [checkInDate, setCheckInDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [includeTax, setIncludeTax] = useState(false);
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

  useEffect(() => {
    // Load available rooms when location is set and view is 'create'
    if (userLocation && receptionistView === 'create') {
      loadAvailableRooms();
    }
  }, [userLocation, receptionistView]);

  const loadAvailableRooms = async () => {
    try {
      const rooms = await RoomService.fetchRoomsFromCloud(userLocation);
      const available = rooms
        .filter(r => r.status === 'available' && !r.isManagerRoom)
        .map(r => r.number)
        .sort((a, b) => parseInt(a) - parseInt(b));
      
      setAvailableRooms(available);
      console.log(`📋 Found ${available.length} available rooms:`, available);
    } catch (error) {
      console.error('❌ Failed to load available rooms from cloud:', error);
      
      // Fallback to localStorage
      try {
        const rooms = RoomService.getRoomsByLocation(userLocation);
        const available = rooms
          .filter(r => r && r.status === 'available' && !r.isManagerRoom)
          .map(r => r.number)
          .sort((a, b) => parseInt(a) - parseInt(b));
        
        setAvailableRooms(available);
        console.log(`📋 Loaded ${available.length} rooms from localStorage:`, available);
      } catch (fallbackError) {
        console.error('❌ Failed to load from localStorage too:', fallbackError);
        setAvailableRooms([]);
      }
    }
  };


  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, ''); // Remove existing commas
    if (value === '' || /^\d+$/.test(value)) {
      // Format with commas
      const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      setAmountFigures(formatted);
    }
  };

  const calculateCheckOutDate = (checkIn: string, days: number): string => {
    const [day, month, year] = checkIn.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('en-GB');
  };


  const addRoom = () => {
    if (!currentRoomNumber) {
      alert('Please enter a room number');
      return;
    }
    
    const rate = parseFloat(currentDailyRate.replace(/,/g, ''));
    if (!rate || rate <= 0) {
      alert('Please enter a valid daily rate');
      return;
    }
    
    // Check if room already added
    if (bookedRooms.some(r => r.roomNumber === currentRoomNumber)) {
      alert(`Room ${currentRoomNumber} is already in this booking`);
      return;
    }
    
    const subtotal = rate * currentNumberOfDays;
    
    const newRoom = {
      roomNumber: currentRoomNumber,
      dailyRate: rate,
      numberOfDays: currentNumberOfDays,
      subtotal
    };
    
    const updatedRooms = [...bookedRooms, newRoom];
    setBookedRooms(updatedRooms);
    
    // Update total amount
    const total = updatedRooms.reduce((sum, r) => sum + r.subtotal, 0);
    setAmountFigures(total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));
    
    // Clear current room inputs
    setCurrentRoomNumber('');
    setCurrentDailyRate('');
    setCurrentNumberOfDays(1);
    
    console.log(`✅ Added Room ${currentRoomNumber} to booking`);
  };


  const removeRoom = (roomNumber: string) => {
    const updatedRooms = bookedRooms.filter(r => r.roomNumber !== roomNumber);
    setBookedRooms(updatedRooms);
    
    // Update total amount
    const total = updatedRooms.reduce((sum, r) => sum + r.subtotal, 0);
    setAmountFigures(total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  };

  const handleLogout = () => {
    AuthService.logout();
    router.push('/');
  };

  const handleGenerateReceipt = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate at least one room is added
    if (bookedRooms.length === 0) {
      alert('Please add at least one room to the booking');
      return;
    }

    const subtotal = parseFloat(amountFigures.replace(/,/g, ''));
    const taxes = includeTax ? calculateTaxes(subtotal) : null;

    const receipt: Receipt = {
      id: Date.now().toString(),
      serialNumber,
      customerName,
      roomNumber: bookedRooms.map(r => r.roomNumber).join(', '),
      amountFigures: taxes ? taxes.totalWithTax : subtotal,  // ← CHANGED: Include tax if enabled
      amountWords: ReceiptService.numberToWords(taxes ? taxes.totalWithTax : subtotal),  // ← CHANGED
      paymentMode,
      companyName: paymentMode === 'BTC' ? companyName : undefined,
      receptionistName: user?.name || '',
      location: userLocation,
      date: new Date().toLocaleDateString('en-GB'),
      timestamp: Date.now(),
      numberOfDays: bookedRooms[0]?.numberOfDays || 1,
      synced: false,
      dailyRate: bookedRooms.length === 1 ? bookedRooms[0].dailyRate : undefined,
      roomDetails: bookedRooms.map(room => ({
        roomNumber: room.roomNumber,
        numberOfDays: room.numberOfDays,
        dailyRate: room.dailyRate,
        subtotal: room.subtotal
      })),
      // ← ADD TAX FIELDS
      includeTax,
      vatAmount: taxes?.vatAmount,
      consumptionTaxAmount: taxes?.consumptionTaxAmount,
      totalWithTax: taxes?.totalWithTax,
    };

    ReceiptService.saveReceipt(receipt);
    setCurrentReceipt(receipt);
    setShowReceipt(true);
    
    // Mark ALL rooms as occupied after creating receipt
    if (bookedRooms.length > 0 && userLocation) {
      bookedRooms.forEach(room => {
        RoomService.updateRoomStatus(
          userLocation,
          room.roomNumber,
          'occupied',
          customerName,
          new Date().toLocaleDateString('en-GB'),
          ''
        );
        console.log('✅ Room', room.roomNumber, 'marked as occupied');
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNewReceipt = () => {
    setShowReceipt(false);
    setCustomerName('');
    setBookedRooms([]);
    setCurrentRoomNumber('');
    setCurrentDailyRate('');
    setCurrentNumberOfDays(1);
    setAmountFigures('');
    setAmountWords('');
    setPaymentMode('Cash');
    setCompanyName('');
    setCheckInDate(new Date().toLocaleDateString('en-GB'));
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
            <img 
              src="/logo.png" 
              alt="Atlantic Hotel Logo" 
              className="w-16 h-16 object-contain bg-white rounded-lg shadow-lg"
            />
            
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
        ) : user && user.role === 'Restaurant' ? (
          <RestaurantDashboard userName={user.name} />
        ) : (
          <>
            {/* Navigation - Show Back button when not in rooms view */}
            {receptionistView !== 'rooms' && (
              <div className="flex gap-4 mb-6 no-print">
                <button
                  onClick={() => {
                    setReceptionistView('rooms');
                    setShowReceipt(false);
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
                    setCurrentRoomNumber(roomNumber);
                    console.log('🏨 Pre-filled room:', roomNumber);
                  }
                  setReceptionistView('create');
                }}
                onViewHistory={() => setReceptionistView('history')}
              />
            ) : receptionistView === 'create' ? (
              <>
                {!showReceipt ? (
                  <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Generate New Receipt</h2>
                    
                    <form onSubmit={handleGenerateReceipt} className="space-y-6" autoComplete="off">
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

                      {/* Multi-Room Booking Section */}
                      <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                        <h3 className="text-lg font-bold text-blue-900 mb-4">Add Rooms to Booking</h3>
                        
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Room Number *
                            </label>
                            <select
                              value={currentRoomNumber}
                              onChange={(e) => setCurrentRoomNumber(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                              <option value="">Select Room...</option>
                              {availableRooms.map(roomNum => (
                                <option 
                                  key={roomNum} 
                                  value={roomNum}
                                  disabled={bookedRooms.some(r => r.roomNumber === roomNum)}
                                >
                                  Room {roomNum}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Daily Rate (₦) *
                            </label>
                            <input
                              type="text"
                              value={currentDailyRate}
                              onChange={(e) => {
                                const value = e.target.value.replace(/,/g, '');
                                if (value === '' || /^\d+$/.test(value)) {
                                  setCurrentDailyRate(value.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="e.g., 10,000"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Days *
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={currentNumberOfDays}
                              onChange={(e) => setCurrentNumberOfDays(parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="3"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={addRoom}
                          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                        >
                          ➕ Add Room to Booking
                        </button>

                        {/* Booked Rooms List */}
                        {bookedRooms.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-semibold text-blue-900">Rooms in this booking:</p>
                            {bookedRooms.map((room) => (
                              <div key={room.roomNumber} className="flex justify-between items-center bg-white p-3 rounded-lg border border-blue-300">
                                <div>
                                  <p className="font-semibold text-gray-800">Room {room.roomNumber}</p>
                                  <p className="text-xs text-gray-600">
                                    {room.numberOfDays} day{room.numberOfDays > 1 ? 's' : ''} @ ₦{room.dailyRate.toLocaleString()}/day
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <p className="font-bold text-blue-900">₦{room.subtotal.toLocaleString()}</p>
                                  <button
                                    type="button"
                                    onClick={() => removeRoom(room.roomNumber)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Date range display */}
                      {bookedRooms.length > 0 && checkInDate && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-900 font-semibold mb-1">
                            📅 Booking Summary
                          </p>
                          <p className="text-sm text-green-800">
                            <strong>Check-in:</strong> {checkInDate}
                          </p>
                          <p className="text-sm text-green-800">
                            <strong>Total Rooms:</strong> {bookedRooms.length}
                          </p>
                          <p className="text-sm text-green-800 mt-2">
                            <strong>Grand Total:</strong> <span className="font-bold text-green-900 text-lg">₦{amountFigures || '0'}</span>
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total Amount (₦) *
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
                          onChange={(e) => {
                            setPaymentMode(e.target.value as any);
                            // Clear company name if not BTC
                            if (e.target.value !== 'BTC') {
                              setCompanyName('');
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          required
                        >
                          <option value="Cash">Cash</option>
                          <option value="Card">Card</option>
                          <option value="Transfer">Transfer</option>
                          <option value="BTC">BTC (Bill to Company)</option>
                        </select>
                      </div>

                      {/* Include Tax Toggle */}
                      <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-semibold text-gray-700">
                              Include Tax (VAT + Consumption Tax)
                            </label>
                            <p className="text-xs text-gray-600 mt-1">
                              VAT: 7.5% • Lagos State Consumption Tax: 5% • Total: 12.5%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Tax will be shown on invoice only (VAT NO: {TAX_CONFIG.VAT_NUMBER})
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIncludeTax(!includeTax)}
                            className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${
                              includeTax ? 'bg-green-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-10 w-10 transform rounded-full bg-white transition-transform ${
                                includeTax ? 'translate-x-12' : 'translate-x-1'
                              }`}
                            />
                            <span className={`absolute text-xs font-bold ${
                              includeTax ? 'left-2 text-white' : 'right-2 text-gray-600'
                            }`}>
                              {includeTax ? 'YES' : 'NO'}
                            </span>
                          </button>
                        </div>

                        {/* Tax Breakdown Preview */}
                        {includeTax && bookedRooms.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-orange-300">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Tax Breakdown:</p>
                            <div className="space-y-1 text-xs text-gray-600">
                              <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span className="font-semibold">₦{amountFigures || '0'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>VAT (7.5%):</span>
                                <span className="font-semibold">₦{calculateTaxes(parseFloat(amountFigures.replace(/,/g, '')) || 0).vatAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Consumption Tax (5%):</span>
                                <span className="font-semibold">₦{calculateTaxes(parseFloat(amountFigures.replace(/,/g, '')) || 0).consumptionTaxAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-orange-300">
                                <span className="font-bold text-orange-900">Total with Tax:</span>
                                <span className="font-bold text-orange-900">₦{calculateTaxes(parseFloat(amountFigures.replace(/,/g, '')) || 0).totalWithTax.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Company Name - Show only when BTC is selected */}
                      {paymentMode === 'BTC' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Company Name *
                          </label>
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g., Shell Nigeria Ltd"
                            autoComplete="off"
                            required
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition"
                      >
                        Generate Receipt
                      </button>
                    </form>
                  </div>
                ) : (
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

                    {/* Receipt Success Message */}
                    <div className="max-w-md mx-auto bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center no-print">
                      <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">Receipt Generated!</h3>
                      <p className="text-gray-600 mb-4">
                        Receipt <span className="font-bold text-green-600">{currentReceipt?.serialNumber}</span> has been created successfully.
                      </p>
                      <p className="text-sm text-gray-500">
                        Click "Print Receipt" to print or "New Receipt" to create another.
                      </p>
                    </div>

                    {/* Hidden Receipt for Printing Only */}
                    {/* Hidden Receipt for Printing Only */}
<div 
  ref={receiptRef}
  className="bg-white print-only"
  style={{ 
    width: '800px',
    margin: '0',
    padding: '0',
    marginLeft: '-100px',
    marginTop: '-30px'
  }}  
>
                      {/* Copy 1 - Customer Copy */}
                      <div style={{ 
                        padding: '3mm 10mm', 
                        borderBottom: '2px dashed #999',
                        boxSizing: 'border-box'
                      }}>                   
                        <div className="text-right mb-2">
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded">CUSTOMER COPY</span>
                        </div>
                        
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4 border-b-2 border-gray-300 pb-3">
                          <div className="flex items-start gap-4">
                            <img 
                              src="/logo2.png" 
                              alt="Atlantic Hotel Logo" 
                              className="w-20 h-20 object-contain rounded"
                            />
                            <div>
                              <h1 className="text-lg font-bold text-gray-800">Atlantic Hotel & Suites</h1>
                              <p className="text-sm text-gray-600 mt-1">{getLocationAddress(userLocation)}</p>
                              <p className="text-sm text-gray-600">Victoria Island, Lagos, Nigeria</p>
                              <p className="text-sm text-gray-600">info@atlantichotelslagos.com</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600 font-medium">Receipt No.</p>
                            <p className="text-lg font-bold text-blue-900">{currentReceipt?.serialNumber}</p>
                            <p className="text-sm text-gray-600 mt-2">{currentReceipt?.date}</p>
                            <p className="text-sm font-bold text-gray-600">Payment Receipt</p>
                          </div>
                        </div>

                        {/* Receipt Body */}
                        <div className="space-y-3 mb-4">
                          <div className="border-b border-gray-300 pb-2">
                            <p className="text-xs text-gray-600 font-medium mb-1">Customer Name</p>
                            <p className="text-lg font-semibold text-gray-800">{currentReceipt?.customerName}</p>
                          </div>

                          {/* Room Numbers, Days, Payment Mode - All Horizontal */}
                          <div className="grid grid-cols-3 gap-4">
                            <div className="border-b border-gray-300 pb-2">
                              <p className="text-xs text-gray-600 font-medium mb-1">Room Numbers</p>
                              <p className="text-lg font-semibold text-gray-800">
                                {bookedRooms.map(r => r.roomNumber).join(', ')}
                              </p>
                            </div>
                            <div className="border-b border-gray-300 pb-2">
                              <p className="text-xs text-gray-600 font-medium mb-1">Number of Days</p>
                              <p className="text-lg font-semibold text-gray-800">
                                {bookedRooms[0]?.numberOfDays || 1} day{(bookedRooms[0]?.numberOfDays || 1) > 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="border-b border-gray-300 pb-2">
                              <p className="text-xs text-gray-600 font-medium mb-1">Payment Mode</p>
                              <p className="text-lg font-semibold text-gray-800">
                                {currentReceipt?.paymentMode}-
                                {currentReceipt?.companyName && (
                                  <span className="text-sm text-gray-600 mt-1">({currentReceipt.companyName})</span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Booking Period & Amount in Figures - Horizontal */}
                          <div className="grid grid-cols-2 gap-4">
                            {bookedRooms.length > 0 && checkInDate && (
                              <div className="border-b border-gray-300 pb-2">
                                <p className="text-xs text-gray-600 font-medium mb-1">Booking Period</p>
                                <p className="text-sm font-semibold text-gray-800">
                                  {checkInDate} to {calculateCheckOutDate(checkInDate, bookedRooms[0]?.numberOfDays || 1)}
                                  {bookedRooms.length === 1 && bookedRooms[0]?.dailyRate && (
                                    <span className="text-xs text-gray-600 block mt-1">
                                      (@ ₦{bookedRooms[0].dailyRate.toLocaleString()}/day)
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}

                            <div className="border-b border-gray-300 pb-2">
                              <p className="text-xs text-gray-600 font-medium mb-1">Amount Received (in figures)</p>
                              <p className="text-2xl font-bold text-blue-900">
                                ₦{currentReceipt?.amountFigures.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>

                          <div className="border-b border-gray-300 pb-2">
                            <p className="text-xs text-gray-600 font-medium mb-1">Amount Received (in words)</p>
                            <p className="text-sm font-semibold text-gray-800 uppercase">{currentReceipt?.amountWords}</p>
                          </div>
                        </div>

                        {/* Signature Section */}
                        <div className="pt-4 border-gray-300">
                          <div className="flex justify-between items-end">
                            <div className="w-64">
                              <p className="text-sm text-gray-600 font-medium mb-1">Receptionist</p>
                              {/* <p className="text-lg font-semibold text-gray-800 mb-4">{currentReceipt?.receptionistName}</p> */}
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
                          <p className="mt-1">For inquiries, please contact us at info@atlantichotelslagos.com</p>
                        </div>
                      </div>
                      {/* END Copy 1 */}

                      {/* Copy 2 - Office Copy */}
                      <div style={{ 
                        padding: '3mm 10mm'
                      }}>
                        <div className="text-right mb-2">
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded">OFFICE COPY</span>
                        </div>

                        {/* Header */}
                        <div className="flex justify-between items-start mb-4 border-b-2 border-gray-300 pb-3">
                          <div className="flex items-start gap-4">
                            <img 
                              src="/logo2.png" 
                              alt="Atlantic Hotel Logo" 
                              className="w-20 h-20 object-contain rounded"
                            />
                            <div>
                              <h1 className="text-lg font-bold text-gray-800">Atlantic Hotel & Suites</h1>
                              <p className="text-sm text-gray-600 mt-1">{getLocationAddress(userLocation)}</p>
                              <p className="text-sm text-gray-600">Victoria Island, Lagos, Nigeria</p>
                              <p className="text-sm text-gray-600">info@atlantichotelslagos.com</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600 font-medium">Receipt No.</p>
                            <p className="text-lg font-bold text-blue-900">{currentReceipt?.serialNumber}</p>
                            <p className="text-sm text-gray-600 mt-2">{currentReceipt?.date}</p>
                            <p className="text-sm font-bold text-gray-600">Payment Receipt</p>
                          </div>
                        </div>

                        {/* Receipt Body */}
                        <div className="space-y-3 mb-4">
                          <div className="border-b border-gray-300 pb-2">
                            <p className="text-xs text-gray-600 font-medium mb-1">Customer Name</p>
                            <p className="text-lg font-semibold text-gray-800">{currentReceipt?.customerName}</p>
                          </div>

                          {/* Room Numbers, Days, Payment Mode - All Horizontal */}
                          <div className="grid grid-cols-3 gap-4">
                            <div className="border-b border-gray-300 pb-2">
                              <p className="text-xs text-gray-600 font-medium mb-1">Room Numbers</p>
                              <p className="text-lg font-semibold text-gray-800">
                                {bookedRooms.map(r => r.roomNumber).join(', ')}
                              </p>
                            </div>
                            <div className="border-b border-gray-300 pb-2">
                              <p className="text-xs text-gray-600 font-medium mb-1">Number of Days</p>
                              <p className="text-lg font-semibold text-gray-800">
                                {bookedRooms[0]?.numberOfDays || 1} day{(bookedRooms[0]?.numberOfDays || 1) > 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="border-b border-gray-300 pb-2">
                              <p className="text-xs text-gray-600 font-medium mb-1">Payment Mode</p>
                              <p className="text-lg font-semibold text-gray-800">
                                {currentReceipt?.paymentMode}-
                                {currentReceipt?.companyName && (
                                  <span className="text-sm text-gray-600 mt-1">({currentReceipt.companyName})</span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Booking Period & Amount in Figures - Horizontal */}
                          <div className="grid grid-cols-2 gap-4">
                            {bookedRooms.length > 0 && checkInDate && (
                              <div className="border-b border-gray-300 pb-2">
                                <p className="text-xs text-gray-600 font-medium mb-1">Booking Period</p>
                                <p className="text-sm font-semibold text-gray-800">
                                  {checkInDate} to {calculateCheckOutDate(checkInDate, bookedRooms[0]?.numberOfDays || 1)}
                                  {bookedRooms.length === 1 && bookedRooms[0]?.dailyRate && (
                                    <span className="text-xs text-gray-600 block mt-1">
                                      (@ ₦{bookedRooms[0].dailyRate.toLocaleString()}/day)
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}

                            <div className="border-b border-gray-300 pb-2">
                              <p className="text-xs text-gray-600 font-medium mb-1">Amount Received (in figures)</p>
                              <p className="text-2xl font-bold text-blue-900">
                                ₦{currentReceipt?.amountFigures.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>

                          <div className="border-b border-gray-300 pb-2">
                            <p className="text-xs text-gray-600 font-medium mb-1">Amount Received (in words)</p>
                            <p className="text-sm font-semibold text-gray-800 uppercase">{currentReceipt?.amountWords}</p>
                          </div>
                        </div>

                        {/* Signature Section */}
                        <div className="pt-2 border-gray-300">
                          <div className="flex justify-between items-end">
                            <div className="w-64">
                              <p className="text-sm text-gray-600 font-medium mb-1">Receptionist</p>
                              {/* <p className="text-lg font-semibold text-gray-800 mb-4">{currentReceipt?.receptionistName}</p> */}
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
                      </div>
                      {/* END Copy 2 */}
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
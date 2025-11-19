'use client';

import { useState, useEffect, useRef } from 'react';
import { MenuService, MenuItem, Bill, BillItem } from '@/lib/menu';
import { TAX_CONFIG, calculateTaxes } from '@/lib/receipts';
import BillHistory from './BillHistory';
import { RoomService, Room } from '@/lib/rooms';

interface RestaurantDashboardProps {
  userName: string;
}

export default function RestaurantDashboard({ userName }: RestaurantDashboardProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<BillItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [showBill, setShowBill] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomLocation, setRoomLocation] = useState('');
  const [currentBill, setCurrentBill] = useState<Bill | null>(null);
  const billRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'billing' | 'history'>('billing');
  const [occupiedRooms, setOccupiedRooms] = useState<Room[]>([]);
  const [selectedRoomData, setSelectedRoomData] = useState<Room | null>(null);
  const [includeTax, setIncludeTax] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
      loadMenuItems();
  }, []);

  useEffect(() => {
    if (roomLocation) {
      loadOccupiedRooms(roomLocation);
    } else {
      setOccupiedRooms([]);
      setSelectedRoomData(null);
    }
  }, [roomLocation]);

  const loadOccupiedRooms = async (location: string) => {
    try {
      console.log(`🔍 Loading occupied rooms from database for: ${location}`);
      
      // Fetch from cloud/database
      const rooms = await RoomService.fetchRoomsFromCloud(location);
      console.log(`📊 Fetched ${rooms.length} total rooms from database`);
      
      // Filter to occupied rooms with guest names (case-insensitive)
      const occupied = rooms.filter(r => {
        const isOccupied = r.status?.toLowerCase() === 'occupied';
        const hasGuest = r.guestName && r.guestName.trim() !== '';
        
        if (isOccupied && !hasGuest) {
          console.warn(`⚠️ Room ${r.number} is occupied but has no guest name`);
        }
        
        return isOccupied && hasGuest;
      });
      
      console.log(`✅ Found ${occupied.length} occupied rooms with guests:`, 
        occupied.map(r => `Room ${r.number} - ${r.guestName}`)
      );
      
      setOccupiedRooms(occupied);
      
      if (occupied.length === 0) {
        console.warn(`⚠️ No occupied rooms found at ${location}`);
      }
      
    } catch (error) {
      console.error('❌ Error loading occupied rooms from database:', error);
      setOccupiedRooms([]);
    }
  };

  const loadMenuItems = async () => {
      // Show loading state
      const items = await MenuService.initializeMenuItems();
      if (items) {
          setMenuItems(items);
      } else {
          // Load from cache
          const cached = MenuService.getAvailableMenuItems();
          setMenuItems(cached);
      }
  };

  const categories = ['All', 'Drinks', 'Food', 'Snacks'];

  const filteredItems = menuItems.filter(item => {
    // Filter by category
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    
    // Filter by search query
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const addToCart = (menuItem: MenuItem) => {
    const existingItem = cart.find(item => item.menuItemId === menuItem.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.menuItemId === menuItem.id
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.pricePerUnit }
          : item
      ));
    } else {
      const newItem: BillItem = {
        id: Date.now().toString(),
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: 1,
        pricePerUnit: menuItem.price,
        subtotal: menuItem.price
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (itemId: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQuantity, subtotal: newQuantity * item.pricePerUnit };
      }
      return item;
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleGenerateBill = () => {
    if (cart.length === 0) {
      alert('Please add items to the cart first!');
      return;
    }

    const subtotal = calculateTotal();
    const taxes = includeTax ? calculateTaxes(subtotal) : null;

    const bill: Bill = {
      id: Date.now().toString(),
      billNumber: MenuService.generateBillNumber(),
      customerName: customerName || undefined,
      roomNumber: roomNumber || undefined,
      roomLocation: roomLocation || undefined,
      guestName: selectedRoomData?.guestName,
      items: cart,
      total: taxes ? taxes.totalWithTax : subtotal,
      date: new Date().toLocaleDateString('en-GB'),
      timestamp: Date.now(),
      staffName: userName,
      synced: false,
      includeTax,
      subtotal: taxes ? subtotal : undefined,
      vatAmount: taxes?.vatAmount,
      consumptionTaxAmount: taxes?.consumptionTaxAmount,
      totalWithTax: taxes?.totalWithTax,
    };

    MenuService.saveBill(bill);
    setCurrentBill(bill);
    setShowBill(true);
  };

  const handlePrint = () => {
    // Ensure proper formatting before print
    if (billRef.current) {
      billRef.current.style.pageBreakInside = 'avoid';
      billRef.current.style.pageBreakAfter = 'avoid';
      billRef.current.style.display = 'block';
    }
    
    // Small delay to ensure styles are applied
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleNewBill = () => {
    setShowBill(false);
    setCart([]);
    setCustomerName('');
    setRoomNumber('');
    setRoomLocation('');
    setSelectedRoomData(null);
    setCurrentBill(null);
  };

  return (
  <div>
    {/* Navigation Tabs */}
    <div className="flex gap-4 mb-6 no-print">
      <button
        onClick={() => setView('billing')}
        className={`px-6 py-3 rounded-lg font-semibold transition ${
          view === 'billing'
            ? 'bg-orange-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        📝 New Bill
      </button>
      <button
        onClick={() => setView('history')}
        className={`px-6 py-3 rounded-lg font-semibold transition ${
          view === 'history'
            ? 'bg-orange-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        📋 Bill History
      </button>
    </div>

    {view === 'history' ? (
      <BillHistory userName={userName} onBack={() => setView('billing')} />
    ) : (
    <div>
      {!showBill ? (
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Menu Items */}
          <div className="col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Menu</h2>
              
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search menu items..."
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  <svg 
                    className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Category Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      selectedCategory === category
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Menu Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <div className="col-span-3 text-center py-8">
                    <p className="text-gray-500 text-lg">No items found</p>
                    <p className="text-gray-400 text-sm mt-2">
                      {searchQuery ? `No results for "${searchQuery}"` : 'No items in this category'}
                    </p>
                  </div>
                ) : (
                  filteredItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg hover:shadow-md transition text-left"
                    >
                      <h3 className="font-bold text-gray-800 mb-1">{item.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{item.category}</p>
                      <p className="text-lg font-bold text-orange-600">₦{item.price.toLocaleString()}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Cart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Current Order</h2>

            {/* Customer Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name (Optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Enter name"
              />
            </div>

            {/* Room Location & Number */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link to Room (Optional)
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Location Dropdown */}
                <select
                  value={roomLocation}
                  onChange={(e) => {
                    setRoomLocation(e.target.value);
                    setRoomNumber('');
                    setSelectedRoomData(null);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="">No Room</option>
                  <option value="musa-yaradua">Musa Yar'Adua</option>
                  <option value="adeleke-adedoyin">Adeleke Adedoyin</option>
                </select>

                {/* Occupied Rooms Dropdown */}
                <select
                  value={roomNumber}
                  onChange={(e) => {
                    const roomNum = e.target.value;
                    setRoomNumber(roomNum);
                    
                    // Find and store the selected room data
                    const room = occupiedRooms.find(r => r.number === roomNum);
                    setSelectedRoomData(room || null);
                  }}
                  disabled={!roomLocation}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!roomLocation 
                      ? 'Select location first'
                      : occupiedRooms.length === 0 
                        ? 'No occupied rooms' 
                        : 'Select room...'
                    }
                  </option>
                  {occupiedRooms.map(room => (
                    <option key={room.number} value={room.number}>
                      Room {room.number} - {room.guestName}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Show selected guest info */}
              {selectedRoomData && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Guest:</strong> {selectedRoomData.guestName}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Check-in: {selectedRoomData.checkIn}
                  </p>
                </div>
              )}
            </div>


            {/* Cart Items */}
            <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No items added</p>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-800">{item.name}</h4>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="bg-orange-200 hover:bg-orange-300 w-6 h-6 rounded flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="bg-orange-200 hover:bg-orange-300 w-6 h-6 rounded flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                      <p className="font-bold text-orange-600">₦{item.subtotal.toLocaleString()}</p>
                    </div>

                    <p className="text-xs text-gray-500 mt-1">₦{item.pricePerUnit.toLocaleString()} each</p>
                  </div>
                ))
              )}
            </div>

            {/* Tax Toggle */}
            <div className="mb-4 border-2 border-orange-200 rounded-lg p-3 bg-orange-50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700">
                  Include Tax (VAT + Consumption Tax)
                </label>
                <button
                  type="button"
                  onClick={() => setIncludeTax(!includeTax)}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                    includeTax ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      includeTax ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {includeTax && (
                <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-orange-300">
                  <div className="flex justify-between">
                    <span>VAT (7.5%):</span>
                    <span className="font-semibold">₦{calculateTaxes(calculateTotal()).vatAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Consumption Tax (5%):</span>
                    <span className="font-semibold">₦{calculateTaxes(calculateTotal()).consumptionTaxAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="border-t-2 border-gray-300 pt-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-800">
                  {includeTax ? 'Total (with tax):' : 'Total:'}
                </span>
                <span className="text-2xl font-bold text-orange-600">
                  ₦{(includeTax ? calculateTaxes(calculateTotal()).totalWithTax : calculateTotal()).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Generate Bill Button */}
            <button
              onClick={handleGenerateBill}
              disabled={cart.length === 0}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition"
            >
              Generate Bill
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mb-6 no-print">
            <button
              onClick={handlePrint}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              🖨️ Print Bill
            </button>
            <button
              onClick={handleNewBill}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              ➕ New Bill
            </button>
          </div>

          {/* Success Message */}
          <div className="max-w-md mx-auto bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center mb-6 no-print">
            <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Bill Generated!</h3>
            <p className="text-gray-600 mb-4">
              Bill <span className="font-bold text-green-600">{currentBill?.billNumber}</span> created successfully.
            </p>
          </div>

          {/* Thermal Receipt for Printing */}
          <div ref={billRef} className="print-only mx-auto bg-white"style={{
            pageBreakInside: 'avoid',
            pageBreakAfter: 'avoid',
            pageBreakBefore: 'avoid'
          }}>
            <div className="text-center mb-4">
              <h1 className="text-[56px] font-bold">Atlantic Hotel & Suites</h1>
              <p className="text-[32px] text-gray-600">Restaurant</p>
              <p className="text-[32px] text-gray-600">Victoria Island, Lagos</p>
            </div>

            <div className="mb-4 text-[32px]">
              <p><strong>Bill No:</strong> {currentBill?.billNumber}</p>
              <p><strong>Date:</strong> {currentBill?.date}</p>
              <p><strong>Time:</strong> {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
              {currentBill?.customerName && (
                <p><strong>Customer:</strong> {currentBill.customerName}</p>
              )}
              {currentBill?.roomNumber && (
                <p>
                  <strong>Room:</strong> {currentBill.roomNumber}
                  {currentBill.roomLocation && ` (${currentBill.roomLocation === 'musa-yaradua' ? 'Musa Yar\'Adua' : 'Adeleke Adedoyin'})`}
                </p>
              )}
              <p><strong>Staff:</strong> {currentBill?.staffName}</p>
            </div>

            <table className="w-full mb-4 text-[32px]">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-[32px] text-left py-2">Item</th>
                  <th className="text-[32px] text-center py-2">Qty</th>
                  <th className="text-[32px] text-right py-2">Price</th>
                  <th className="text-[32px] text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {currentBill?.items.map(item => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-2">{item.name}</td>
                    <td className="text-[32px] text-center py-2">{item.quantity}</td>
                    <td className="text-[32px] text-right py-2">₦{item.pricePerUnit.toLocaleString()}</td>
                    <td className="text-[32px] text-right py-2">₦{item.subtotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>


            {/* Tax Breakdown - Always Show if Tax is Included */}
            {currentBill?.includeTax && (
              <div className="mb-4 border-t-2 border-black pt-8">
                <table className="w-full text-[32px]">
                  <tbody>
                    <tr>
                      <td colSpan={3} className="py-1 text-gray-600">Subtotal</td>
                      <td className="text-right py-1 text-gray-600">₦{currentBill?.subtotal?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-1 text-gray-600">VAT (7.5%)</td>
                      <td className="text-right py-1 text-gray-600">₦{currentBill?.vatAmount?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-1 text-gray-600">Lagos Consumption Tax (5%)</td>
                      <td className="text-right py-1 text-gray-600">₦{currentBill?.consumptionTaxAmount?.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Total */}
            <div className="border-t-2 border-black pt-2 mb-4">
              <table className="w-full">
                <tfoot>
                  <tr className="font-bold text-[32px]">
                    <td colSpan={3} className="py-2">TOTAL</td>
                    <td className="text-right py-2">₦{currentBill?.total.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Guest Signature Section */}
            <div className="mt-6 border-t-2 border-gray-300 pt-4">
              <p className="text-[24px] font-semibold mb-3">Guest Signature:</p>
              <div className="border-b-2 border-gray-400 h-16 mb-2"></div>
              <p className="text-[20px] text-gray-500 italic">
                I acknowledge receipt of the above items and agree to the charges.
              </p>
            </div>

            <p className="text-center text-[28px] text-gray-600 mt-6">Thank you for your patronage!</p>
            
          </div>
        </div>
      )}
    </div>
    )}
  </div>
  );
}
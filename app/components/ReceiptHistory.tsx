'use client';

import { useState, useEffect, useRef } from 'react';
import { ReceiptService, Receipt } from '@/lib/receipts';
import { getLocationAddress } from '@/lib/locations';
import { Room } from '@/lib/rooms';
import RoomInvoiceGenerator from './RoomInvoiceGenerator';

interface ReceiptHistoryProps {
  userLocation: string;
  userName: string;
}

export default function ReceiptHistory({ userLocation, userName }: ReceiptHistoryProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'receipts' | 'invoices'>('receipts');
  const [guestInvoices, setGuestInvoices] = useState<{[key: string]: Receipt[]}>({});
  const [selectedGuestForInvoice, setSelectedGuestForInvoice] = useState<{name: string, room: string, receipts: Receipt[]} | null>(null);

  useEffect(() => {
    loadReceipts();
  }, [userLocation]);

  useEffect(() => {
    filterReceipts();
  }, [searchTerm, receipts]);

  const loadReceipts = () => {
    setLoading(true);
    // Get all receipts and filter by location
    const allReceipts = ReceiptService.getAllReceipts()
      .filter(receipt => receipt.location === userLocation)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    setReceipts(allReceipts);
    setFilteredReceipts(allReceipts);
    setLoading(false);
  };

  const handleFetchFromCloud = async () => {
    setSyncing(true);
    try {
      console.log('🌩️ Fetching all receipts from cloud...');
      const cloudReceipts = await ReceiptService.fetchFromCloud();
      
      if (cloudReceipts.length > 0) {
        console.log(`✅ Fetched ${cloudReceipts.length} receipts from cloud`);
        
        // Merge cloud receipts with local receipts
        const localReceipts = ReceiptService.getAllReceipts();
        const localReceiptIds = new Set(localReceipts.map(r => r.id));
        
        // Add new receipts from cloud that don't exist locally
        const newReceipts = cloudReceipts.filter(r => !localReceiptIds.has(r.id));
        
        if (newReceipts.length > 0) {
          console.log(`📥 Adding ${newReceipts.length} new receipts to local storage`);
          
          // Save merged receipts to localStorage
          const mergedReceipts = [...localReceipts, ...newReceipts];
          localStorage.setItem('atlantic_hotel_receipts', JSON.stringify(mergedReceipts));
          
          // Reload receipts
          loadReceipts();
          
          alert(`✅ Successfully synced ${newReceipts.length} new receipt(s) from cloud!`);
        } else {
          console.log('ℹ️ No new receipts to sync');
          alert('ℹ️ All receipts are up to date!');
        }
      } else {
        console.log('ℹ️ No receipts found in cloud');
        alert('ℹ️ No receipts found in cloud database');
      }
    } catch (error) {
      console.error('❌ Error fetching from cloud:', error);
      alert('❌ Failed to fetch receipts from cloud. Please check your connection.');
    } finally {
      setSyncing(false);
    }
  };

  const filterReceipts = () => {
    if (!searchTerm.trim()) {
      setFilteredReceipts(receipts);
      return;
    }

    const filtered = receipts.filter(receipt => 
      receipt.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredReceipts(filtered);
  };

  const groupReceiptsByGuest = () => {
    const grouped: {[key: string]: Receipt[]} = {};
    
    receipts.forEach(receipt => {
      // Handle both single rooms and multi-room bookings
      const rooms = receipt.roomNumber.split(',').map(r => r.trim());
      
      // For multi-room bookings, create entries for EACH individual room
      rooms.forEach(room => {
        const key = `${receipt.customerName.toLowerCase().trim()}_${room}`;
        
        if (!grouped[key]) {
          grouped[key] = [];
        }
        
        // Check if this receipt is already in the array (avoid duplicates)
        if (!grouped[key].some(r => r.id === receipt.id)) {
          grouped[key].push(receipt);
        }
      });
    });
    
    console.log('📊 Grouped invoices by individual rooms:', grouped);
    setGuestInvoices(grouped);
  };

  useEffect(() => {
    groupReceiptsByGuest();
  }, [receipts]);

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCloseReceipt = () => {
    setSelectedReceipt(null);
  };

  const handleViewInvoice = (customerName: string, roomNumber: string, receipts: Receipt[]) => {
    console.log('🏨 Opening invoice with receipts:', receipts);
    setSelectedGuestForInvoice({ 
      name: customerName, 
      room: roomNumber,
      receipts: receipts 
    });
  };

// Show full invoice for selected guest
  if (selectedGuestForInvoice) {
    const guestReceipts = selectedGuestForInvoice.receipts;
    
    console.log('📄 Rendering invoice with receipts:', guestReceipts);
    
    if (!guestReceipts || guestReceipts.length === 0) {
      return (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <p className="text-red-600">No receipts found for this guest.</p>
          <button
            onClick={() => setSelectedGuestForInvoice(null)}
            className="mt-4 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            ← Back to Invoices
          </button>
        </div>
      );
    }

    // Create a mock Room object for the invoice generator
    const mockRoom: Room = {
      id: `${userLocation}_${selectedGuestForInvoice.room}`,
      number: selectedGuestForInvoice.room,
      status: 'occupied',
      location: userLocation,
      guestName: selectedGuestForInvoice.name,
      checkIn: guestReceipts[0].date,
      checkOut: '',
      isManagerRoom: false,
      floor: 1,  
      lastUpdated: Date.now(),  
    };

    return <RoomInvoiceGenerator room={mockRoom} location={userLocation} onClose={() => setSelectedGuestForInvoice(null)} />;
  }

  if (selectedReceipt) {
    // Show full receipt for printing
    return (
      <div>
        {/* Action Buttons - Don't print */}
        <div className="flex justify-center gap-4 mb-6 no-print">
          <button
            onClick={handleCloseReceipt}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-semibold transition"
          >
            ← Back to History
          </button>
          <button
            onClick={handlePrint}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            🖨️ Print Receipt
          </button>
        </div>

        {/* Receipt - Same format as home page */}
        <div 
          ref={receiptRef}
          className="bg-white print-only"
          style={{ 
            width: '800px',
            margin: '0 auto',
            padding: '0',
            marginLeft: '-100px',
            marginTop: '-30px'
          }}  
        >
          {/* Customer Copy */}
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
                  <p className="text-sm text-gray-600 mt-1">{getLocationAddress(selectedReceipt.location)}</p>
                  <p className="text-sm text-gray-600">Victoria Island, Lagos, Nigeria</p>
                  <p className="text-sm text-gray-600">info@atlantichotelslagos.com</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 font-medium">Receipt No.</p>
                <p className="text-lg font-bold text-blue-900">{selectedReceipt.serialNumber}</p>
                <p className="text-sm text-gray-600 mt-2">{selectedReceipt.date}</p>
                <p className="text-sm font-bold text-gray-600">Payment Receipt</p>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="space-y-3 mb-4">
              <div className="border-b border-gray-300 pb-2">
                <p className="text-xs text-gray-600 font-medium mb-1">Customer Name</p>
                <p className="text-lg font-semibold text-gray-800">{selectedReceipt.customerName}</p>
              </div>

              {/* Room Numbers, Days, Payment Mode - All Horizontal */}
              <div className="grid grid-cols-3 gap-4">
                <div className="border-b border-gray-300 pb-2">
                  <p className="text-xs text-gray-600 font-medium mb-1">Room Numbers</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedReceipt.roomNumber}</p>
                </div>
                <div className="border-b border-gray-300 pb-2">
                  <p className="text-xs text-gray-600 font-medium mb-1">Number of Days</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {selectedReceipt.numberOfDays || 1} day{(selectedReceipt.numberOfDays || 1) > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="border-b border-gray-300 pb-2">
                  <p className="text-xs text-gray-600 font-medium mb-1">Payment Mode</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {selectedReceipt.paymentMode}
                    {selectedReceipt.companyName && (
                      <span className="text-sm text-gray-600 block mt-1">({selectedReceipt.companyName})</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Booking Period & Amount in Figures - Horizontal */}
              <div className="grid grid-cols-2 gap-4">
                {selectedReceipt.numberOfDays && (
                  <div className="border-b border-gray-300 pb-2">
                    <p className="text-xs text-gray-600 font-medium mb-1">Booking Period</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {selectedReceipt.date}
                      {selectedReceipt.dailyRate && (
                        <span className="text-xs text-gray-600 block mt-1">
                          (@ ₦{selectedReceipt.dailyRate.toLocaleString()}/day)
                        </span>
                      )}
                    </p>
                  </div>
                )}

                <div className="border-b border-gray-300 pb-2">
                  <p className="text-xs text-gray-600 font-medium mb-1">Amount Received (in figures)</p>
                  <p className="text-2xl font-bold text-blue-900">
                    ₦{selectedReceipt.amountFigures.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="border-b border-gray-300 pb-2">
                <p className="text-xs text-gray-600 font-medium mb-1">Amount Received (in words)</p>
                <p className="text-sm font-semibold text-gray-800 uppercase">{selectedReceipt.amountWords}</p>
              </div>
            </div>

            {/* Signature Section */}
            <div className="pt-4 border-gray-300">
              <div className="flex justify-between items-end">
                <div className="w-64">
                  <p className="text-sm text-gray-600 font-medium mb-1">Receptionist</p>
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
          {/* END Customer Copy */}

          {/* Office Copy */}
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
                  <p className="text-sm text-gray-600 mt-1">{getLocationAddress(selectedReceipt.location)}</p>
                  <p className="text-sm text-gray-600">Victoria Island, Lagos, Nigeria</p>
                  <p className="text-sm text-gray-600">info@atlantichotelslagos.com</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 font-medium">Receipt No.</p>
                <p className="text-lg font-bold text-blue-900">{selectedReceipt.serialNumber}</p>
                <p className="text-sm text-gray-600 mt-2">{selectedReceipt.date}</p>
                <p className="text-sm font-bold text-gray-600">Payment Receipt</p>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="space-y-3 mb-4">
              <div className="border-b border-gray-300 pb-2">
                <p className="text-xs text-gray-600 font-medium mb-1">Customer Name</p>
                <p className="text-lg font-semibold text-gray-800">{selectedReceipt.customerName}</p>
              </div>

              {/* Room Numbers, Days, Payment Mode - All Horizontal */}
              <div className="grid grid-cols-3 gap-4">
                <div className="border-b border-gray-300 pb-2">
                  <p className="text-xs text-gray-600 font-medium mb-1">Room Numbers</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedReceipt.roomNumber}</p>
                </div>
                <div className="border-b border-gray-300 pb-2">
                  <p className="text-xs text-gray-600 font-medium mb-1">Number of Days</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {selectedReceipt.numberOfDays || 1} day{(selectedReceipt.numberOfDays || 1) > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="border-b border-gray-300 pb-2">
                  <p className="text-xs text-gray-600 font-medium mb-1">Payment Mode</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {selectedReceipt.paymentMode}
                    {selectedReceipt.companyName && (
                      <span className="text-sm text-gray-600 block mt-1">({selectedReceipt.companyName})</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Booking Period & Amount in Figures - Horizontal */}
              <div className="grid grid-cols-2 gap-4">
                {selectedReceipt.numberOfDays && (
                  <div className="border-b border-gray-300 pb-2">
                    <p className="text-xs text-gray-600 font-medium mb-1">Booking Period</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {selectedReceipt.date}
                      {selectedReceipt.dailyRate && (
                        <span className="text-xs text-gray-600 block mt-1">
                          (@ ₦{selectedReceipt.dailyRate.toLocaleString()}/day)
                        </span>
                      )}
                    </p>
                  </div>
                )}

                <div className="border-b border-gray-300 pb-2">
                  <p className="text-xs text-gray-600 font-medium mb-1">Amount Received (in figures)</p>
                  <p className="text-2xl font-bold text-blue-900">
                    ₦{selectedReceipt.amountFigures.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="border-b border-gray-300 pb-2">
                <p className="text-xs text-gray-600 font-medium mb-1">Amount Received (in words)</p>
                <p className="text-sm font-semibold text-gray-800 uppercase">{selectedReceipt.amountWords}</p>
              </div>
            </div>

            {/* Signature Section */}
            <div className="pt-2 border-gray-300">
              <div className="flex justify-between items-end">
                <div className="w-64">
                  <p className="text-sm text-gray-600 font-medium mb-1">Receptionist</p>
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
          {/* END Office Copy */}
        </div>
      </div>
    );
  }

  // Show receipt list
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setViewMode('receipts')}
            className={`pb-3 px-4 font-semibold transition ${
              viewMode === 'receipts'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📄 Receipts ({filteredReceipts.length})
          </button>
          <button
            onClick={() => setViewMode('invoices')}
            className={`pb-3 px-4 font-semibold transition ${
              viewMode === 'invoices'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🧾 Invoices ({Object.keys(guestInvoices).length})
          </button>
        </div>

        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          {viewMode === 'receipts' ? 'Receipt History' : 'Invoice History'}
        </h2>
        <p className="text-gray-600 mb-6">
          {viewMode === 'receipts' 
            ? `Showing ${filteredReceipts.length} receipts from ${getLocationAddress(userLocation)}`
            : `Showing ${Object.keys(guestInvoices).length} guest invoices from ${getLocationAddress(userLocation)}`
          }
        </p>

        {/* Search and Refresh */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by serial number, customer, or room..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={handleFetchFromCloud}
            disabled={syncing}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Get all receipts and invoice
              </>
            )}
          </button>
          <button
            onClick={loadReceipts}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Loading receipts...</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600">No receipts found</p>
          </div>
        ) : viewMode === 'receipts' ? (
          <div className="space-y-4">
            {filteredReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Receipt No.</p>
                    <p className="text-2xl font-bold text-blue-900">{receipt.serialNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{receipt.date}</p>
                    {receipt.synced && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Synced
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-semibold text-gray-800">{receipt.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="text-xl font-bold text-green-600">
                      ₦{receipt.amountFigures.toLocaleString('en-NG')}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-600">
                      Room <span className="font-semibold text-gray-800">{receipt.roomNumber}</span>
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      receipt.paymentMode === 'Cash' ? 'bg-green-100 text-green-700' :
                      receipt.paymentMode === 'Card' ? 'bg-blue-100 text-blue-700' :
                      receipt.paymentMode === 'BTC' ? 'bg-purple-100 text-purple-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {receipt.paymentMode}
                    </span>
                  </div>

                  <button
                    onClick={() => handleViewReceipt(receipt)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                  >
                    View & Print
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Invoice View */
          <div className="space-y-4">
            {Object.entries(guestInvoices).map(([key, guestReceipts]) => {
              if (!guestReceipts || guestReceipts.length === 0) return null;
              
              const firstReceipt = guestReceipts[0];
              const totalAmount = guestReceipts.reduce((sum, r) => sum + r.amountFigures, 0);
              const totalDays = guestReceipts.reduce((sum, r) => sum + (r.numberOfDays || 1), 0);
              
              console.log(`📊 Invoice for ${firstReceipt.customerName}:`, {
                key,
                receipts: guestReceipts.length,
                totalAmount,
                totalDays
              });
              
              return (
                <div
                  key={key}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Guest Invoice</p>
                      <p className="text-2xl font-bold text-blue-900">{firstReceipt.customerName}</p>
                      <p className="text-sm text-gray-600 mt-1">Room {firstReceipt.roomNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Check-in: {firstReceipt.date}</p>
                      <p className="text-sm text-gray-600">Total Stay: {totalDays} day{totalDays > 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Receipts</p>
                      <p className="text-xl font-bold text-gray-800">{guestReceipts.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Days</p>
                      <p className="text-xl font-bold text-gray-800">{totalDays}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-xl font-bold text-green-600">
                        ₦{totalAmount.toLocaleString('en-NG')}
                      </p>
                    </div>
                  </div>

                  {/* Receipt Breakdown */}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Payment History:</p>
                    <div className="space-y-2">
                      {guestReceipts.map(receipt => (
                        <div key={receipt.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">
                            {receipt.serialNumber} • {receipt.date}
                          </span>
                          <span className="font-semibold text-gray-800">
                            ₦{receipt.amountFigures.toLocaleString('en-NG')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        const roomNumber = firstReceipt.roomNumber.split(',')[0].trim();
                        console.log('🏨 Opening invoice for:', firstReceipt.customerName, 'Room:', roomNumber, 'Receipts:', guestReceipts);
                        handleViewInvoice(firstReceipt.customerName, roomNumber, guestReceipts);
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View Full Invoice
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
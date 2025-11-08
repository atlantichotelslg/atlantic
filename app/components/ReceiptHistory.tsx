'use client';

import { useState, useEffect, useRef } from 'react';
import { ReceiptService, Receipt } from '@/lib/receipts';
import { getLocationAddress } from '@/lib/locations';

interface ReceiptHistoryProps {
  userLocation: string;
  userName: string;
}

export default function ReceiptHistory({ userLocation, userName }: ReceiptHistoryProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

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

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCloseReceipt = () => {
    setSelectedReceipt(null);
  };

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
                <p className="text-sm text-gray-600 mt-1">{getLocationAddress(selectedReceipt.location)}</p>
                <p className="text-sm text-gray-600">Victoria Island, Lagos, Nigeria</p>
                <p className="text-sm text-gray-600">info@atlanticslagos.com</p>
              </div>
            </div>
            {/* Serial Number */}
            <div className="text-right">
              <p className="text-sm text-gray-600 font-medium">Receipt No.</p>
              <p className="text-xl font-bold text-blue-900">{selectedReceipt.serialNumber}</p>
              <p className="text-sm text-gray-600 mt-2">{selectedReceipt.date}</p>
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
              <p className="text-xl font-semibold text-gray-800">{selectedReceipt.customerName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border-b border-gray-300 pb-2">
                <p className="text-xs text-gray-600 font-medium mb-1">Room Number</p>
                <p className="text-xl font-semibold text-gray-800">{selectedReceipt.roomNumber}</p>
              </div>
              <div className="border-b border-gray-300 pb-2">
                <p className="text-xs text-gray-600 font-medium mb-1">Payment Mode</p>
                <p className="text-xl font-semibold text-gray-800">{selectedReceipt.paymentMode}</p>
              </div>
            </div>

            <div className="border-b border-gray-300 pb-2">
              <p className="text-xs text-gray-600 font-medium mb-1">Amount Received (in words)</p>
              <p className="text-sm font-semibold text-gray-800 uppercase">{selectedReceipt.amountWords}</p>
            </div>

            <div className="border-b border-gray-300 pb-2">
              <p className="text-xs text-gray-600 font-medium mb-1">Amount Received (in figures)</p>
              <p className="text-3xl font-bold text-blue-900">
                ₦{selectedReceipt.amountFigures.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Signature Section */}
          <div className="pt-8 border-t-2 border-gray-300">
            <div className="flex justify-between items-end">
              <div className="w-64">
                <p className="text-sm text-gray-600 font-medium mb-1">Receptionist</p>
                <p className="text-lg font-semibold text-gray-800 mb-4">{selectedReceipt.receptionistName}</p>
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
    );
  }

  // Show receipt list
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Receipt History</h2>
        <p className="text-gray-600 mb-6">
          Showing {filteredReceipts.length} receipts from {getLocationAddress(userLocation)}
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
        ) : (
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
                      'bg-purple-100 text-purple-700'
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
        )}
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect, useRef } from 'react';
import { MenuService, Bill } from '@/lib/menu';

interface BillHistoryProps {
  userName: string;
  onBack: () => void;
}

export default function BillHistory({ userName, onBack }: BillHistoryProps) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const billRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = () => {
    const allBills = MenuService.getAllBills();
    // Sort by newest first
    const sorted = allBills.sort((a, b) => b.timestamp - a.timestamp);
    setBills(sorted);
  };

  const filteredBills = bills.filter(bill => 
    bill.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bill.customerName && bill.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    bill.staffName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrint = () => {
    if (selectedBill) {
      window.print();
    }
  };

  const handleClosePreview = () => {
    setSelectedBill(null);
  };

  return (
    <div>
      {!selectedBill ? (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Bill History</h2>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              ← Back
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by bill number, customer name, or staff..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          {/* Bills Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bill No.</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Room</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Items</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No bills found
                    </td>
                  </tr>
                ) : (
                  filteredBills.map(bill => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{bill.billNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{bill.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{bill.customerName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {bill.roomNumber ? (
                          <div className="flex flex-col gap-1">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold inline-block w-fit">
                              Room {bill.roomNumber}
                            </span>
                            {bill.roomLocation && (
                              <span className="text-xs text-gray-500">
                                {bill.roomLocation === 'musa-yaradua' ? 'Musa Yar\'Adua' : 'Adeleke Adedoyin'}
                              </span>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{bill.items.length} items</td>
                      <td className="px-4 py-3 text-sm font-bold text-orange-600 text-right">
                        ₦{bill.total.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedBill(bill)}
                          className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
              onClick={handleClosePreview}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              ← Back to History
            </button>
          </div>

          {/* Bill Preview Card */}
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8 no-print">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Bill Preview</h3>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-600">Bill Number</p>
                <p className="text-lg font-semibold text-gray-800">{selectedBill.billNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="text-lg font-semibold text-gray-800">{selectedBill.date}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="text-lg font-semibold text-gray-800">{selectedBill.customerName || 'Walk-in Customer'}</p>
              </div>
              {selectedBill.roomNumber && (
                <div>
                  <p className="text-sm text-gray-600">Room Number</p>
                  <p className="text-lg font-semibold text-blue-700">
                    Room {selectedBill.roomNumber}
                    {selectedBill.roomLocation && (
                      <span className="text-sm text-gray-600 ml-2">
                        ({selectedBill.roomLocation === 'musa-yaradua' ? 'Musa Yar\'Adua' : 'Adeleke Adedoyin'})
                      </span>
                    )}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Staff</p>
                <p className="text-lg font-semibold text-gray-800">{selectedBill.staffName}</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-semibold text-gray-800 mb-4">Items Ordered</h4>
              <div className="space-y-3">
                {selectedBill.items.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} × ₦{item.pricePerUnit.toLocaleString()}
                      </p>
                    </div>
                    <p className="font-bold text-orange-600">₦{item.subtotal.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t mt-6 pt-6">
              <div className="flex justify-between items-center">
                <p className="text-xl font-bold text-gray-800">Total Amount</p>
                <p className="text-3xl font-bold text-orange-600">₦{selectedBill.total.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Thermal Receipt for Printing */}
          <div ref={billRef} className="print-only mx-auto bg-white" style={{
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
              <p><strong>Bill No:</strong> {selectedBill.billNumber}</p>
              <p><strong>Date:</strong> {selectedBill.date}</p>
              <p><strong>Time:</strong> {new Date(selectedBill.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
              {selectedBill.customerName && (
                <p><strong>Customer:</strong> {selectedBill.customerName}</p>
              )}
              {selectedBill.roomNumber && (
                <p>
                  <strong>Room:</strong> {selectedBill.roomNumber}
                  {selectedBill.roomLocation && ` (${selectedBill.roomLocation === 'musa-yaradua' ? 'Musa Yar\'Adua' : 'Adeleke Adedoyin'})`}
                </p>
              )}
              <p><strong>Staff:</strong> {selectedBill.staffName}</p>
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
                {selectedBill.items.map(item => (
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
            {selectedBill.includeTax && (
              <div className="mb-4 border-t-2 border-black pt-8">
                <table className="w-full text-[32px]">
                  <tbody>
                    <tr>
                      <td colSpan={3} className="py-1 text-gray-600">Subtotal</td>
                      <td className="text-right py-1 text-gray-600">₦{selectedBill.subtotal?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-1 text-gray-600">VAT (7.5%)</td>
                      <td className="text-right py-1 text-gray-600">₦{selectedBill.vatAmount?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-1 text-gray-600">Lagos Consumption Tax (5%)</td>
                      <td className="text-right py-1 text-gray-600">₦{selectedBill.consumptionTaxAmount?.toLocaleString()}</td>
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
                    <td className="text-right py-2">₦{selectedBill.total.toLocaleString()}</td>
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
  );
}
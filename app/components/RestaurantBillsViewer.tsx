'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bill } from '@/lib/menu';

export default function RestaurantBillsViewer() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_bills')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const billsData: Bill[] = data.map(bill => ({
        id: bill.id,
        billNumber: bill.bill_number,
        customerName: bill.customer_name || undefined,
        roomNumber: bill.room_number || undefined,
        roomLocation: bill.room_location || undefined,
        guestName: bill.guest_name || undefined,
        items: JSON.parse(bill.items),
        total: Number(bill.total),
        date: bill.date,
        timestamp: bill.timestamp,
        staffName: bill.staff_name,
        synced: bill.synced,
        
        // ← ADD THESE TAX FIELDS
        includeTax: bill.include_tax || false,
        subtotal: bill.subtotal ? Number(bill.subtotal) : undefined,
        vatAmount: bill.vat_amount ? Number(bill.vat_amount) : undefined,
        consumptionTaxAmount: bill.consumption_tax_amount ? Number(bill.consumption_tax_amount) : undefined,
        totalWithTax: bill.total_with_tax ? Number(bill.total_with_tax) : undefined
      }));

      setBills(billsData);
    } catch (error) {
      console.error('Error loading bills:', error);
      alert('Failed to load restaurant bills');
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills.filter(bill => 
    bill.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bill.customerName && bill.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    bill.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bill.roomNumber && bill.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getTotalRevenue = () => {
    return bills.reduce((sum, bill) => sum + bill.total, 0);
  };

  const getTodayRevenue = () => {
    const today = new Date().toLocaleDateString('en-GB');
    return bills
      .filter(bill => bill.date === today)
      .reduce((sum, bill) => sum + bill.total, 0);
  };

  const getLocationName = (location?: string) => {
    if (!location) return '';
    return location === 'musa-yaradua' ? 'Musa Yar\'Adua' : 'Adeleke Adedoyin';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Restaurant Bills</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
          <p className="text-sm text-gray-600 mb-1">Total Bills</p>
          <p className="text-3xl font-bold text-blue-900">{bills.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
          <p className="text-sm text-gray-600 mb-1">Today's Revenue</p>
          <p className="text-3xl font-bold text-green-900">₦{getTodayRevenue().toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl">
          <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-orange-900">₦{getTotalRevenue().toLocaleString()}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by bill number, customer, staff, or room..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Staff</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Items</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filteredBills.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
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
                            {getLocationName(bill.roomLocation)}
                          </span>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{bill.staffName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{bill.items.length} items</td>
                  <td className="px-4 py-3 text-sm font-bold text-orange-600 text-right">
                    ₦{bill.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedBill(bill)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bill Details Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            {/* Action Buttons */}
            <div className="flex justify-between items-start mb-6 no-print">
              <h3 className="text-2xl font-bold text-gray-800">Bill Details</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition flex items-center gap-2"
                >
                  🖨️ Print Bill
                </button>
                <button
                  onClick={() => setSelectedBill(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Screen View */}
            <div className="no-print">
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Bill Number</p>
                    <p className="font-semibold text-gray-800">{selectedBill.billNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-semibold text-gray-800">{selectedBill.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-semibold text-gray-800">{selectedBill.customerName || 'N/A'}</p>
                  </div>
                  {selectedBill.roomNumber && (
                    <div>
                      <p className="text-sm text-gray-600">Room</p>
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold inline-block w-fit">
                          Room {selectedBill.roomNumber}
                        </span>
                        {selectedBill.roomLocation && (
                          <span className="text-xs text-gray-500">
                            {getLocationName(selectedBill.roomLocation)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Staff</p>
                    <p className="font-semibold text-gray-800">{selectedBill.staffName}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-800 mb-3">Items</h4>
                <div className="space-y-2">
                  {selectedBill.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
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

              <div className="border-t mt-4 pt-4">
                {selectedBill.includeTax && (
                  <div className="space-y-2 mb-4 pb-4 border-b">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal:</span>
                      <span>₦{selectedBill.subtotal?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>VAT (7.5%):</span>
                      <span>₦{selectedBill.vatAmount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Lagos Consumption Tax (5%):</span>
                      <span>₦{selectedBill.consumptionTaxAmount?.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold text-gray-800">Total</p>
                  <p className="text-2xl font-bold text-orange-600">₦{selectedBill.total.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Printable Bill */}
            <div className="print-only max-w-md mx-auto bg-white p-6">
              <div className="text-center mb-4">
                <h1 className="text-[56px] font-bold">Atlantic Hotel & Suites</h1>
                <p className="text-[32px] text-gray-600">Restaurant</p>
                <p className="text-[32px] text-gray-600">Victoria Island, Lagos</p>
              </div>

              <div className="mb-4 text-[32px]">
                <p><strong>Bill No:</strong> {selectedBill.billNumber}</p>
                <p><strong>Date:</strong> {selectedBill.date}</p>
                {selectedBill.customerName && (
                  <p><strong>Customer:</strong> {selectedBill.customerName}</p>
                )}
                {selectedBill.roomNumber && (
                  <p>
                    <strong>Room:</strong> {selectedBill.roomNumber}
                    {selectedBill.roomLocation && ` (${getLocationName(selectedBill.roomLocation)})`}
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
                {selectedBill.includeTax && (
                  <>
                    <tr className="border-t border-gray-200">
                      <td colSpan={3} className="py-1 text-[32px] text-gray-600">Subtotal</td>
                      <td className="text-right py-1 text-gray-600 text-[32px]">₦{selectedBill.subtotal?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-1 text-gray-600 text-[32px]">VAT (7.5%)</td>
                      <td className="text-right py-1 text-gray-600 text-[32px]">₦{selectedBill.vatAmount?.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-1 text-gray-600 text-[32px]">Consumption Tax (5%)</td>
                      <td className="text-right py-1 text-gray-600 text-[32px]">₦{selectedBill.consumptionTaxAmount?.toLocaleString()}</td>
                    </tr>
                  </>
                )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-boldtext-[32px] ">
                    <td colSpan={3} className="py-2">TOTAL</td>
                    <td className="text-right py-2">₦{selectedBill.total.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>

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
        </div>
      )}
    </div>
  );
}
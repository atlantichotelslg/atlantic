'use client';

import React, { useState, useEffect } from 'react';
import { Room } from '@/lib/rooms';
import { MenuService, Bill } from '@/lib/menu';
import { ReceiptService, Receipt } from '@/lib/receipts';
import { LOCATIONS } from '@/lib/locations';
import { TAX_CONFIG } from '@/lib/receipts';

interface RoomInvoiceGeneratorProps {
  room: Room;
  location: string;
  onClose: () => void;
}

export default function RoomInvoiceGenerator({ room, location, onClose }: RoomInvoiceGeneratorProps) {
  const [additionalCharges, setAdditionalCharges] = useState<Array<{description: string, amount: string}>>([
    { description: '', amount: '' }
  ]);
  const [roomBills, setRoomBills] = useState<Bill[]>([]);
  const [roomReceipts, setRoomReceipts] = useState<Receipt[]>([]);

  useEffect(() => {
    loadRoomBills();
    loadRoomReceipts();
  }, []);

  const loadRoomBills = () => {
    const allBills = MenuService.getAllBills();
    
    // Only get bills for this room, location, AND current guest name
    const filtered = allBills.filter(bill => {
      // Must match room number and location
      if (bill.roomNumber !== room.number || bill.roomLocation !== location) {
        return false;
      }
      
      // Must match current guest name (case insensitive)
      if (bill.guestName && room.guestName) {
        return bill.guestName.toLowerCase().trim() === room.guestName.toLowerCase().trim();
      }
      
      // If bill has no guest name (old bills from before this feature), don't include it
      return false;
    });
    
    setRoomBills(filtered);
    console.log(`Found ${filtered.length} restaurant bills for ${room.guestName} in room ${room.number}`);
  };

  const loadRoomReceipts = () => {
    const allReceipts = ReceiptService.getAllReceipts();
    
    // Only get receipts for this room, location, AND current guest name
    const filtered = allReceipts.filter(receipt => {
      // Check if this receipt includes the current room
      // Handle both single room "5" and multiple rooms "5, 7, 9"
      const receiptRooms = receipt.roomNumber.split(',').map(r => r.trim());
      const hasThisRoom = receiptRooms.includes(room.number);
      
      // Must match location
      if (receipt.location !== location) {
        return false;
      }
      
      // Must include this room number
      if (!hasThisRoom) {
        return false;
      }
      
      // Must match current guest name exactly (case insensitive)
      if (receipt.customerName && room.guestName) {
        return receipt.customerName.toLowerCase().trim() === room.guestName.toLowerCase().trim();
      }
      
      return false;
    });
    
    setRoomReceipts(filtered);
    console.log(`Found ${filtered.length} hotel receipts for ${room.guestName} in room ${room.number}`);
  };

  const calculateTotalDays = () => {
    return roomReceipts.reduce((sum, receipt) => sum + (receipt.numberOfDays || 1), 0);
  };

  const calculateRoomTotal = () => {
    return roomReceipts.reduce((sum, receipt) => sum + receipt.amountFigures, 0);
  };

  const calculateRestaurantTotal = () => {
    return roomBills.reduce((sum, bill) => sum + bill.total, 0);
  };

  const calculateAdditionalTotal = () => {
    return additionalCharges.reduce((sum, charge) => {
      const amount = parseFloat(charge.amount.replace(/,/g, '')) || 0;
      return sum + amount;
    }, 0);
  };

  const calculateGrandTotal = () => {
    return calculateRoomTotal() + calculateRestaurantTotal() + calculateAdditionalTotal();
  };

  const calculateSubtotal = () => {
    return calculateRoomTotal() + calculateRestaurantTotal() + calculateAdditionalTotal();
  };

  const calculateTaxAmounts = () => {
    // Check if any receipt has tax included
    const hasTaxReceipts = roomReceipts.some(r => r.includeTax);
    
    if (!hasTaxReceipts) {
      return { subtotal: calculateSubtotal(), vatAmount: 0, consumptionTaxAmount: 0, grandTotal: calculateGrandTotal() };
    }

    // Calculate tax from receipts that have tax
    const taxReceiptsTotal = roomReceipts
      .filter(r => r.includeTax)
      .reduce((sum, r) => {
        // Back-calculate subtotal from total
        const subtotal = r.totalWithTax ? r.totalWithTax / 1.125 : r.amountFigures;
        return sum + subtotal;
      }, 0);

    const nonTaxTotal = roomReceipts
      .filter(r => !r.includeTax)
      .reduce((sum, r) => sum + r.amountFigures, 0);

    const restaurantTotal = calculateRestaurantTotal();
    const additionalTotal = calculateAdditionalTotal();
    
    const subtotal = taxReceiptsTotal + nonTaxTotal + restaurantTotal + additionalTotal;
    const vatAmount = taxReceiptsTotal * TAX_CONFIG.VAT_RATE;
    const consumptionTaxAmount = taxReceiptsTotal * TAX_CONFIG.CONSUMPTION_TAX_RATE;
    const grandTotal = subtotal + vatAmount + consumptionTaxAmount;

    return { subtotal, vatAmount, consumptionTaxAmount, grandTotal };
  };

  const addChargeRow = () => {
    setAdditionalCharges([...additionalCharges, { description: '', amount: '' }]);
  };

  const removeChargeRow = (index: number) => {
    const updated = additionalCharges.filter((_, i) => i !== index);
    setAdditionalCharges(updated);
  };

  const updateCharge = (index: number, field: 'description' | 'amount', value: string) => {
    const updated = [...additionalCharges];
    if (field === 'amount') {
      const cleanValue = value.replace(/,/g, '');
      if (cleanValue === '' || /^\d+$/.test(cleanValue)) {
        updated[index][field] = cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }
    } else {
      updated[index][field] = value;
    }
    setAdditionalCharges(updated);
  };

  const handlePrint = () => {
    window.print();
  };

  const getLocationName = () => {
    const loc = LOCATIONS.find(l => l.id === location);
    return loc ? loc.name : location;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-5xl w-full my-8 max-h-[95vh] overflow-y-auto">
        {/* Header - Hidden when printing */}
        <div className="p-4 bg-white sticky top-0 shadow no-print flex justify-between items-center border-b-2">
          <h3 className="text-xl font-bold text-gray-800">Invoice Preview</h3>
          <div className="flex gap-4">
            <button 
              onClick={handlePrint} 
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
            >
              🖨️ Print Invoice
            </button>
            <button 
              onClick={onClose} 
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Invoice Content - This gets printed */}
        <div className="p-8 bg-gray-50 print:p-0">
          <div className="invoice-content bg-white mx-auto shadow-2xl print:shadow-none" style={{width: '210mm', padding: '15mm', pageBreakAfter: 'avoid', pageBreakInside: 'avoid'}}>
            {/* Header */}
            <div className="border-b-4 border-blue-600 pb-6 mb-6 flex justify-between">
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden shadow-lg">
                  <img src="/logo2.png" alt="Atlantic Hotel" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Atlantic Hotel & Suites</h1>
                  <p className="text-gray-600">{getLocationName()}</p>
                  <p className="text-gray-600">Victoria Island, Lagos</p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-blue-600 text-white px-4 py-2 rounded mb-2">INVOICE</div>
                <p className="text-sm">{new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            {/* Bill To */}
            <div className="bg-gray-50 p-4 rounded mb-6">
              <p className="text-xs text-gray-600 mb-2">BILL TO:</p>
              <p className="text-xl font-bold">{room.guestName}</p>
              <p className="text-sm text-gray-600">
                Room {room.number} • Check-in: {room.checkIn}
                {roomReceipts.length > 0 && calculateTotalDays() > 0 && (
                  <span className="ml-2">• Total Stay: {calculateTotalDays()} day{calculateTotalDays() > 1 ? 's' : ''}</span>
                )}
              </p>
            </div>

            {/* Items Table */}
            <table className="w-full mb-6">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="text-left py-3 px-3">Description</th>
                  <th className="text-center py-3 px-3">Date</th>
                  <th className="text-right py-3 px-3">Ref #</th>
                  <th className="text-right py-3 px-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {/* Room Receipts */}
                {roomReceipts.map(r => {
                  const hasRoomDetails = r.roomDetails && r.roomDetails.length > 0;
                  const isMultiRoom = hasRoomDetails && r.roomDetails && r.roomDetails.length > 1;
                  
                  // If we have detailed room breakdown, show each room separately
                  if (hasRoomDetails && isMultiRoom && r.roomDetails) {
                    return (
                      <React.Fragment key={r.id}>
                        {/* Header row for multi-room receipt */}
                        <tr className="bg-gray-50">
                          <td colSpan={4} className="py-2 px-3 text-sm">
                            <span className="font-bold">Receipt {r.serialNumber}</span>
                            <span className="text-xs text-gray-600 ml-2">({r.date})</span>
                            {r.isExtension && <span className="text-xs text-purple-600 ml-2">(Extension)</span>}
                          </td>
                        </tr>
                        {/* Individual room rows */}
                        {r.roomDetails.map((roomDetail, idx) => (
                          <tr key={`${r.id}-${idx}`} className="border-b text-sm">
                            <td className="py-2 px-3 pl-8">
                              <span className="font-semibold">Room {roomDetail.roomNumber}</span>
                              <br/>
                              <span className="text-xs text-gray-600">
                                {roomDetail.numberOfDays} day{roomDetail.numberOfDays > 1 ? 's' : ''} @ ₦{roomDetail.dailyRate.toLocaleString()}/day
                              </span>
                            </td>
                            <td className="text-center py-2 px-3">-</td>
                            <td className="text-right py-2 px-3">-</td>
                            <td className="text-right py-2 px-3 font-bold">₦{roomDetail.subtotal.toLocaleString()}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  }
                  
                  // Single room or old receipts without roomDetails
                  return (
                    <tr key={r.id} className="border-b text-sm">
                      <td className="py-2 px-3">
                        <span className="font-semibold">
                          Room Accommodation {hasRoomDetails && r.roomDetails?.[0] ? `(Room ${r.roomDetails[0].roomNumber})` : ''}
                          {r.isExtension && <span className="text-xs text-purple-600 ml-2">(Extension)</span>}
                        </span>
                        <br/>
                        <span className="text-xs text-gray-600">
                          {hasRoomDetails && r.roomDetails?.[0]
                            ? `${r.roomDetails[0].numberOfDays} day${r.roomDetails[0].numberOfDays > 1 ? 's' : ''} @ ₦${r.roomDetails[0].dailyRate.toLocaleString()}/day`
                            : r.numberOfDays && r.numberOfDays > 1 
                              ? `${r.numberOfDays} days @ ₦${r.dailyRate?.toLocaleString() || 0}/day`
                              : r.paymentMode
                          }
                        </span>
                      </td>
                      <td className="text-center py-2 px-3">{r.date}</td>
                      <td className="text-right py-2 px-3">{r.serialNumber}</td>
                      <td className="text-right py-2 px-3 font-bold">₦{r.amountFigures.toLocaleString()}</td>
                    </tr>
                  );
                })}
                
                {/* Restaurant Bills */}
                {roomBills.map(b => (
                  <tr key={b.id} className="border-b text-sm">
                    <td className="py-2 px-3">
                      <span className="font-semibold">Restaurant</span>
                      <br/>
                      <span className="text-xs text-gray-600">
                        {b.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                      </span>
                    </td>
                    <td className="text-center py-2 px-3">{b.date}</td>
                    <td className="text-right py-2 px-3">{b.billNumber}</td>
                    <td className="text-right py-2 px-3 font-bold">₦{b.total.toLocaleString()}</td>
                  </tr>
                ))}
                
                {/* Additional Charges */}
                {additionalCharges.filter(c => c.description && c.amount).map((c, i) => (
                  <tr key={i} className="border-b text-sm">
                    <td className="py-2 px-3 font-semibold">{c.description}</td>
                    <td className="text-center py-2 px-3">{new Date().toLocaleDateString('en-GB')}</td>
                    <td className="text-right py-2 px-3">-</td>
                    <td className="text-right py-2 px-3 font-bold">
                      ₦{parseFloat(c.amount.replace(/,/g, '')).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary Breakdown */}
            <div className="flex justify-end mb-6">
              <div className="w-96 space-y-2">
                {roomReceipts.length > 0 && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">Room Charges ({roomReceipts.length} receipt{roomReceipts.length > 1 ? 's' : ''})</span>
                    <span className="font-bold">₦{calculateRoomTotal().toLocaleString()}</span>
                  </div>
                )}
                
                {roomBills.length > 0 && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">Restaurant ({roomBills.length} bill{roomBills.length > 1 ? 's' : ''})</span>
                    <span className="font-bold">₦{calculateRestaurantTotal().toLocaleString()}</span>
                  </div>
                )}
                
                {calculateAdditionalTotal() > 0 && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-700">Additional Charges</span>
                    <span className="font-bold">₦{calculateAdditionalTotal().toLocaleString()}</span>
                  </div>
                )}

                {/* Tax Breakdown - Only show if tax is included */}
                {roomReceipts.some(r => r.includeTax) && (() => {
                  const { subtotal, vatAmount, consumptionTaxAmount, grandTotal } = calculateTaxAmounts();
                  return (
                    <>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-700">Subtotal</span>
                        <span className="font-bold">₦{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 text-sm">
                        <span className="text-gray-600">VAT (7.5%) - {TAX_CONFIG.VAT_NUMBER}</span>
                        <span className="font-semibold">₦{vatAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 text-sm border-b">
                        <span className="text-gray-600">Lagos Consumption Tax (5%)</span>
                        <span className="font-semibold">₦{consumptionTaxAmount.toLocaleString()}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-end mb-8">
              <div className="w-80 bg-blue-600 text-white p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">TOTAL</span>
                  <span className="text-3xl font-bold">
                    ₦{(roomReceipts.some(r => r.includeTax) 
                      ? calculateTaxAmounts().grandTotal 
                      : calculateGrandTotal()
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center border-t pt-6">
              <p className="font-semibold mb-2">Thank you for choosing Atlantic Hotel & Suites!</p>
              <p className="text-sm text-gray-600">info@atlantichotelslagos.com</p>
            </div>
          </div>
        </div>

        {/* Additional Charges Editor - Hidden when printing */}
        <div className="p-8 bg-white border-t-2 no-print">
          <h4 className="text-lg font-bold mb-4">Add Additional Charges (Optional)</h4>
          <div className="space-y-3">
            {additionalCharges.map((charge, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  value={charge.description}
                  onChange={(e) => updateCharge(idx, 'description', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                  placeholder="Description (e.g., Laundry)"
                />
                <input
                  value={charge.amount}
                  onChange={(e) => updateCharge(idx, 'amount', e.target.value)}
                  className="w-32 px-3 py-2 border rounded"
                  placeholder="Amount"
                />
                {additionalCharges.length > 1 && (
                  <button 
                    onClick={() => removeChargeRow(idx)} 
                    className="px-3 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button 
              onClick={addChargeRow} 
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              + Add Another Charge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
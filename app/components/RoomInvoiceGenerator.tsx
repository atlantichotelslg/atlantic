'use client';

import React, { useState, useEffect } from 'react';
import { Room } from '@/lib/rooms';
import { MenuService, Bill } from '@/lib/menu';
import { ReceiptService, Receipt } from '@/lib/receipts';
import { LOCATIONS } from '@/lib/locations';
import { TAX_CONFIG } from '@/lib/receipts';
import { BankAccountService, BankAccount } from '@/lib/bankAccounts';

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
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  useEffect(() => {
    loadRoomReceipts();
  }, []);

  useEffect(() => {
    // Load bills after receipts are loaded (so we know all room numbers)
    if (roomReceipts.length > 0) {
      loadRoomBills();
    }
  }, [roomReceipts]);


  const loadRoomBills = async () => {
    setIsLoadingBills(true);
    try {
      // Get all room numbers from the multi-room booking
      const roomNumbers = roomReceipts.length > 0 && roomReceipts[0].guestNames
        ? roomReceipts[0].guestNames.map(gn => gn.roomNumber)
        : [room.number];
      
      console.log(`🔍 Loading restaurant bills for rooms: ${roomNumbers.join(', ')}`);
      
      // Get the check-in date of the current guest
      const currentCheckInDate = roomReceipts.length > 0 ? roomReceipts[0].date : null;
      console.log(`📅 Current guest check-in date: ${currentCheckInDate}`);
      
      // Fetch bills for all rooms in the booking
      const allBillsPromises = roomNumbers.map(roomNum => 
        MenuService.fetchBillsFromCloud(roomNum, location, '')
      );
      
      const allBillsArrays = await Promise.all(allBillsPromises);
      const allBills = allBillsArrays.flat();
      
      // Filter to only include bills for rooms in this booking AND after check-in date
      const filtered = allBills.filter(bill => {
        if (bill.roomLocation !== location) {
          return false;
        }
        
        if (!bill.roomNumber || !roomNumbers.includes(bill.roomNumber)) {
          return false;
        }
        
        // IMPORTANT: Only include bills from the current guests
        // Match by guest name for the specific room
        if (roomReceipts.length > 0) {
          const guestNamesForBill = roomReceipts[0].guestNames || [];
          const matchingGuest = guestNamesForBill.find(gn => gn.roomNumber === bill.roomNumber);
          
          if (matchingGuest && bill.guestName) {
            const billGuestName = bill.guestName.toLowerCase().trim();
            const currentGuestName = matchingGuest.guestName.toLowerCase().trim();
            
            // Only include if guest names match
            if (billGuestName !== currentGuestName) {
              console.log(`❌ Skipping bill - guest mismatch: "${billGuestName}" vs "${currentGuestName}"`);
              return false;
            }
          }
        }
        
        return true;
      });
      
      setRoomBills(filtered);
      console.log(`✅ Found ${filtered.length} restaurant bills for current guests`);
    } catch (error) {
      console.error('❌ Error loading restaurant bills:', error);
      setRoomBills([]);
    } finally {
      setIsLoadingBills(false);
    }
  };

  const loadRoomReceipts = async () => {
    try {
      // FORCE load from database, not localStorage
      console.log('🔄 Loading receipts from DATABASE...');
      const cloudReceipts = await ReceiptService.fetchFromCloud();
      
      const filtered = cloudReceipts.filter(receipt => {
        // Filter out checked-out receipts
        if (receipt.checkedOut) {
          return false;
        }
        
        const receiptRooms = receipt.roomNumber.split(',').map(r => r.trim());
        const hasThisRoom = receiptRooms.includes(room.number);
        
        if (receipt.location !== location) {
          return false;
        }
        
        if (!hasThisRoom) {
          return false;
        }
        
        // For multi-room bookings
        if (receipt.guestNames && receipt.guestNames.length > 0) {
          const hasMatchingRoom = receipt.guestNames.some(gn => 
            gn.roomNumber === room.number && 
            room.guestName &&
            gn.guestName.toLowerCase().trim() === room.guestName.toLowerCase().trim()
          );
          return hasMatchingRoom;
        }
        
        // Single room receipt
        if (receipt.customerName && room.guestName) {
          return receipt.customerName.toLowerCase().trim() === room.guestName.toLowerCase().trim();
        }
        
        return false;
      });
      
      console.log('✅ Loaded from DATABASE:', filtered);
      console.log('Service charge values:', filtered.map(r => ({
        serial: r.serialNumber,
        includeServiceCharge: r.includeServiceCharge,
        serviceChargeAmount: r.serviceChargeAmount
      })));
      
      setRoomReceipts(filtered);
    } catch (error) {
      console.error('❌ Failed to load from database:', error);
      setRoomReceipts([]);
    }
  };

  const calculateTotalDays = () => {
    return roomReceipts.reduce((sum, receipt) => sum + (receipt.numberOfDays || 1), 0);
  };

  const calculateRoomSubtotal = () => {
    return roomReceipts.reduce((sum, receipt) => {
      // If receipt has roomDetails, sum up the subtotals from there
      if (receipt.roomDetails && receipt.roomDetails.length > 0) {
        const roomDetailsSubtotal = receipt.roomDetails.reduce((detailSum, detail) => {
          return detailSum + detail.subtotal;
        }, 0);
        return sum + roomDetailsSubtotal;
      }
      
      // Otherwise, calculate from amountFigures minus tax
      if (receipt.includeTax && receipt.vatAmount && receipt.consumptionTaxAmount) {
        return sum + (receipt.amountFigures - receipt.vatAmount - receipt.consumptionTaxAmount);
      }
      
      return sum + receipt.amountFigures;
    }, 0);
  };

  const calculateRestaurantTotal = () => {
    return roomBills.reduce((sum, bill) => {
      // Use total_with_tax if available and include_tax is true, otherwise use total
      if (bill.includeTax && bill.totalWithTax) {
        return sum + bill.totalWithTax;
      }
      return sum + bill.total;
    }, 0);
  };

  const calculateAdditionalTotal = () => {
    return additionalCharges.reduce((sum, charge) => {
      const amount = parseFloat(charge.amount.replace(/,/g, '')) || 0;
      return sum + amount;
    }, 0);
  };

  const calculateRoomTaxAmounts = () => {
    const hasTaxReceipts = roomReceipts.some(r => r.includeTax);
    
    if (!hasTaxReceipts) {
      return { 
        roomSubtotal: calculateRoomSubtotal(), 
        vatAmount: 0, 
        consumptionTaxAmount: 0, 
        totalTax: 0,
        roomTotalWithTax: calculateRoomSubtotal() 
      };
    }

    const roomSubtotal = calculateRoomSubtotal();
    
    const vatAmount = roomReceipts
      .filter(r => r.includeTax && r.vatAmount)
      .reduce((sum, r) => sum + (r.vatAmount || 0), 0);
    
    const consumptionTaxAmount = roomReceipts
      .filter(r => r.includeTax && r.consumptionTaxAmount)
      .reduce((sum, r) => sum + (r.consumptionTaxAmount || 0), 0);

    const totalTax = vatAmount + consumptionTaxAmount;
    const roomTotalWithTax = roomSubtotal + totalTax;

    return { roomSubtotal, vatAmount, consumptionTaxAmount, totalTax, roomTotalWithTax };
  };

  const calculateGrandTotal = () => {
    const roomSubtotal = calculateRoomSubtotal();
    const restaurantTotal = calculateRestaurantTotal();
    const additionalTotal = calculateAdditionalTotal();
    
    // Get exact values from database
    const roomVat = roomReceipts.reduce((sum, r) => {
      return sum + (r.vatAmount ? parseFloat(r.vatAmount.toString()) : 0);
    }, 0);
    
    const roomConsumption = roomReceipts.reduce((sum, r) => {
      return sum + (r.consumptionTaxAmount ? parseFloat(r.consumptionTaxAmount.toString()) : 0);
    }, 0);
    
    const roomServiceCharge = roomReceipts.reduce((sum, r) => {
      // If includeServiceCharge is false, return 0
      if (r.includeServiceCharge === false || !r.includeServiceCharge) {
        return sum + 0;
      }
      // If true, add the amount
      if (r.serviceChargeAmount) {
        return sum + parseFloat(r.serviceChargeAmount.toString());
      }
      return sum + 0;
    }, 0);
    
    return roomSubtotal + restaurantTotal + additionalTotal + 
          roomVat + roomConsumption + roomServiceCharge;
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

  const calculateCheckOutDate = (checkInDate: string, numberOfDays: number): string => {
    const [day, month, year] = checkInDate.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    
    date.setDate(date.getDate() + numberOfDays);
    
    const newDay = String(date.getDate()).padStart(2, '0');
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    const newYear = date.getFullYear();
    
    return `${newDay}/${newMonth}/${newYear}`;
  };

  return (
    <>
      {/* Print Styles - Force background colors to print */}
      <style jsx global>{`
        @media print {
          .print-bg-black {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            background-color: #000000 !important;
          }
          .print-bg-blue {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            background-color: #2563eb !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center z-50 p-2 overflow-y-auto print:overflow-visible">
        <div className="bg-white rounded-xl max-w-5xl w-full my-8 max-h-[95vh] overflow-y-auto print:overflow-visible print:max-h-none">
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
          <div className="p-2 bg-gray-50 print:p-0">
            <div className="invoice-content bg-white mx-auto shadow-2xl print:shadow-none" style={{width: '210mm', padding: '15mm', pageBreakAfter: 'avoid', pageBreakInside: 'avoid'}}>
              {/* Header */}
              <div className="border-b-4 border-blue-600 pb-2 mb-4 flex justify-between">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg">
                    <img src="/logo2.png" alt="Atlantic Hotel" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h1 className="text-[20px] font-bold">Atlantic Hotel & Suites</h1>
                    <p className="text-[12px] text-gray-600">{getLocationName()}</p>
                    <p className="text-[12px] text-gray-600">Victoria Island, Lagos</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] bg-blue-600 text-white px-4 py-2 rounded mb-2">INVOICE</div>
                  <p className="text-sm">{new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>

              

              {/* Bank Details Section - At Top */}
              <div className="mb-4">
                <h4 className="text-sm font-bold mb-3">BANK DETAILS</h4>
                <div className="grid grid-cols-3 gap-4 rounded">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm no-print"
                      placeholder="e.g., Access Bank"
                    />
                    <div className="hidden print:block text-sm">{bankDetails.bankName || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm no-print"
                      placeholder="e.g., 0123456789"
                    />
                    <div className="hidden print:block text-sm">{bankDetails.accountNumber || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={bankDetails.accountName}
                      onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm no-print"
                      placeholder="e.g., Atlantic Hotel & Suites Ltd"
                    />
                    <div className="hidden print:block text-sm">{bankDetails.accountName || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Guest Info - Simple Text */}
              <div className="mb-2">
                <p className="text-[14px]">
                  {(() => {
                    if (roomReceipts.length > 0) {
                      const sortedReceipts = [...roomReceipts].sort((a, b) => b.timestamp - a.timestamp);
                      const latestReceipt = sortedReceipts[0];
                      const paymentMode = latestReceipt.paymentMode || '';
                      const registrationNumber = latestReceipt.serialNumber || '';
                      const companyName = (paymentMode.toUpperCase() === 'BTC' && latestReceipt.companyName) ? latestReceipt.companyName : '';
                      
                      return (
                        <>
                          {paymentMode && <span className=""><span className="font-bold">Payment Mode:</span> {paymentMode}</span>}
                          {registrationNumber && <span className="ml-6"><span className="font-bold">Reg No:</span> {registrationNumber}</span>}
                          {companyName && <span className="ml-6"><span className="font-bold">Company:</span> {companyName}</span>}
                        </>
                      );
                    }
                    return null;
                  })()}
                </p>
              </div>

              {/* Items Table with Tax Column */}
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-blue-600 text-white text-[12px] print-bg-blue">
                    <th className="text-left py-1 px-3 border border-gray-300">Name of Guest</th>
                    <th className="text-center py-1 px-3 border border-gray-300">Check-in</th>
                    <th className="text-center py-1 px-3 border border-gray-300">Check-out</th>
                    <th className="text-center py-1 px-3 border border-gray-300">Days</th>
                    <th className="text-right py-1 px-3 border border-gray-300">Room Tariff</th>
                    <th className="text-right py-1 px-3 border border-gray-300 w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Room Receipts */}
                  {roomReceipts.map(r => {
                    const hasRoomDetails = r.roomDetails && r.roomDetails.length > 0;
                    const isMultiRoom = hasRoomDetails && r.roomDetails && r.roomDetails.length > 1;
                    
                    let displayAmount = r.amountFigures;
                    let taxAmount = 0;
                    
                    if (r.includeTax && r.vatAmount && r.consumptionTaxAmount) {
                      taxAmount = r.vatAmount + r.consumptionTaxAmount;
                      displayAmount = r.amountFigures - taxAmount;
                    }
                    
                    if (hasRoomDetails && isMultiRoom && r.roomDetails) {
                      return (
                        <React.Fragment key={r.id}>
                          {r.roomDetails.map((roomDetail, idx) => {
                            return (
                              <tr key={`${r.id}-${idx}`} className="border-b text-sm">
                                <td className="py-1 px-3 border border-gray-300">
                                  <span className="font-semibold">{roomDetail.guestName || room.guestName}</span>
                                  <br/>
                                  <span className="text-xs text-gray-600">
                                    Room {roomDetail.roomNumber}
                                    {r.isExtension && <span className="text-purple-600 ml-2">(Extension)</span>}
                                    <span className="text-gray-500 ml-2">- Receipt {r.serialNumber}</span>
                                  </span>
                                </td>
                                <td className="text-center py-1 px-3 text-xs border border-gray-300">{r.date}</td>
                                <td className="text-center py-1 px-3 text-xs border border-gray-300">
                                  {calculateCheckOutDate(r.date, roomDetail.numberOfDays)}
                                </td>
                                <td className="text-center py-1 px-3 text-xs border border-gray-300">
                                  {roomDetail.numberOfDays}
                                </td>
                                <td className="text-right py-1 px-3 text-xs border border-gray-300">
                                  ₦{roomDetail.dailyRate.toLocaleString()}
                                </td>
                                <td className="text-right py-1 px-3 font-bold border border-gray-300">
                                  ₦{roomDetail.subtotal.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    }
                    
                    return (
                      <tr key={r.id} className="border-b text-sm">
                        <td className="py-2 px-3 border border-gray-300">
                          <span className="font-semibold">
                            {hasRoomDetails && r.roomDetails?.[0] && r.roomDetails[0].guestName 
                              ? r.roomDetails[0].guestName 
                              : room.guestName}
                          </span>
                          <br/>
                          <span className="text-xs text-gray-600">
                            Room {hasRoomDetails && r.roomDetails?.[0] ? r.roomDetails[0].roomNumber : room.number}
                            {r.isExtension && <span className="text-purple-600 ml-2">(Extension)</span>}
                          </span>
                        </td>
                        <td className="text-center py-2 px-3 text-xs border border-gray-300">{r.date}</td>
                        <td className="text-center py-2 px-3 text-xs border border-gray-300">
                          {r.numberOfDays && r.numberOfDays > 0 
                            ? calculateCheckOutDate(r.date, r.numberOfDays)
                            : '-'
                          }
                        </td>
                        <td className="text-center py-2 px-3 text-xs border border-gray-300">
                          {hasRoomDetails && r.roomDetails?.[0]
                            ? r.roomDetails[0].numberOfDays
                            : r.numberOfDays || '-'
                          }
                        </td>
                        <td className="text-right py-2 px-3 text-xs border border-gray-300">
                          {hasRoomDetails && r.roomDetails?.[0]
                            ? `₦${r.roomDetails[0].dailyRate.toLocaleString()}`
                            : r.dailyRate 
                              ? `₦${r.dailyRate.toLocaleString()}`
                              : '-'
                          }
                        </td>
                        <td className="text-right py-2 px-3 font-bold border border-gray-300">
                          ₦{(() => {
                            if (r.includeTax && r.vatAmount && r.consumptionTaxAmount) {
                              return (r.amountFigures - r.vatAmount - r.consumptionTaxAmount).toLocaleString();
                            }
                            return r.amountFigures.toLocaleString();
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* Additional Charges */}
                  {additionalCharges.filter(c => c.description && c.amount).map((c, i) => (
                    <tr key={i} className="border-b text-sm">
                      <td className="py-2 px-3 border border-gray-300">
                        <span className="font-semibold">{c.description}</span>
                      </td>
                      <td className="text-center py-2 px-3 border border-gray-300">{new Date().toLocaleDateString('en-GB')}</td>
                      <td className="text-center py-2 px-3 border border-gray-300">-</td>
                      <td className="text-center py-2 px-3 border border-gray-300">-</td>
                      <td className="text-right py-2 px-3 border border-gray-300">-</td>
                      <td className="text-right py-2 px-3 font-bold border border-gray-300">
                        ₦{parseFloat(c.amount.replace(/,/g, '')).toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  {/* Empty Rows - Always Show 3 */}
                  <tr className="border-b text-sm">
                    <td className="py-1 px-3 border border-gray-300">&nbsp;</td>
                    <td className="text-center py-1 px-3 border border-gray-300">&nbsp;</td>
                    <td className="text-center py-1 px-3 border border-gray-300">&nbsp;</td>
                    <td className="text-right py-1 px-3 border border-gray-300">&nbsp;</td>
                    <td className="text-right py-1 px-3 border border-gray-300">&nbsp;</td>
                    <td className="text-right py-1 px-3 border border-gray-300">&nbsp;</td>
                  </tr>
                </tbody>
              </table>

              {/* Restaurant Table - Show Individual Bills */}
              <table className="w-full mb-3 border-collapse border border-gray-300">
                <tbody>
                  {roomBills.length > 0 ? (
                    roomBills.map((bill, index) => (
                      <tr key={bill.id} className="border-b text-sm">
                        <td className="py-2 px-4 border border-gray-300 text-[14px]">
                          Meals / Beverages Bills {index + 1}
                          <span className="text-xs text-gray-500 ml-2">({bill.date})</span>
                        </td>
                        <td className="text-right py-2 px-4 border border-gray-300 text-[14px] font-semibold w-28">
                          ₦{(bill.includeTax && bill.totalWithTax ? bill.totalWithTax : bill.total).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b text-sm">
                      <td className="py-2 px-4 border border-gray-300 text-[14px]">Meals / Beverages Bills</td>
                      <td className="text-right py-2 px-4 border border-gray-300 text-[14px] font-semibold w-28">₦0</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Summary Section */}
              <table className="w-full border-collapse border border-gray-300">
                <tbody>
                  <tr className="border-b">
                    <td className="px-4 border border-gray-300 text-[14px] font-bold">Sub Total</td>
                    <td className="text-right px-4 border border-gray-300 text-[14px] font-bold w-28">
                      ₦{(calculateRoomSubtotal() + calculateRestaurantTotal() + calculateAdditionalTotal()).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

            
              {/* Tax Summary Table - Always show, get exact values from database */}
              <div className="mb-4">
                <table className="w-full border-collapse border border-gray-300">
                  <tbody>
                    {(() => {
                      // Get exact values from database - NO calculations, just read what's stored
                      const roomVat = roomReceipts.reduce((sum, r) => {
                        return sum + (r.vatAmount ? parseFloat(r.vatAmount.toString()) : 0);
                      }, 0);
                      
                      const roomConsumption = roomReceipts.reduce((sum, r) => {
                        return sum + (r.consumptionTaxAmount ? parseFloat(r.consumptionTaxAmount.toString()) : 0);
                      }, 0);
                      
                      const roomServiceCharge = roomReceipts.reduce((sum, r) => {
                        // If includeServiceCharge is false, return 0
                        if (r.includeServiceCharge === false || !r.includeServiceCharge) {
                          return sum + 0;
                        }
                        // If true, add the amount
                        if (r.serviceChargeAmount) {
                          return sum + parseFloat(r.serviceChargeAmount.toString());
                        }
                        return sum + 0;
                      }, 0);
                      
                      return (
                        <>
                          <tr className="border-b">
                            <td className="px-4 border border-gray-300 text-[14px]">7.5% Value Added Tax (VAT No. VIVI4002500868)</td>
                            <td className="text-right px-4 border border-gray-300 text-[14px] font-semibold w-28">
                              {Math.round(roomVat) > 0 ? `₦${Math.round(roomVat).toLocaleString()}` : ''}
                            </td>
                          </tr>
                          
                          <tr className="border-b">
                            <td className="px-4 border border-gray-300 text-[14px]">5% Lagos State Consumption Tax </td>
                            <td className="text-right px-4 border border-gray-300 text-[14px] font-semibold w-28">
                              {Math.round(roomConsumption) > 0 ? `₦${Math.round(roomConsumption).toLocaleString()}` : ''}
                            </td>
                          </tr>
                          
                          <tr className="border-b">
                            <td className="px-4 border border-gray-300 text-[14px]">10% Service Charge</td>
                            <td className="text-right px-4 border border-gray-300 text-[14px] font-semibold w-28">
                              {Math.round(roomServiceCharge) > 0 ? `₦${Math.round(roomServiceCharge).toLocaleString()}` : ''}
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Grand Total with print background */}
              <div className="flex justify-end mb-8">
                <div className="w-80 bg-blue-600 text-white p-4 rounded-xl print-bg-blue">
                  <div className="flex justify-between items-center">
                    <span className="text-[16px] font-bold">GRAND TOTAL</span>
                    <span className="text-[20px] font-bold">
                      ₦{calculateGrandTotal().toLocaleString()}
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
    </>
  );
}
// lib/receipts.ts - DEBUG VERSION
import { supabase, isOnline } from './supabase';

// Tax Configuration
export const TAX_CONFIG = {
  VAT_RATE: 0.075,                    // 7.5%
  CONSUMPTION_TAX_RATE: 0.05,         // 5%
  VAT_NUMBER: 'VIVI4002500868',
  TOTAL_TAX_RATE: 0.125,              // 7.5% + 5% = 12.5%
};

export const calculateTaxes = (subtotal: number) => {
  const vatAmount = subtotal * TAX_CONFIG.VAT_RATE;
  const consumptionTaxAmount = subtotal * TAX_CONFIG.CONSUMPTION_TAX_RATE;
  const totalWithTax = subtotal + vatAmount + consumptionTaxAmount;
  
  return {
    vatAmount: Math.round(vatAmount * 100) / 100,
    consumptionTaxAmount: Math.round(consumptionTaxAmount * 100) / 100,
    totalWithTax: Math.round(totalWithTax * 100) / 100,
  };
};

export interface Receipt {
  id: string;
  serialNumber: string;
  customerName: string;
  roomNumber: string;
  amountFigures: number;
  amountWords: string;
  paymentMode: 'Cash' | 'Card' | 'Transfer' | 'BTC';
  companyName?: string; 
  receptionistName: string;
  location: string;
  receptionistSignature?: string;
  date: string;
  timestamp: number;
  synced: boolean;
  
  // NEW FIELDS
  numberOfDays?: number;         // How many days paid for
  dailyRate?: number;            // Price per day
  roomDetails?: Array<{  // ← ADD THIS
    roomNumber: string;
    numberOfDays: number;
    dailyRate: number;
    subtotal: number;
  }>;
  isExtension?: boolean;         
  originalReceiptId?: string;   
  paymentForDates?: string;   
  includeTax?: boolean;              // ← ADD THIS
  vatAmount?: number;                // ← ADD THIS (7.5%)
  consumptionTaxAmount?: number;     // ← ADD THIS (5%)
  totalWithTax?: number;             // ← ADD THIS (subtotal + taxes)
}

export class ReceiptService {
  private static readonly STORAGE_KEY = 'atlantic_hotel_receipts';
  private static readonly COUNTER_KEY = 'atlantic_hotel_receipt_counter';
  private static readonly SYNC_QUEUE_KEY = 'atlantic_hotel_sync_queue';

  static initializeCounter() {
    if (typeof window === 'undefined') return;
    const counter = localStorage.getItem(this.COUNTER_KEY);
    if (!counter) {
      localStorage.setItem(this.COUNTER_KEY, '1000');
    }
  }

  static generateSerialNumber(): string {
    if (typeof window === 'undefined') return 'AH-1000';
    const counter = localStorage.getItem(this.COUNTER_KEY) || '1000';
    const nextNumber = parseInt(counter) + 1;
    localStorage.setItem(this.COUNTER_KEY, nextNumber.toString());
    return `AH-${nextNumber}`;
  }

  static numberToWords(num: number): string {
    if (num === 0) return 'Zero Naira Only';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) {
        const ten = Math.floor(n / 10);
        const one = n % 10;
        return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
      }
      const hundred = Math.floor(n / 100);
      const rest = n % 100;
      return ones[hundred] + ' Hundred' + (rest > 0 ? ' and ' + convertLessThanThousand(rest) : '');
    };
    
    if (num < 1000) {
      return convertLessThanThousand(num) + ' Naira Only';
    }
    if (num < 1000000) {
      const thousands = Math.floor(num / 1000);
      const rest = num % 1000;
      return convertLessThanThousand(thousands) + ' Thousand' + 
             (rest > 0 ? ' ' + convertLessThanThousand(rest) : '') + ' Naira Only';
    }
    const millions = Math.floor(num / 1000000);
    const rest = num % 1000000;
    let result = convertLessThanThousand(millions) + ' Million';
    if (rest >= 1000) {
      const thousands = Math.floor(rest / 1000);
      const remainder = rest % 1000;
      result += ' ' + convertLessThanThousand(thousands) + ' Thousand';
      if (remainder > 0) {
        result += ' ' + convertLessThanThousand(remainder);
      }
    } else if (rest > 0) {
      result += ' ' + convertLessThanThousand(rest);
    }
    return result + ' Naira Only';
  }

  // Save receipt locally and try to sync
  static async saveReceipt(receipt: Receipt) {
    console.log('💾 Saving receipt:', receipt.serialNumber);
    
    if (typeof window === 'undefined') {
      console.log('❌ Window is undefined');
      return;
    }
    
    // Save to localStorage first
    const receipts = this.getAllReceipts();
    const receiptWithSync = { ...receipt, synced: false };
    receipts.push(receiptWithSync);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(receipts));
    console.log('✅ Saved to localStorage');
    
    // Check if online
    const online = isOnline();
    console.log('🌐 Online status:', online);
    
    // Try to sync to Supabase if online
    if (online) {
      console.log('🚀 Attempting to sync to cloud...');
      const success = await this.syncReceiptToCloud(receiptWithSync);
      if (success) {
        console.log('✅ Synced to cloud successfully!');
      } else {
        console.log('❌ Cloud sync failed, added to queue');
        this.addToSyncQueue(receiptWithSync.id);
      }
    } else {
      console.log('📴 Offline - adding to sync queue');
      this.addToSyncQueue(receiptWithSync.id);
    }
  }

  // Sync single receipt to Supabase
  static async syncReceiptToCloud(receipt: Receipt): Promise<boolean> {
    console.log('☁️ Syncing to Supabase:', receipt.serialNumber);
    
    try {
      const dataToInsert = {
        id: receipt.id,
        serial_number: receipt.serialNumber,
        customer_name: receipt.customerName,
        room_number: receipt.roomNumber,
        amount_figures: receipt.amountFigures,
        amount_words: receipt.amountWords,
        payment_mode: receipt.paymentMode,
        company_name: receipt.companyName || null,  // ← ADD THIS
        receptionist_name: receipt.receptionistName,
        location: receipt.location,
        date: receipt.date,
        timestamp: receipt.timestamp,
        number_of_days: receipt.numberOfDays || null,  // ← ADD THIS
        daily_rate: receipt.dailyRate || null,  // ← ADD THIS
        room_details: receipt.roomDetails || null,  // ← ADD THIS
        is_extension: receipt.isExtension || false,  // ← ADD THIS
        original_receipt_id: receipt.originalReceiptId || null,  // ← ADD THIS
        payment_for_dates: receipt.paymentForDates || null,  // ← ADD THIS
        include_tax: receipt.includeTax || false,  // ← ADD THIS
        vat_amount: receipt.vatAmount || null,  // ← ADD THIS
        consumption_tax_amount: receipt.consumptionTaxAmount || null,  // ← ADD THIS
        total_with_tax: receipt.totalWithTax || null,  // ← ADD THIS
      };
      
      console.log('📤 Sending data:', dataToInsert);
      
      const { data, error } = await supabase
        .from('receipts')
        .insert([dataToInsert]);

      if (error) {
        console.error('❌ Supabase error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        return false;
      }

      console.log('✅ Supabase insert successful!', data);
      
      // Mark as synced in localStorage
      this.markAsSynced(receipt.id);
      this.removeFromSyncQueue(receipt.id);
      return true;
    } catch (error) {
      console.error('❌ Sync exception:', error);
      return false;
    }
  }

  static markAsSynced(receiptId: string) {
    if (typeof window === 'undefined') return;
    const receipts = this.getAllReceipts();
    const updated = receipts.map(r => 
      r.id === receiptId ? { ...r, synced: true } : r
    );
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    console.log('✅ Marked as synced:', receiptId);
  }

  static addToSyncQueue(receiptId: string) {
    if (typeof window === 'undefined') return;
    const queue = this.getSyncQueue();
    if (!queue.includes(receiptId)) {
      queue.push(receiptId);
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
      console.log('📋 Added to sync queue:', receiptId, '| Queue size:', queue.length);
    }
  }

  static getSyncQueue(): string[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static removeFromSyncQueue(receiptId: string) {
    if (typeof window === 'undefined') return;
    const queue = this.getSyncQueue();
    const updated = queue.filter(id => id !== receiptId);
    localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(updated));
    console.log('🗑️ Removed from queue:', receiptId, '| Queue size:', updated.length);
  }

  static async syncAllPending(): Promise<{ success: number; failed: number }> {
    console.log('🔄 Starting sync all pending...');
    
    if (!isOnline()) {
      console.log('❌ Cannot sync - offline');
      return { success: 0, failed: 0 };
    }

    const queue = this.getSyncQueue();
    console.log('📋 Sync queue size:', queue.length);
    
    const receipts = this.getAllReceipts();
    let success = 0;
    let failed = 0;

    for (const receiptId of queue) {
      const receipt = receipts.find(r => r.id === receiptId);
      if (receipt && !receipt.synced) {
        console.log(`🔄 Syncing ${receiptId}...`);
        const synced = await this.syncReceiptToCloud(receipt);
        if (synced) {
          success++;
          console.log(`✅ Synced ${success}/${queue.length}`);
        } else {
          failed++;
          console.log(`❌ Failed ${failed}/${queue.length}`);
        }
      }
    }

    console.log(`🏁 Sync complete! Success: ${success}, Failed: ${failed}`);
    return { success, failed };
  }

  static getAllReceipts(): Receipt[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static getReceiptById(id: string): Receipt | null {
    const receipts = this.getAllReceipts();
    return receipts.find(r => r.id === id) || null;
  }

  static getUnsyncedCount(): number {
    return this.getSyncQueue().length;
  }

  static searchReceipts(query: string): Receipt[] {
    const receipts = this.getAllReceipts();
    const lowerQuery = query.toLowerCase();
    return receipts.filter(r => 
      r.serialNumber.toLowerCase().includes(lowerQuery) ||
      r.roomNumber.toLowerCase().includes(lowerQuery) ||
      r.customerName.toLowerCase().includes(lowerQuery) ||
      r.receptionistName.toLowerCase().includes(lowerQuery)
    );
  }

  static async fetchFromCloud(): Promise<Receipt[]> {
    console.log('☁️ Fetching from cloud...');
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('❌ Fetch error:', error);
        return [];
      }

      console.log(`✅ Fetched ${data.length} receipts from cloud`);
      
      return data.map(item => ({
        id: item.id,
        serialNumber: item.serial_number,
        customerName: item.customer_name,
        roomNumber: item.room_number,
        amountFigures: parseFloat(item.amount_figures),
        amountWords: item.amount_words,
        paymentMode: item.payment_mode,
        companyName: item.company_name || undefined,  // ← ADD THIS
        receptionistName: item.receptionist_name,
        location: item.location || 'Unknown',
        date: item.date,
        timestamp: item.timestamp,
        synced: true,
        numberOfDays: item.number_of_days || undefined,  // ← ADD THIS
        dailyRate: item.daily_rate || undefined,  // ← ADD THIS
        roomDetails: item.room_details || undefined,  // ← ADD THIS
        isExtension: item.is_extension || false,  // ← ADD THIS
        originalReceiptId: item.original_receipt_id || undefined,  // ← ADD THIS
        paymentForDates: item.payment_for_dates || undefined,  // ← ADD THIS
        includeTax: item.include_tax || false,
        vatAmount: item.vat_amount ? parseFloat(item.vat_amount) : undefined,
        consumptionTaxAmount: item.consumption_tax_amount ? parseFloat(item.consumption_tax_amount) : undefined,
        totalWithTax: item.total_with_tax ? parseFloat(item.total_with_tax) : undefined,
      }));
    } catch (error) {
      console.error('❌ Cloud fetch exception:', error);
      return [];
    }
  }
}
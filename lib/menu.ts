import { supabase } from './supabase';

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  description?: string;
}

export interface BillItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  customerName?: string;
  roomNumber?: string;
  roomLocation?: string;
  guestName?: string;  
  items: BillItem[];
  total: number;
  date: string;
  timestamp: number;
  staffName: string;
  synced: boolean;
  includeTax?: boolean;
  subtotal?: number;
  vatAmount?: number;
  consumptionTaxAmount?: number;
  totalWithTax?: number;
}

export class MenuService {
  private static MENU_KEY = 'atlantic_hotel_menu_items';
  private static BILLS_KEY = 'atlantic_hotel_bills';
  private static LAST_SYNC_KEY = 'atlantic_hotel_menu_last_sync';

  // Initialize menu items - Fetch from database first
  static async initializeMenuItems() {
    if (typeof window === 'undefined') return;

    try {
      // Try to fetch from Supabase first
      console.log('📡 Fetching menu items from database...');
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Convert database format to app format
        const menuItems: MenuItem[] = data.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          price: Number(item.price),
          available: item.available,
          description: item.description || ''
        }));

        // Cache in localStorage
        localStorage.setItem(this.MENU_KEY, JSON.stringify(menuItems));
        localStorage.setItem(this.LAST_SYNC_KEY, Date.now().toString());
        
        console.log(`✅ Loaded ${menuItems.length} items from database`);
        return menuItems;
      }
    } catch (error) {
      console.error('❌ Failed to fetch from database:', error);
    }

    // Fallback to cached data
    const cached = localStorage.getItem(this.MENU_KEY);
    if (cached) {
      console.log('📦 Using cached menu items (offline mode)');
      return JSON.parse(cached);
    }

    // If no cache and no database, return empty
    console.warn('⚠️ No menu items available. Please add items to database.');
    return [];
  }

  // Get all menu items (from cache)
  static getAllMenuItems(): MenuItem[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.MENU_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Get available menu items
  static getAvailableMenuItems(): MenuItem[] {
    return this.getAllMenuItems().filter(item => item.available);
  }

  // Get items by category
  static getItemsByCategory(category: string): MenuItem[] {
    const items = this.getAvailableMenuItems();
    if (category === 'All') return items;
    return items.filter(item => item.category === category);
  }

  // Refresh menu from database
  static async refreshMenuFromDatabase() {
    return await this.initializeMenuItems();
  }

  // Save bill
  static saveBill(bill: Bill) {
    if (typeof window === 'undefined') return;

    const bills = this.getAllBills();
    bills.push(bill);
    localStorage.setItem(this.BILLS_KEY, JSON.stringify(bills));

    // Sync to cloud
    this.syncBillToCloud(bill);
  }

  // Get all bills
  static getAllBills(): Bill[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.BILLS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Generate bill number
  static generateBillNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const bills = this.getAllBills();
    const todayBills = bills.filter(b => b.billNumber.startsWith(`REST-${year}${month}${day}`));
    const counter = todayBills.length + 1;
    
    return `REST-${year}${month}${day}-${String(counter).padStart(4, '0')}`;
  }

  // Sync bill to cloud
  static async syncBillToCloud(bill: Bill) {
    try {
      await supabase.from('restaurant_bills').insert({
        id: bill.id,
        bill_number: bill.billNumber,
        customer_name: bill.customerName || '',
        room_number: bill.roomNumber || null,
        room_location: bill.roomLocation || null,
        guest_name: bill.guestName || null,
        items: JSON.stringify(bill.items),
        total: bill.total,
        date: bill.date,
        timestamp: bill.timestamp,
        staff_name: bill.staffName,
        synced: true,
        
        // ← ADD THESE TAX FIELDS
        include_tax: bill.includeTax || false,
        subtotal: bill.subtotal || null,
        vat_amount: bill.vatAmount || null,
        consumption_tax_amount: bill.consumptionTaxAmount || null,
        total_with_tax: bill.totalWithTax || null
      });
      console.log('✅ Bill synced to cloud with tax data');
    } catch (error) {
      console.error('❌ Bill sync failed:', error);
    }
  }

  // Get categories
  static getCategories(): string[] {
    const items = this.getAllMenuItems();
    const categories = [...new Set(items.map(item => item.category))];
    return ['All', ...categories.sort()];
  }

  // Get last sync time
  static getLastSyncTime(): Date | null {
    if (typeof window === 'undefined') return null;
    const timestamp = localStorage.getItem(this.LAST_SYNC_KEY);
    return timestamp ? new Date(parseInt(timestamp)) : null;
  }
}
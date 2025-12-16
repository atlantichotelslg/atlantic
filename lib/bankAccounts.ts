import { supabase } from './supabase';

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

const BANK_ACCOUNT_STORAGE_KEY = 'atlantic_bank_accounts';

export class BankAccountService {
  // Fetch from database with localStorage fallback
  static async getBankAccount(location?: string): Promise<BankAccount | null> {
    try {
      console.log('🏦 Fetching bank account from database...');
      
      let query = supabase
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (location) {
        query = query.or(`location.eq.${location},location.eq.all`);
      } else {
        query = query.eq('location', 'all');
      }

      const { data, error } = await query.limit(1).single();

      if (error) throw error;

      if (data) {
        const account: BankAccount = {
          id: data.id,
          bankName: data.bank_name,
          accountNumber: data.account_number,
          accountName: data.account_name,
          location: data.location,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        // Cache to localStorage
        this.saveToLocalStorage(account);
        console.log('✅ Bank account fetched from database');
        return account;
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching bank account from database:', error);
      console.log('📦 Falling back to localStorage...');
      return this.getFromLocalStorage();
    }
  }

  // Save to localStorage
  static saveToLocalStorage(account: BankAccount): void {
    try {
      localStorage.setItem(BANK_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  // Get from localStorage
  static getFromLocalStorage(): BankAccount | null {
    try {
      const stored = localStorage.getItem(BANK_ACCOUNT_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  // Update bank account in database
  static async updateBankAccount(
    id: string,
    updates: Partial<Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> {
    try {
      const dbUpdates: any = {};
      if (updates.bankName) dbUpdates.bank_name = updates.bankName;
      if (updates.accountNumber) dbUpdates.account_number = updates.accountNumber;
      if (updates.accountName) dbUpdates.account_name = updates.accountName;
      if (updates.location !== undefined) dbUpdates.location = updates.location;

      const { error } = await supabase
        .from('bank_accounts')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Bank account updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating bank account:', error);
      return false;
    }
  }

  // Create new bank account
  static async createBankAccount(
    account: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<BankAccount | null> {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          bank_name: account.bankName,
          account_number: account.accountNumber,
          account_name: account.accountName,
          location: account.location || 'all',
        })
        .select()
        .single();

      if (error) throw error;

      const newAccount: BankAccount = {
        id: data.id,
        bankName: data.bank_name,
        accountNumber: data.account_number,
        accountName: data.account_name,
        location: data.location,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      this.saveToLocalStorage(newAccount);
      return newAccount;
    } catch (error) {
      console.error('❌ Error creating bank account:', error);
      return null;
    }
  }
}
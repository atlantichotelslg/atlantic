// lib/auth.ts
export interface User {
  username: string;
  name: string;
  role: string;
}

// Default users (stored locally for offline access)
const DEFAULT_USERS = [
  { username: 'admin', password: 'admin123', name: 'Administrator', role: 'Admin' },
  { username: 'receptionist', password: 'recept123', name: 'Front Desk', role: 'Receptionist' },
];

export class AuthService {
  private static readonly STORAGE_KEY = 'atlantic_hotel_users';
  private static readonly SESSION_KEY = 'atlantic_hotel_session';

  // Initialize default users in localStorage
  static initializeUsers() {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    }
  }

  // Get all users from localStorage
  static getUsers() {
    if (typeof window === 'undefined') return DEFAULT_USERS;
    
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_USERS;
  }

  // Login function (works offline)
  static async login(username: string, password: string): Promise<User | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const users = this.getUsers();
    const user = users.find(
      (u: any) => u.username === username && u.password === password
    );

    if (user) {
      const userSession: User = {
        username: user.username,
        name: user.name,
        role: user.role,
      };
      
      // Store session
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(userSession));
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(userSession));
      }
      
      return userSession;
    }

    return null;
  }

  // Get current user session
  static getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    // Try sessionStorage first (current tab)
    const sessionUser = sessionStorage.getItem(this.SESSION_KEY);
    if (sessionUser) return JSON.parse(sessionUser);
    
    // Fall back to localStorage (persistent)
    const storedUser = localStorage.getItem(this.SESSION_KEY);
    if (storedUser) {
      const user = JSON.parse(storedUser);
      sessionStorage.setItem(this.SESSION_KEY, storedUser);
      return user;
    }
    
    return null;
  }

  // Logout function
  static logout() {
    if (typeof window === 'undefined') return;
    
    sessionStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.SESSION_KEY);
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  // Add new user (admin only)
  static addUser(username: string, password: string, name: string, role: string) {
    if (typeof window === 'undefined') return false;
    
    const users = this.getUsers();
    const exists = users.find((u: any) => u.username === username);
    
    if (exists) return false;
    
    users.push({ username, password, name, role });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    return true;
  }
}
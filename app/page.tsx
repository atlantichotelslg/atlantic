'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/auth';
import { LOCATIONS } from '@/lib/locations';

type UserRole = 'Admin' | 'Receptionist' | 'Restaurant' | null;

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'role' | 'login'>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [showUnderConstruction, setShowUnderConstruction] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    AuthService.initializeUsers();
    
    if (AuthService.isAuthenticated()) {
      router.push('/home');
    }

    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [router]);

  const handleRoleSelect = (role: UserRole) => {
    if (role === 'Restaurant') {
      setShowUnderConstruction(true);
      return;
    }
    setSelectedRole(role);
    setStep('login');
    setError('');
  };

  const handleBack = () => {
    setStep('role');
    setSelectedRole(null);
    setUsername('');
    setPassword('');
    setSelectedLocation('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Receptionist must select location
    if (selectedRole === 'Receptionist' && !selectedLocation) {
      setError('Please select a location');
      return;
    }

    setLoading(true);

    try {
      const user = await AuthService.login(username, password);

      if (user) {
        // Verify role matches
        if (user.role !== selectedRole) {
          setError(`This account is for ${user.role}, not ${selectedRole}`);
          setLoading(false);
          return;
        }

        // Store location in session data (localStorage)
        const sessionData = localStorage.getItem('atlantic_hotel_session');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          
          if (selectedRole === 'Receptionist') {
            session.location = selectedLocation; // Add location to session
            localStorage.setItem('atlantic_hotel_session', JSON.stringify(session));
            console.log('✅ Saved location to session:', selectedLocation);
          } else {
            // Admin doesn't have default location
            session.location = '';
            localStorage.setItem('atlantic_hotel_session', JSON.stringify(session));
          }
        }
        
        router.push('/home');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      <div className="absolute top-4 right-4">
        <div className={`px-4 py-2 rounded-full text-sm font-medium ${
          isOnline 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-7xl">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-blue-900 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-4xl font-bold">
            AH
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Atlantic Hotel & Suites</h1>
          <p className="text-gray-600 mt-2">Hotel Management System</p>
        </div>

        {step === 'role' ? (
          // Role Selection Screen
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Select Your Role</h2>
            
            <div className="grid grid-cols-3 gap-6">
              {/* Admin Card */}
              <button
                onClick={() => handleRoleSelect('Admin')}
                className="group relative overflow-hidden bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 p-8 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex flex-col items-center space-y-4">
                  {/* Admin Avatar */}
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                    <svg className="w-12 h-12 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold">Administrator</h3>
                    <p className="text-sm opacity-90 mt-2">View all receipts, manage system</p>
                  </div>
                </div>
              </button>

              {/* Receptionist Card */}
              <button
                onClick={() => handleRoleSelect('Receptionist')}
                className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 p-8 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex flex-col items-center space-y-4">
                  {/* Receptionist Avatar */}
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                    <svg className="w-12 h-12 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold">Receptionist</h3>
                    <p className="text-sm opacity-90 mt-2">Generate receipts, invoices, book rooms, view history</p>
                  </div>
                </div>
              </button>

              {/* Restaurant Card */}
              <button
                onClick={() => handleRoleSelect('Restaurant')}
                className="group relative overflow-hidden bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 p-8 rounded-2xl shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex flex-col items-center space-y-4">
                  {/* Restaurant Avatar */}
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
                    <svg className="w-12 h-12 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold">Restaurant</h3>
                    <p className="text-sm opacity-90 mt-2">Manage orders & invoices</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          // Login Form
          <div>
            <div className="flex items-center mb-6">
              <button
                onClick={handleBack}
                className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <div className={`ml-auto px-4 py-2 rounded-full text-sm font-bold ${
                selectedRole === 'Admin' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {selectedRole}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Location Selection - Only for Receptionist */}
              {selectedRole === 'Receptionist' && (
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Location *
                  </label>
                  <select
                    id="location"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  >
                    <option value="">-- Select Branch --</option>
                    {LOCATIONS.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} - {location.address}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Enter your username"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            {/* <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800 font-semibold mb-2">Demo Credentials:</p>
              <p className="text-xs text-blue-700">Admin: admin / admin123</p>
              <p className="text-xs text-blue-700">Receptionist: receptionist / recept123</p>
            </div> */}
          </div>
        )}

        {!isOnline && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              ⚡ You are currently offline. The system will continue to work using locally stored data.
            </p>
          </div>
        )}
      </div>

      {/* Under Construction Modal */}
      {showUnderConstruction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowUnderConstruction(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Construction Icon */}
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-orange-100 rounded-full mx-auto flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Under Construction</h3>
              <p className="text-gray-600 mb-6">
                The Restaurant module is currently under development and will be available soon!
              </p>
              
              {/* Features Coming Soon */}
              <div className="bg-orange-50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-semibold text-orange-800 mb-2">Coming Soon:</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>🍽️ Order management</li>
                  <li>📋 Menu management</li>
                  <li>💰 Restaurant invoicing</li>
                  <li>📊 Sales tracking</li>
                </ul>
              </div>
              
              <button
                onClick={() => setShowUnderConstruction(false)}
                className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
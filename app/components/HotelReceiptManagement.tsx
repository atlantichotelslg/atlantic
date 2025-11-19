'use client';

import { useState, useEffect, useRef } from 'react';
import { ReceiptService, Receipt } from '@/lib/receipts';
import { LOCATIONS, getLocationAddress } from '@/lib/locations';

interface HotelReceiptManagementProps {
  userName: string;
}

export default function HotelReceiptManagement({ userName }: HotelReceiptManagementProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'synced' | 'unsynced'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [fetchingFromCloud, setFetchingFromCloud] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);
  
  // Receipt Creation
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLocation, setCreateLocation] = useState('');
  const [createCustomerName, setCreateCustomerName] = useState('');
  const [createRoomNumber, setCreateRoomNumber] = useState('');
  const [createAmount, setCreateAmount] = useState('');
  const [createAmountWords, setCreateAmountWords] = useState('');
  const [createPaymentMode, setCreatePaymentMode] = useState<'Cash' | 'Card' | 'Transfer'>('Cash');

  useEffect(() => {
    checkOnlineStatus();
    loadReceipts();
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    filterReceipts();
    setCurrentPage(1);
  }, [receipts, searchQuery, filterMode, locationFilter]);

  const checkOnlineStatus = () => {
    setIsOnline(navigator.onLine);
  };

  const handleOnline = () => {
    setIsOnline(true);
    console.log('🟢 Back online - fetching from cloud...');
    fetchFromCloud();
  };

  const handleOffline = () => {
    setIsOnline(false);
    console.log('🔴 Gone offline - using local data');
  };

  const loadReceipts = () => {
    setLoading(true);
    const allReceipts = ReceiptService.getAllReceipts();
    console.log(`📊 Loaded ${allReceipts.length} receipts from localStorage`);
    setReceipts(allReceipts.sort((a, b) => b.timestamp - a.timestamp));
    setLoading(false);
  };

  const fetchFromCloud = async () => {
    if (!navigator.onLine) {
      console.log('❌ Cannot fetch - offline');
      return;
    }

    setFetchingFromCloud(true);
    console.log('☁️ Fetching receipts from Supabase...');

    try {
      const cloudReceipts = await ReceiptService.fetchFromCloud();
      console.log(`✅ Fetched ${cloudReceipts.length} receipts from cloud`);

      const localReceipts = ReceiptService.getAllReceipts();
      const localIds = new Set(localReceipts.map(r => r.id));
      
      const newReceipts = cloudReceipts.filter(r => !localIds.has(r.id));
      
      if (newReceipts.length > 0) {
        console.log(`💾 Saving ${newReceipts.length} new receipts to localStorage`);
        const allReceipts = [...localReceipts, ...newReceipts];
        localStorage.setItem('atlantic_hotel_receipts', JSON.stringify(allReceipts));
      }

      loadReceipts();
      
      alert(`✅ Fetched ${cloudReceipts.length} receipts from cloud!\n${newReceipts.length} new receipts added.`);
    } catch (error) {
      console.error('❌ Failed to fetch from cloud:', error);
      alert('Failed to fetch from cloud. Check console for details.');
    } finally {
      setFetchingFromCloud(false);
    }
  };

  const handleSyncAll = async () => {
    if (!navigator.onLine) {
      alert('❌ Cannot sync - you are offline');
      return;
    }

    setSyncing(true);
    console.log('🔄 Starting sync all...');

    try {
      const result = await ReceiptService.syncAllPending();
      console.log(`✅ Sync complete: ${result.success} succeeded, ${result.failed} failed`);
      
      loadReceipts();
      
      alert(`✅ Sync complete!\n${result.success} receipts synced\n${result.failed} failed`);
    } catch (error) {
      console.error('❌ Sync failed:', error);
      alert('Sync failed. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  const filterReceipts = () => {
    let filtered = [...receipts];

    if (locationFilter !== 'all') {
      filtered = filtered.filter(r => r.location === locationFilter);
    }

    if (filterMode === 'synced') {
      filtered = filtered.filter(r => r.synced);
    } else if (filterMode === 'unsynced') {
      filtered = filtered.filter(r => !r.synced);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.serialNumber.toLowerCase().includes(query) ||
        r.customerName.toLowerCase().includes(query) ||
        r.roomNumber.toLowerCase().includes(query) ||
        r.receptionistName.toLowerCase().includes(query)
      );
    }

    setFilteredReceipts(filtered);
  };

  const getTotalAmount = (location?: string) => {
    const receiptsToSum = location && location !== 'all'
      ? receipts.filter(r => r.location === location)
      : filteredReceipts;
    return receiptsToSum.reduce((sum, r) => sum + r.amountFigures, 0);
  };

  const getLocationStats = () => {
    const stats: { [key: string]: { count: number; revenue: number } } = {};
    
    LOCATIONS.forEach(loc => {
      const locationReceipts = receipts.filter(r => r.location === loc.id);
      stats[loc.id] = {
        count: locationReceipts.length,
        revenue: locationReceipts.reduce((sum, r) => sum + r.amountFigures, 0)
      };
    });

    return stats;
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReceipts = filteredReceipts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPaginationRange = () => {
    const range = [];
    const showPages = 5;
    let start = Math.max(1, currentPage - Math.floor(showPages / 2));
    let end = Math.min(totalPages, start + showPages - 1);
    
    if (end - start < showPages - 1) {
      start = Math.max(1, end - showPages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  };

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
  };

  const handleCloseModal = () => {
    setSelectedReceipt(null);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '');
    if (value === '' || /^\d+$/.test(value)) {
      const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      setCreateAmount(formatted);
      
      const amount = parseFloat(value);
      if (!isNaN(amount) && amount > 0) {
        setCreateAmountWords(ReceiptService.numberToWords(amount));
      } else {
        setCreateAmountWords('');
      }
    }
  };

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();

    const receipt: Receipt = {
      id: Date.now().toString(),
      serialNumber: ReceiptService.generateSerialNumber(),
      customerName: createCustomerName,
      roomNumber: createRoomNumber,
      amountFigures: parseFloat(createAmount.replace(/,/g, '')),
      amountWords: createAmountWords,
      paymentMode: createPaymentMode,
      receptionistName: userName,
      location: createLocation,
      date: new Date().toLocaleDateString('en-GB'),
      timestamp: Date.now(),
      synced: false,
    };

    await ReceiptService.saveReceipt(receipt);
    
    setCreateCustomerName('');
    setCreateRoomNumber('');
    setCreateAmount('');
    setCreateAmountWords('');
    setCreatePaymentMode('Cash');
    setCreateLocation('');
    setShowCreateForm(false);
    
    loadReceipts();
    
    alert('✅ Receipt created successfully!');
  };

  if (loading && receipts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  const locationStats = getLocationStats();

  return (
    <div className="space-y-6">
      {/* Action Buttons Row */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {showCreateForm ? 'Hide Form' : 'Create Receipt'}
        </button>

        <button
          onClick={fetchFromCloud}
          disabled={!isOnline || fetchingFromCloud}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className={`w-5 h-5 ${fetchingFromCloud ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          {fetchingFromCloud ? 'Fetching...' : 'Fetch from Cloud'}
        </button>

        <button
          onClick={handleSyncAll}
          disabled={!isOnline || syncing}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncing ? 'Syncing...' : `Sync All (${receipts.filter(r => !r.synced).length})`}
        </button>

        <button
          onClick={loadReceipts}
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center gap-2"
        >
          🔄 Refresh
        </button>

        <div className={`ml-auto px-4 py-3 rounded-lg font-medium ${
          isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </div>
      </div>

      {/* Create Receipt Form */}
      {showCreateForm && (
        <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-green-500">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Create New Receipt</h3>
          
          <form onSubmit={handleCreateReceipt} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Location *
                </label>
                <select
                  value={createLocation}
                  onChange={(e) => setCreateLocation(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  required
                >
                  <option value="">-- Select Branch --</option>
                  {LOCATIONS.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Number *
                </label>
                <input
                  type="text"
                  value={createRoomNumber}
                  onChange={(e) => setCreateRoomNumber(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="e.g., 305"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                value={createCustomerName}
                onChange={(e) => setCreateCustomerName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="e.g., John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount Received (₦) *
              </label>
              <input
                type="text"
                value={createAmount}
                onChange={handleAmountChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="e.g., 50,000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount in Words
              </label>
              <input
                type="text"
                value={createAmountWords}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                placeholder="Auto-generated"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mode of Payment *
              </label>
              <select
                value={createPaymentMode}
                onChange={(e) => setCreatePaymentMode(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                required
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Generate Receipt
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Location Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-xl shadow-lg text-white">
          <p className="text-sm font-medium opacity-90">All Locations</p>
          <p className="text-3xl font-bold mt-2">{receipts.length} Receipts</p>
          <p className="text-lg mt-1">₦{getTotalAmount('all').toLocaleString()}</p>
        </div>
        
        {LOCATIONS.map(location => (
          <div key={location.id} className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-600">
            <p className="text-sm text-gray-600 font-medium">{location.name}</p>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {locationStats[location.id]?.count || 0} Receipts
            </p>
            <p className="text-lg text-green-700 font-semibold mt-1">
              ₦{(locationStats[location.id]?.revenue || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">{location.address}</p>
          </div>
        ))}
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-600">
          <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            ₦{getTotalAmount().toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-600">
          <p className="text-sm text-gray-600 font-medium">Synced to Cloud</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {receipts.filter(r => r.synced).length}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-amber-600">
          <p className="text-sm text-gray-600 font-medium">Pending Sync</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {receipts.filter(r => !r.synced).length}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex flex-col gap-4 mb-6">
          {/* Location Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setLocationFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                locationFilter === 'all'
                  ? 'bg-blue-900 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Locations
            </button>
            {LOCATIONS.map(location => (
              <button
                key={location.id}
                onClick={() => setLocationFilter(location.id)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  locationFilter === location.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {location.name}
              </button>
            ))}
          </div>

          {/* Search and Sync Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by serial, customer, room, or staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterMode === 'all'
                    ? 'bg-blue-900 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('synced')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterMode === 'synced'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Synced
              </button>
              <button
                onClick={() => setFilterMode('unsynced')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterMode === 'unsynced'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Pending
              </button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 text-sm text-gray-600 flex justify-between items-center">
          <div>
            Showing <span className="font-bold text-gray-800">{indexOfFirstItem + 1}</span> to{' '}
            <span className="font-bold text-gray-800">{Math.min(indexOfLastItem, filteredReceipts.length)}</span> of{' '}
            <span className="font-bold text-gray-800">{filteredReceipts.length}</span> receipts
            {locationFilter !== 'all' && (
              <span> from <span className="font-bold text-gray-800">{LOCATIONS.find(l => l.id === locationFilter)?.name}</span></span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Page {currentPage} of {totalPages || 1}
          </div>
        </div>

        {/* Receipts Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Serial #</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Room</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Staff</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentReceipts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No receipts found
                  </td>
                </tr>
              ) : (
                currentReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-blue-900">
                      {receipt.serialNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {receipt.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {receipt.roomNumber}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                      ₦{receipt.amountFigures.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        receipt.paymentMode === 'Cash'
                          ? 'bg-green-100 text-green-700'
                          : receipt.paymentMode === 'Card'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {receipt.paymentMode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {receipt.date}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {getLocationAddress(receipt.location)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {receipt.receptionistName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {receipt.synced ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          ✓ Synced
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          ⏱ Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleViewReceipt(receipt)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View & Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              ← Previous
            </button>

            <div className="flex gap-2">
              {currentPage > 3 && (
                <>
                  <button
                    onClick={() => handlePageChange(1)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    1
                  </button>
                  {currentPage > 4 && <span className="px-2 py-2">...</span>}
                </>
              )}

              {getPaginationRange().map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-4 py-2 rounded-lg transition ${
                    currentPage === pageNum
                      ? 'bg-blue-900 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && <span className="px-2 py-2">...</span>}
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Receipt Detail Modal with Print */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-gray-100 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-white p-4 rounded-t-xl flex justify-between items-center sticky top-0 z-10 shadow no-print">
              <h3 className="text-xl font-bold text-gray-800">Receipt Preview</h3>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintReceipt}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-8">
              <div
                ref={receiptRef}
                className="receipt-container bg-white mx-auto shadow-2xl"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '20mm',
                }}
              >
                <div className="flex justify-between items-start mb-8 border-b-2 border-gray-300 pb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 bg-blue-900 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                      AH
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-800">Atlantic Hotel & Suites</h1>
                      <p className="text-sm text-gray-600 mt-1">{getLocationAddress(selectedReceipt.location)}</p>
                      <p className="text-sm text-gray-600">Victoria Island, Lagos, Nigeria</p>
                      <p className="text-sm text-gray-600">info@atlantichotelslagos.com</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 font-medium">Receipt No.</p>
                    <p className="text-xl font-bold text-blue-900">{selectedReceipt.serialNumber}</p>
                    <p className="text-sm text-gray-600 mt-2">{selectedReceipt.date}</p>
                  </div>
                </div>

                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-800 uppercase tracking-wide">
                    Payment Receipt
                  </h2>
                </div>

                <div className="space-y-6 mb-12">
                  <div className="border-b border-gray-300 pb-2">
                    <p className="text-sm text-gray-600 font-medium mb-1">Customer Name</p>
                    <p className="text-xl font-semibold text-gray-800">{selectedReceipt.customerName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-b border-gray-300 pb-2">
                      <p className="text-sm text-gray-600 font-medium mb-1">Room Number</p>
                      <p className="text-xl font-semibold text-gray-800">{selectedReceipt.roomNumber}</p>
                    </div>
                    <div className="border-b border-gray-300 pb-2">
                      <p className="text-sm text-gray-600 font-medium mb-1">Payment Mode</p>
                      <p className="text-xl font-semibold text-gray-800">{selectedReceipt.paymentMode}</p>
                    </div>
                  </div>

                  <div className="border-b border-gray-300 pb-2">
                    <p className="text-sm text-gray-600 font-medium mb-1">Amount Received (in words)</p>
                    <p className="text-lg font-semibold text-gray-800 uppercase">{selectedReceipt.amountWords}</p>
                  </div>

                  <div className="border-b border-gray-300 pb-2">
                    <p className="text-sm text-gray-600 font-medium mb-1">Amount Received (in figures)</p>
                    <p className="text-3xl font-bold text-blue-900">
                      ₦{selectedReceipt.amountFigures.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="mt-16 pt-8 border-t-2 border-gray-300">
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

                <div className="mt-12 text-center text-xs text-gray-500">
                  <p>This is a computer-generated receipt and does not require a physical signature</p>
                  <p className="mt-1">For inquiries, please contact us at info@atlantichotelslagos.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { RoomService, Room } from '@/lib/rooms';
import { LOCATIONS } from '@/lib/locations';
import RoomInvoiceGenerator from './RoomInvoiceGenerator';

export default function RoomManagement() {
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]?.id || '');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'occupied' | 'maintenance'>('all');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);

  useEffect(() => {
    if (selectedLocation) {
      // Initialize rooms from database
      RoomService.initializeRooms(selectedLocation).then(() => {
        loadRooms();
      });
      
      // Auto-refresh every 5 seconds
      const interval = setInterval(() => {
        if (navigator.onLine) {
          loadRooms();
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [selectedLocation]);

  const loadRooms = async () => {
    try {
      await RoomService.initializeRooms(selectedLocation);
      const locationRooms = RoomService.getRoomsByLocation(selectedLocation);
      setRooms(locationRooms);
      console.log(`📊 Loaded ${locationRooms.length} rooms for ${selectedLocation}`);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (room.guestName && room.guestName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || room.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStats = () => {
    const total = rooms.length;
    const available = rooms.filter(r => r.status === 'available').length;
    const occupied = rooms.filter(r => r.status === 'occupied').length;
    const maintenance = rooms.filter(r => r.status === 'maintenance').length;
    const occupancyRate = total > 0 ? ((occupied / total) * 100).toFixed(1) : '0';

    return { total, available, occupied, maintenance, occupancyRate };
  };

  const handleSetMaintenance = async (room: Room) => {
    if (confirm(`Set room ${room.number} to maintenance mode?`)) {
      setLoading(true);
      try {
        await RoomService.updateRoomStatus(selectedLocation, room.number, 'maintenance');
        await loadRooms();
        alert('✅ Room set to maintenance mode');
      } catch (error) {
        console.error('Failed to set maintenance:', error);
        alert('❌ Failed to update room status');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSetAvailable = async (room: Room) => {
    if (confirm(`Set room ${room.number} back to available?`)) {
      setLoading(true);
      try {
        await RoomService.updateRoomStatus(selectedLocation, room.number, 'available', '', '', '');
        await loadRooms();
        alert('✅ Room set to available');
      } catch (error) {
        console.error('Failed to set available:', error);
        alert('❌ Failed to update room status');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCheckOut = async (room: Room) => {
    if (confirm(`Check out guest from room ${room.number}?`)) {
      setLoading(true);
      try {
        const checkOutDate = new Date().toLocaleDateString('en-GB');
        await RoomService.updateRoomStatus(selectedLocation, room.number, 'available', '', room.checkIn, checkOutDate);
        await loadRooms();
        alert(`✅ Room ${room.number} checked out successfully!`);
      } catch (error) {
        console.error('Failed to check out:', error);
        alert('❌ Failed to check out guest');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleViewDetails = (room: Room) => {
    setSelectedRoom(room);
    setShowModal(true);
  };

  const handleExtendStay = (room: Room) => {
    // This will redirect to the receipt creation page with extension mode
    // You'll need to implement this based on your routing
    alert(`Extension/Additional payment for Room ${room.number} - ${room.guestName}\n\nThis will open the receipt creation form.`);
    
    // TODO: Navigate to receipt creation page with these params:
    // - roomNumber: room.number
    // - location: selectedLocation
    // - isExtension: true
    // - existingGuest: room.guestName
  };

  const stats = getStats();

  return (
    <div>
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Room Management</h2>
          <div className="flex items-center gap-3">
            {loading && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Updating...</span>
              </div>
            )}
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              navigator.onLine ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {navigator.onLine ? '🟢 Online' : '🔴 Offline'}
            </div>
          </div>
        </div>

        {/* Location Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Location</label>
          <div className="flex gap-2">
            {LOCATIONS.map(location => (
              <button
                key={location.id}
                onClick={() => setSelectedLocation(location.id)}
                className={`px-6 py-3 rounded-lg font-semibold transition ${
                  selectedLocation === location.id
                    ? 'bg-blue-900 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {location.name}
              </button>
            ))}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border-2 border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Total Rooms</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border-2 border-green-300">
            <p className="text-xs text-gray-600 mb-1">🟢 Available</p>
            <p className="text-3xl font-bold text-green-700">{stats.available}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-300">
            <p className="text-xs text-gray-600 mb-1">🔵 Occupied</p>
            <p className="text-3xl font-bold text-blue-700">{stats.occupied}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border-2 border-red-300">
            <p className="text-xs text-gray-600 mb-1">🔴 Maintenance</p>
            <p className="text-3xl font-bold text-red-700">{stats.maintenance}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border-2 border-purple-300">
            <p className="text-xs text-gray-600 mb-1">Occupancy</p>
            <p className="text-3xl font-bold text-purple-700">{stats.occupancyRate}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by room number or guest name..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'all'
                  ? 'bg-blue-900 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('available')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'available'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🟢 Available
            </button>
            <button
              onClick={() => setFilterStatus('occupied')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'occupied'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🔵 Occupied
            </button>
            <button
              onClick={() => setFilterStatus('maintenance')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'maintenance'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🔴 Maintenance
            </button>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredRooms.map(room => (
            <div
              key={room.id}
              onClick={() => handleViewDetails(room)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition hover:shadow-lg ${
                room.status === 'available'
                  ? 'bg-green-100 border-green-400 hover:border-green-600'
                  : room.status === 'occupied'
                  ? 'bg-blue-100 border-blue-400 hover:border-blue-600'
                  : 'bg-red-100 border-red-400 hover:border-red-600'
              }`}
            >
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800 mb-1">{room.number}</p>
                <p className={`text-xs font-semibold uppercase ${
                  room.status === 'available'
                    ? 'text-green-700'
                    : room.status === 'occupied'
                    ? 'text-blue-700'
                    : 'text-red-700'
                }`}>
                  {room.status}
                </p>
                {room.isManagerRoom && (
                  <p className="text-xs text-purple-600 font-semibold mt-1">MANAGER</p>
                )}
                {room.linkedRoom && (
                  <p className="text-xs text-indigo-600 mt-1">Linked: {room.linkedRoom}</p>
                )}
                {room.guestName && (
                  <p className="text-xs text-gray-700 mt-2 truncate font-medium">{room.guestName}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredRooms.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No rooms found matching your criteria
          </div>
        )}
      </div>

      {/* Room Details Modal */}
      {showModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Room {selectedRoom.number}</h3>
                {selectedRoom.isManagerRoom && (
                  <p className="text-sm text-purple-600 font-semibold mt-1">Manager's Room</p>
                )}
                {selectedRoom.linkedRoom && (
                  <p className="text-sm text-blue-600 mt-1">Linked with Room {selectedRoom.linkedRoom}</p>
                )}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className={`text-lg font-semibold ${
                  selectedRoom.status === 'available'
                    ? 'text-green-700'
                    : selectedRoom.status === 'occupied'
                    ? 'text-blue-700'
                    : 'text-red-700'
                }`}>
                  {selectedRoom.status === 'available' && '🟢 '}
                  {selectedRoom.status === 'occupied' && '🔵 '}
                  {selectedRoom.status === 'maintenance' && '🔴 '}
                  {selectedRoom.status.toUpperCase()}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Floor</p>
                <p className="text-lg font-semibold text-gray-800">Floor {selectedRoom.floor}</p>
              </div>

              {selectedRoom.guestName && (
                <div>
                  <p className="text-sm text-gray-600">Guest Name</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedRoom.guestName}</p>
                </div>
              )}

              {selectedRoom.checkIn && (
                <div>
                  <p className="text-sm text-gray-600">Check-in Date</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedRoom.checkIn}</p>
                </div>
              )}

              {selectedRoom.checkOut && (
                <div>
                  <p className="text-sm text-gray-600">Check-out Date</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedRoom.checkOut}</p>
                </div>
              )}

              {!selectedRoom.synced && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-700 font-semibold">⚠️ Pending sync to cloud</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {selectedRoom.status === 'occupied' && (
                <>
                  <button
                    onClick={() => {
                      setShowInvoiceGenerator(true);
                      setShowModal(false);
                    }}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-semibold transition"
                  >
                    🧾 Print Invoice
                  </button>
                  
                  {/* ADD THIS NEW BUTTON */}
                  <button
                    onClick={() => {
                      handleExtendStay(selectedRoom);
                      setShowModal(false);
                    }}
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-semibold transition"
                  >
                    💰 Extend Stay / Add Payment
                  </button>
                  
                  <button
                    onClick={() => {
                      handleCheckOut(selectedRoom);
                      setShowModal(false);
                    }}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-semibold transition"
                  >
                    ✅ Check Out Guest
                  </button>
                  <button
                    onClick={() => {
                      handleSetMaintenance(selectedRoom);
                      setShowModal(false);
                    }}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-semibold transition"
                  >
                    🔧 Set to Maintenance
                  </button>
                </>
              )}

              {selectedRoom.status === 'available' && (
                <button
                  onClick={() => {
                    handleSetMaintenance(selectedRoom);
                    setShowModal(false);
                  }}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-semibold transition"
                >
                  🔧 Set to Maintenance
                </button>
              )}

              {selectedRoom.status === 'maintenance' && (
                <button
                  onClick={() => {
                    handleSetAvailable(selectedRoom);
                    setShowModal(false);
                  }}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-semibold transition"
                >
                  ✅ Set to Available
                </button>
              )}

              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Generator */}
      {showInvoiceGenerator && selectedRoom && (
        <RoomInvoiceGenerator
          room={selectedRoom}
          location={selectedLocation}
          onClose={() => {
            setShowInvoiceGenerator(false);
            setSelectedRoom(null);
          }}
        />
      )}
    </div>
  );
}
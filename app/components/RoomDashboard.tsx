'use client';

import { useState, useEffect } from 'react';
import { RoomService, Room, RoomStatus } from '@/lib/rooms';
import { getLocationAddress } from '@/lib/locations';

interface RoomDashboardProps {
  userLocation: string;
  onCreateReceipt: (roomNumber: string) => void;
  onViewHistory: () => void;
}

export default function RoomDashboard({ userLocation, onCreateReceipt, onViewHistory }: RoomDashboardProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [stats, setStats] = useState({ total: 0, available: 0, occupied: 0, maintenance: 0, unsynced: 0 });
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initialize rooms
    initRooms();
    
    // Check online status
    setIsOnline(navigator.onLine);
    
    // Listen for online/offline events
    const handleOnline = () => {
      console.log('🟢 Back online');
      setIsOnline(true);
      syncPendingRooms();
    };
    
    const handleOffline = () => {
      console.log('🔴 Gone offline');
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userLocation]);

  const initRooms = async () => {
    await RoomService.initializeRooms(userLocation);
    loadRooms();
  };

  const loadRooms = () => {
    const locationRooms = RoomService.getRoomsByLocation(userLocation);
    setRooms(locationRooms);
    setStats(RoomService.getRoomStats(userLocation));
  };

  const syncPendingRooms = async () => {
    setSyncing(true);
    await RoomService.syncPendingRooms();
    loadRooms();
    setSyncing(false);
  };

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setShowUpdateModal(true);
  };

  const handleUpdateRoomStatus = async (status: RoomStatus) => {
    if (!selectedRoom) return;

    if (status === 'occupied') {
      setShowUpdateModal(false);
      onCreateReceipt(selectedRoom.number);
      return;
    }

    await RoomService.updateRoomStatus(
      userLocation,
      selectedRoom.number,
      status
    );

    loadRooms();
    setShowUpdateModal(false);
    setSelectedRoom(null);
  };

  const handleSyncRooms = async () => {
    if (!isOnline) {
      alert('❌ Cannot sync - you are offline');
      return;
    }

    setSyncing(true);
    const result = await RoomService.syncPendingRooms();
    loadRooms();
    setSyncing(false);
    
    alert(`✅ Sync complete!\n${result.success} rooms synced\n${result.failed} failed`);
  };

  const getRoomColor = (room: Room) => {
    if (room.isManagerRoom) {
      return 'bg-purple-100 border-2 border-purple-400 hover:border-purple-600';
    }
    
    switch (room.status) {
      case 'available':
        return 'bg-white border-2 border-gray-300 hover:border-green-500';
      case 'occupied':
        return 'bg-blue-500 text-white border-2 border-blue-600 hover:border-blue-700';
      case 'maintenance':
        return 'bg-red-500 text-white border-2 border-red-600 hover:border-red-700';
    }
  };

  const getRoomIcon = (room: Room) => {
    if (room.isManagerRoom) {
      return (
        <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    }

    switch (room.status) {
      case 'available':
        return (
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'occupied':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'maintenance':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
    }
  };

  const getRoomLabel = (room: Room) => {
    if (room.isManagerRoom) return "Manager";
    if (room.status === 'available') return 'Available';
    if (room.status === 'occupied') return 'Occupied';
    return 'Maintenance';
  };

  const roomRows: Room[][] = [];
  let currentRow: Room[] = [];
  rooms.forEach((room, index) => {
    currentRow.push(room);
    if (currentRow.length === 10 || index === rooms.length - 1) {
      roomRows.push([...currentRow]);
      currentRow = [];
    }
  });

  return (
    <div className="space-y-6">
      {/* Header with Buttons */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Room Overview</h2>
            <p className="text-gray-600 mt-1">{getLocationAddress(userLocation)}</p>
            <p className="text-sm text-gray-500 mt-1">
              {userLocation === 'musa-yaradua' ? '25 Rooms (11/13 and 21/23 are combined)' : '30 Rooms (Room 2 is Manager&apos;s room)'}
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Online/Offline Status */}
            <div className={`px-4 py-2 rounded-lg font-medium ${
              isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {isOnline ? '🟢 Online' : '🔴 Offline'}
            </div>

            {/* Sync Button - show if unsynced rooms */}
            {stats.unsynced > 0 && (
              <button
                onClick={handleSyncRooms}
                disabled={!isOnline || syncing}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                <svg className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {syncing ? 'Syncing...' : `Sync (${stats.unsynced})`}
              </button>
            )}

            <button
              onClick={onViewHistory}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center gap-2 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View History
            </button>
            <button
              onClick={() => onCreateReceipt('')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards - same as before */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-gray-600 to-gray-700 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Rooms</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Available</p>
              <p className="text-3xl font-bold mt-1">{stats.available}</p>
            </div>
            <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Occupied</p>
              <p className="text-3xl font-bold mt-1">{stats.occupied}</p>
            </div>
            <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-600 to-red-700 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Maintenance</p>
              <p className="text-3xl font-bold mt-1">{stats.maintenance}</p>
            </div>
            <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Legend - same as before */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Room Status Legend</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white border-2 border-gray-300 rounded"></div>
            <span className="text-gray-700 font-medium">Available - Ready for check-in</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded"></div>
            <span className="text-gray-700 font-medium">Occupied - Guest checked in</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
              </svg>
            </div>
            <span className="text-gray-700 font-medium">Under Maintenance - Not available</span>
          </div>
          {userLocation === 'adeleke-adedoyin' && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 border-2 border-purple-400 rounded"></div>
              <span className="text-gray-700 font-medium">Manager&apos;s Room</span>
            </div>
          )}
        </div>
      </div>

      {/* Visual Room Grid - same as before */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-6">
          All Rooms - {stats.available} Available
        </h3>
        
        <div className="space-y-4">
          {roomRows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-10 gap-4">
              {row.map((room) => (
                <button
                  key={room.number}
                  onClick={() => handleRoomClick(room)}
                  className={`${getRoomColor(room)} p-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg relative`}
                  disabled={room.isManagerRoom && room.status === 'available'}
                >
                  {/* Unsynced indicator */}
                  {!room.synced && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
                  )}
                  
                  <div className="flex flex-col items-center gap-2">
                    {getRoomIcon(room)}
                    <span className={`text-sm font-bold ${room.status === 'available' && !room.isManagerRoom ? 'text-gray-800' : room.isManagerRoom ? 'text-purple-700' : 'text-white'}`}>
                      {room.number}
                    </span>
                    <span className={`text-xs ${room.status === 'available' && !room.isManagerRoom ? 'text-gray-600' : room.isManagerRoom ? 'text-purple-600' : 'text-white opacity-90'}`}>
                      {getRoomLabel(room)}
                    </span>
                  </div>
                </button>
              ))}
              {rowIndex === roomRows.length - 1 && row.length < 10 && (
                Array(10 - row.length).fill(0).map((_, i) => (
                  <div key={`empty-${i}`} className="p-4"></div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Room Update Modal - same as before with guest info for occupied */}
      {showUpdateModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Room {selectedRoom.number}</h3>
                {selectedRoom.isManagerRoom && (
                  <p className="text-sm text-purple-600 font-semibold">Manager's Room</p>
                )}
                {selectedRoom.linkedRoom && (
                  <p className="text-sm text-gray-600">Combined Room</p>
                )}
                {selectedRoom.guestName && (
                  <p className="text-sm text-gray-600 mt-2">Guest: {selectedRoom.guestName}</p>
                )}
              </div>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Current Status:</p>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                selectedRoom.status === 'available' ? 'bg-green-100 text-green-700' :
                selectedRoom.status === 'occupied' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700'
              }`}>
                {getRoomIcon(selectedRoom)}
                <span className="font-semibold capitalize">{selectedRoom.status}</span>
              </div>
              
              {!selectedRoom.synced && (
                <p className="text-xs text-orange-600 mt-2">⏱ Pending sync to cloud</p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Update Room Status:</p>
              
              {selectedRoom.status !== 'available' && !selectedRoom.isManagerRoom && (
                <button
                  onClick={() => handleUpdateRoomStatus('available')}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mark as Available
                </button>
              )}

              {selectedRoom.status !== 'occupied' && !selectedRoom.isManagerRoom && (
                <button
                  onClick={() => handleUpdateRoomStatus('occupied')}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Check-in Guest (Create Receipt)
                </button>
              )}

              {selectedRoom.status !== 'maintenance' && !selectedRoom.isManagerRoom && (
                <button
                  onClick={() => handleUpdateRoomStatus('maintenance')}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                  </svg>
                  Mark as Maintenance
                </button>
              )}

              {selectedRoom.isManagerRoom && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-purple-700">This is the manager&apos;s room and cannot be modified.</p>
                </div>
              )}

              <button
                onClick={() => setShowUpdateModal(false)}
                className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
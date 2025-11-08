// lib/rooms.ts
import { supabase, isOnline } from './supabase';

export type RoomStatus = 'available' | 'occupied' | 'maintenance';

export interface Room {
  id: string;
  number: string;
  floor: number;
  status: RoomStatus;
  guestName?: string;
  checkIn?: string;
  checkOut?: string;
  lastUpdated: number;
  isManagerRoom?: boolean;
  linkedRoom?: string;
  location: string;
  synced?: boolean;
}

export class RoomService {
  private static readonly STORAGE_KEY = 'atlantic_hotel_rooms';
  private static readonly SYNC_QUEUE_KEY = 'atlantic_hotel_rooms_sync_queue';

  // Location-specific room configurations
  static getLocationRoomConfig(location: string): { rooms: string[], specialRooms: { [key: string]: any } } {
    if (location === 'musa-yaradua') {
      return {
        rooms: [
          '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
          '11/13', // Combined room
          '12', '14', '15', '16', '17', '18', '19', '20',
          '21/23', // Combined room
          '22', '24', '25'
        ],
        specialRooms: {
          '11/13': { linkedRoom: '13', displayName: 'Room 11/13' },
          '21/23': { linkedRoom: '23', displayName: 'Room 21/23' }
        }
      };
    } else if (location === 'adeleke-adedoyin') {
      return {
        rooms: [
          '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
          '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
          '21', '22', '23', '24', '25', '26', '27', '28', '29', '30'
        ],
        specialRooms: {
          '2': { isManagerRoom: true, displayName: "Manager's Room" }
        }
      };
    }
    return { rooms: [], specialRooms: {} };
  }

  // Initialize rooms for specific location
  static async initializeRooms(location: string) {
    console.log('🔧 Initializing rooms for', location);
    
    // Try to fetch from cloud first if online
    if (isOnline()) {
      console.log('☁️ Online - fetching rooms from cloud...');
      const cloudRooms = await this.fetchRoomsFromCloud(location);
      if (cloudRooms.length > 0) {
        console.log(`✅ Fetched ${cloudRooms.length} rooms from cloud`);
        this.saveRoomsToLocal(location, cloudRooms);
        return;
      }
    }

    // Check if already initialized locally
    const existingRooms = this.getRoomsByLocation(location);
    if (existingRooms.length > 0) {
      console.log(`✅ Using ${existingRooms.length} rooms from localStorage`);
      return;
    }

    // Initialize with default configuration
    console.log('🆕 Creating default room configuration...');
    const config = this.getLocationRoomConfig(location);
    const rooms: Room[] = [];
    
    config.rooms.forEach((roomNum, index) => {
      const specialConfig = config.specialRooms[roomNum];
      
      const room: Room = {
        id: `${location}-${roomNum}`,
        number: roomNum,
        floor: Math.floor(index / 10) + 1,
        status: 'available',
        lastUpdated: Date.now(),
        isManagerRoom: specialConfig?.isManagerRoom || false,
        linkedRoom: specialConfig?.linkedRoom,
        location: location,
        synced: false,
      };
      
      rooms.push(room);
    });

    this.saveRoomsToLocal(location, rooms);
    
    // Sync to cloud if online
    if (isOnline()) {
      await this.syncAllRoomsToCloud(location);
    }
  }

  // Fetch rooms from Supabase
  static async fetchRoomsFromCloud(location: string): Promise<Room[]> {
    try {
      console.log('☁️ Fetching rooms from Supabase for', location);
      
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('location', location);

      if (error) {
        console.error('❌ Error fetching rooms:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('📭 No rooms found in cloud for', location);
        return [];
      }

      console.log(`✅ Fetched ${data.length} rooms from cloud`);

      return data.map(item => ({
        id: item.id,
        number: item.room_number,
        floor: item.floor,
        status: item.status,
        guestName: item.guest_name,
        checkIn: item.check_in,
        checkOut: item.check_out,
        lastUpdated: item.last_updated,
        isManagerRoom: item.is_manager_room,
        linkedRoom: item.linked_room,
        location: item.location,
        synced: true,
      }));
    } catch (error) {
      console.error('❌ Exception fetching rooms:', error);
      return [];
    }
  }

  // Sync all rooms to cloud
  static async syncAllRoomsToCloud(location: string): Promise<{ success: number; failed: number }> {
    console.log('🔄 Syncing all rooms to cloud for', location);
    
    if (!isOnline()) {
      console.log('❌ Cannot sync - offline');
      return { success: 0, failed: 0 };
    }

    const rooms = this.getRoomsByLocation(location);
    let success = 0;
    let failed = 0;

    for (const room of rooms) {
      const synced = await this.syncRoomToCloud(room);
      if (synced) {
        success++;
      } else {
        failed++;
      }
    }

    console.log(`✅ Sync complete: ${success} synced, ${failed} failed`);
    return { success, failed };
  }

  // Sync single room to cloud
  static async syncRoomToCloud(room: Room): Promise<boolean> {
    console.log('☁️ Syncing room to cloud:', room.number);
    console.log('📦 Room data:', room);
    
    try {
      const roomData = {
        id: room.id,
        location: room.location,
        room_number: room.number,
        floor: room.floor,
        status: room.status,
        guest_name: room.guestName || null,
        check_in: room.checkIn || null,
        check_out: room.checkOut || null,
        is_manager_room: room.isManagerRoom || false,
        linked_room: room.linkedRoom || null,
        last_updated: room.lastUpdated,
      };

      const { error } = await supabase
        .from('rooms')
        .upsert([roomData], { onConflict: 'id' });

      console.log('📤 Upsert response - Error:', error);

      if (error) {
        console.error('❌ Error syncing room:', room.number, error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        return false;
      }

      // Mark as synced in localStorage
      this.markRoomAsSynced(room.location, room.id);
      return true;
    } catch (error) {
      console.error('❌ Exception syncing room:', error);
      return false;
    }
  }

  // Update room status with offline support
  static async updateRoomStatus(
    location: string,
    roomNumber: string,
    status: RoomStatus,
    guestName?: string,
    checkIn?: string,
    checkOut?: string
  ) {
    console.log(`🔄 Updating room ${roomNumber} to ${status}`);
    console.log('📍 Location:', location);
    console.log('👤 Guest:', guestName);
    console.log('📅 Check-in:', checkIn);
    console.log('🌐 Online:', isOnline());
    
    const rooms = this.getRoomsByLocation(location);
    const updatedRooms = rooms.map(room => {
      if (room.number === roomNumber) {
        return {
          ...room,
          status,
          guestName: status === 'occupied' ? guestName : undefined,
          checkIn: status === 'occupied' ? checkIn : undefined,
          checkOut: status === 'occupied' ? checkOut : undefined,
          lastUpdated: Date.now(),
          synced: false, // Mark as unsynced
        };
      }
      return room;
    });
    
    this.saveRoomsToLocal(location, updatedRooms);

    // Try to sync if online
    const updatedRoom = updatedRooms.find(r => r.number === roomNumber);
    if (updatedRoom && isOnline()) {
      console.log('☁️ Online - syncing room update...');
      await this.syncRoomToCloud(updatedRoom);
    } else {
      console.log('📴 Offline - room update queued for sync');
      this.addToSyncQueue(location, roomNumber);
    }
  }

  // Sync queue management
  static addToSyncQueue(location: string, roomNumber: string) {
    if (typeof window === 'undefined') return;
    
    const queue = this.getSyncQueue();
    const key = `${location}-${roomNumber}`;
    
    if (!queue.includes(key)) {
      queue.push(key);
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
      console.log('📋 Added to sync queue:', key);
    }
  }

  static getSyncQueue(): string[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static removeFromSyncQueue(location: string, roomNumber: string) {
    if (typeof window === 'undefined') return;
    
    const queue = this.getSyncQueue();
    const key = `${location}-${roomNumber}`;
    const updated = queue.filter(item => item !== key);
    
    localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(updated));
    console.log('🗑️ Removed from queue:', key);
  }

  // Sync all pending room updates
  static async syncPendingRooms(): Promise<{ success: number; failed: number }> {
    console.log('🔄 Syncing pending room updates...');
    
    if (!isOnline()) {
      console.log('❌ Cannot sync - offline');
      return { success: 0, failed: 0 };
    }

    const queue = this.getSyncQueue();
    let success = 0;
    let failed = 0;

    for (const queueItem of queue) {
      const [location, roomNumber] = queueItem.split('-');
      const room = this.getRoomByNumber(location, roomNumber);
      
      if (room && !room.synced) {
        const synced = await this.syncRoomToCloud(room);
        if (synced) {
          success++;
          this.removeFromSyncQueue(location, roomNumber);
        } else {
          failed++;
        }
      }
    }

    console.log(`✅ Pending sync complete: ${success} synced, ${failed} failed`);
    return { success, failed };
  }

  // Mark room as synced
  static markRoomAsSynced(location: string, roomId: string) {
    const rooms = this.getRoomsByLocation(location);
    const updated = rooms.map(r => r.id === roomId ? { ...r, synced: true } : r);
    this.saveRoomsToLocal(location, updated);
  }

  // LocalStorage operations
  static getAllRooms(): { [location: string]: Room[] } {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  static getRoomsByLocation(location: string): Room[] {
    const allRooms = this.getAllRooms();
    const rooms = allRooms[location] || [];
    
    // Sort rooms numerically by room number
    return rooms.sort((a, b) => {
      // Handle combined rooms like "11/13"
      const aNum = parseInt(a.number.split('/')[0]);
      const bNum = parseInt(b.number.split('/')[0]);
      return aNum - bNum;
    });
  }

  static saveRoomsToLocal(location: string, rooms: Room[]) {
    if (typeof window === 'undefined') return;
    const allRooms = this.getAllRooms();
    allRooms[location] = rooms;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allRooms));
  }

  // Backward compatible method
  static saveRooms(location: string, rooms: Room[]) {
    this.saveRoomsToLocal(location, rooms);
  }

  static getRoomByNumber(location: string, roomNumber: string): Room | null {
    const rooms = this.getRoomsByLocation(location);
    return rooms.find(r => r.number === roomNumber) || null;
  }

  static getAvailableRooms(location: string): Room[] {
    const rooms = this.getRoomsByLocation(location);
    return rooms.filter(r => r.status === 'available' && !r.isManagerRoom);
  }

  static getOccupiedRooms(location: string): Room[] {
    const rooms = this.getRoomsByLocation(location);
    return rooms.filter(r => r.status === 'occupied');
  }

  static getMaintenanceRooms(location: string): Room[] {
    const rooms = this.getRoomsByLocation(location);
    return rooms.filter(r => r.status === 'maintenance');
  }

  static getRoomStats(location: string) {
    const rooms = this.getRoomsByLocation(location);
    return {
      total: rooms.length,
      available: rooms.filter(r => r.status === 'available').length,
      occupied: rooms.filter(r => r.status === 'occupied').length,
      maintenance: rooms.filter(r => r.status === 'maintenance').length,
      unsynced: rooms.filter(r => !r.synced).length,
    };
  }

  static getRoomsByFloor(location: string, floor: number): Room[] {
    const rooms = this.getRoomsByLocation(location);
    return rooms.filter(r => r.floor === floor).sort((a, b) => {
      const aNum = parseInt(a.number.split('/')[0]);
      const bNum = parseInt(b.number.split('/')[0]);
      return aNum - bNum;
    });
  }

  static getRoomDisplayName(room: Room): string {
    if (room.isManagerRoom) return `Room ${room.number} (Manager)`;
    if (room.linkedRoom) return `Room ${room.number}`;
    return `Room ${room.number}`;
  }

  // Get unsynced count for display
  static getUnsyncedCount(): number {
    return this.getSyncQueue().length;
  }
}
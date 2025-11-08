// lib/locations.ts
export interface Location {
  id: string;
  name: string;
  address: string;
  fullAddress: string;
}

export const LOCATIONS: Location[] = [
  {
    id: 'musa-yaradua',
    name: 'Musa Yar\'Adua Branch',
    address: '20A, Musa Yar\'Adua Street',
    fullAddress: '20A, Musa Yar\'Adua Street, Victoria Island, Lagos, Nigeria'
  },
  {
    id: 'adeleke-adedoyin',
    name: 'Adeleke Adedoyin Branch',
    address: '4A, Adeleke Adedoyin Street',
    fullAddress: '4A, Adeleke Adedoyin Street, Victoria Island, Lagos, Nigeria'
  }
];

export const getLocationById = (id: string): Location | undefined => {
  return LOCATIONS.find(loc => loc.id === id);
};

export const getLocationAddress = (id: string): string => {
  const location = getLocationById(id);
  return location ? location.address : 'Unknown Location';
};

export const getLocationFullAddress = (id: string): string => {
  const location = getLocationById(id);
  return location ? location.fullAddress : 'Unknown Location';
};
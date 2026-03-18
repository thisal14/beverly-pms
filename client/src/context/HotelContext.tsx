import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import type { Hotel } from '@beverly-pms/shared';

interface HotelContextType {
  activeHotelId: number | null;
  setActiveHotelId: (id: number) => void;
  activeHotel: Hotel | null;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

export function HotelProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeHotelId, setActiveHotelId] = useState<number | null>(null);

  const { data: hotels } = useQuery({
    queryKey: ['hotels'],
    queryFn: async () => (await api.get('/hotels')).data.data,
    enabled: !!user
  });

  const activeHotel = hotels?.find((h: Hotel) => h.id === activeHotelId) || null;

  useEffect(() => {
    if (user?.hotel_id) {
      setActiveHotelId(user.hotel_id);
    }
  }, [user]);

  return (
    <HotelContext.Provider value={{ activeHotelId, setActiveHotelId, activeHotel }}>
      {children}
    </HotelContext.Provider>
  );
}

export const useHotel = () => {
  const context = useContext(HotelContext);
  if (context === undefined) {
    throw new Error('useHotel must be used within a HotelProvider');
  }
  return context;
};

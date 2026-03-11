'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface UserLocation {
    country: string;
    state: string | null;
    area_type: 'urban' | 'rural' | null;
    city: string | null;
    corporation: string | null;
    ward: string | null;
    locality: string | null;
    district: string | null;
    block: string | null;
    panchayat: string | null;
    village: string | null;
    lat: number | null;
    lng: number | null;
    gps_label: string | null;
}

interface LocationContextType {
    locationComplete: boolean;
    userLocation: UserLocation | null;
    locationLoading: boolean;
    setLocationComplete: (v: boolean) => void;
    setUserLocation: (loc: UserLocation) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [locationComplete, setLocationComplete] = useState(false);
    const [locationLoading, setLocationLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            // Not logged in: no location needed yet
            setLocationLoading(false);
            setLocationComplete(false);
            return;
        }

        // Fetch profile to check if location is already set
        const check = async () => {
            try {
                const res = await fetch('/api/profile');
                if (!res.ok) { setLocationLoading(false); return; }
                const data = await res.json();
                const loc: UserLocation = {
                    country: data.country || 'India',
                    state: data.state || null,
                    area_type: data.area_type || null,
                    city: data.city || null,
                    corporation: data.corporation || null,
                    ward: data.ward || null,
                    locality: data.locality || null,
                    district: data.district || null,
                    block: data.block || null,
                    panchayat: data.panchayat || null,
                    village: data.village || null,
                    lat: data.lat || null,
                    lng: data.lng || null,
                    gps_label: data.gps_label || null,
                };
                setUserLocation(loc);
                // Location is "complete" if we have at least a state
                setLocationComplete(!!loc.state);
            } catch {
                // On error, don't block the user
                setLocationComplete(true);
            } finally {
                setLocationLoading(false);
            }
        };

        check();
    }, [user, authLoading]);

    return (
        <LocationContext.Provider value={{
            locationComplete,
            userLocation,
            locationLoading,
            setLocationComplete,
            setUserLocation,
        }}>
            {children}
        </LocationContext.Provider>
    );
}

export function useLocation() {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
}

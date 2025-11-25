import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export interface GeolocationState {
  coords: GeolocationCoords | null;
  error: string | null;
  loading: boolean;
  permissionGranted: boolean;
}

/**
 * Custom hook to get user's current geolocation
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: true,
    permissionGranted: false,
  });

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const requestLocationPermission = async () => {
      try {
        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setState({
            coords: null,
            error: 'Location permission denied',
            loading: false,
            permissionGranted: false,
          });
          return;
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setState({
          coords: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
            altitude: location.coords.altitude || undefined,
            heading: location.coords.heading || undefined,
            speed: location.coords.speed || undefined,
          },
          error: null,
          loading: false,
          permissionGranted: true,
        });

        // Watch position for updates
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000, // Update every 10 seconds
            distanceInterval: 100, // Update every 100 meters
          },
          (location) => {
            setState((prevState) => ({
              ...prevState,
              coords: {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy || 0,
                altitude: location.coords.altitude || undefined,
                heading: location.coords.heading || undefined,
                speed: location.coords.speed || undefined,
              },
              loading: false,
            }));
          }
        );
      } catch (error) {
        setState({
          coords: null,
          error: error instanceof Error ? error.message : 'Failed to get location',
          loading: false,
          permissionGranted: false,
        });
      }
    };

    requestLocationPermission();

    // Cleanup subscription
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  return state;
}

/**
 * Hook to get user's current position once (no watching)
 */
export function useCurrentPosition() {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: true,
    permissionGranted: false,
  });

  const refresh = async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setState({
          coords: null,
          error: 'Location permission denied',
          loading: false,
          permissionGranted: false,
        });
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setState({
        coords: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || 0,
          altitude: location.coords.altitude || undefined,
          heading: location.coords.heading || undefined,
          speed: location.coords.speed || undefined,
        },
        error: null,
        loading: false,
        permissionGranted: true,
      });
    } catch (error) {
      setState({
        coords: null,
        error: error instanceof Error ? error.message : 'Failed to get location',
        loading: false,
        permissionGranted: false,
      });
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { ...state, refresh };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Format distance to human-readable string
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

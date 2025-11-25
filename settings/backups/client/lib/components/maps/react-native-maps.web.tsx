/**
 * Web fallback for react-native-maps
 * Platform-specific implementation that gets resolved by Metro
 */
import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

// Type definitions matching react-native-maps API
export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MarkerProps {
  coordinate: LatLng;
  title?: string;
  description?: string;
  onPress?: () => void;
  children?: React.ReactNode;
  identifier?: string;
}

export interface CircleProps {
  center: LatLng;
  radius: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface MapViewProps {
  ref?: React.Ref<MapView>;
  region?: Region;
  initialRegion?: Region;
  onRegionChange?: (region: Region) => void;
  onRegionChangeComplete?: (region: Region) => void;
  children?: React.ReactNode;
  style?: ViewStyle;
  provider?: string;
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
}

// Web fallback MapView component
class MapView extends React.Component<MapViewProps> {
  fitToCoordinates(
    coordinates: LatLng[],
    _options?: {
      edgePadding?: { top: number; right: number; bottom: number; left: number };
      animated?: boolean;
    }
  ) {
    // No-op on web
    console.log('MapView.fitToCoordinates called on web (no-op)', coordinates.length, 'markers');
  }

  render() {
    const { children, style, region, initialRegion } = this.props;
    const displayRegion = region || initialRegion;

    return (
      <View style={[styles.container, style]}>
        <View style={styles.placeholder}>
          <Text style={styles.icon}>🗺️</Text>
          <Text style={styles.title}>Map View</Text>
          {displayRegion && (
            <View style={styles.coordsContainer}>
              <Text style={styles.coordsLabel}>Center:</Text>
              <Text style={styles.coords}>
                {displayRegion.latitude.toFixed(4)}, {displayRegion.longitude.toFixed(4)}
              </Text>
            </View>
          )}
          <Text style={styles.message}>
            Interactive maps are only available on iOS and Android.
          </Text>
          <Text style={styles.hint}>
            View this page on a mobile device to see the full map experience.
          </Text>
        </View>
        {children && <View style={styles.markers}>{children}</View>}
      </View>
    );
  }
}

export const Marker: React.FC<MarkerProps> = ({ title, description, coordinate }) => {
  return (
    <View style={styles.marker}>
      <Text style={styles.markerIcon}>📍</Text>
      {title && <Text style={styles.markerTitle}>{title}</Text>}
      {description && <Text style={styles.markerDesc}>{description}</Text>}
      {coordinate && (
        <Text style={styles.markerCoords}>
          {coordinate.latitude.toFixed(4)}, {coordinate.longitude.toFixed(4)}
        </Text>
      )}
    </View>
  );
};

export const Circle: React.FC<CircleProps> = ({ center, radius }) => {
  return (
    <View style={styles.circle}>
      <Text style={styles.circleIcon}>⭕</Text>
      <Text style={styles.circleText}>Search Radius: {(radius / 1000).toFixed(1)} km</Text>
      {center && (
        <Text style={styles.circleCoords}>
          Center: {center.latitude.toFixed(4)}, {center.longitude.toFixed(4)}
        </Text>
      )}
    </View>
  );
};

// Map providers (constants)
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minHeight: 300,
  },
  placeholder: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  coordsContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  coordsLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  coords: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'monospace',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  hint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  markers: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  marker: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  markerIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  markerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  markerDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  markerCoords: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  circle: {
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#90caf9',
  },
  circleIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  circleText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
    marginBottom: 4,
  },
  circleCoords: {
    fontSize: 12,
    color: '#1565c0',
    fontFamily: 'monospace',
  },
});

export default MapView;

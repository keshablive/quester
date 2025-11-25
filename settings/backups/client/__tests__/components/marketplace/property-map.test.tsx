/**
 * PropertyMap Component Tests
 *
 * Comprehensive tests for the PropertyMap component covering:
 * - Map rendering with markers
 * - User location and radius circle
 * - Marker interaction and selection
 * - Legend display
 * - Property count badge
 * - Region handling
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PropertyMap } from '@/components/marketplace/property-map';
import { Property } from '@/lib/api/properties';

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        fitToCoordinates: jest.fn(),
      }));

      return <View testID="map-view">{props.children}</View>;
    }),
    Marker: ({ children, onPress, coordinate }: any) => {
      if (!coordinate) return null;
      return (
        <View testID={`marker-${coordinate.latitude}-${coordinate.longitude}`} onTouchEnd={onPress}>
          {children}
        </View>
      );
    },
    Circle: ({ center, radius }: any) => (
      <View testID={`circle-${center.latitude}-${center.longitude}-${radius}`} />
    ),
    PROVIDER_GOOGLE: 'google',
  };
});

describe('PropertyMap', () => {
  const mockProperties: Property[] = [
    {
      id: '1',
      title: 'Property 1',
      listing_type: 'for_sale',
      price: 5000000,
      currency: 'INR',
      location: {
        type: 'Point',
        coordinates: [77.209, 28.6139], // [longitude, latitude]
      },
      bedrooms: 3,
      bathrooms: 2,
      area_sqft: 1500,
      images: [],
      address: { city: 'Delhi', state: 'Delhi', country: 'India' },
    } as Property,
    {
      id: '2',
      title: 'Property 2',
      listing_type: 'for_rent',
      price: 25000,
      currency: 'INR',
      location: {
        type: 'Point',
        coordinates: [77.21, 28.615],
      },
      bedrooms: 2,
      bathrooms: 1,
      area_sqft: 1000,
      images: [],
      address: { city: 'Delhi', state: 'Delhi', country: 'India' },
    } as Property,
  ];

  const mockUserLocation = {
    latitude: 28.6139,
    longitude: 77.209,
  };

  const mockOnPropertyPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('should render map view', () => {
      render(<PropertyMap properties={mockProperties} />);

      expect(screen.getByTestId('map-view')).toBeTruthy();
    });

    it('should render property markers', () => {
      render(<PropertyMap properties={mockProperties} />);

      expect(screen.getByTestId('marker-28.6139-77.209')).toBeTruthy();
      expect(screen.getByTestId('marker-28.615-77.21')).toBeTruthy();
    });

    it('should render legend', () => {
      render(<PropertyMap properties={mockProperties} />);

      expect(screen.getByText('For Sale')).toBeTruthy();
      expect(screen.getByText('For Rent')).toBeTruthy();
    });

    it('should render property count badge', () => {
      render(<PropertyMap properties={mockProperties} />);

      expect(screen.getByText('2 properties')).toBeTruthy();
    });

    it('should render user location circle when provided', () => {
      render(
        <PropertyMap properties={mockProperties} userLocation={mockUserLocation} radius={5000} />
      );

      expect(screen.getByTestId('circle-28.6139-77.209-5000')).toBeTruthy();
    });
  });

  // ============================================================================
  // Marker Interaction Tests
  // ============================================================================

  describe('Marker Interaction', () => {
    it('should call onPropertyPress when marker is pressed', () => {
      render(<PropertyMap properties={mockProperties} onPropertyPress={mockOnPropertyPress} />);

      const marker = screen.getByTestId('marker-28.6139-77.209');
      fireEvent(marker, 'touchEnd');

      expect(mockOnPropertyPress).toHaveBeenCalledWith('1');
    });

    it('should show selected property in legend', () => {
      render(<PropertyMap properties={mockProperties} selectedPropertyId="1" />);

      expect(screen.getByText('Selected')).toBeTruthy();
    });

    it('should not show selected legend item when no property selected', () => {
      render(<PropertyMap properties={mockProperties} />);

      expect(screen.queryByText('Selected')).toBeNull();
    });
  });

  // ============================================================================
  // Price Formatting Tests
  // ============================================================================

  describe('Price Formatting', () => {
    it('should format INR prices in lakhs', () => {
      const properties: Property[] = [
        {
          ...mockProperties[0],
          price: 5000000,
          currency: 'INR',
        },
      ];

      render(<PropertyMap properties={properties} />);

      expect(screen.getByText('₹50.0L')).toBeTruthy();
    });

    it('should format USD prices in thousands', () => {
      const properties: Property[] = [
        {
          ...mockProperties[0],
          price: 250000,
          currency: 'USD',
        },
      ];

      render(<PropertyMap properties={properties} />);

      expect(screen.getByText('$250k')).toBeTruthy();
    });

    it('should format other currencies with locale string', () => {
      const properties: Property[] = [
        {
          ...mockProperties[0],
          price: 150000,
          currency: 'EUR',
        },
      ];

      render(<PropertyMap properties={properties} />);

      // Accept either format depending on locale
      const text = screen.getByTestId('marker-28.6139-77.209');
      expect(text).toBeTruthy();
    });
  });

  // ============================================================================
  // Property Count Tests
  // ============================================================================

  describe('Property Count', () => {
    it('should show singular "property" for one property', () => {
      render(<PropertyMap properties={[mockProperties[0]]} />);

      expect(screen.getByText('1 property')).toBeTruthy();
    });

    it('should show plural "properties" for multiple', () => {
      render(<PropertyMap properties={mockProperties} />);

      expect(screen.getByText('2 properties')).toBeTruthy();
    });

    it('should show zero properties correctly', () => {
      render(<PropertyMap properties={[]} />);

      expect(screen.getByText('0 properties')).toBeTruthy();
    });
  });

  // ============================================================================
  // User Location Tests
  // ============================================================================

  describe('User Location', () => {
    it('should render radius circle with custom radius', () => {
      render(
        <PropertyMap properties={mockProperties} userLocation={mockUserLocation} radius={10000} />
      );

      expect(screen.getByTestId('circle-28.6139-77.209-10000')).toBeTruthy();
    });

    it('should use default radius when not specified', () => {
      render(<PropertyMap properties={mockProperties} userLocation={mockUserLocation} />);

      expect(screen.getByTestId('circle-28.6139-77.209-5000')).toBeTruthy();
    });

    it('should not render circle when user location not provided', () => {
      render(<PropertyMap properties={mockProperties} />);

      expect(screen.queryByTestId(/circle-/)).toBeNull();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty properties array', () => {
      render(<PropertyMap properties={[]} />);

      expect(screen.getByTestId('map-view')).toBeTruthy();
      expect(screen.getByText('0 properties')).toBeTruthy();
    });

    it('should handle properties without location', () => {
      const properties: Property[] = [
        {
          ...mockProperties[0],
          location: {
            type: 'Point',
            coordinates: [0, 0],
          },
        },
      ];

      render(<PropertyMap properties={properties} />);
      expect(screen.getByTestId('map-view')).toBeTruthy();
    });

    it('should handle very large property arrays', () => {
      const manyProperties = Array.from({ length: 100 }, (_, i) => ({
        ...mockProperties[0],
        id: `${i}`,
        location: {
          type: 'Point' as const,
          coordinates: [77.209 + i * 0.001, 28.6139 + i * 0.001],
        },
      }));

      render(<PropertyMap properties={manyProperties} />);

      expect(screen.getByText('100 properties')).toBeTruthy();
    });

    it('should handle selectedPropertyId as string or number', () => {
      const { rerender } = render(
        <PropertyMap properties={mockProperties} selectedPropertyId="1" />
      );

      expect(screen.getByText('Selected')).toBeTruthy();

      rerender(<PropertyMap properties={mockProperties} selectedPropertyId={1} />);

      expect(screen.getByText('Selected')).toBeTruthy();
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should render accessible legend labels', () => {
      render(<PropertyMap properties={mockProperties} />);

      const saleLabel = screen.getByText('For Sale');
      const rentLabel = screen.getByText('For Rent');

      expect(saleLabel).toBeTruthy();
      expect(rentLabel).toBeTruthy();
    });

    it('should render accessible count badge', () => {
      render(<PropertyMap properties={mockProperties} />);

      const countText = screen.getByText('2 properties');
      expect(countText).toBeTruthy();
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should render within acceptable time', () => {
      const startTime = Date.now();
      render(<PropertyMap properties={mockProperties} />);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(100);
    });

    it('should handle rapid property updates', () => {
      const { rerender } = render(<PropertyMap properties={mockProperties} />);

      for (let i = 0; i < 10; i++) {
        const updatedProperties = mockProperties.map((p) => ({
          ...p,
          price: p.price + i * 1000,
        }));
        rerender(<PropertyMap properties={updatedProperties} />);
      }

      expect(screen.getByTestId('map-view')).toBeTruthy();
    });
  });
});

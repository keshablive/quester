import { apiClient } from './client';

// Property Types
export interface Point {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface Document {
  id: string;
  type: string;
  url: string;
  verification_status: 'pending' | 'verified' | 'rejected' | 'failed';
  ocr_confidence: number;
  ocr_text?: string;
  rejection_reason?: string;
  verified_at?: string;
}

export interface Property {
  id: string;
  tenant_id: string;
  owner_id: string;
  title: string;
  description: string;
  property_type: 'residential' | 'commercial' | 'land' | 'industrial';
  listing_type: 'for_sale' | 'for_rent';
  status: 'draft' | 'active' | 'sold' | 'rented' | 'expired' | 'suspended';
  price: number;
  currency: string;
  location: Point;
  address: Address;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  year_built?: number;
  images: string[];
  virtual_tour_urls?: string[];
  documents?: Document[];
  verification_score: number;
  is_verified: boolean;
  verified_at?: string;
  amenities?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
  view_count: number;
  contact_count: number;
  favorite_count: number;
  published_at?: string;
  expires_at?: string;
  contact_phone?: string;
  contact_email?: string;
  created_at: string;
  updated_at: string;
}

export interface PropertyWithDistance {
  property: Property;
  distance_meters: number;
  distance_display: string;
}

export interface PropertySearchParams {
  latitude?: number;
  longitude?: number;
  radius?: number; // meters
  property_type?: string;
  listing_type?: string;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  tags?: string | string[];
  // Allow keywords and pagination parameters commonly used by UI screens
  keywords?: string | string[];
  page?: number;
  min_area?: number;
  max_area?: number;
  limit?: number;
  offset?: number;
}

export interface PropertyStats {
  total: number;
  active: number;
  sold: number;
  rented: number;
  expired: number;
  total_views: number;
}

// API Functions

/**
 * Create a new property listing
 */
export async function createProperty(data: Partial<Property>): Promise<Property> {
  const response = await apiClient.post('/properties', data);
  return response.data.data;
}

/**
 * Get property by ID
 */
export async function getProperty(id: string | number): Promise<Property> {
  const response = await apiClient.get(`/properties/${id}`);
  return response.data.data;
}

/**
 * Update property
 */
export async function updateProperty(id: string, data: Partial<Property>): Promise<void> {
  await apiClient.put(`/properties/${id}`, data);
}

/**
 * Delete property
 */
export async function deleteProperty(id: string): Promise<void> {
  await apiClient.delete(`/properties/${id}`);
}

/**
 * Search properties with geo-spatial filtering
 */
export async function searchProperties(
  params: PropertySearchParams
): Promise<{ properties: PropertyWithDistance[]; total: number }> {
  const response = await apiClient.get('/properties/search', { params });
  return {
    properties: response.data.data.properties,
    total: response.data.data.total,
  };
}

/**
 * Upload verification documents
 */
export async function uploadDocuments(
  propertyId: string,
  documents: Partial<Document>[]
): Promise<{ documents: Document[] }> {
  const response = await apiClient.post(`/properties/${propertyId}/documents`, { documents });
  return response.data.data;
}

/**
 * Trigger OCR + AI document verification
 */
export async function verifyDocuments(propertyId: string): Promise<{
  verification_score: number;
  is_verified: boolean;
  documents: Document[];
}> {
  const response = await apiClient.post(`/properties/${propertyId}/verify`);
  return response.data.data;
}

/**
 * Publish property listing
 */
export async function publishProperty(propertyId: string): Promise<Property> {
  const response = await apiClient.post(`/properties/${propertyId}/publish`);
  return response.data.data;
}

/**
 * Increment contact count
 */
export async function incrementContactCount(propertyId: string): Promise<void> {
  await apiClient.post(`/properties/${propertyId}/contact`);
}

/**
 * Get property statistics
 */
export async function getPropertyStats(): Promise<PropertyStats> {
  const response = await apiClient.get('/properties/stats');
  return response.data.data;
}

import { apiClient } from './client';

export type TransactionStatus = 
  | 'initiated'
  | 'pending'
  | 'escrow_held'
  | 'delivered'
  | 'released'
  | 'disputed'
  | 'refunded'
  | 'cancelled'
  | 'failed';

export type PaymentGateway = 'razorpay' | 'stripe' | 'paypal' | 'crypto' | 'upi';

export type DisputeStatus = 'pending' | 'under_review' | 'resolved_refund' | 'resolved_release' | 'rejected';

export interface Transaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  commission_amount: number;
  seller_payout: number;
  payment_gateway: PaymentGateway;
  payment_id?: string;
  payment_details?: Record<string, any>;
  escrow_held_at?: string;
  delivery_confirmed_at?: string;
  funds_released_at?: string;
  auto_release_date?: string;
  dispute_opened_at?: string;
  dispute_reason?: string;
  dispute_status?: DisputeStatus;
  dispute_resolved_at?: string;
  dispute_resolution?: string;
  buyer?: {
    id: string;
    username: string;
    email: string;
  };
  seller?: {
    id: string;
    username: string;
    email: string;
  };
  listing?: {
    id: string;
    title: string;
    listing_type: string;
  };
  created_at: string;
  updated_at: string;
}

export interface InitiateTransactionRequest {
  listing_id: string;
  payment_gateway: PaymentGateway;
}

export interface ConfirmPaymentRequest {
  payment_id: string;
  payment_details?: Record<string, any>;
}

export interface OpenDisputeRequest {
  reason: string;
}

export interface ResolveDisputeRequest {
  resolution: 'refund' | 'release';
  resolution_notes?: string;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Initiate a new transaction
 */
export async function initiateTransaction(data: InitiateTransactionRequest): Promise<{
  transaction: Transaction;
  payment_order: any;
}> {
  const response = await apiClient.post('/transactions', data);
  return response.data;
}

/**
 * Confirm payment and move funds to escrow
 */
export async function confirmPayment(
  transactionId: string,
  data: ConfirmPaymentRequest
): Promise<Transaction> {
  const response = await apiClient.post(`/transactions/${transactionId}/confirm`, data);
  return response.data.transaction;
}

/**
 * Seller confirms delivery
 */
export async function confirmDelivery(transactionId: string): Promise<Transaction> {
  const response = await apiClient.post(`/transactions/${transactionId}/confirm-delivery`);
  return response.data.transaction;
}

/**
 * Buyer releases funds to seller (early release)
 */
export async function releaseFunds(transactionId: string): Promise<Transaction> {
  const response = await apiClient.post(`/transactions/${transactionId}/release`);
  return response.data.transaction;
}

/**
 * Open a dispute on a transaction
 */
export async function openDispute(
  transactionId: string,
  data: OpenDisputeRequest
): Promise<Transaction> {
  const response = await apiClient.post(`/transactions/${transactionId}/dispute`, data);
  return response.data.transaction;
}

/**
 * Resolve a dispute (admin only)
 */
export async function resolveDispute(
  transactionId: string,
  data: ResolveDisputeRequest
): Promise<Transaction> {
  const response = await apiClient.post(`/transactions/${transactionId}/resolve-dispute`, data);
  return response.data.transaction;
}

/**
 * Get a single transaction
 */
export async function getTransaction(id: string): Promise<Transaction> {
  const response = await apiClient.get(`/transactions/${id}`);
  return response.data.transaction;
}

/**
 * Get user's transactions
 */
export async function getTransactions(
  role: 'buyer' | 'seller' | 'all' = 'all',
  page = 1,
  limit = 20
): Promise<PaginatedTransactions> {
  const response = await apiClient.get('/transactions', {
    params: { role, page, limit },
  });
  return response.data;
}

/**
 * Get disputed transactions (admin only)
 */
export async function getDisputedTransactions(
  page = 1,
  limit = 20
): Promise<PaginatedTransactions> {
  const response = await apiClient.get('/transactions/disputed', {
    params: { page, limit },
  });
  return response.data;
}

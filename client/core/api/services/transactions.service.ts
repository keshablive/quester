import { apiClient } from '../client';
import { API_ENDPOINTS } from '../../config/env';

export interface Transaction {
    id: string;
    amount: number;
    currency: string;
    status: string;
    type: string;
    senderId: string;
    receiverId: string;
    createdAt: string;
    updatedAt: string;
}

export const transactionsService = {
    /**
     * Initiate transaction
     */
    async initiate(data: any): Promise<Transaction> {
        try {
            return await apiClient.post(API_ENDPOINTS.TRANSACTIONS.BASE, data);
        } catch (error) {
            console.error('Failed to initiate transaction:', error);
            throw error;
        }
    },

    /**
     * Confirm payment
     */
    async confirmPayment(id: string, paymentDetails: any): Promise<Transaction> {
        try {
            return await apiClient.post(API_ENDPOINTS.TRANSACTIONS.CONFIRM(id), paymentDetails);
        } catch (error) {
            console.error(`Failed to confirm payment for transaction ${id}:`, error);
            throw error;
        }
    },

    /**
     * Confirm delivery
     */
    async confirmDelivery(id: string): Promise<Transaction> {
        try {
            return await apiClient.post(API_ENDPOINTS.TRANSACTIONS.DELIVERY(id));
        } catch (error) {
            console.error(`Failed to confirm delivery for transaction ${id}:`, error);
            throw error;
        }
    },

    /**
     * Release funds
     */
    async releaseFunds(id: string): Promise<Transaction> {
        try {
            return await apiClient.post(API_ENDPOINTS.TRANSACTIONS.RELEASE(id));
        } catch (error) {
            console.error(`Failed to release funds for transaction ${id}:`, error);
            throw error;
        }
    },

    /**
     * Open dispute
     */
    async openDispute(id: string, reason: string): Promise<Transaction> {
        try {
            return await apiClient.post(API_ENDPOINTS.TRANSACTIONS.DISPUTE(id), { reason });
        } catch (error) {
            console.error(`Failed to open dispute for transaction ${id}:`, error);
            throw error;
        }
    },

    /**
     * Resolve dispute (Admin)
     */
    async resolveDispute(id: string, resolution: any): Promise<Transaction> {
        try {
            return await apiClient.post(API_ENDPOINTS.TRANSACTIONS.RESOLVE(id), resolution);
        } catch (error) {
            console.error(`Failed to resolve dispute for transaction ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get transaction
     */
    async get(id: string): Promise<Transaction> {
        try {
            return await apiClient.get(API_ENDPOINTS.TRANSACTIONS.BY_ID(id));
        } catch (error) {
            console.error(`Failed to get transaction ${id}:`, error);
            throw error;
        }
    },

    /**
     * Get my transactions
     */
    async getMyTransactions(): Promise<Transaction[]> {
        try {
            return await apiClient.get(API_ENDPOINTS.TRANSACTIONS.MY);
        } catch (error) {
            console.error('Failed to get my transactions:', error);
            throw error;
        }
    },

    /**
     * Get disputed transactions (Admin)
     */
    async getDisputedTransactions(): Promise<Transaction[]> {
        try {
            return await apiClient.get(API_ENDPOINTS.TRANSACTIONS.DISPUTED);
        } catch (error) {
            console.error('Failed to get disputed transactions:', error);
            throw error;
        }
    }
};

// Feature 003: Marketplace & Wallet Types

export interface Transaction {
  id: string;
  type: 'purchase' | 'sale' | 'earning' | 'refund';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  createdAt: number;
  completedAt?: number;
  description: string;
  itemId?: string;
  itemTitle?: string;
  seller?: {
    id: string;
    username: string;
    avatar?: string;
  };
  buyer?: {
    id: string;
    username: string;
    avatar?: string;
  };
}

export interface EscrowStatus {
  transactionId: string;
  status: 'held' | 'released' | 'disputed';
  amount: number;
  releaseDate: number;
  daysRemaining: number;
  canConfirm: boolean;
  canDispute: boolean;
}

export interface WalletState {
  availableBalance: number;
  pendingEscrow: number;
  totalEarnings: number;
  recentTransactions: Transaction[];
  currency: string;
}

export interface SellerReputation {
  totalSales: number;
  averageRating: number;
  totalReviews: number;
  responseTime: string; // "< 1 hour", "1-2 hours", etc.
  xp: number;
  level: number;
  badges: Array<{
    id: string;
    name: string;
    iconUrl: string;
  }>;
  courseRating?: number; // If instructor
  questCompletionRate?: number; // If quest creator
  reputationScore: number; // Calculated composite score (0-100)
  // Formula: (0.4 * (courseRating/5 * 100)) + (0.3 * (questCompletionRate * 100)) + (0.2 * min(xp/1000, 100)) + (0.1 * min(badges.length * 10, 100))
}

export interface CheckoutState {
  step: 'review' | 'payment' | 'confirm' | 'processing' | 'success';
  listing: any; // Listing details
  paymentMethod?: PaymentMethod;
  total: number;
  platformFee: number;
  escrowPeriod: number; // days
  error?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'points' | 'card' | 'wallet';
  label: string;
  isDefault: boolean;
}

export interface PricingBreakdown {
  basePrice: number;
  platformFee: number;
  platformFeePercent: number;
  escrowPeriod: number; // days
  total: number;
  currency: string;
}

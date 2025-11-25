import { useState, useCallback, useMemo, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import type {
  CheckoutState,
  PaymentMethod,
  PricingBreakdown,
} from '@/lib/types/marketplace';

interface Listing {
  id: string;
  title?: string;
  price: number;
  description?: string;
  imageUrl?: string;
  seller?: any;
}

interface UseCheckoutOptions {
  listingId?: string;
  basePrice?: number;
  currency?: string;
  onSuccess?: (transaction: any) => void;
  onError?: (error: Error) => void;
}

interface UseCheckoutCallbacks {
  onSuccess?: (transaction: any) => void;
  onError?: (error: Error) => void;
}

// Accept either options object or listing object for backward compatibility
type UseCheckoutParams = UseCheckoutOptions | Listing;

interface UseCheckoutReturn {
  // State
  currentStep: CheckoutState['step']; // Step as string ('review', 'payment', etc.)
  selectedPaymentMethod: PaymentMethod | null;
  pricing: PricingBreakdown;
  isProcessing: boolean;
  error: string | null;
  state: CheckoutState; // Backwards compat: contains step as string
  
  // Computed
  progress: number;
  totalSteps: number;
  canProceed: () => boolean;
  
  // Actions
  nextStep: () => void;
  previousStep: () => void;
  selectPaymentMethod: (method: PaymentMethod) => void;
  completePurchase: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
  getPricingBreakdown: () => PricingBreakdown;
}

const PLATFORM_FEE_PERCENT = 5;
const ESCROW_PERIOD_DAYS = 7;

export function useCheckout(
  params: UseCheckoutParams,
  callbacks?: UseCheckoutCallbacks
): UseCheckoutReturn {
  // Handle both old format (options object) and new format (listing object)
  const isListing = 'price' in params && params.price !== undefined;
  const listingId = isListing ? (params as Listing).id : (params as UseCheckoutOptions).listingId || '';
  const basePrice = isListing ? (params as Listing).price : (params as UseCheckoutOptions).basePrice || 0;
  const currency = (params as UseCheckoutOptions).currency || 'USD';
  
  // Support callbacks from either params or separate callbacks argument
  const onSuccess = callbacks?.onSuccess || (params as UseCheckoutOptions).onSuccess;
  const onError = callbacks?.onError || (params as UseCheckoutOptions).onError;
  const listing = isListing ? (params as Listing) : undefined;
  // Validate inputs
  const initialError = useMemo(() => {
    if (basePrice <= 0) {
      return 'Invalid price: must be positive';
    }
    if (!listingId) {
      return 'Invalid listing: missing required ID';
    }
    if (listing && !listing.seller) {
      return 'Invalid listing: missing required seller information';
    }
    return null;
  }, [basePrice, listingId, listing]);

  // State
  const [step, setStep] = useState<CheckoutState['step']>('review');
  const stepRef = useRef<CheckoutState['step']>('review'); // Track latest step for rapid calls
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const selectedPaymentMethodRef = useRef<PaymentMethod | null>(null); // Track latest value for validation
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  // Calculate pricing
  const pricing = useMemo<PricingBreakdown>(() => {
    const platformFee = basePrice * (PLATFORM_FEE_PERCENT / 100);
    const total = basePrice + platformFee;

    return {
      basePrice,
      platformFee,
      platformFeePercent: PLATFORM_FEE_PERCENT,
      escrowPeriod: ESCROW_PERIOD_DAYS,
      total,
      currency,
    };
  }, [basePrice, currency]);

  // Step management
  const stepOrder: Array<CheckoutState['step']> = ['review', 'payment', 'confirm', 'processing', 'success'];
  const currentStep = step; // Return step as string
  const totalSteps = 3; // Only count user-facing steps (review, payment, confirm)

  // Calculate progress (0-1 scale)
  const progress = useMemo(() => {
    const stepIndex = stepOrder.indexOf(step);
    // Processing and success count as 100%
    if (stepIndex >= 3) return 1.0;
    return (stepIndex + 1) / totalSteps; // Step 1/3, 2/3, 3/3
  }, [step, totalSteps]);

  // Validation (check current state including ref for latest payment method)
  const canProceedInternal = useCallback(() => {
    // Block if there's a validation error
    if (error !== null) return false;
    
    const currentPaymentMethod = selectedPaymentMethodRef.current;
    switch (step) {
      case 'review':
        return true; // Can always proceed from review
      case 'payment':
        return currentPaymentMethod !== null; // Need payment method selected
      case 'confirm':
        return currentPaymentMethod !== null && !isProcessing; // Ready to purchase
      case 'processing':
      case 'success':
        return false; // No proceeding from these states
      default:
        return false;
    }
  }, [step, isProcessing, error]);

  // Actions
  const nextStep = useCallback(() => {
    let errorToSet: string | null = null;
    
    // Use ref for immediate step tracking to handle rapid successive calls
    const currentStepForValidation = stepRef.current;
    const currentPaymentMethod = selectedPaymentMethodRef.current;
    
    // Check if can proceed from current step
    let canProceed = true;
    if (currentStepForValidation === 'payment' && currentPaymentMethod === null) {
      canProceed = false;
      errorToSet = 'Please select a payment method before proceeding';
    } else if (currentStepForValidation === 'confirm' && (currentPaymentMethod === null || isProcessing)) {
      canProceed = false;
      errorToSet = 'Please complete the current step before proceeding';
    } else if (currentStepForValidation === 'processing' || currentStepForValidation === 'success') {
      canProceed = false;
    }
    
    if (!canProceed) {
      setError(errorToSet);
      return; // Stay at current step
    }

    // Can proceed - advance to next step
    errorToSet = null;
    const currentIndex = stepOrder.indexOf(currentStepForValidation);
    
    if (currentIndex < stepOrder.length - 1) {
      const nextStepValue = stepOrder[currentIndex + 1];
      
      // Don't advance to processing - completePurchase handles that
      if (nextStepValue === 'processing') {
        return;
      }
      
      stepRef.current = nextStepValue; // Update ref immediately
      setStep(nextStepValue);
    }
    
    setError(null);
  }, [isProcessing]);

  const previousStep = useCallback(() => {
    const currentStepForNav = stepRef.current;
    
    // Can't go back from processing or success
    if (currentStepForNav === 'processing' || currentStepForNav === 'success') {
      return;
    }
    
    const currentIndex = stepOrder.indexOf(currentStepForNav);
    if (currentIndex > 0) {
      const prevStep = stepOrder[currentIndex - 1];
      stepRef.current = prevStep;
      setStep(prevStep);
    }
    
    setError(null);
  }, []);

  const selectPaymentMethod = useCallback((method: PaymentMethod) => {
    // Validate points payment if label contains point amount
    if (method.type === 'points' && method.label.match(/\d+/)) {
      const availablePoints = parseInt(method.label.match(/\d+/)?.[0] || '0');
      const requiredPoints = Math.ceil(pricing.total);
      
      if (availablePoints > 0 && availablePoints < requiredPoints) {
        setError(`Insufficient points. Need ${requiredPoints}, have ${availablePoints}`);
        setSelectedPaymentMethod(null);
        selectedPaymentMethodRef.current = null;
        return;
      }
    }
    
    setSelectedPaymentMethod(method);
    selectedPaymentMethodRef.current = method; // Update ref immediately
    setError(null);
  }, [pricing.total]);

  const completePurchase = useCallback(async () => {
    const currentPaymentMethod = selectedPaymentMethodRef.current;
    if (!currentPaymentMethod) {
      const err = new Error('Please select a payment method');
      setError(err.message);
      onError?.(err);
      return;
    }

    setIsProcessing(true);
    stepRef.current = 'processing'; // Update ref immediately
    setStep('processing');
    setError(null);

    try {
      const response = await apiClient.post<any>('/marketplace/purchase', {
        listingId,
        paymentMethodId: currentPaymentMethod.id,
        total: pricing.total,
        escrowPeriod: pricing.escrowPeriod,
      });

      // Success
      stepRef.current = 'success'; // Update ref immediately
      setStep('success');
      
      // Call onSuccess with purchase result
      if (onSuccess) {
        onSuccess({
          transactionId: response.transactionId,
          listingId,
          total: pricing.total,
        } as any);
      }
    } catch (err) {
      const error = err as any;
      // Extract error message from API response structure or Error object
      const errorMessage = 
        error?.response?.data?.error || 
        error?.response?.data?.message || 
        error?.message || 
        'Failed to complete purchase';
      
      setError(errorMessage);
      stepRef.current = 'confirm'; // Update ref immediately
      setStep('confirm'); // Return to confirm step
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  }, [listingId, selectedPaymentMethod, pricing, onSuccess, onError]);

  const reset = useCallback(() => {
    stepRef.current = 'review';
    setStep('review');
    setSelectedPaymentMethod(null);
    selectedPaymentMethodRef.current = null;
    setIsProcessing(false);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Backwards compatibility: getPricingBreakdown function
  const getPricingBreakdown = useCallback(() => pricing, [pricing]);

  // Backwards compatibility: expose state object for tests
  const state = useMemo<CheckoutState>(() => ({
    step: step,
    listing: listing || { id: listingId, price: basePrice, currency, title: '', description: '', imageUrl: '' },
    paymentMethod: selectedPaymentMethod || undefined,
    escrowPeriod: pricing.escrowPeriod,
    total: pricing.total,
    platformFee: pricing.platformFee,
    isProcessing,
    error: error || undefined, // Convert null to undefined for CheckoutState
  }), [step, listingId, basePrice, currency, listing, selectedPaymentMethod, pricing, isProcessing, error]);

  return {
    // State
    currentStep, // Number (1-5)
    selectedPaymentMethod,
    pricing,
    isProcessing,
    error,
    state, // Backwards compatibility: has step as string
    
    // Computed
    progress,
    totalSteps,
    canProceed: canProceedInternal, // Return function itself
    
    // Actions
    nextStep,
    previousStep,
    selectPaymentMethod,
    completePurchase,
    reset,
    clearError,
    getPricingBreakdown, // Backwards compat
  };
}

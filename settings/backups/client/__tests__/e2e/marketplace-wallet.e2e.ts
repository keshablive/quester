import { by, device, element, expect as detoxExpect, waitFor } from 'detox';

describe('Marketplace & Wallet Integration E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Login as test user with wallet
    await element(by.id('email-input')).typeText('testuser@example.com');
    await element(by.id('password-input')).typeText('Password123!');
    await element(by.id('sign-in-button')).tap();
    await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(5000);
  });

  describe('Marketplace Browsing', () => {
    it('should navigate to marketplace', async () => {
      await element(by.id('tab-marketplace')).tap();
      await waitFor(element(by.id('marketplace-screen'))).toBeVisible().withTimeout(3000);
    });

    it('should display marketplace listings with prices', async () => {
      await element(by.id('tab-marketplace')).tap();
      await waitFor(element(by.id('marketplace-screen'))).toBeVisible();

      // Should show at least one listing
      await detoxExpect(element(by.id('listing-item-0'))).toBeVisible();
      await detoxExpect(element(by.id('listing-price-0'))).toBeVisible();
    });

    it('should display seller reputation on listings', async () => {
      await element(by.id('tab-marketplace')).tap();
      await waitFor(element(by.id('marketplace-screen'))).toBeVisible();

      await element(by.id('listing-item-0')).tap();
      await waitFor(element(by.id('listing-detail-screen'))).toBeVisible();

      // Should show seller reputation card
      await detoxExpect(element(by.id('seller-reputation-card'))).toBeVisible();
      await detoxExpect(element(by.id('seller-rating'))).toBeVisible();
      await detoxExpect(element(by.id('seller-response-time'))).toBeVisible();
    });

    it('should filter marketplace by category', async () => {
      await element(by.id('tab-marketplace')).tap();
      await waitFor(element(by.id('marketplace-screen'))).toBeVisible();

      // Tap category filter
      await element(by.id('category-filter-courses')).tap();

      // Should only show course listings
      await detoxExpect(element(by.text('Courses'))).toBeVisible();
    });
  });

  describe('Purchase Flow', () => {
    it('should complete full checkout flow with points', async () => {
      await element(by.id('tab-marketplace')).tap();
      await waitFor(element(by.id('marketplace-screen'))).toBeVisible();

      // Select a listing
      await element(by.id('listing-item-0')).tap();
      await waitFor(element(by.id('listing-detail-screen'))).toBeVisible();

      // Start checkout
      await element(by.id('buy-now-button')).tap();
      await waitFor(element(by.id('checkout-flow'))).toBeVisible();

      // Step 1: Review
      await detoxExpect(element(by.text('Review Purchase'))).toBeVisible();
      await detoxExpect(element(by.id('pricing-breakdown'))).toBeVisible();
      await element(by.id('continue-to-payment-button')).tap();

      // Step 2: Payment
      await waitFor(element(by.text('Select Payment Method'))).toBeVisible();
      await element(by.id('payment-method-points')).tap();
      await element(by.id('continue-to-confirm-button')).tap();

      // Step 3: Confirm
      await waitFor(element(by.text('Confirm Purchase'))).toBeVisible();
      await detoxExpect(element(by.id('escrow-explanation'))).toBeVisible();
      await element(by.id('complete-purchase-button')).tap();

      // Step 4: Processing & Success
      await waitFor(element(by.text('Processing'))).toBeVisible().withTimeout(2000);
      await waitFor(element(by.text('Purchase Successful'))).toBeVisible().withTimeout(5000);
    });

    it('should show pricing breakdown with fees', async () => {
      await element(by.id('tab-marketplace')).tap();
      await element(by.id('listing-item-0')).tap();
      await element(by.id('buy-now-button')).tap();

      await waitFor(element(by.id('checkout-flow'))).toBeVisible();

      // Check pricing components
      await detoxExpect(element(by.id('item-price'))).toBeVisible();
      await detoxExpect(element(by.id('platform-fee'))).toBeVisible();
      await detoxExpect(element(by.id('total-price'))).toBeVisible();
      await detoxExpect(element(by.text(/5%/))).toBeVisible(); // Platform fee percentage
    });

    it('should allow selecting different payment methods', async () => {
      await element(by.id('tab-marketplace')).tap();
      await element(by.id('listing-item-0')).tap();
      await element(by.id('buy-now-button')).tap();

      await element(by.id('continue-to-payment-button')).tap();
      await waitFor(element(by.text('Select Payment Method'))).toBeVisible();

      // Should show multiple payment options
      await detoxExpect(element(by.id('payment-method-points'))).toBeVisible();
      await detoxExpect(element(by.id('payment-method-wallet'))).toBeVisible();

      // Select wallet
      await element(by.id('payment-method-wallet')).tap();
      await detoxExpect(element(by.id('payment-method-wallet'))).toHaveToggleValue(true);
    });

    it('should show error for insufficient points', async () => {
      await element(by.id('tab-marketplace')).tap();
      await element(by.id('listing-item-expensive')).tap(); // Expensive item
      await element(by.id('buy-now-button')).tap();

      await element(by.id('continue-to-payment-button')).tap();
      await element(by.id('payment-method-points')).tap();

      // Should show insufficient points error
      await detoxExpect(element(by.text(/Insufficient points/i))).toBeVisible();
      await detoxExpect(element(by.id('continue-to-confirm-button'))).not.toBeVisible();
    });
  });

  describe('Wallet Management', () => {
    it('should navigate to wallet screen', async () => {
      await element(by.id('tab-profile')).tap();
      await waitFor(element(by.id('profile-screen'))).toBeVisible();

      await element(by.id('wallet-button')).tap();
      await waitFor(element(by.id('wallet-screen'))).toBeVisible();
    });

    it('should display wallet balance', async () => {
      await element(by.id('tab-profile')).tap();
      await element(by.id('wallet-button')).tap();

      await waitFor(element(by.id('wallet-screen'))).toBeVisible();

      // Should show balance components
      await detoxExpect(element(by.id('available-balance'))).toBeVisible();
      await detoxExpect(element(by.id('pending-escrow'))).toBeVisible();
      await detoxExpect(element(by.id('total-earnings'))).toBeVisible();
    });

    it('should display transaction history', async () => {
      await element(by.id('tab-profile')).tap();
      await element(by.id('wallet-button')).tap();

      await waitFor(element(by.id('wallet-screen'))).toBeVisible();

      // Scroll to transactions
      await element(by.id('wallet-scroll-view')).scrollTo('bottom');

      // Should show recent transactions
      await detoxExpect(element(by.id('transaction-list'))).toBeVisible();
      await detoxExpect(element(by.id('transaction-item-0'))).toBeVisible();
    });

    it('should show transaction details on tap', async () => {
      await element(by.id('tab-profile')).tap();
      await element(by.id('wallet-button')).tap();
      await element(by.id('wallet-scroll-view')).scrollTo('bottom');

      await element(by.id('transaction-item-0')).tap();
      await waitFor(element(by.id('transaction-detail-modal'))).toBeVisible();

      // Should show full transaction details
      await detoxExpect(element(by.id('transaction-receipt'))).toBeVisible();
      await detoxExpect(element(by.id('transaction-status'))).toBeVisible();
      await detoxExpect(element(by.id('transaction-date'))).toBeVisible();
    });

    it('should filter transactions by type', async () => {
      await element(by.id('tab-profile')).tap();
      await element(by.id('wallet-button')).tap();
      await element(by.id('wallet-scroll-view')).scrollTo('bottom');

      // Apply filter
      await element(by.id('transaction-filter-button')).tap();
      await element(by.id('filter-purchases')).tap();
      await element(by.id('apply-filter-button')).tap();

      // Should only show purchases
      await detoxExpect(element(by.text('Purchases'))).toBeVisible();
    });
  });

  describe('Escrow Management', () => {
    it('should display escrow status for pending transactions', async () => {
      await element(by.id('tab-profile')).tap();
      await element(by.id('wallet-button')).tap();

      // Check pending escrow section
      await detoxExpect(element(by.id('pending-escrow'))).toBeVisible();
      await element(by.id('pending-escrow')).tap();

      // Should show escrow details
      await waitFor(element(by.id('escrow-list'))).toBeVisible();
      await detoxExpect(element(by.id('escrow-item-0'))).toBeVisible();
    });

    it('should show escrow release countdown', async () => {
      await element(by.id('tab-profile')).tap();
      await element(by.id('wallet-button')).tap();
      await element(by.id('pending-escrow')).tap();

      await element(by.id('escrow-item-0')).tap();
      await waitFor(element(by.id('escrow-detail-modal'))).toBeVisible();

      // Should show days remaining
      await detoxExpect(element(by.id('days-remaining'))).toBeVisible();
      await detoxExpect(element(by.text(/days remaining/i))).toBeVisible();
    });

    it('should allow buyer to confirm delivery', async () => {
      await element(by.id('tab-profile')).tap();
      await element(by.id('wallet-button')).tap();
      await element(by.id('pending-escrow')).tap();

      await element(by.id('escrow-item-0')).tap();
      await waitFor(element(by.id('escrow-detail-modal'))).toBeVisible();

      // Confirm delivery button should be visible
      await detoxExpect(element(by.id('confirm-delivery-button'))).toBeVisible();
      await element(by.id('confirm-delivery-button')).tap();

      // Should show confirmation dialog
      await waitFor(element(by.text('Confirm Delivery?'))).toBeVisible();
      await element(by.text('Confirm')).tap();

      // Should show success message
      await waitFor(element(by.text(/Funds released to seller/i))).toBeVisible().withTimeout(3000);
    });

    it('should allow initiating dispute', async () => {
      await element(by.id('tab-profile')).tap();
      await element(by.id('wallet-button')).tap();
      await element(by.id('pending-escrow')).tap();

      await element(by.id('escrow-item-0')).tap();
      await element(by.id('dispute-button')).tap();

      // Should show dispute form
      await waitFor(element(by.id('dispute-form'))).toBeVisible();
      await detoxExpect(element(by.id('dispute-reason-input'))).toBeVisible();
      await element(by.id('dispute-reason-input')).typeText('Item not as described');
      await element(by.id('submit-dispute-button')).tap();

      // Should show dispute submitted message
      await waitFor(element(by.text(/Dispute submitted/i))).toBeVisible();
    });
  });

  describe('Seller Features', () => {
    it('should show seller dashboard for sellers', async () => {
      // Switch to seller account
      await element(by.id('tab-profile')).tap();
      await element(by.id('settings-button')).tap();
      await element(by.id('switch-account-button')).tap();
      await element(by.id('seller-account')).tap();

      await element(by.id('tab-marketplace')).tap();
      await element(by.id('my-listings-tab')).tap();

      // Should show seller-specific views
      await detoxExpect(element(by.id('active-listings'))).toBeVisible();
      await detoxExpect(element(by.id('total-sales'))).toBeVisible();
      await detoxExpect(element(by.id('pending-earnings'))).toBeVisible();
    });

    it('should show reputation score on seller profile', async () => {
      await element(by.id('tab-marketplace')).tap();
      await element(by.id('listing-item-0')).tap();
      await element(by.id('seller-reputation-card')).tap();

      // Should navigate to seller profile
      await waitFor(element(by.id('seller-profile-screen'))).toBeVisible();

      // Should show detailed reputation
      await detoxExpect(element(by.id('reputation-score'))).toBeVisible();
      await detoxExpect(element(by.id('total-sales'))).toBeVisible();
      await detoxExpect(element(by.id('average-rating'))).toBeVisible();
      await detoxExpect(element(by.id('badges-list'))).toBeVisible();
    });
  });

  describe('Performance', () => {
    it('should load marketplace within 2 seconds', async () => {
      const start = Date.now();

      await element(by.id('tab-marketplace')).tap();
      await waitFor(element(by.id('marketplace-screen'))).toBeVisible().withTimeout(2000);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000);
    });

    it('should scroll marketplace listings smoothly', async () => {
      await element(by.id('tab-marketplace')).tap();
      await waitFor(element(by.id('marketplace-screen'))).toBeVisible();

      // Scroll quickly
      await element(by.id('marketplace-list')).scroll(1000, 'down', NaN, 0.5);
      await element(by.id('marketplace-list')).scroll(1000, 'down', NaN, 0.5);

      // Should remain responsive
      await detoxExpect(element(by.id('marketplace-screen'))).toBeVisible();
    });

    it('should handle checkout without lag', async () => {
      const start = Date.now();

      await element(by.id('tab-marketplace')).tap();
      await element(by.id('listing-item-0')).tap();
      await element(by.id('buy-now-button')).tap();

      await waitFor(element(by.id('checkout-flow'))).toBeVisible().withTimeout(1000);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Offline Behavior', () => {
    it('should show offline banner in marketplace', async () => {
      await element(by.id('tab-marketplace')).tap();
      await waitFor(element(by.id('marketplace-screen'))).toBeVisible();

      // Simulate offline
      await device.setURLBlacklist(['.*']);

      // Should show offline indicator
      await waitFor(element(by.id('offline-banner'))).toBeVisible().withTimeout(2000);
    });

    it('should prevent purchases when offline', async () => {
      await device.setURLBlacklist(['.*']); // Go offline

      await element(by.id('tab-marketplace')).tap();
      await element(by.id('listing-item-0')).tap();
      await element(by.id('buy-now-button')).tap();

      // Should show offline error
      await waitFor(element(by.text(/No internet connection/i))).toBeVisible();
    });
  });
});

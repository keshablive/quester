/**
 * E2E Tests: Marketplace Flow
 * Tests: Browse products, Add to cart, Checkout, Order confirmation
 */

import {
  waitForElement,
  tapElement,
  typeText,
  replaceText,
  scrollToElement,
  expectElementToHaveText,
  takeScreenshot,
  TEST_USER,
  TEST_IDS,
  WAIT_MEDIUM,
  WAIT_LONG,
} from './helpers';

describe('Marketplace Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    
    // Login as test user
    await waitForElement(by.id(TEST_IDS.SIGN_IN_EMAIL_INPUT));
    await element(by.id(TEST_IDS.SIGN_IN_EMAIL_INPUT)).replaceText(TEST_USER.email);
    await element(by.id(TEST_IDS.SIGN_IN_PASSWORD_INPUT)).replaceText(TEST_USER.password);
    await tapElement(by.id(TEST_IDS.SIGN_IN_BUTTON));
    
    // Wait for home screen
    await waitForElement(by.id(TEST_IDS.HOME_TAB), WAIT_MEDIUM);
  });

  beforeEach(async () => {
    // Navigate to marketplace tab
    await tapElement(by.id(TEST_IDS.MARKETPLACE_TAB));
    await waitForElement(by.text('Marketplace'));
  });

  describe('Browse Products', () => {
    it('should display product grid', async () => {
      await waitForElement(by.id('product-grid'));
      await expect(element(by.id('product-grid'))).toBeVisible();
      await takeScreenshot('product-grid');
    });

    it('should show product cards with details', async () => {
      const productCard = by.id(TEST_IDS.PRODUCT_CARD).withAncestor(by.id('product-grid'));
      await waitForElement(productCard);
      
      // Should show product image, name, price, rating
      await expect(element(productCard)).toBeVisible();
      await expect(element(by.id('product-image').withAncestor(productCard))).toBeVisible();
      await expect(element(by.id('product-name').withAncestor(productCard))).toBeVisible();
      await expect(element(by.id('product-price').withAncestor(productCard))).toBeVisible();
      await takeScreenshot('product-card-details');
    });

    it('should filter products by category', async () => {
      await tapElement(by.id('category-filter'));
      await waitForElement(by.text('Categories'));
      await tapElement(by.text('Electronics'));
      await tapElement(by.text('Apply'));
      
      // Should show only electronics
      await waitForElement(by.text('Electronics'), WAIT_MEDIUM);
      await takeScreenshot('filtered-products');
    });

    it('should search products', async () => {
      await tapElement(by.id('search-input'));
      await typeText(by.id('search-input'), 'iPhone');
      
      // Should show search results
      await waitForElement(by.text(/iPhone/i), WAIT_MEDIUM);
      await expect(element(by.text(/iPhone/i))).toBeVisible();
      await takeScreenshot('product-search-results');
    });

    it('should sort products by price', async () => {
      await tapElement(by.id('sort-button'));
      await waitForElement(by.text('Sort By'));
      await tapElement(by.text('Price: Low to High'));
      
      // Should reorder products
      await waitForElement(by.id('product-grid'), WAIT_MEDIUM);
      await takeScreenshot('sorted-products');
    });

    it('should show product details on tap', async () => {
      const firstProduct = element(by.id(TEST_IDS.PRODUCT_CARD)).atIndex(0);
      await tapElement(firstProduct);
      
      // Should navigate to product details
      await waitForElement(by.text('Product Details'), WAIT_MEDIUM);
      await expect(element(by.text('Product Details'))).toBeVisible();
      await expect(element(by.id('product-description'))).toBeVisible();
      await expect(element(by.id(TEST_IDS.ADD_TO_CART_BUTTON))).toBeVisible();
      await takeScreenshot('product-details');
    });
  });

  describe('Product Details', () => {
    beforeEach(async () => {
      // Navigate to a product
      const firstProduct = element(by.id(TEST_IDS.PRODUCT_CARD)).atIndex(0);
      await tapElement(firstProduct);
      await waitForElement(by.text('Product Details'));
    });

    it('should show product images carousel', async () => {
      await waitForElement(by.id('image-carousel'));
      await expect(element(by.id('image-carousel'))).toBeVisible();
      
      // Should be able to swipe through images
      await element(by.id('image-carousel')).swipe('left');
      await takeScreenshot('product-image-carousel');
    });

    it('should show product specifications', async () => {
      await scrollToElement('product-details-scroll', 'specifications-section');
      await waitForElement(by.id('specifications-section'));
      await expect(element(by.id('specifications-section'))).toBeVisible();
      await takeScreenshot('product-specifications');
    });

    it('should show product reviews', async () => {
      await scrollToElement('product-details-scroll', 'reviews-section');
      await waitForElement(by.id('reviews-section'));
      await expect(element(by.id('reviews-section'))).toBeVisible();
      await takeScreenshot('product-reviews');
    });

    it('should select product quantity', async () => {
      await tapElement(by.id('quantity-increase-button'));
      await tapElement(by.id('quantity-increase-button'));
      
      // Should show quantity 3
      await expectElementToHaveText(by.id('quantity-display'), '3');
      await takeScreenshot('quantity-selected');
    });

    it('should select product variant', async () => {
      // Check if product has variants
      const variantSelector = by.id('variant-selector');
      if (await element(variantSelector).exists()) {
        await tapElement(variantSelector);
        await waitForElement(by.text('Select Variant'));
        await tapElement(by.text('Medium'));
        await expectElementToHaveText(by.id('selected-variant'), 'Medium');
      }
    });
  });

  describe('Shopping Cart', () => {
    beforeEach(async () => {
      // Add product to cart
      const firstProduct = element(by.id(TEST_IDS.PRODUCT_CARD)).atIndex(0);
      await tapElement(firstProduct);
      await waitForElement(by.id(TEST_IDS.ADD_TO_CART_BUTTON));
    });

    it('should add product to cart', async () => {
      await tapElement(by.id(TEST_IDS.ADD_TO_CART_BUTTON));
      
      // Should show success message
      await waitForElement(by.text(/added to cart/i), WAIT_MEDIUM);
      await takeScreenshot('product-added-to-cart');
      
      // Cart icon should show item count
      await expect(element(by.id('cart-badge'))).toBeVisible();
      await expectElementToHaveText(by.id('cart-badge'), '1');
    });

    it('should navigate to cart', async () => {
      await tapElement(by.id(TEST_IDS.CART_ICON));
      
      // Should show cart screen
      await waitForElement(by.text('Shopping Cart'), WAIT_MEDIUM);
      await expect(element(by.text('Shopping Cart'))).toBeVisible();
      await takeScreenshot('shopping-cart');
    });

    it('should display cart items', async () => {
      await tapElement(by.id(TEST_IDS.CART_ICON));
      await waitForElement(by.id('cart-item'));
      
      // Should show product in cart
      await expect(element(by.id('cart-item'))).toBeVisible();
      await expect(element(by.id('cart-item-name'))).toBeVisible();
      await expect(element(by.id('cart-item-price'))).toBeVisible();
      await expect(element(by.id('cart-item-quantity'))).toBeVisible();
    });

    it('should update cart item quantity', async () => {
      await tapElement(by.id(TEST_IDS.CART_ICON));
      await waitForElement(by.id('cart-item'));
      
      // Increase quantity
      await tapElement(by.id('increase-quantity-button'));
      
      // Should update total
      await waitForElement(by.text(/total/i));
      await takeScreenshot('cart-quantity-updated');
    });

    it('should remove item from cart', async () => {
      await tapElement(by.id(TEST_IDS.CART_ICON));
      await waitForElement(by.id('cart-item'));
      
      // Remove item
      await tapElement(by.id('remove-item-button'));
      await waitForElement(by.text('Remove Item?'));
      await tapElement(by.text('Remove'));
      
      // Should show empty cart
      await waitForElement(by.text(/cart is empty/i), WAIT_MEDIUM);
      await takeScreenshot('cart-empty');
    });

    it('should show cart total', async () => {
      // Add multiple products
      await tapElement(by.id(TEST_IDS.MARKETPLACE_TAB));
      const product1 = element(by.id(TEST_IDS.PRODUCT_CARD)).atIndex(0);
      await tapElement(product1);
      await tapElement(by.id(TEST_IDS.ADD_TO_CART_BUTTON));
      await device.pressBack();
      
      const product2 = element(by.id(TEST_IDS.PRODUCT_CARD)).atIndex(1);
      await tapElement(product2);
      await tapElement(by.id(TEST_IDS.ADD_TO_CART_BUTTON));
      
      // View cart
      await tapElement(by.id(TEST_IDS.CART_ICON));
      
      // Should show subtotal, tax, shipping, total
      await expect(element(by.text('Subtotal'))).toBeVisible();
      await expect(element(by.text('Tax'))).toBeVisible();
      await expect(element(by.text('Shipping'))).toBeVisible();
      await expect(element(by.text('Total'))).toBeVisible();
      await takeScreenshot('cart-total');
    });
  });

  describe('Checkout Process', () => {
    beforeEach(async () => {
      // Add product and navigate to cart
      await tapElement(by.id(TEST_IDS.MARKETPLACE_TAB));
      const product = element(by.id(TEST_IDS.PRODUCT_CARD)).atIndex(0);
      await tapElement(product);
      await tapElement(by.id(TEST_IDS.ADD_TO_CART_BUTTON));
      await tapElement(by.id(TEST_IDS.CART_ICON));
      await waitForElement(by.id(TEST_IDS.CHECKOUT_BUTTON));
    });

    it('should navigate to checkout', async () => {
      await tapElement(by.id(TEST_IDS.CHECKOUT_BUTTON));
      
      // Should show checkout screen
      await waitForElement(by.text('Checkout'), WAIT_MEDIUM);
      await expect(element(by.text('Checkout'))).toBeVisible();
      await takeScreenshot('checkout-screen');
    });

    it('should display shipping address form', async () => {
      await tapElement(by.id(TEST_IDS.CHECKOUT_BUTTON));
      await waitForElement(by.text('Shipping Address'));
      
      await expect(element(by.id('address-line1-input'))).toBeVisible();
      await expect(element(by.id('city-input'))).toBeVisible();
      await expect(element(by.id('state-input'))).toBeVisible();
      await expect(element(by.id('zipcode-input'))).toBeVisible();
      await takeScreenshot('shipping-address-form');
    });

    it('should validate shipping address', async () => {
      await tapElement(by.id(TEST_IDS.CHECKOUT_BUTTON));
      await waitForElement(by.text('Shipping Address'));
      
      // Try to proceed without filling form
      await tapElement(by.id('continue-to-payment-button'));
      
      // Should show validation errors
      await waitForElement(by.text(/required/i));
      await expect(element(by.text(/required/i))).toBeVisible();
    });

    it('should fill shipping address', async () => {
      await tapElement(by.id(TEST_IDS.CHECKOUT_BUTTON));
      await waitForElement(by.text('Shipping Address'));
      
      // Fill address form
      await replaceText(by.id('address-line1-input'), '123 Test Street');
      await replaceText(by.id('city-input'), 'San Francisco');
      await replaceText(by.id('state-input'), 'CA');
      await replaceText(by.id('zipcode-input'), '94102');
      await replaceText(by.id('phone-input'), '555-1234');
      
      await tapElement(by.id('continue-to-payment-button'));
      
      // Should navigate to payment
      await waitForElement(by.text('Payment Method'), WAIT_MEDIUM);
      await takeScreenshot('payment-screen');
    });

    it('should display payment options', async () => {
      // Continue from shipping address
      await expect(element(by.text('Credit Card'))).toBeVisible();
      await expect(element(by.text('PayPal'))).toBeVisible();
      await expect(element(by.text('Stripe'))).toBeVisible();
    });

    it('should fill credit card details', async () => {
      await tapElement(by.text('Credit Card'));
      
      // Fill payment form
      await replaceText(by.id('card-number-input'), '4242424242424242');
      await replaceText(by.id('expiry-input'), '12/25');
      await replaceText(by.id('cvv-input'), '123');
      await replaceText(by.id('cardholder-name-input'), 'Test User');
      
      await takeScreenshot('payment-details-filled');
    });

    it('should show order summary', async () => {
      await scrollToElement('checkout-scroll', 'order-summary');
      await waitForElement(by.id('order-summary'));
      
      // Should show items, prices, total
      await expect(element(by.id('order-summary'))).toBeVisible();
      await expect(element(by.text('Order Total'))).toBeVisible();
      await takeScreenshot('order-summary');
    });
  });

  describe('Order Completion', () => {
    beforeEach(async () => {
      // Complete checkout process
      await tapElement(by.id(TEST_IDS.MARKETPLACE_TAB));
      const product = element(by.id(TEST_IDS.PRODUCT_CARD)).atIndex(0);
      await tapElement(product);
      await tapElement(by.id(TEST_IDS.ADD_TO_CART_BUTTON));
      await tapElement(by.id(TEST_IDS.CART_ICON));
      await tapElement(by.id(TEST_IDS.CHECKOUT_BUTTON));
      
      // Fill shipping address
      await replaceText(by.id('address-line1-input'), '123 Test Street');
      await replaceText(by.id('city-input'), 'San Francisco');
      await replaceText(by.id('state-input'), 'CA');
      await replaceText(by.id('zipcode-input'), '94102');
      await tapElement(by.id('continue-to-payment-button'));
      
      // Fill payment details
      await replaceText(by.id('card-number-input'), '4242424242424242');
      await replaceText(by.id('expiry-input'), '12/25');
      await replaceText(by.id('cvv-input'), '123');
    });

    it('should place order successfully', async () => {
      await tapElement(by.id('place-order-button'));
      
      // Should show processing
      await waitForElement(by.text(/processing/i), WAIT_MEDIUM);
      
      // Should show success
      await waitForElement(by.text(/order placed/i), WAIT_LONG);
      await expect(element(by.text(/order placed/i))).toBeVisible();
      await takeScreenshot('order-placed');
    });

    it('should display order confirmation', async () => {
      await tapElement(by.id('place-order-button'));
      await waitForElement(by.text('Order Confirmation'), WAIT_LONG);
      
      // Should show order details
      await expect(element(by.text('Order Confirmation'))).toBeVisible();
      await expect(element(by.id('order-number'))).toBeVisible();
      await expect(element(by.id('order-total'))).toBeVisible();
      await expect(element(by.text('Estimated Delivery'))).toBeVisible();
      await takeScreenshot('order-confirmation');
    });

    it('should send confirmation email', async () => {
      // Should show email sent message
      await waitForElement(by.text(/confirmation email sent/i));
      await expect(element(by.text(/confirmation email sent/i))).toBeVisible();
    });

    it('should add order to order history', async () => {
      // Navigate to profile > orders
      await tapElement(by.id(TEST_IDS.PROFILE_TAB));
      await waitForElement(by.text('My Orders'));
      await tapElement(by.text('My Orders'));
      
      // Should show recent order
      await waitForElement(by.id('order-item'), WAIT_MEDIUM);
      await expect(element(by.id('order-item'))).toBeVisible();
      await takeScreenshot('order-history');
    });

    it('should allow order tracking', async () => {
      await tapElement(by.id(TEST_IDS.PROFILE_TAB));
      await tapElement(by.text('My Orders'));
      await waitForElement(by.id('order-item'));
      
      // Tap on order
      await tapElement(by.id('order-item'));
      
      // Should show order details and tracking
      await waitForElement(by.text('Order Details'), WAIT_MEDIUM);
      await expect(element(by.text('Track Order'))).toBeVisible();
      await takeScreenshot('order-tracking');
    });

    it('should clear cart after order', async () => {
      // Navigate to cart
      await tapElement(by.id(TEST_IDS.MARKETPLACE_TAB));
      await tapElement(by.id(TEST_IDS.CART_ICON));
      
      // Cart should be empty
      await waitForElement(by.text(/cart is empty/i), WAIT_MEDIUM);
      await expect(element(by.text(/cart is empty/i))).toBeVisible();
    });
  });
});

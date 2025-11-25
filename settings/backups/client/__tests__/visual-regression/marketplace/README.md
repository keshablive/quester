# Marketplace Screen Visual Regression Baseline

## Captured: November 10, 2025

### Screenshots

- `listing-light.png` - Marketplace listing in light theme
- `listing-dark.png` - Marketplace listing in dark theme
- `search-active-light.png` - Search bar with query
- `filters-open-light.png` - Filters panel expanded
- `empty-state-light.png` - No listings found

### Test Cases

1. **Header**
   - "Marketplace" title
   - Search input with icon
   - Filter button

2. **Search & Filters**
   - Search input with label
   - Filter button (SlidersHorizontal icon)
   - Sort options (newest, price_low, price_high)
   - Category badges

3. **Product Grid**
   - 2-column FlatList layout
   - ListingCard components
   - Product images
   - Title, price, seller info
   - "Buy" button on each card

4. **Performance Optimizations**
   - FlatList with getItemLayout (2-column grid)
   - removeClippedSubviews={true}
   - maxToRenderPerBatch={10}
   - windowSize={21}
   - Pull-to-refresh

5. **Accessibility**
   - Search input with label and hint
   - Filter button with role and label
   - List role for FlatList
   - Product cards with proper structure
   - Buy buttons with hints

6. **States**
   - Loading indicator
   - Empty state message
   - Error handling

## Status: ✅ Optimized 2-column grid with accessibility

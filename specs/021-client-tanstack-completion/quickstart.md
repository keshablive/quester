# Quickstart: TanStack Query Component Testing Checklist

**Feature**: 021-client-tanstack-completion  
**Date**: November 30, 2025

## Overview

This document provides the manual testing checklist for verifying each migrated component. Per FR-014, each component MUST pass this checklist before being marked complete.

## Pre-requisites

1. Build and run the app: `npx expo start`
2. Have a logged-in user with:
   - At least 1 transaction
   - Access to marketplace (view properties/classifieds)
   - Notification settings available
3. Know how to toggle airplane mode on device/simulator

---

## Component 1: TransactionDetail

**File**: `components/pages/transactions/TransactionDetail.tsx`  
**Hook**: `useTransaction(transactionId)`

### Test Checklist

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1 | Open transaction detail | Detail loads, shows transaction data | ☐ |
| 2 | Navigate away, return to same transaction | Data appears instantly (<100ms) | ☐ |
| 3 | Pull down to refresh | Subtle spinner appears, data refreshes | ☐ |
| 4 | Turn on airplane mode, view cached transaction | Data displays with offline indicator | ☐ |
| 5 | Offline indicator shows timestamp | "Showing cached data" message visible | ☐ |
| 6 | Simulate error (invalid ID) | Error state with retry button | ☐ |
| 7 | Tap retry button | Refetch attempt made | ☐ |

### Notes

- Transaction actions (confirm delivery, release funds) still use local state - not part of this migration

---

## Component 2: MarketplaceDetail

**File**: `components/pages/marketplace/MarketplaceDetail.tsx`  
**Hooks**: `useMarketplaceProperty(id)` or `useMarketplaceClassified(id)`

### Test Checklist

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1 | Open property detail | Property loads, shows all fields | ☐ |
| 2 | Open classified detail | Classified loads, shows all fields | ☐ |
| 3 | Navigate away, return to same item | Data appears instantly (<100ms) | ☐ |
| 4 | View property, then different property | Second property loads from network | ☐ |
| 5 | Return to first property | First property loads from cache | ☐ |
| 6 | Airplane mode with cached property | Data displays with offline indicator | ☐ |
| 7 | Error state (invalid ID) | Error message with retry button | ☐ |
| 8 | Contact button works | Contact action triggers | ☐ |

### Notes

- MarketplaceDetail handles both types via `type` prop
- Mark as sold action still uses local state

---

## Component 3: NotificationSettings

**File**: `components/pages/settings/NotificationSettings.tsx`  
**Hooks**: `useNotificationSettings()`, `useUpdateNotificationSettings()`

### Test Checklist

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1 | Open settings | Current settings load from server | ☐ |
| 2 | Toggle push notifications | UI updates instantly (optimistic) | ☐ |
| 3 | Toggle email updates | UI updates instantly (optimistic) | ☐ |
| 4 | Rapid toggle spam (5+ times quickly) | Debounce: only final state sent | ☐ |
| 5 | Airplane mode, toggle setting | Setting appears changed, queued for sync | ☐ |
| 6 | Turn off airplane mode | Queued mutation syncs | ☐ |
| 7 | Simulate server error | UI reverts to previous state | ☐ |
| 8 | Error shows toast | Toast notification appears | ☐ |
| 9 | Navigate away, return | Settings appear instantly from cache | ☐ |

### Notes

- 300ms debounce interval per clarification
- Optimistic updates via `useUpdateNotificationSettings` hook

---

## General Testing Notes

### Cache Verification

To verify caching is working:

1. Open React Query DevTools (shake device in dev mode)
2. Check query cache entries exist after navigation
3. Verify stale times match constants:
   - Transactions: 60 seconds
   - Marketplace: 300 seconds
   - Notification Settings: 300 seconds

### Offline Testing

1. Load data while online
2. Enable airplane mode
3. Navigate to cached screens
4. Verify offline indicator appears for data >1 hour old
5. Verify data still displays (not error screen)

### Performance Verification

Use React DevTools Profiler:

1. Record navigation to cached screen
2. Verify render time <100ms
3. No unnecessary re-renders during background refetch

---

## Sign-off

| Component | Tester | Date | All Tests Pass |
|-----------|--------|------|----------------|
| TransactionDetail | | | ☐ |
| MarketplaceDetail | | | ☐ |
| NotificationSettings | | | ☐ |

**Feature Complete**: All components pass → Ready for PR review

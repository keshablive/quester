# Data Model: Client TanStack Query Migration

**Feature**: 020-client-tanstack-query-migration  
**Date**: 2025-11-30  
**Purpose**: Define query/cache data structures, types, and relationships

## Query Key Structure

All query keys follow the established pattern in `core/query/keys.ts`:

```typescript
// Pattern: ['entity', 'scope', ...identifiers]
```

### New Query Keys

```typescript
// Transactions
transactions: {
  all: ['transactions'] as const,
  lists: () => [...queryKeys.transactions.all, 'list'] as const,
  list: (filters?: TransactionFilters) => 
    [...queryKeys.transactions.lists(), filters ?? {}] as const,
  details: () => [...queryKeys.transactions.all, 'detail'] as const,
  detail: (id: string) => [...queryKeys.transactions.details(), id] as const,
  infinite: (filters?: TransactionFilters) =>
    [...queryKeys.transactions.all, 'infinite', filters ?? {}] as const,
}

// Marketplace
marketplace: {
  all: ['marketplace'] as const,
  properties: {
    all: () => [...queryKeys.marketplace.all, 'properties'] as const,
    list: (filters?: PropertyFilters) =>
      [...queryKeys.marketplace.properties.all(), 'list', filters ?? {}] as const,
    detail: (id: string) =>
      [...queryKeys.marketplace.properties.all(), 'detail', id] as const,
    infinite: (filters?: PropertyFilters) =>
      [...queryKeys.marketplace.properties.all(), 'infinite', filters ?? {}] as const,
  },
  classifieds: {
    all: () => [...queryKeys.marketplace.all, 'classifieds'] as const,
    list: (filters?: ClassifiedFilters) =>
      [...queryKeys.marketplace.classifieds.all(), 'list', filters ?? {}] as const,
    detail: (id: string) =>
      [...queryKeys.marketplace.classifieds.all(), 'detail', id] as const,
    infinite: (filters?: ClassifiedFilters) =>
      [...queryKeys.marketplace.classifieds.all(), 'infinite', filters ?? {}] as const,
  },
}

// Certificates
certificates: {
  all: ['certificates'] as const,
  lists: () => [...queryKeys.certificates.all, 'list'] as const,
  list: (filters?: CertificateFilters) =>
    [...queryKeys.certificates.lists(), filters ?? {}] as const,
  details: () => [...queryKeys.certificates.all, 'detail'] as const,
  detail: (id: string) => [...queryKeys.certificates.details(), id] as const,
}

// Notification Settings (separate from notifications)
notificationSettings: {
  all: ['notificationSettings'] as const,
  current: () => [...queryKeys.notificationSettings.all, 'current'] as const,
}
```

## Data Types

### Transaction Types

```typescript
interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: 'credit' | 'debit';
  status?: 'pending' | 'completed' | 'failed';
  startDate?: string;
  endDate?: string;
}

interface TransactionsResponse extends PaginatedResponse<Transaction> {
  // Uses PaginatedResponse from core/types/query.types.ts
}
```

### Marketplace Types

```typescript
interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  type: 'sale' | 'rent';
  images: string[];
  location: {
    address: string;
    city: string;
    coordinates?: { lat: number; lng: number };
  };
  features: string[];
  ownerId: string;
  status: 'active' | 'pending' | 'sold';
  createdAt: string;
  updatedAt: string;
}

interface ClassifiedAd {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  condition: 'new' | 'used' | 'refurbished';
  sellerId: string;
  status: 'active' | 'sold' | 'expired';
  createdAt: string;
  updatedAt: string;
}

interface PropertyFilters {
  page?: number;
  limit?: number;
  query?: string;
  type?: 'sale' | 'rent';
  minPrice?: number;
  maxPrice?: number;
  city?: string;
}

interface ClassifiedFilters {
  page?: number;
  limit?: number;
  query?: string;
  category?: string;
  condition?: 'new' | 'used' | 'refurbished';
  minPrice?: number;
  maxPrice?: number;
}

type MarketplaceItem = Property | ClassifiedAd;
type MarketplaceItemType = 'property' | 'classified';
```

### Certificate Types

```typescript
interface Certificate {
  id: string;
  courseId: string;
  courseName: string;
  userId: string;
  issuedAt: string;
  expiresAt?: string;
  certificateUrl: string;
  thumbnailUrl?: string;
  skills: string[];
  verificationCode: string;
}

interface CertificateFilters {
  page?: number;
  limit?: number;
  courseId?: string;
}
```

### Notification Settings Types

```typescript
interface NotificationSettings {
  id: string;
  userId: string;
  email: {
    marketing: boolean;
    courseUpdates: boolean;
    questReminders: boolean;
    achievements: boolean;
  };
  push: {
    newMessages: boolean;
    questReminders: boolean;
    achievements: boolean;
    dailyChallenges: boolean;
  };
  inApp: {
    newMessages: boolean;
    mentions: boolean;
    achievements: boolean;
  };
  updatedAt: string;
}

interface UpdateNotificationSettingsInput {
  email?: Partial<NotificationSettings['email']>;
  push?: Partial<NotificationSettings['push']>;
  inApp?: Partial<NotificationSettings['inApp']>;
}
```

## Cache Configuration

### Stale Times (per FR-001)

| Data Type | Stale Time | Rationale |
|-----------|------------|-----------|
| Transactions | 1 minute | Financial data needs freshness |
| Marketplace Properties | 5 minutes | Catalog data, moderately static |
| Marketplace Classifieds | 5 minutes | Catalog data, moderately static |
| Certificates | 5 minutes | Achievement data, rarely changes |
| Notification Settings | 10 minutes | User preference, changes infrequently |

### Cache Retention (GC Time)

All queries use 24-hour garbage collection time (defined in `GC_TIME` constant) for offline access per SC-003.

## Query Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                        Query Cache                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  transactions.list ──┬── transactions.detail(id)            │
│                      │                                      │
│  marketplace.properties.list ──┬── marketplace.properties.detail(id)
│                                │                            │
│  marketplace.classifieds.list ──┬── marketplace.classifieds.detail(id)
│                                 │                           │
│  certificates.list ──┬── certificates.detail(id)            │
│                      │                                      │
│  notificationSettings.current                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Invalidation Rules

| Action | Invalidates |
|--------|-------------|
| New transaction completed | `transactions.all` |
| Property created/updated | `marketplace.properties.all` |
| Classified created/updated | `marketplace.classifieds.all` |
| Course completed (new cert) | `certificates.all` |
| Settings updated | `notificationSettings.all` |

## State Transitions

### Transaction Status Flow

```
pending ──→ completed
    │
    └──→ failed
```

### Marketplace Item Status Flow

```
Property: active ──→ pending ──→ sold
Classified: active ──→ sold ──→ expired
```

## Offline Data Model

### Persisted Queries

All queries are persisted to AsyncStorage via `@tanstack/query-async-storage-persister`:

```typescript
// Automatic persistence for all queries with gcTime > 0
// Queries survive app restart up to 24 hours
```

### Queued Mutations

Mutations queued when offline:

| Mutation | Queue Priority | Conflict Resolution |
|----------|---------------|---------------------|
| updateNotificationSettings | Normal | Server wins on sync |
| (Future: marketplace mutations) | Normal | Server wins on sync |

## Validation Rules

### Transaction

- `amount` must be > 0
- `type` must be 'credit' or 'debit'
- `status` must be valid enum value
- `createdAt` must be valid ISO date

### Marketplace Item

- `title` must be 1-200 characters
- `price` must be >= 0
- `images` array max 10 items
- Required fields vary by type

### Notification Settings

- All boolean fields, no additional validation
- Partial updates allowed (merge strategy)

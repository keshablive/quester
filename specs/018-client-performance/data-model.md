# Data Model: Client Performance Optimization

**Feature**: 018-client-performance
**Date**: 2025-11-29
**Status**: Complete

## Overview

This feature is a refactoring/optimization feature with **no new data entities**. Changes are limited to:

1. Type definitions (fixing `any` types)
2. Component optimizations (React.memo)
3. API client enhancements (AbortController)

## Type Definitions to Fix

### Quest Types (`core/types/quest.ts`)

**Current** (problematic):
```typescript
content: any;
metadata?: any;
```

**Target**:
```typescript
interface QuestContent {
  type: 'text' | 'quiz' | 'video' | 'task';
  data: QuestTextContent | QuestQuizContent | QuestVideoContent | QuestTaskContent;
}

interface QuestMetadata {
  createdBy?: string;
  lastModified?: string;
  version?: number;
  tags?: string[];
}
```

### Error Types (`core/utils/error.ts`)

**Current** (problematic):
```typescript
context?: Record<string, any>
```

**Target**:
```typescript
context?: Record<string, unknown>
```

### Theme Types (`core/types/index.ts`)

**Current** (problematic):
```typescript
light: any;
dark: any;
[key: string]: any;
```

**Target**:
```typescript
light: ThemeColors;
dark: ThemeColors;
[key: string]: ThemeColors | string | number;
```

### Component Types (`core/types/components.ts`)

**Current** (problematic):
```typescript
value?: any;
onChange?: (value: any) => void;
SelectOption<T = any>
data?: any;
```

**Target**:
```typescript
value?: T;
onChange?: (value: T) => void;
SelectOption<T = string>
data?: T;
```

### Utility Types (`core/utils/common.ts`)

**Current** (problematic):
```typescript
function debounce<T extends (...args: any[]) => any>
function throttle<T extends (...args: any[]) => any>
```

**Target**:
```typescript
function debounce<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  delay: number
): (...args: TArgs) => void

function throttle<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  limit: number
): (...args: TArgs) => TReturn
```

## New Shared Component

### ErrorState Component

```typescript
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  icon?: React.ComponentType;
  className?: string;
}
```

**Purpose**: Inline error display for data/content failures (per FR-003)

## No Database Changes

This feature does not modify:
- Database schema
- API contracts
- Server models
- Storage structures

All changes are client-side TypeScript/React optimizations.

// Feature 003: Error Handling Types

export interface AppError {
  id: string;
  type: 'network' | 'validation' | 'system' | 'session' | 'file';
  message: string;
  userMessage: string;
  code?: string;
  retryable: boolean;
  timestamp: number;
  context?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  suggestions?: string[];
}

export interface OfflineAction {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'purchase' | 'update';
  feature: string;
  payload: Record<string, any>;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
}

export interface OfflineState {
  isOnline: boolean;
  queuedActions: OfflineAction[];
  lastSyncAt?: number;
  syncInProgress: boolean;
  syncErrors: AppError[];
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: {
    componentStack: string;
  };
}

export interface SessionState {
  isExpired: boolean;
  expiresAt?: number;
  hasUnsavedChanges: boolean;
  draftData?: Record<string, any>;
}

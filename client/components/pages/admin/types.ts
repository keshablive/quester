export interface AdminStats {
    totalKeys: number;
    activeKeys: number;
    rotations: number;
}

export interface EncryptionKey {
    version: number;
    status: 'active' | 'rotated' | 'archived';
    algorithm: string;
    createdAt: string;
}

export interface AuditLogEntry {
    action: string;
    timestamp: string;
    details?: string;
    userId?: string;
}

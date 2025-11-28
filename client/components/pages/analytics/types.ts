import { LucideIcon } from 'lucide-react-native';

/**
 * Props for analytics components that need user context
 */
export interface AnalyticsProps {
    /** Optional user ID - defaults to current authenticated user */
    userId?: string;
}

export interface MetricItem {
    label: string;
    value: string;
    change: string;
    changeType: 'increase' | 'decrease';
    icon: LucideIcon;
}

export interface PageStat {
    page: string;
    views: string;
    change: string;
    trend: LucideIcon;
}

export interface LocationStat {
    name: string;
    percentage: number;
}

export interface DeviceStat {
    name: string;
    percentage: number;
}

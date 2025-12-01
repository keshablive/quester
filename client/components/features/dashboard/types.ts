import { LucideIcon } from 'lucide-react-native';

export interface StatItem {
    label: string;
    value: string;
    change?: string;
    changeType: 'increase' | 'decrease' | 'neutral';
    icon: LucideIcon;
    color: string;
}

export interface ActivityItem {
    id?: string;
    title: string;
    time?: string;
    type?: string;
    icon?: LucideIcon;
}

export interface QuickAction {
    id?: string;
    label: string;
    type: string;
    route?: string;
    icon?: LucideIcon;
}

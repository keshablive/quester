import { LucideIcon } from 'lucide-react-native';

/**
 * Props for profile components
 * When userId is provided, displays that user's profile
 * When omitted, displays the current authenticated user's profile
 */
export interface ProfileProps {
  userId?: string;
}

export interface StatItem {
    label: string;
    value: string;
}

export interface ContactItem {
    icon: LucideIcon;
    value: string;
}

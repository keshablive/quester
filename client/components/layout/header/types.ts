import { LucideIcon } from 'lucide-react-native';

export interface HeaderAction {
    icon: LucideIcon;
    label: string;
    onPress: () => void;
    badge?: number;
    image?: string;
}

export interface AppHeaderProps {
    onUserIconPress?: () => void;
    onCartIconPress?: () => void;
    onNotificationIconPress?: () => void;
    onSearchIconPress?: () => void;
}

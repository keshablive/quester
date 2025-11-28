import { LucideIcon } from 'lucide-react-native';

export interface NavigationProps {
    isExpanded: boolean;
    onToggle: () => void;
}

export interface NavigationItemProps {
    item: {
        icon: LucideIcon;
        label: string;
        href: string;
    };
    isActive: boolean;
    isExpanded: boolean;
    orientation: 'vertical' | 'horizontal';
}

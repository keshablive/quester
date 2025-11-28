export interface NotificationItemProps {
    notification: {
        id: string;
        type: string;
        title: string;
        message: string;
        read: boolean;
        createdAt: string;
    };
    onPress?: (id: string) => void;
    onMarkRead?: (id: string) => void;
    onDelete?: (id: string) => void;
}

export interface NotificationListProps {
    onNotificationPress?: (id: string) => void;
}

export interface NotificationSettingsProps {
    onSave?: () => void;
}

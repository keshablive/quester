import { Property, ClassifiedAd } from '@/core';

export type MarketplaceItemType = 'property' | 'classified';

export type MarketplaceItem = Property | ClassifiedAd;

export interface MarketplaceCardProps {
    item: MarketplaceItem;
    type: MarketplaceItemType;
    onPress: (item: MarketplaceItem) => void;
}

export interface MarketplaceListProps {
    onItemPress: (item: MarketplaceItem, type: MarketplaceItemType) => void;
    initialTab?: 'properties' | 'classifieds';
}

export interface MarketplaceDetailProps {
    itemId: string;
    type: MarketplaceItemType;
    onEdit?: (item: MarketplaceItem) => void;
    onContact?: (item: MarketplaceItem) => void;
}

export interface MarketplaceFormProps {
    item?: MarketplaceItem;
    type: MarketplaceItemType;
    onSuccess: (item: MarketplaceItem) => void;
    onCancel: () => void;
}

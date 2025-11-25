// Feature 003: Navigation & Discovery Types

export type FeatureType =
  | 'home'
  | 'quests'
  | 'learning'
  | 'marketplace'
  | 'social'
  | 'video'
  | 'messaging'
  | 'properties'
  | 'profile';

export interface NavigationState {
  currentFeature: FeatureType;
  activeTab: string;
  notificationCounts: NotificationCounts;
  searchHistory: string[];
  recentlyVisited: Array<{
    feature: FeatureType;
    screen: string;
    timestamp: number;
  }>;
}

export interface NotificationCounts {
  quests: number;
  learning: number;
  marketplace: number;
  social: number;
  messages: number;
  total: number;
}

export interface FeatureCardData {
  id: string;
  type: FeatureType;
  title: string;
  description: string;
  imageUrl?: string;
  badge?: string;
  action: {
    label: string;
    route: string;
  };
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  route: string;
  params?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  type: FeatureType;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  route: string;
  relevanceScore: number;
}

export interface CarouselItem {
  id: string;
  type: 'quest' | 'course' | 'listing' | 'livestream' | 'activity';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  badge?: {
    text: string;
    color: string;
  };
  route: string;
  priority: number;
}

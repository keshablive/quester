// Feature 003: Multi-Feature Workflow Types

export interface WorkflowContext {
  currentStep: string;
  completedSteps: string[];
  availableActions: string[];
  relatedContent: SuggestedContent[];
  featureLinks: FeatureLink[];
}

export interface WorkflowState {
  id: string;
  type: 'quest-course' | 'course-certificate' | 'certificate-marketplace' | 'purchase-social';
  status: 'in-progress' | 'completed' | 'abandoned';
  startedAt: number;
  lastActivityAt: number;
  completionRate: number;
}

export interface SuggestedContent {
  id: string;
  type: 'quest' | 'course' | 'listing' | 'user' | 'property';
  title: string;
  description: string;
  relevanceReason: string;
  imageUrl?: string;
  route: string;
  priority: number;
}

export interface FeatureLink {
  id: string;
  sourceFeature: string;
  targetFeature: string;
  title: string;
  description: string;
  actionLabel: string;
  route: string;
  metadata?: Record<string, any>;
}

export interface QuickActionsMenuData {
  trigger: 'quest-complete' | 'course-complete' | 'certificate-earned' | 'payment-received';
  actions: Array<{
    id: string;
    label: string;
    icon: string;
    route: string;
    priority: number;
  }>;
}

import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Clock,
  CheckCircle,
  ShieldCheck,
  AlertCircle,
  XCircle,
  Package,
  DollarSign,
} from 'lucide-react-native';

export type TransactionStatus =
  | 'initiated'
  | 'pending'
  | 'escrow_held'
  | 'delivered'
  | 'released'
  | 'disputed'
  | 'refunded'
  | 'cancelled'
  | 'failed';

interface EscrowStatusProps {
  status: TransactionStatus;
  escrowHeldAt?: string;
  deliveryConfirmedAt?: string;
  fundsReleasedAt?: string;
  autoReleaseDate?: string;
  disputeOpenedAt?: string;
  showTimeline?: boolean;
}

const statusConfig: Record<
  TransactionStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ComponentType<any>;
    description: string;
  }
> = {
  initiated: {
    label: 'Initiated',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    icon: Clock,
    description: 'Transaction has been created',
  },
  pending: {
    label: 'Payment Pending',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    icon: Clock,
    description: 'Waiting for payment confirmation',
  },
  escrow_held: {
    label: 'Funds in Escrow',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    icon: ShieldCheck,
    description: 'Payment received and held securely',
  },
  delivered: {
    label: 'Delivery Confirmed',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    icon: Package,
    description: 'Seller confirmed delivery',
  },
  released: {
    label: 'Funds Released',
    color: '#10b981',
    bgColor: '#d1fae5',
    icon: CheckCircle,
    description: 'Payment released to seller',
  },
  disputed: {
    label: 'Under Dispute',
    color: '#ef4444',
    bgColor: '#fee2e2',
    icon: AlertCircle,
    description: 'Dispute opened, under review',
  },
  refunded: {
    label: 'Refunded',
    color: '#6366f1',
    bgColor: '#e0e7ff',
    icon: DollarSign,
    description: 'Payment refunded to buyer',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    icon: XCircle,
    description: 'Transaction cancelled',
  },
  failed: {
    label: 'Failed',
    color: '#ef4444',
    bgColor: '#fee2e2',
    icon: XCircle,
    description: 'Payment failed',
  },
};

export function EscrowStatus({
  status,
  escrowHeldAt,
  deliveryConfirmedAt,
  fundsReleasedAt,
  autoReleaseDate,
  disputeOpenedAt,
  showTimeline = true,
}: EscrowStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDaysRemaining = (targetDate?: string) => {
    if (!targetDate) return null;
    const now = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilAutoRelease = calculateDaysRemaining(autoReleaseDate);

  return (
    <View className="w-full">
      {/* Main Status Card */}
      <Card className="mb-4 p-4" style={{ backgroundColor: config.bgColor }}>
        <View className="mb-2 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="mr-3">
              <Icon size={24} color={config.color} />
            </View>
            <View>
              <Text variant="h3" style={{ color: config.color }}>
                {config.label}
              </Text>
              <Text variant="small" className="mt-0.5 text-muted-foreground">
                {config.description}
              </Text>
            </View>
          </View>
        </View>

        {/* Auto-release countdown */}
        {status === 'delivered' && daysUntilAutoRelease !== null && daysUntilAutoRelease > 0 && (
          <View className="mt-3 rounded-lg bg-background/50 p-3">
            <Text variant="small" className="font-medium text-foreground">
              🕐 Auto-release in {daysUntilAutoRelease}{' '}
              {daysUntilAutoRelease === 1 ? 'day' : 'days'}
            </Text>
            <Text variant="small" className="mt-1 text-muted-foreground">
              Funds will be automatically released to seller on {formatDate(autoReleaseDate)}
            </Text>
          </View>
        )}

        {/* Escrow protection notice */}
        {(status === 'escrow_held' || status === 'delivered') && (
          <View className="mt-3 rounded-lg bg-background/50 p-3">
            <View className="flex-row items-center">
              <ShieldCheck size={16} color={config.color} />
              <Text variant="small" className="ml-2 font-medium text-foreground">
                Your payment is protected
              </Text>
            </View>
            <Text variant="small" className="mt-1 text-muted-foreground">
              Funds are held securely until delivery is confirmed or dispute is resolved
            </Text>
          </View>
        )}
      </Card>

      {/* Timeline */}
      {showTimeline && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Timeline</CardTitle>
          </CardHeader>

          <CardContent>
            <View className="space-y-4">
              {/* Escrow Held */}
              {escrowHeldAt && (
                <TimelineItem
                  icon={ShieldCheck}
                  title="Funds Held in Escrow"
                  date={formatDate(escrowHeldAt)}
                  completed={true}
                  color="#3b82f6"
                />
              )}

              {/* Delivery Confirmed */}
              {deliveryConfirmedAt && (
                <TimelineItem
                  icon={Package}
                  title="Delivery Confirmed"
                  date={formatDate(deliveryConfirmedAt)}
                  completed={true}
                  color="#8b5cf6"
                />
              )}

              {/* Disputed */}
              {disputeOpenedAt && (
                <TimelineItem
                  icon={AlertCircle}
                  title="Dispute Opened"
                  date={formatDate(disputeOpenedAt)}
                  completed={true}
                  color="#ef4444"
                />
              )}

              {/* Funds Released */}
              {fundsReleasedAt && (
                <TimelineItem
                  icon={CheckCircle}
                  title="Funds Released to Seller"
                  date={formatDate(fundsReleasedAt)}
                  completed={true}
                  color="#10b981"
                />
              )}

              {/* Auto-release pending */}
              {status === 'delivered' && !fundsReleasedAt && autoReleaseDate && (
                <TimelineItem
                  icon={Clock}
                  title="Auto-release Scheduled"
                  date={formatDate(autoReleaseDate)}
                  completed={false}
                  color="#6b7280"
                />
              )}
            </View>
          </CardContent>
        </Card>
      )}
    </View>
  );
}

interface TimelineItemProps {
  icon: React.ComponentType<any>;
  title: string;
  date: string | null;
  completed: boolean;
  color: string;
}

function TimelineItem({ icon: Icon, title, date, completed, color }: TimelineItemProps) {
  return (
    <View className="flex-row items-start">
      {/* Icon */}
      <View
        className="mr-3 h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: completed ? color : '#e5e7eb' }}>
        <Icon size={16} color="white" />
      </View>

      {/* Content */}
      <View className="flex-1">
        <Text
          className={`text-sm font-medium ${completed ? 'text-foreground' : 'text-muted-foreground'}`}>
          {title}
        </Text>
        {date && <Text className="mt-0.5 text-xs text-muted-foreground">{date}</Text>}
      </View>
    </View>
  );
}

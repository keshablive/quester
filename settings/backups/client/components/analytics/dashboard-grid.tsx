/**
 * DashboardGrid Component (T191)
 *
 * Responsive dashboard widget layout component with customizable grid.
 * Supports multiple widget types and responsive column layouts.
 *
 * Features:
 * - Responsive grid layout (1-4 columns)
 * - Multiple widget types (metric, chart, list, custom)
 * - Drag-and-drop reordering (future enhancement)
 * - Widget add/remove/edit actions
 * - Empty state with add widget prompt
 * - Loading skeletons
 * - Export all data functionality
 */

import * as React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Plus,
  Download as DownloadIcon,
  Edit as EditIcon,
  Trash as TrashIcon,
  Move as MoveIcon,
} from 'lucide-react-native';
import { MetricCard, MetricData } from './metric-card';
import { ChartWidget, ChartConfig } from './chart-widget';

// Widget types
export type WidgetType = 'metric' | 'chart' | 'list' | 'custom';

// Widget size
export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

// Base widget interface
export interface BaseWidget {
  id: string;
  type: WidgetType;
  title: string;
  size?: WidgetSize;
  order?: number;
}

// Metric widget
export interface MetricWidget extends BaseWidget {
  type: 'metric';
  data: MetricData;
}

// Chart widget
export interface ChartWidget extends BaseWidget {
  type: 'chart';
  config: ChartConfig;
}

// List widget
export interface ListWidget extends BaseWidget {
  type: 'list';
  items: Array<{
    id: string;
    label: string;
    value: string | number;
    icon?: React.ComponentType<any>;
  }>;
}

// Custom widget
export interface CustomWidget extends BaseWidget {
  type: 'custom';
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

// Union type for all widgets
export type Widget = MetricWidget | ChartWidget | ListWidget | CustomWidget;

export interface DashboardGridProps {
  widgets: Widget[];
  columns?: 1 | 2 | 3 | 4;
  isLoading?: boolean;
  isEditing?: boolean;
  onAddWidget?: () => void;
  onEditWidget?: (widget: Widget) => void;
  onDeleteWidget?: (widgetId: string) => void;
  onReorderWidgets?: (widgets: Widget[]) => void;
  onExportAll?: () => void;
  emptyMessage?: string;
  className?: string;
}

// Widget size to grid span mapping
const widgetSpans = {
  small: 'col-span-1',
  medium: 'col-span-1 sm:col-span-2',
  large: 'col-span-1 sm:col-span-2 lg:col-span-3',
  full: 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4',
};

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  widgets,
  columns = 2,
  isLoading = false,
  isEditing = false,
  onAddWidget,
  onEditWidget,
  onDeleteWidget,
  onReorderWidgets: _onReorderWidgets,
  onExportAll,
  emptyMessage = 'No widgets added yet',
  className,
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  // Loading state
  if (isLoading) {
    return (
      <View className={cn('grid gap-4', gridCols[columns], className)}>
        {Array.from({ length: columns * 2 }).map((_, index) => (
          <Card key={index} className="p-4">
            <CardContent className="flex min-h-[200px] items-center justify-center">
              <ActivityIndicator size="large" />
            </CardContent>
          </Card>
        ))}
      </View>
    );
  }

  // Empty state
  if (widgets.length === 0) {
    return (
      <View className={cn('flex min-h-[400px] items-center justify-center', className)}>
        <Card className="w-full max-w-md p-8">
          <CardContent className="flex flex-col items-center text-center">
            <Text variant="h3" className="mb-2">
              No Widgets
            </Text>
            <Text className="mb-4 text-muted-foreground">{emptyMessage}</Text>
            {onAddWidget && (
              <Button onPress={onAddWidget}>
                <Plus className="mr-2 h-4 w-4" />
                <Text>Add Widget</Text>
              </Button>
            )}
          </CardContent>
        </Card>
      </View>
    );
  }

  // Sort widgets by order
  const sortedWidgets = React.useMemo(
    () => [...widgets].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [widgets]
  );

  return (
    <View className={className}>
      {/* Header with actions */}
      <View className="mb-4 flex flex-row items-center justify-between">
        <Text variant="h3">Dashboard</Text>
        <View className="flex flex-row gap-2">
          {onExportAll && (
            <Button variant="outline" size="sm" onPress={onExportAll}>
              <DownloadIcon className="mr-2 h-4 w-4" />
              <Text>Export</Text>
            </Button>
          )}
          {onAddWidget && (
            <Button size="sm" onPress={onAddWidget}>
              <Plus className="mr-2 h-4 w-4" />
              <Text>Add Widget</Text>
            </Button>
          )}
        </View>
      </View>

      {/* Widget grid */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className={cn('grid gap-4', gridCols[columns])}>
          {sortedWidgets.map((widget) => (
            <View key={widget.id} className={cn(widgetSpans[widget.size || 'medium'])}>
              <WidgetContainer
                widget={widget}
                isEditing={isEditing}
                onEdit={onEditWidget}
                onDelete={onDeleteWidget}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// Widget Container with actions
interface WidgetContainerProps {
  widget: Widget;
  isEditing: boolean;
  onEdit?: (widget: Widget) => void;
  onDelete?: (widgetId: string) => void;
}

const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  isEditing,
  onEdit,
  onDelete,
}) => {
  const [_showActions, _setShowActions] = React.useState(false);

  return (
    <View className="relative">
      {/* Widget actions overlay (shown in edit mode) */}
      {isEditing && (
        <View className="absolute right-2 top-2 z-10 flex flex-row gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onPress={() => onEdit?.(widget)}>
            <EditIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8"
            onPress={() => onDelete?.(widget.id)}>
            <TrashIcon className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" className="h-8 w-8">
            <MoveIcon className="h-4 w-4" />
          </Button>
        </View>
      )}

      {/* Render widget based on type */}
      {widget.type === 'metric' && (
        <MetricCard metric={widget.data} size="medium" showTrend showChange showComparison />
      )}

      {widget.type === 'chart' && <ChartWidget title={widget.title} config={widget.config} />}

      {widget.type === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>{widget.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {widget.items.map((item) => (
              <View
                key={item.id}
                className="flex flex-row items-center justify-between border-b py-2 last:border-b-0">
                <View className="flex flex-row items-center gap-2">
                  {item.icon && <item.icon className="h-4 w-4 text-muted-foreground" />}
                  <Text variant="small">{item.label}</Text>
                </View>
                <Text variant="small" className="font-medium">
                  {item.value}
                </Text>
              </View>
            ))}
          </CardContent>
        </Card>
      )}

      {widget.type === 'custom' && <widget.component {...(widget.props || {})} />}
    </View>
  );
};

// Preset dashboard layouts
export const PRESET_LAYOUTS = {
  overview: [
    { id: '1', type: 'metric' as const, title: 'Total Users', size: 'small' as const },
    { id: '2', type: 'metric' as const, title: 'Active Users', size: 'small' as const },
    { id: '3', type: 'metric' as const, title: 'Revenue', size: 'small' as const },
    { id: '4', type: 'metric' as const, title: 'Completion Rate', size: 'small' as const },
    { id: '5', type: 'chart' as const, title: 'User Activity', size: 'medium' as const },
    { id: '6', type: 'chart' as const, title: 'Course Performance', size: 'medium' as const },
  ],
  analytics: [
    { id: '1', type: 'chart' as const, title: 'Daily Active Users', size: 'full' as const },
    { id: '2', type: 'metric' as const, title: 'Sessions', size: 'small' as const },
    { id: '3', type: 'metric' as const, title: 'Bounce Rate', size: 'small' as const },
    { id: '4', type: 'metric' as const, title: 'Conversion Rate', size: 'small' as const },
    { id: '5', type: 'list' as const, title: 'Top Pages', size: 'medium' as const },
  ],
  performance: [
    { id: '1', type: 'metric' as const, title: 'Total Revenue', size: 'medium' as const },
    { id: '2', type: 'metric' as const, title: 'Avg. Order Value', size: 'medium' as const },
    { id: '3', type: 'chart' as const, title: 'Revenue Trend', size: 'full' as const },
    { id: '4', type: 'list' as const, title: 'Top Courses', size: 'medium' as const },
  ],
};

export default DashboardGrid;

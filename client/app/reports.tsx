import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { 
  Text, 
  Button, 
  Icon,
  Card,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui';
import { AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react-native';
import { reportsService, Report, ReportStats } from '@/core';
import { cn } from '@/core';

function ReportCard({ report, onStatusChange }: { report: Report; onStatusChange: (id: string, status: Report['status']) => void }) {
  const getTypeIcon = () => {
    switch (report.type) {
      case 'user': return '👤';
      case 'post': return '📝';
      case 'comment': return '💬';
      case 'message': return '✉️';
      default: return '⚠️';
    }
  };

  const getStatusColor = () => {
    switch (report.status) {
      case 'pending': return 'text-yellow-500';
      case 'reviewed': return 'text-blue-500';
      case 'resolved': return 'text-green-500';
      case 'dismissed': return 'text-gray-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="p-4 mb-3">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Text className="text-2xl mr-2">{getTypeIcon()}</Text>
          <View>
            <Text className="text-base font-semibold text-foreground capitalize">{report.type} Report</Text>
            <Text className="text-xs text-muted-foreground">
              {new Date(report.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <Text className={cn("text-sm font-semibold capitalize", getStatusColor())}>
          {report.status}
        </Text>
      </View>

      <Text className="text-sm font-semibold text-foreground mb-1">Reason: {report.reason}</Text>
      {report.description && (
        <Text className="text-sm text-muted-foreground mb-3">{report.description}</Text>
      )}

      {report.status === 'pending' && (
        <View className="flex-row gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onPress={() => onStatusChange(report.id, 'reviewed')}
          >
            <Icon as={Eye} size={16} className="mr-1" />
            <Text>Review</Text>
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onPress={() => onStatusChange(report.id, 'resolved')}
          >
            <Icon as={CheckCircle} size={16} className="mr-1" />
            <Text>Resolve</Text>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onPress={() => onStatusChange(report.id, 'dismissed')}
          >
            <Icon as={XCircle} size={16} className="mr-1" />
            <Text>Dismiss</Text>
          </Button>
        </View>
      )}
    </Card>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsData, statsData] = await Promise.all([
        reportsService.getReports(filter === 'all' ? undefined : filter),
        reportsService.getStats(),
      ]);
      setReports(reportsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: Report['status']) => {
    try {
      await reportsService.updateReportStatus(id, status);
      await loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header with Stats */}
      <View className="p-4 border-b border-border bg-card">
        <View className="flex-row items-center mb-4">
          <Icon as={AlertTriangle} size={24} className="text-primary mr-2" />
          <Text className="text-2xl font-bold text-foreground">Reports</Text>
        </View>
        {stats && (
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-2xl font-bold text-foreground">{stats.pending}</Text>
              <Text className="text-xs text-muted-foreground">Pending</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-foreground">{stats.reviewed}</Text>
              <Text className="text-xs text-muted-foreground">Reviewed</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-foreground">{stats.resolved}</Text>
              <Text className="text-xs text-muted-foreground">Resolved</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-foreground">{stats.dismissed}</Text>
              <Text className="text-xs text-muted-foreground">Dismissed</Text>
            </View>
          </View>
        )}
      </View>

      <Tabs value={filter} onValueChange={setFilter} className="flex-1">
        <TabsList className="mx-2 my-2">
          <TabsTrigger value="all" className="flex-1">
            <Text>All</Text>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">
            <Text>Pending</Text>
          </TabsTrigger>
          <TabsTrigger value="reviewed" className="flex-1">
            <Text>Reviewed</Text>
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex-1">
            <Text>Resolved</Text>
          </TabsTrigger>
          <TabsTrigger value="dismissed" className="flex-1">
            <Text>Dismissed</Text>
          </TabsTrigger>
        </TabsList>

        {['all', 'pending', 'reviewed', 'resolved', 'dismissed'].map((status) => (
          <TabsContent key={status} value={status} className="flex-1">
            <FlatList
              data={reports}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ReportCard report={item} onStatusChange={handleStatusChange} />}
              contentContainerClassName="p-4"
              ListEmptyComponent={
                <View className="items-center justify-center py-12">
                  <Icon as={AlertTriangle} size={64} className="text-muted-foreground/30 mb-4" />
                  <Text className="text-lg font-semibold text-foreground mb-2">No reports</Text>
                  <Text className="text-sm text-muted-foreground">All clear!</Text>
                </View>
              }
            />
          </TabsContent>
        ))}
      </Tabs>
    </View>
  );
}

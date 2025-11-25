/**
 * Reports Screen (T197)
 *
 * Reports listing, generation, and scheduling interface.
 *
 * Features:
 * - List all available reports
 * - Create and generate reports
 * - Schedule automated reports
 * - View report execution history
 * - Export reports in various formats
 * - Search and filter reports
 */

import * as React from 'react';
import { View, ScrollView, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useReports,
  useSearchReports,
  useGenerateReport,
  useReportSchedules,
  useCreateReportSchedule,
  useReportExecutions,
} from '@/lib/hooks/useReports';
import type {
  Report,
  ReportSchedule,
  ReportExecution,
  ReportFormat,
  ReportType,
} from '@/lib/api/reports';
import {
  FileTextIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  FilterIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  LoaderIcon,
} from 'lucide-react-native';

const REPORT_TYPES: { label: string; value: string }[] = [
  { label: 'User Analytics', value: 'user_analytics' },
  { label: 'Course Performance', value: 'course_performance' },
  { label: 'Engagement Summary', value: 'engagement_summary' },
  { label: 'Revenue Report', value: 'revenue_report' },
  { label: 'Custom Query', value: 'custom' },
];

const SCHEDULE_FREQUENCIES: { label: string; value: string }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
];

export default function ReportsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('reports');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false);

  // Form states
  const [newReport, setNewReport] = React.useState({
    name: '',
    description: '',
    type: 'user_analytics' as ReportType,
    format: 'pdf' as ReportFormat,
  });

  const [newSchedule, setNewSchedule] = React.useState({
    reportId: '',
    name: '',
    frequency: 'weekly',
    dayOfWeek: 1,
    timeOfDay: '09:00',
    timezone: 'UTC',
  });

  // Queries
  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useReports();
  const { data: searchResults, refetch: _refetchSearch } = useSearchReports(searchQuery, {
    enabled: searchQuery.length > 0,
  });
  const {
    data: schedulesData,
    isLoading: schedulesLoading,
    refetch: refetchSchedules,
  } = useReportSchedules();
  const {
    data: executionsData,
    isLoading: executionsLoading,
    refetch: refetchExecutions,
  } = useReportExecutions(
    '', // empty schedule ID to get all executions
    { limit: 20, enabled: false } // disabled until we have a specific schedule
  );

  // Mutations
  const generateReportMutation = useGenerateReport();
  const createScheduleMutation = useCreateReportSchedule();

  const reports = searchQuery ? searchResults?.reports : reportsData?.reports;

  // Handle refresh
  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchReports(), refetchSchedules(), refetchExecutions()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchReports, refetchSchedules, refetchExecutions]);

  // Handle report generation
  const handleGenerateReport = React.useCallback(
    async (reportId: string) => {
      try {
        await generateReportMutation.mutateAsync(reportId);
        // The report will be downloaded/shown based on the backend implementation
      } catch (error) {
        console.error('Failed to generate report:', error);
      }
    },
    [generateReportMutation]
  );

  // Handle create report
  const handleCreateReport = React.useCallback(async () => {
    // This would typically open a detailed form or navigate to a report builder
    // For now, we'll just close the dialog
    setCreateDialogOpen(false);
    router.push('/report-builder' as any);
  }, [router]);

  // Handle create schedule
  const handleCreateSchedule = React.useCallback(async () => {
    try {
      await createScheduleMutation.mutateAsync({
        name: newSchedule.name,
        report_type: 'user_analytics' as ReportType,
        report_format: 'pdf' as ReportFormat,
        frequency: newSchedule.frequency as any,
        day_of_week: newSchedule.dayOfWeek,
        time_of_day: newSchedule.timeOfDay,
      });
      setScheduleDialogOpen(false);
      setNewSchedule({
        reportId: '',
        name: '',
        frequency: 'weekly',
        dayOfWeek: 1,
        timeOfDay: '09:00',
        timezone: 'UTC',
      });
    } catch (error) {
      console.error('Failed to create schedule:', error);
    }
  }, [createScheduleMutation, newSchedule]);

  // Render report status badge
  const renderStatusBadge = (status: string) => {
    const statusConfig = {
      completed: {
        icon: CheckCircleIcon,
        color: 'text-green-600',
        bg: 'bg-green-50 dark:bg-green-950',
      },
      failed: { icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' },
      running: { icon: LoaderIcon, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
      pending: { icon: ClockIcon, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <View className={`flex-row items-center gap-1 rounded px-2 py-1 ${config.bg}`}>
        <Icon className={`h-3 w-3 ${config.color}`} />
        <Text className={`text-xs font-medium capitalize ${config.color}`}>{status}</Text>
      </View>
    );
  };

  // Render report item
  const renderReportItem = ({ item }: { item: Report }) => (
    <Card className="mb-3">
      <CardHeader>
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <CardTitle>{item.name}</CardTitle>
            {item.description && (
              <CardDescription className="mt-1">{item.description}</CardDescription>
            )}
          </View>
          {renderStatusBadge(item.status || 'pending')}
        </View>
      </CardHeader>
      <CardContent>
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <FileTextIcon className="h-4 w-4 text-muted-foreground" />
            <Text className="text-sm capitalize text-muted-foreground">
              {item.type?.replace('_', ' ')}
            </Text>
          </View>
          {item.created_at && (
            <View className="flex-row items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Text className="text-sm text-muted-foreground">
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
        <View className="mt-4 flex-row gap-2">
          <Button
            variant="default"
            size="sm"
            onPress={() => handleGenerateReport(item.id)}
            disabled={generateReportMutation.isPending}>
            <PlayIcon className="mr-1 h-4 w-4" />
            <Text>Generate</Text>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onPress={() => router.push(`/reports/${item.id}` as any)}>
            <Text>View Details</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );

  // Render schedule item
  const renderScheduleItem = ({ item }: { item: ReportSchedule }) => (
    <Card className="mb-3">
      <CardHeader>
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <CardTitle>{item.name}</CardTitle>
            <CardDescription className="mt-1">Type: {item.report_type}</CardDescription>
          </View>
          <View
            className={`rounded px-2 py-1 ${item.is_active ? 'bg-green-50 dark:bg-green-950' : 'bg-gray-50 dark:bg-gray-950'}`}>
            <Text
              className={`text-xs font-medium ${item.is_active ? 'text-green-600' : 'text-gray-600'}`}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </CardHeader>
      <CardContent>
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            <Text className="text-sm capitalize text-muted-foreground">
              {item.frequency} at {item.time_of_day}
            </Text>
          </View>
          {item.next_run_at && (
            <View className="flex-row items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Text className="text-sm text-muted-foreground">
                Next run: {new Date(item.next_run_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </CardContent>
    </Card>
  );

  // Render execution item
  const renderExecutionItem = ({ item }: { item: ReportExecution }) => (
    <Card className="mb-3">
      <CardContent className="pt-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="font-medium">Schedule #{item.schedule_id}</Text>
            {item.started_at && (
              <Text className="text-sm text-muted-foreground">
                {new Date(item.started_at).toLocaleString()}
              </Text>
            )}
          </View>
          <View className="items-end gap-1">{renderStatusBadge(item.status)}</View>
        </View>
        {item.error && <Text className="mt-2 text-sm text-red-600">{item.error}</Text>}
        {item.duration && (
          <Text className="mt-1 text-xs text-muted-foreground">
            Duration: {Math.round(item.duration / 1000)}s
          </Text>
        )}
      </CardContent>
    </Card>
  );

  return (
    <ScreenWrapper screenName="Reports">
      <View className="flex-1 bg-background">
        <Stack.Screen
          options={{
            title: 'Reports',
            headerShown: true,
            headerRight: () => (
              <View className="flex-row gap-2 pr-4">
                <Button variant="ghost" size="icon" onPress={handleRefresh} disabled={refreshing}>
                  <FilterIcon className="h-5 w-5" />
                </Button>
              </View>
            ),
          }}
        />

        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          <View className="gap-6 p-4">
            {/* Header */}
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-bold">Reports</Text>
                <Text className="text-sm text-muted-foreground">
                  Generate and schedule automated reports
                </Text>
              </View>
            </View>

            {/* Search and Filters */}
            <View className="gap-2">
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Input
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="flex-1"
                  />
                </View>
                <Select
                  value={{
                    value: selectedType,
                    label: REPORT_TYPES.find((t) => t.value === selectedType)?.label || 'All Types',
                  }}
                  onValueChange={(option) => option && setSelectedType(option.value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" label="All Types">
                      All Types
                    </SelectItem>
                    {REPORT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value} label={type.label}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-2">
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex-1">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    <Text>New Report</Text>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Report</DialogTitle>
                    <DialogDescription>
                      Choose a report type and configure the parameters
                    </DialogDescription>
                  </DialogHeader>
                  <View className="gap-4 py-4">
                    <View>
                      <Label>Report Name</Label>
                      <Input
                        value={newReport.name}
                        onChangeText={(text) => setNewReport({ ...newReport, name: text })}
                        placeholder="My Report"
                      />
                    </View>
                    <View>
                      <Label>Type</Label>
                      <Select
                        value={{
                          value: newReport.type,
                          label:
                            REPORT_TYPES.find((t) => t.value === newReport.type)?.label ||
                            'User Analytics',
                        }}
                        onValueChange={(option) =>
                          option && setNewReport({ ...newReport, type: option.value as ReportType })
                        }>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {REPORT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value} label={type.label}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </View>
                  </View>
                  <DialogFooter>
                    <Button variant="outline" onPress={() => setCreateDialogOpen(false)}>
                      <Text>Cancel</Text>
                    </Button>
                    <Button onPress={handleCreateReport}>
                      <Text>Create</Text>
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <Text>Schedule</Text>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Schedule Report</DialogTitle>
                    <DialogDescription>Configure automated report generation</DialogDescription>
                  </DialogHeader>
                  <View className="gap-4 py-4">
                    <View>
                      <Label>Schedule Name</Label>
                      <Input
                        value={newSchedule.name}
                        onChangeText={(text) => setNewSchedule({ ...newSchedule, name: text })}
                        placeholder="Weekly Report"
                      />
                    </View>
                    <View>
                      <Label>Frequency</Label>
                      <Select
                        value={{
                          value: newSchedule.frequency,
                          label:
                            SCHEDULE_FREQUENCIES.find((f) => f.value === newSchedule.frequency)
                              ?.label || 'Weekly',
                        }}
                        onValueChange={(option) =>
                          option && setNewSchedule({ ...newSchedule, frequency: option.value })
                        }>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          {SCHEDULE_FREQUENCIES.map((freq) => (
                            <SelectItem key={freq.value} value={freq.value} label={freq.label}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </View>
                  </View>
                  <DialogFooter>
                    <Button variant="outline" onPress={() => setScheduleDialogOpen(false)}>
                      <Text>Cancel</Text>
                    </Button>
                    <Button onPress={handleCreateSchedule}>
                      <Text>Create</Text>
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </View>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="reports">
                  <Text>Reports</Text>
                </TabsTrigger>
                <TabsTrigger value="schedules">
                  <Text>Schedules</Text>
                </TabsTrigger>
                <TabsTrigger value="history">
                  <Text>History</Text>
                </TabsTrigger>
              </TabsList>

              {/* Reports Tab */}
              <TabsContent value="reports">
                {reportsLoading ? (
                  <View className="py-8">
                    <ActivityIndicator size="large" />
                  </View>
                ) : reports && reports.length > 0 ? (
                  <FlatList
                    data={reports}
                    renderItem={renderReportItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                  />
                ) : (
                  <Card>
                    <CardContent className="items-center py-8">
                      <FileTextIcon className="mb-2 h-12 w-12 text-muted-foreground" />
                      <Text className="text-muted-foreground">No reports found</Text>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Schedules Tab */}
              <TabsContent value="schedules">
                {schedulesLoading ? (
                  <View className="py-8">
                    <ActivityIndicator size="large" />
                  </View>
                ) : schedulesData?.schedules && schedulesData.schedules.length > 0 ? (
                  <FlatList
                    data={schedulesData.schedules}
                    renderItem={renderScheduleItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                  />
                ) : (
                  <Card>
                    <CardContent className="items-center py-8">
                      <CalendarIcon className="mb-2 h-12 w-12 text-muted-foreground" />
                      <Text className="text-muted-foreground">No schedules configured</Text>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history">
                {executionsLoading ? (
                  <View className="py-8">
                    <ActivityIndicator size="large" />
                  </View>
                ) : executionsData?.executions && executionsData.executions.length > 0 ? (
                  <FlatList
                    data={executionsData.executions}
                    renderItem={renderExecutionItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                  />
                ) : (
                  <Card>
                    <CardContent className="items-center py-8">
                      <ClockIcon className="mb-2 h-12 w-12 text-muted-foreground" />
                      <Text className="text-muted-foreground">No execution history</Text>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </View>
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

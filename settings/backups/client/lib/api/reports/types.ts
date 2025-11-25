/**
 * Reports API Types
 * 
 * Shared type definitions for reports, schedules, and dashboards APIs.
 */

// Report types
export type ReportType = 'user_activity' | 'course_performance' | 'engagement' | 'custom';
export type ReportPeriod = 'today' | 'yesterday' | '7days' | '30days' | '90days' | 'year' | 'custom';
export type ReportFormat = 'pdf' | 'csv' | 'excel' | 'json';
export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Schedule frequency
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

// Request Types
export interface CreateReportRequest {
  name: string;
  description?: string;
  type: ReportType;
  period: ReportPeriod;
  format?: ReportFormat;
  start_date?: string;
  end_date?: string;
}

export interface CreateReportScheduleRequest {
  name: string;
  description?: string;
  report_type: ReportType;
  report_format: ReportFormat;
  frequency: ScheduleFrequency;
  time_of_day?: string;
  day_of_week?: number;
  day_of_month?: number;
  recipients?: string[];
  filters?: Record<string, any>;
  is_active?: boolean;
}

export interface UpdateReportScheduleRequest {
  name?: string;
  description?: string;
  report_format?: ReportFormat;
  frequency?: ScheduleFrequency;
  time_of_day?: string;
  day_of_week?: number;
  day_of_month?: number;
  recipients?: string[];
  filters?: Record<string, any>;
}

export interface ToggleReportScheduleRequest {
  is_active: boolean;
}

export interface CreateDashboardRequest {
  name: string;
  description?: string;
  layout?: Record<string, any>;
  widgets?: Record<string, any>;
  filters?: Record<string, any>;
  preferences?: Record<string, any>;
  refresh_interval?: number;
  is_default?: boolean;
}

export interface UpdateDashboardRequest {
  name?: string;
  description?: string;
  layout?: Record<string, any>;
  widgets?: Record<string, any>;
  filters?: Record<string, any>;
  preferences?: Record<string, any>;
  refresh_interval?: number;
}

export interface CloneDashboardRequest {
  name: string;
  description?: string;
}

export interface GetReportsParams {
  limit?: number;
  offset?: number;
}

export interface SearchReportsParams {
  q: string;
  limit?: number;
  offset?: number;
}

export interface GetReportExecutionsParams {
  limit?: number;
  offset?: number;
}

export interface GetReportExecutionStatsParams {
  start_date?: string;
  end_date?: string;
}

export interface GetDashboardsParams {
  limit?: number;
  offset?: number;
}

export interface SearchDashboardsParams {
  q: string;
  limit?: number;
  offset?: number;
}

// Response Types
export interface Report {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  description?: string;
  type: ReportType;
  period: ReportPeriod;
  format: ReportFormat;
  status: ReportStatus;
  file_url?: string;
  file_size?: number;
  start_date: string;
  end_date: string;
  metadata?: Record<string, any>;
  error?: string;
  generated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportSchedule {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  description?: string;
  report_type: ReportType;
  report_format: ReportFormat;
  frequency: ScheduleFrequency;
  time_of_day?: string;
  day_of_week?: number;
  day_of_month?: number;
  recipients?: string[];
  filters?: Record<string, any>;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportExecution {
  id: string;
  tenant_id: string;
  schedule_id: string;
  report_id?: string;
  status: ReportStatus;
  started_at: string;
  completed_at?: string;
  duration?: number;
  error?: string;
  record_count?: number;
  created_at: string;
}

export interface ReportExecutionStats {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  avg_duration: number;
  avg_record_count: number;
}

export interface Dashboard {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  description?: string;
  layout?: Record<string, any>;
  widgets?: Record<string, any>;
  filters?: Record<string, any>;
  preferences?: Record<string, any>;
  shared_with?: Record<string, any>;
  export_config?: Record<string, any>;
  refresh_interval?: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

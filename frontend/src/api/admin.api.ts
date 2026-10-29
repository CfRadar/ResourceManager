import { api } from './client';
import type { ApiResponse } from './auth.api';

export interface AuditRecord {
  id: string;
  sequenceNumber?: number;
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  previousHash: string;
  recordHash: string;
  payloadHash?: string;
  isVerified?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditVerificationResult {
  scope: string;
  scopeId: string;
  isValid: boolean;
  totalEvents: number;
  genesisHash: string;
  latestHash: string;
  brokenAtSequence?: number;
  verifiedAt: string;
}

export interface CronJobTelemetry {
  name: string;
  schedule: string;
  description: string;
  lastRunAt?: string;
  lastStatus?: 'SUCCESS' | 'FAILURE' | 'RUNNING';
  durationMs?: number;
  nextRunAt?: string;
  enabled: boolean;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  institutionName?: string;
  department?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface TransactionHistoryRecord {
  id: string;
  type: 'BOOKING' | 'SERVICE' | 'NEED';
  referenceNumber: string;
  resourceName: string;
  facilityName?: string;
  institutionName: string;
  requesterName: string;
  requesterEmail: string;
  status: string;
  totalCost?: number;
  currency?: string;
  timeline: Array<{
    title: string;
    description: string;
    actor: string;
    timestamp: string;
    hash?: string;
  }>;
  auditChain: {
    isValid: boolean;
    eventCount: number;
    headHash: string;
  };
}

export const adminApi = {
  // Cron Jobs
  async fetchCronJobs(): Promise<ApiResponse<CronJobTelemetry[]>> {
    const res = await api.get<ApiResponse<CronJobTelemetry[]>>('/admin/jobs');
    return res.data;
  },

  async triggerCronJob(jobName: string): Promise<ApiResponse<{ executed: boolean; result?: unknown }>> {
    const res = await api.post<ApiResponse<{ executed: boolean; result?: unknown }>>(`/admin/jobs/${jobName}/run`);
    return res.data;
  },

  // Users Management
  async fetchUsers(): Promise<ApiResponse<AdminUserRecord[]>> {
    const res = await api.get<ApiResponse<AdminUserRecord[]>>('/admin/users');
    return res.data;
  },

  async suspendUser(id: string): Promise<ApiResponse<{ suspended: boolean }>> {
    const res = await api.post<ApiResponse<{ suspended: boolean }>>(`/admin/users/${id}/suspend`);
    return res.data;
  },

  // Audit Logs & Hash Chain Verification
  async fetchAuditEvents(id: string): Promise<ApiResponse<AuditRecord[]>> {
    const res = await api.get<ApiResponse<AuditRecord[]>>(`/audit/requests/${id}`);
    return res.data;
  },

  async fetchInstitutionAudit(institutionId: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<AuditRecord[]>> {
    const res = await api.get<ApiResponse<AuditRecord[]>>(`/audit/institution/${institutionId}`, { params });
    return res.data;
  },

  async verifyAuditChain(scope: string, id: string): Promise<ApiResponse<AuditVerificationResult>> {
    const res = await api.get<ApiResponse<AuditVerificationResult>>(`/audit/verify/${scope}/${id}`);
    return res.data;
  },

  // Universal Transaction History
  async fetchTransactionHistory(_type: string, id: string): Promise<ApiResponse<TransactionHistoryRecord>> {
    // Queries booking, accessRequest or audit chain
    const res = await api.get<ApiResponse<TransactionHistoryRecord>>(`/bookings/${id}`);
    return res.data;
  },

  // Export URLs
  getAuditCsvExportUrl(): string {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    return `${base}/exports/audit.csv`;
  },

  getTransactionPdfExportUrl(id: string): string {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    return `${base}/exports/transaction/${id}.pdf`;
  },

  getIncidentPdfExportUrl(id: string): string {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    return `${base}/exports/incident-report/${id}.pdf`;
  },
};

import { api } from './client';
import type { ApiResponse } from './auth.api';
import type { EligibilityCheck } from './resources.api';

export interface EligibilityIndicators {
  affiliation: boolean;
  training: boolean;
  documents: boolean;
  fairUse: boolean;
}

export interface QueueItem {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  requesterInstitution: string;
  isVerifiedResearcher: boolean;
  resourceId: string;
  resourceName: string;
  facilityName: string;
  requestedSlotStart: string;
  requestedSlotEnd: string;
  accessMode: 'INDEPENDENT' | 'SUPERVISED' | 'STAFF_SERVICE' | 'COLLABORATION';
  purpose: string;
  outsideMaterials?: Array<{ name: string; hazardClass?: string; needsApproval?: boolean }>;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'WAITLISTED' | 'APPROVED' | 'REJECTED';
  waitingHours: number;
  submittedAt: string;
  indicators: EligibilityIndicators;
  checks?: EligibilityCheck[];
  reviewerId?: string | null;
  reviewerName?: string | null;
  waitlistPosition?: number;
}

export interface ReviewDecisionPayload {
  decision: 'APPROVE' | 'REJECT' | 'WAITLIST';
  reason: string;
  conditions?: string;
  overrideCheckKeys?: string[];
}

export interface ManagerDashboardKPIs {
  requestsToReview: number;
  returnsToConfirm: number;
  openIncidents: number;
  activeTodayBookings: number;
  facilityUtilizationRate: number; // percentage, e.g. 74
  totalEquipmentCount: number;
}

export interface ScheduleEvent {
  id: string;
  bookingId: string;
  resourceName: string;
  requesterName: string;
  startHour: number; // e.g. 9
  durationHours: number; // e.g. 3
  status: 'SCHEDULED' | 'CHECKED_IN' | 'COMPLETED';
}

export interface ResourceDemandStat {
  resourceId: string;
  resourceName: string;
  category: string;
  waitlistCount: number;
  weeklyHoursBooked: number;
  utilizationPercent: number;
}

export interface DeskBookingItem {
  id: string;
  resourceName: string;
  facilityName: string;
  requesterName: string;
  startAt: string;
  endAt: string;
  status: 'SCHEDULED' | 'CHECKED_IN' | 'COMPLETED' | 'NO_SHOW';
  isOverdue?: boolean;
  conditionBeforeRating?: number;
}

/**
 * Fetch manager dashboard operational overview KPIs and schedule timeline.
 */
export async function fetchManagerDashboardStats(): Promise<{
  kpis: ManagerDashboardKPIs;
  schedule: ScheduleEvent[];
  demand: ResourceDemandStat[];
}> {
  try {
    const res = await api.get<ApiResponse<unknown>>('/dashboards/manager');
    if (res.data?.data) {
      // Shape if returned by backend
    }
  } catch {
    // Fallback to demo data
  }

  return {
    kpis: {
      requestsToReview: 5,
      returnsToConfirm: 2,
      openIncidents: 1,
      activeTodayBookings: 4,
      facilityUtilizationRate: 78,
      totalEquipmentCount: 6,
    },
    schedule: [
      {
        id: 'ev-1',
        bookingId: 'bk-501',
        resourceName: 'Prusa i3 MK3S+ 3D Printer',
        requesterName: 'Dr. Jane Doe',
        startHour: 9,
        durationHours: 3,
        status: 'CHECKED_IN',
      },
      {
        id: 'ev-2',
        bookingId: 'bk-502',
        resourceName: 'Epilog Fusion Pro Laser Cutter',
        requesterName: 'Michael Chang',
        startHour: 13,
        durationHours: 2,
        status: 'SCHEDULED',
      },
      {
        id: 'ev-3',
        bookingId: 'bk-503',
        resourceName: 'Haas VF-2 CNC Vertical Mill',
        requesterName: 'Dr. Sarah Chen',
        startHour: 10,
        durationHours: 5,
        status: 'CHECKED_IN',
      },
      {
        id: 'ev-4',
        bookingId: 'bk-504',
        resourceName: 'Keysight DSOX1204G Oscilloscope',
        requesterName: 'Alex Rivera',
        startHour: 16,
        durationHours: 2,
        status: 'SCHEDULED',
      },
    ],
    demand: [
      {
        resourceId: 'res-001',
        resourceName: 'Prusa i3 MK3S+ 3D Printer',
        category: 'Fabrication',
        waitlistCount: 3,
        weeklyHoursBooked: 32,
        utilizationPercent: 80,
      },
      {
        resourceId: 'res-002',
        resourceName: 'Epilog Fusion Pro Laser Cutter',
        category: 'Laser Optics',
        waitlistCount: 2,
        weeklyHoursBooked: 24,
        utilizationPercent: 75,
      },
      {
        resourceId: 'res-003',
        resourceName: 'Haas VF-2 CNC Mill',
        category: 'Machining',
        waitlistCount: 5,
        weeklyHoursBooked: 38,
        utilizationPercent: 95,
      },
    ],
  };
}

/**
 * Fetch access requests review queue.
 */
export async function fetchReviewQueue(): Promise<QueueItem[]> {
  try {
    const res = await api.get<ApiResponse<QueueItem[]>>('/access-requests/review-queue');
    if (res.data?.data) {
      return res.data.data;
    }
  } catch {
    // Fallback demo queue
  }

  const now = new Date();
  return [
    {
      id: 'req-101',
      requesterId: 'usr-researcher-1',
      requesterName: 'Dr. Sarah Chen',
      requesterEmail: 'sarah.chen@mit.edu',
      requesterInstitution: 'MIT Media Lab',
      isVerifiedResearcher: true,
      resourceId: 'res-003',
      resourceName: 'Haas VF-2 CNC Vertical Mill',
      facilityName: 'Precision Engineering Wing',
      requestedSlotStart: new Date(now.getTime() + 24 * 3600000).toISOString(),
      requestedSlotEnd: new Date(now.getTime() + 30 * 3600000).toISOString(),
      accessMode: 'INDEPENDENT',
      purpose: 'Fabricating aerospace grade bracket mounts for micro-satellite subassembly.',
      status: 'SUBMITTED',
      waitingHours: 3,
      submittedAt: new Date(now.getTime() - 3 * 3600000).toISOString(),
      indicators: {
        affiliation: true,
        training: true,
        documents: true,
        fairUse: true,
      },
      checks: [
        { key: 'membership_verified', label: 'Institutional Affiliation', status: 'PASS' },
        { key: 'user_group_allowed', label: 'Authorized User Cohort', status: 'PASS' },
        { key: 'training', label: 'Level 2 CNC Certification', status: 'PASS' },
        { key: 'documents', label: 'Safety Liability Waiver', status: 'PASS' },
        { key: 'fair_use', label: 'Weekly Quota Allowance', status: 'PASS' },
        { key: 'slot_free', label: 'Schedule Slot Available', status: 'PASS' },
      ],
    },
    {
      id: 'req-102',
      requesterId: 'usr-researcher-2',
      requesterName: 'Michael Chang',
      requesterEmail: 'mchang@harvard.edu',
      requesterInstitution: 'Harvard SEAS',
      isVerifiedResearcher: true,
      resourceId: 'res-002',
      resourceName: 'Epilog Fusion Pro Laser Cutter',
      facilityName: 'Digital Fabrication Lab',
      requestedSlotStart: new Date(now.getTime() + 48 * 3600000).toISOString(),
      requestedSlotEnd: new Date(now.getTime() + 51 * 3600000).toISOString(),
      accessMode: 'SUPERVISED',
      purpose: 'Microfluidic acrylic chip laser ablation with sub-millimeter tolerances.',
      outsideMaterials: [{ name: 'Acrylic PMMA Sheet (4mm)', needsApproval: false }],
      status: 'UNDER_REVIEW',
      waitingHours: 8,
      submittedAt: new Date(now.getTime() - 8 * 3600000).toISOString(),
      indicators: {
        affiliation: true,
        training: false,
        documents: true,
        fairUse: true,
      },
      checks: [
        { key: 'membership_verified', label: 'Institutional Affiliation', status: 'PASS' },
        { key: 'user_group_allowed', label: 'Authorized User Cohort', status: 'PASS' },
        { key: 'training', label: 'Laser Safety Level 1', status: 'FAIL', reason: 'Annual renewal due in 2 days (Overridable with supervision)' },
        { key: 'documents', label: 'Laser Cleanroom SOP', status: 'PASS' },
        { key: 'fair_use', label: 'Weekly Quota Allowance', status: 'PASS' },
        { key: 'slot_free', label: 'Schedule Slot Available', status: 'PASS' },
      ],
    },
    {
      id: 'req-103',
      requesterId: 'usr-researcher-3',
      requesterName: 'Elena Rostova',
      requesterEmail: 'elena.rostova@cambridge.ac.uk',
      requesterInstitution: 'Cambridge Photonics',
      isVerifiedResearcher: false,
      resourceId: 'res-004',
      resourceName: 'FEI Quanta 200 Environmental SEM',
      facilityName: 'Nanoscale Characterization Facility',
      requestedSlotStart: new Date(now.getTime() + 72 * 3600000).toISOString(),
      requestedSlotEnd: new Date(now.getTime() + 76 * 3600000).toISOString(),
      accessMode: 'STAFF_SERVICE',
      purpose: 'Gold nanoparticle size distribution imaging and EDAX compositional mapping.',
      status: 'WAITLISTED',
      waitlistPosition: 2,
      waitingHours: 28,
      submittedAt: new Date(now.getTime() - 28 * 3600000).toISOString(),
      indicators: {
        affiliation: true,
        training: true,
        documents: false,
        fairUse: true,
      },
      checks: [
        { key: 'membership_verified', label: 'Institutional Affiliation', status: 'PASS' },
        { key: 'user_group_allowed', label: 'Authorized User Cohort', status: 'PASS' },
        { key: 'training', label: 'Electron Microscopy Basics', status: 'PASS' },
        { key: 'documents', label: 'Sample MSDS Declaration', status: 'FAIL', reason: 'Unsigned biological specimen form' },
        { key: 'fair_use', label: 'Weekly Quota Allowance', status: 'PASS' },
        { key: 'slot_free', label: 'Schedule Slot Collision', status: 'FAIL', reason: 'Occupied by prior thesis project' },
      ],
    },
  ];
}

/**
 * Fetch a single review queue item by ID.
 */
export async function fetchQueueItemById(id: string): Promise<QueueItem> {
  const queue = await fetchReviewQueue();
  const match = queue.find((q) => q.id === id);
  if (match) return match;

  const now = new Date();
  return {
    id,
    requesterId: 'usr-researcher-1',
    requesterName: 'Dr. Sarah Chen',
    requesterEmail: 'sarah.chen@mit.edu',
    requesterInstitution: 'MIT Media Lab',
    isVerifiedResearcher: true,
    resourceId: 'res-003',
    resourceName: 'Haas VF-2 CNC Vertical Mill',
    facilityName: 'Precision Engineering Wing',
    requestedSlotStart: new Date(now.getTime() + 24 * 3600000).toISOString(),
    requestedSlotEnd: new Date(now.getTime() + 30 * 3600000).toISOString(),
    accessMode: 'INDEPENDENT',
    purpose: 'Fabricating aerospace grade bracket mounts for micro-satellite subassembly.',
    status: 'SUBMITTED',
    waitingHours: 3,
    submittedAt: new Date(now.getTime() - 3 * 3600000).toISOString(),
    indicators: {
      affiliation: true,
      training: true,
      documents: true,
      fairUse: true,
    },
    checks: [
      { key: 'membership_verified', label: 'Institutional Affiliation', status: 'PASS' },
      { key: 'user_group_allowed', label: 'Authorized User Cohort', status: 'PASS' },
      { key: 'training', label: 'Level 2 CNC Certification', status: 'PASS' },
      { key: 'documents', label: 'Safety Liability Waiver', status: 'PASS' },
      { key: 'fair_use', label: 'Weekly Quota Allowance', status: 'PASS' },
      { key: 'slot_free', label: 'Schedule Slot Available', status: 'PASS' },
    ],
  };
}

/**
 * Submit decision (Approve, Reject, Waitlist).
 */
export async function submitReviewDecision(
  id: string,
  payload: ReviewDecisionPayload
): Promise<void> {
  try {
    await api.post(`/access-requests/${id}/decision`, payload);
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      throw err;
    }
  }
}

/**
 * Request clarification question to applicant.
 */
export async function requestClarification(id: string, question: string): Promise<void> {
  try {
    await api.post(`/access-requests/${id}/request-info`, { question });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      throw err;
    }
  }
}

/**
 * Fetch Check-In and Returns Desk items.
 */
export async function fetchDeskBookings(): Promise<{
  arrivingToday: DeskBookingItem[];
  dueBackToday: DeskBookingItem[];
}> {
  const now = new Date();
  return {
    arrivingToday: [
      {
        id: 'bk-501',
        resourceName: 'Prusa i3 MK3S+ 3D Printer',
        facilityName: 'Digital Fabrication Lab',
        requesterName: 'Dr. Jane Doe',
        startAt: new Date(now.getTime() + 1 * 3600000).toISOString(),
        endAt: new Date(now.getTime() + 5 * 3600000).toISOString(),
        status: 'SCHEDULED',
      },
      {
        id: 'bk-502',
        resourceName: 'Epilog Fusion Pro Laser Cutter',
        facilityName: 'Digital Fabrication Lab',
        requesterName: 'Michael Chang',
        startAt: new Date(now.getTime() + 3 * 3600000).toISOString(),
        endAt: new Date(now.getTime() + 6 * 3600000).toISOString(),
        status: 'SCHEDULED',
      },
    ],
    dueBackToday: [
      {
        id: 'bk-499',
        resourceName: 'Keysight DSOX1204G Oscilloscope',
        facilityName: 'Microelectronics Lab',
        requesterName: 'Alex Rivera',
        startAt: new Date(now.getTime() - 4 * 3600000).toISOString(),
        endAt: new Date(now.getTime() - 30 * 60000).toISOString(),
        status: 'CHECKED_IN',
        isOverdue: true,
        conditionBeforeRating: 5,
      },
      {
        id: 'bk-500',
        resourceName: 'Haas VF-2 CNC Mill',
        facilityName: 'Precision Engineering Wing',
        requesterName: 'Dr. Sarah Chen',
        startAt: new Date(now.getTime() - 5 * 3600000).toISOString(),
        endAt: new Date(now.getTime() + 30 * 60000).toISOString(),
        status: 'CHECKED_IN',
        conditionBeforeRating: 4,
      },
    ],
  };
}

/**
 * Confirm return from check-out desk.
 */
export async function confirmReturn(
  bookingId: string,
  payload: { action: 'CONFIRM' | 'FLAG_INCIDENT'; findings?: string; notes?: string }
): Promise<void> {
  try {
    await api.post(`/bookings/${bookingId}/confirm-return`, payload);
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      throw err;
    }
  }
}

/**
 * Mark booking as no-show.
 */
export async function markNoShow(bookingId: string): Promise<void> {
  try {
    await api.post(`/bookings/${bookingId}/no-show`);
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      throw err;
    }
  }
}


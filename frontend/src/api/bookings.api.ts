import { api } from './client';
import type { ApiResponse } from './auth.api';

export interface BookingConditionReport {
  timestamp: string;
  condition: 'PRISTINE' | 'NORMAL_WEAR' | 'MINOR_BLEMISH' | 'DAMAGED';
  notes: string;
  cleanlinessScore: number; // 1 to 5
  inspectorId?: string;
  photoUrls?: string[];
}

export interface BookingRecord {
  id: string;
  accessRequestId?: string;
  resourceId: string;
  resourceName?: string;
  category?: string;
  facilityName?: string;
  room?: string;
  facilityAddress?: string;
  startAt: string;
  endAt: string;
  status: 'SCHEDULED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  accessMode?: string;
  qrCodeData?: string;
  doorCode?: string;
  lockboxPin?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  specialInstructions?: string;
  conditionReportBefore?: BookingConditionReport | null;
  conditionReportAfter?: BookingConditionReport | null;
  tokenCost?: number;
  cancellationNoticeHours?: number;
  createdAt: string;
}

export interface ReschedulePayload {
  newStartAt: string;
  newEndAt: string;
  reason?: string;
}

export interface CancelBookingPayload {
  reason: string;
}

export async function fetchMyBookings(): Promise<BookingRecord[]> {
  try {
    const res = await api.get<ApiResponse<BookingRecord[]>>('/bookings/mine');
    if (res.data?.data) {
      return res.data.data;
    }
  } catch {
    // Fallback to demo bookings
  }

  const now = new Date();
  const todayLater = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const todayEnd = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();

  const yesterdayStart = new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString();
  const yesterdayEnd = new Date(now.getTime() - 22 * 60 * 60 * 1000).toISOString();

  return [
    {
      id: 'bk-501',
      accessRequestId: 'req-102',
      resourceId: 'res-001',
      resourceName: 'Prusa i3 MK3S+ 3D Printer',
      category: 'Fabrication',
      facilityName: 'Digital Fabrication Lab',
      room: 'Room 204, East Wing',
      facilityAddress: '105 Innovation Way, Building C',
      startAt: todayLater,
      endAt: todayEnd,
      status: 'SCHEDULED',
      accessMode: 'INDEPENDENT',
      qrCodeData: 'RM-PASS-BK501-VERIFIED',
      doorCode: '4829#',
      lockboxPin: '9173',
      wifiSsid: 'FabLab-Secure-Guest',
      wifiPassword: 'maker-space-2026',
      specialInstructions:
        'Clean PEI sheet with 99% isopropyl alcohol after part removal. Return brass wire brush to tool rack.',
      tokenCost: 4,
      cancellationNoticeHours: 12,
      createdAt: new Date(now.getTime() - 86400000).toISOString(),
    },
    {
      id: 'bk-498',
      accessRequestId: 'req-098',
      resourceId: 'res-003',
      resourceName: 'Keysight DSOX1204G Oscilloscope',
      category: 'Electronics',
      facilityName: 'Microelectronics Lab',
      room: 'Bench 4',
      facilityAddress: '42 Science Parkway, Level 2',
      startAt: yesterdayStart,
      endAt: yesterdayEnd,
      status: 'COMPLETED',
      accessMode: 'SUPERVISED',
      qrCodeData: 'RM-PASS-BK498-COMPLETED',
      tokenCost: 4,
      cancellationNoticeHours: 12,
      conditionReportBefore: {
        timestamp: yesterdayStart,
        condition: 'PRISTINE',
        notes: 'Screen calibrated, 4 passive probes in probe box.',
        cleanlinessScore: 5,
      },
      conditionReportAfter: {
        timestamp: yesterdayEnd,
        condition: 'PRISTINE',
        notes: 'Returned in identical clean state. Probes coiled on rack.',
        cleanlinessScore: 5,
      },
      createdAt: new Date(now.getTime() - 172800000).toISOString(),
    },
  ];
}

export async function fetchBookingById(id: string): Promise<BookingRecord> {
  try {
    const res = await api.get<ApiResponse<BookingRecord>>(`/bookings/${id}`);
    if (res.data?.data) {
      return res.data.data;
    }
  } catch {
    // Demo fallback
  }

  const all = await fetchMyBookings();
  const match = all.find((b) => b.id === id);
  if (match) return match;

  const now = new Date();
  return {
    id,
    accessRequestId: 'req-102',
    resourceId: 'res-001',
    resourceName: 'Prusa i3 MK3S+ 3D Printer',
    category: 'Fabrication',
    facilityName: 'Digital Fabrication Lab',
    room: 'Room 204, East Wing',
    facilityAddress: '105 Innovation Way, Building C',
    startAt: new Date(now.getTime() + 2 * 3600000).toISOString(),
    endAt: new Date(now.getTime() + 6 * 3600000).toISOString(),
    status: 'SCHEDULED',
    accessMode: 'INDEPENDENT',
    qrCodeData: `RM-PASS-${id}-VERIFIED`,
    doorCode: '4829#',
    lockboxPin: '9173',
    wifiSsid: 'FabLab-Secure-Guest',
    wifiPassword: 'maker-space-2026',
    specialInstructions:
      'Clean PEI sheet with 99% isopropyl alcohol after part removal. Return brass wire brush to tool rack.',
    tokenCost: 4,
    cancellationNoticeHours: 12,
    createdAt: new Date().toISOString(),
  };
}

export async function cancelBooking(id: string, payload: CancelBookingPayload): Promise<void> {
  try {
    await api.post(`/bookings/${id}/cancel`, payload);
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      throw err;
    }
  }
}

export async function rescheduleBooking(id: string, payload: ReschedulePayload): Promise<void> {
  try {
    await api.post(`/bookings/${id}/reschedule`, payload);
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      throw err;
    }
  }
}


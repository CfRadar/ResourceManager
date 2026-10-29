import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, QrCode, ArrowRight, Coins } from 'lucide-react';
import { StatusBadge } from '../feedback/StatusBadge';
import { useCountdown } from '../../hooks/useCountdown';
import type { BookingRecord } from '../../api/bookings.api';

interface BookingCardProps {
  booking: BookingRecord;
}

export const BookingCard: React.FC<BookingCardProps> = ({ booking }) => {
  const countdown = useCountdown(booking.startAt);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    });
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const isCheckInEligible = countdown.isImminent || countdown.isStarted;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <StatusBadge status={booking.status} />
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>{booking.tokenCost || 1} Token{(booking.tokenCost || 1) !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <h3 className="font-bold text-slate-900 text-base mb-1">
          {booking.resourceName || 'Laboratory Instrument'}
        </h3>

        <p className="text-xs text-slate-500 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {booking.facilityName || 'Main Lab'} {booking.room ? `• ${booking.room}` : ''}
          </span>
        </p>
      </div>

      {/* Date & Time Window with Countdown */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-700">
          <span className="font-semibold">{formatDate(booking.startAt)}</span>
          <span className="text-slate-500">
            {formatTime(booking.startAt)} - {formatTime(booking.endAt)} UTC
          </span>
        </div>

        {booking.status === 'SCHEDULED' && (
          <div
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${
              countdown.isImminent
                ? 'bg-amber-100 text-amber-900 animate-pulse'
                : countdown.isStarted
                ? 'bg-emerald-100 text-emerald-900'
                : 'bg-blue-100 text-blue-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{countdown.formatted}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <span className="text-[11px] font-mono text-slate-400">ID: {booking.id}</span>

        <div className="flex items-center gap-2">
          {booking.status === 'SCHEDULED' && isCheckInEligible && (
            <Link
              to={`/bookings/${booking.id}`}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center gap-1 shadow-2xs"
            >
              <QrCode className="w-3.5 h-3.5" />
              Check In
            </Link>
          )}

          <Link
            to={`/bookings/${booking.id}`}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

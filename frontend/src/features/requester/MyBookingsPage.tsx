import { QrCode, Clock, MapPin, ArrowRight } from 'lucide-react';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { DemoTag } from '../../components/feedback/DemoTag';

export function MyBookingsPage() {
  const bookings = [
    {
      id: 'bk_501',
      resourceName: 'Prusa i3 MK3S+ 3D Printer',
      facility: 'Digital Fabrication Lab',
      room: 'Room 204, East Wing',
      startAt: 'Today, 17:00 UTC',
      endAt: 'Today, 21:00 UTC',
      status: 'SCHEDULED',
      qrCodeId: 'qr_demo_501',
    },
    {
      id: 'bk_498',
      resourceName: 'Keysight DSOX1204G Oscilloscope',
      facility: 'Microelectronics Lab',
      room: 'Bench 4',
      startAt: 'Yesterday, 10:00 UTC',
      endAt: 'Yesterday, 14:00 UTC',
      status: 'RETURNED',
      qrCodeId: 'qr_demo_498',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900">My Bookings & QR Passes</h1>
            <DemoTag />
          </div>
          <p className="text-xs text-slate-500">
            Present digital pass or QR badge upon facility arrival to trigger check-in condition report.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bookings.map((b) => (
          <div key={b.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <StatusBadge status={b.status} />
                <span className="text-[10px] text-slate-400 font-mono">ID: {b.id}</span>
              </div>

              <h3 className="font-bold text-slate-900 text-base mb-1">{b.resourceName}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{b.facility} ({b.room})</span>
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs mb-4 flex items-center gap-2 text-slate-700">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="font-semibold">{b.startAt} – {b.endAt}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <QrCode className="w-4 h-4 text-slate-700" />
                <span className="font-mono text-[11px]">{b.qrCodeId}</span>
              </div>

              {b.status === 'SCHEDULED' && (
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                >
                  <span>Begin QR Check-In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

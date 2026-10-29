import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, ArrowLeft } from 'lucide-react';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { DemoTag } from '../../components/feedback/DemoTag';
import { api } from '../../api/client';

export function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [resource, setResource] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadResource() {
      setIsLoading(true);
      try {
        const res = await api.get(`/resources/${id}`);
        if (res.data?.ok) {
          setResource(res.data.data);
        }
      } catch {
        // Fallback demo data
        setResource({
          id: id || 'res_001',
          name: 'Prusa i3 MK3S+ 3D Printer',
          category: 'fabrication',
          facility_name: 'Digital Fabrication Lab',
          institution_name: 'Institute of Applied Technology',
          status: 'ACTIVE',
          description: 'High-precision FDM desktop 3D printer with heated bed and magnetic removable PEI sheet.',
          capabilities: ['FDM', 'PLA', 'PETG', 'ABS', 'rapid-prototyping', '0.1mm-resolution'],
          specs: {
            technology: 'FDM',
            buildVolume: '250x210x210 mm',
            layerResolution: '0.05 - 0.35 mm',
            nozzleDiameter: '0.4 mm',
          },
          policy_data: {
            accessModes: ['IN_PERSON', 'SEND_SAMPLE'],
            maxSingleBookingHours: 8,
            advanceBookingDays: 14,
            requiredTrainings: ['train_3d_basics'],
            requiresStaffSupervision: false,
          },
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadResource();
  }, [id]);

  if (isLoading) {
    return <div className="text-center py-16 text-slate-400 text-xs">Loading equipment details...</div>;
  }

  if (!resource) {
    return <div className="text-center py-16 text-slate-600">Resource not found.</div>;
  }

  const policy = resource.policy_data || {};

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link to="/resources" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" />
        Back to Equipment Catalog
      </Link>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                {resource.category}
              </span>
              <StatusBadge status={resource.status || 'ACTIVE'} />
              <DemoTag />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{resource.name}</h1>
            <p className="text-xs text-slate-500 mt-1">
              {resource.facility_name} • {resource.institution_name}
            </p>
          </div>

          <button
            type="button"
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Request Working Slot</span>
          </button>
        </div>

        {/* Description & Technical Envelope */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description</h2>
          <p className="text-sm text-slate-700 leading-relaxed">{resource.description}</p>
        </div>

        {/* Specifications */}
        {resource.specs && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Technical Specifications</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              {Object.entries(resource.specs).map(([key, val]) => (
                <div key={key}>
                  <p className="text-[11px] text-slate-400 font-medium capitalize">{key}</p>
                  <p className="text-xs font-bold text-slate-800">{String(val)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Capabilities Tags */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Capabilities & Materials</h2>
          <div className="flex flex-wrap gap-1.5">
            {(resource.capabilities || []).map((cap: string, i: number) => (
              <span key={i} className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-lg font-medium">
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* Access Policy & Prerequisites */}
        <div className="border-t border-slate-100 pt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Institutional Access Rules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">MAX DURATION</span>
              <span className="text-xs font-bold text-slate-900">{policy.maxSingleBookingHours || 4} Hours per slot</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">ADVANCE NOTICE</span>
              <span className="text-xs font-bold text-slate-900">{policy.advanceBookingDays || 7} Days in advance</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">TRAINING PREREQUISITES</span>
              <span className="text-xs font-bold text-slate-900">
                {(policy.requiredTrainings || []).length > 0 ? `${policy.requiredTrainings.length} Required Module(s)` : 'Open Access'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

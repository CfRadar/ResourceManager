import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, MapPin, ArrowRight } from 'lucide-react';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { DemoTag } from '../../components/feedback/DemoTag';
import { api } from '../../api/client';

export function ResourcesPage() {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialQ);
  const [resources, setResources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchResources() {
      setIsLoading(true);
      try {
        const queryStr = searchTerm ? `?q=${encodeURIComponent(searchTerm)}` : '';
        const res = await api.get(`/resources${queryStr}`);
        if (res.data?.ok) {
          setResources(res.data.data || []);
        }
      } catch {
        // Fallback demo items if backend offline
        setResources([
          {
            id: 'res_001',
            name: 'Prusa i3 MK3S+ 3D Printer',
            category: 'fabrication',
            facility_name: 'Digital Fabrication Lab',
            facility_city: 'Cambridge',
            status: 'ACTIVE',
            capabilities: ['FDM', 'PLA', 'PETG', 'rapid-prototyping'],
          },
          {
            id: 'res_002',
            name: 'Epilog Fusion Pro 48 CO2 Laser Cutter',
            category: 'fabrication',
            facility_name: 'Digital Fabrication Lab',
            facility_city: 'Cambridge',
            status: 'ACTIVE',
            capabilities: ['laser-cutting', 'engraving', 'acrylic'],
          },
          {
            id: 'res_003',
            name: 'Keysight DSOX1204G Digital Storage Oscilloscope',
            category: 'test-equipment',
            facility_name: 'Microelectronics Lab',
            facility_city: 'Boston',
            status: 'ACTIVE',
            capabilities: ['oscilloscope', 'waveform-analysis', 'electronics'],
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchResources();
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900">Equipment Catalog</h1>
            <DemoTag />
          </div>
          <p className="text-xs text-slate-500">
            Browse active cross-institutional resources, verified working envelopes, and access policies.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search equipment or capability..."
            className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid of Resources */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Loading available catalog...</div>
      ) : resources.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
          No resources matched your search query. Try broadening your terms.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((r) => (
            <Link
              key={r.id}
              to={`/resources/${r.id}`}
              className="bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-2xl p-5 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {r.category || 'Laboratory'}
                  </span>
                  <StatusBadge status={r.status || 'ACTIVE'} size="sm" />
                </div>

                <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                  {r.name}
                </h3>

                <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{r.facility_name || 'Facility'}, {r.facility_city || 'City'}</span>
                </p>

                {/* Capabilities pills */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {(r.capabilities || []).slice(0, 4).map((c: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold group-hover:text-blue-700">
                <span>View Availability & Policy</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

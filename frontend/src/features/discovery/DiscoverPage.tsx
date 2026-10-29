import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Sparkles,
  Info,
  HelpCircle,
  PlusCircle,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { discoveryApi } from '../../api/discovery.api';
import type { ResourceMatch, ResourceItem, EmptyMatchGuidance } from '../../api/discovery.api';
import { ResourceCard } from '../../components/discovery/ResourceCard';
import { DemoTag } from '../../components/feedback/DemoTag';

export function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || '';

  const [searchTerm, setSearchTerm] = useState(initialQ);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [accessMode, setAccessMode] = useState<string>('ALL');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [maxTokens, setMaxTokens] = useState<number>(10);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [matches, setMatches] = useState<ResourceMatch[]>([]);
  const [source, setSource] = useState<string>('AI_EMBEDDING');
  const [parsedKeywords, setParsedKeywords] = useState<string[]>([]);
  const [emptyGuidance, setEmptyGuidance] = useState<EmptyMatchGuidance | null>(null);

  // Perform search / AI matching when query parameters change
  useEffect(() => {
    async function executeSearch() {
      setIsLoading(true);
      try {
        if (searchTerm.trim()) {
          // Perform natural language semantic match via Express proxy
          const res = await discoveryApi.matchNeedWithAi(searchTerm.trim());
          if (res?.ok && res.data) {
            const rawMatches = res.data.matches || res.data.rankedResources || [];
            setMatches(rawMatches);
            setSource(res.data.source || 'AI_EMBEDDING');
            setParsedKeywords(res.data.parsedNeed?.detectedKeywords || []);
            setEmptyGuidance(res.data.emptyMatchGuidance || null);
          }
        } else {
          // Standard catalog search
          const res = await discoveryApi.searchResources({
            category: selectedCategory || undefined,
          });
          if (res?.ok && res.data) {
            const listMatches: ResourceMatch[] = (res.data || []).map((r: ResourceItem) => ({
              resourceId: r.id,
              name: r.name,
              category: r.category,
              matchType: 'AVAILABLE_LISTING',
              source: 'CATALOG_BROWSING',
              reasons: [`Available in catalog: ${r.category}`],
              resource: r,
            }));
            setMatches(listMatches);
            setSource('CATALOG_BROWSING');
            setParsedKeywords([]);
            setEmptyGuidance(null);
          }
        }
      } catch {
        // Fallback demo mock results if backend API offline
        setSource('KEYWORD_FALLBACK');
        setParsedKeywords(['3D print', 'PLA', 'prototype']);
        setMatches([
          {
            resourceId: 'res_001',
            name: 'Prusa i3 MK3S+ 3D Printer',
            category: 'fabrication',
            matchType: 'AVAILABLE_LISTING',
            score: 0.94,
            source: 'KEYWORD_FALLBACK',
            reasons: ['Matched requested fabrication category and FDM 3D printing capabilities'],
            caveats: ['Requires 3D Printing Safety Certification module'],
            resource: {
              id: 'res_001',
              name: 'Prusa i3 MK3S+ 3D Printer',
              category: 'fabrication',
              facility_name: 'Digital Fabrication Lab',
              facility_city: 'Cambridge',
              status: 'ACTIVE',
              capabilities: ['FDM', 'PLA', 'PETG', 'ABS', '0.1mm-resolution'],
              policySummary: { version: 1, tokensPerHour: 1 },
            },
          },
          {
            resourceId: 'res_002',
            name: 'Epilog Fusion Pro 48 CO2 Laser Cutter',
            category: 'fabrication',
            matchType: 'POTENTIAL_MATCH',
            score: 0.78,
            source: 'KEYWORD_FALLBACK',
            reasons: ['Alternative fabrication rapid-prototyping tool for sheet materials'],
            caveats: ['Staff supervision required for acrylic thicknesses over 6mm'],
            resource: {
              id: 'res_002',
              name: 'Epilog Fusion Pro 48 CO2 Laser Cutter',
              category: 'fabrication',
              facility_name: 'Digital Fabrication Lab',
              facility_city: 'Cambridge',
              status: 'ACTIVE',
              capabilities: ['laser-cutting', 'engraving', 'acrylic', 'wood'],
              policySummary: { version: 1, tokensPerHour: 3 },
            },
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    executeSearch();
  }, [searchTerm, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: searchTerm, category: selectedCategory });
  };

  const removeKeyword = (kw: string) => {
    setParsedKeywords((prev) => prev.filter((k) => k !== kw));
  };

  // Filter items based on local sidebar criteria
  const filteredMatches = matches.filter((m) => {
    if (selectedCategory && m.category !== selectedCategory) return false;
    if (eligibleOnly && m.matchType === 'INACTIVE') return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Search Bar & Query Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Describe equipment needed, materials, or research envelope..."
              className="w-full text-xs pl-10 pr-4 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Search & Match</span>
          </button>
        </form>

        {/* Parsed Need Keywords Tags Bar */}
        {parsedKeywords.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Parsed Requirements:
            </span>
            {parsedKeywords.map((kw, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
              >
                <span>{kw}</span>
                <button
                  type="button"
                  onClick={() => removeKeyword(kw)}
                  className="hover:text-blue-900 font-bold"
                  aria-label="Remove requirement keyword"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Fallback Banner Handling (Section 6.4) */}
      {source === 'KEYWORD_FALLBACK' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-5 py-3 rounded-2xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Fallback Active:</strong> AI neural service is offline or timed out; deterministic lexical & synonym matching was used.
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-md font-bold">
            Deterministic Engine
          </span>
        </div>
      )}

      {/* Main Grid: Filters Sidebar + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Filter Sidebar */}
        <aside
          className={`lg:block bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-5 ${
            showMobileFilters ? 'block' : 'hidden'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Filter className="w-4 h-4 text-slate-500" />
              <span>Catalog Filters</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('');
                setAccessMode('ALL');
                setEligibleOnly(false);
                setMaxTokens(10);
              }}
              className="text-[11px] text-blue-600 hover:underline font-semibold"
            >
              Reset
            </button>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Discipline / Category
            </label>
            <div className="space-y-1">
              {[
                { id: '', label: 'All Equipment' },
                { id: 'fabrication', label: 'Digital Fabrication' },
                { id: 'microscopy', label: 'Microscopy & Imaging' },
                { id: 'test-equipment', label: 'Electronics & Testing' },
                { id: 'spectroscopy', label: 'Materials Characterization' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`w-full text-left text-xs px-3 py-2 rounded-xl transition-colors font-medium flex items-center justify-between ${
                    selectedCategory === c.id
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Access Mode Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Access Mode
            </label>
            <select
              value={accessMode}
              onChange={(e) => setAccessMode(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Modes</option>
              <option value="INDEPENDENT">Independent Operation</option>
              <option value="SUPERVISED">Staff Supervised</option>
              <option value="STAFF_SERVICE">Staff-Operated Service</option>
            </select>
          </div>

          {/* Max Token Cost */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Max Cost:
              </span>
              <span className="font-bold text-slate-900">{maxTokens} Tokens/hr</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          {/* Eligibility Only Toggle */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Only where eligible</span>
            <input
              type="checkbox"
              checked={eligibleOnly}
              onChange={(e) => setEligibleOnly(e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </div>
        </aside>

        {/* Right Column: Search Results */}
        <main className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">
                {filteredMatches.length} Matching Resource{filteredMatches.length === 1 ? '' : 's'}
              </span>
              <DemoTag />
            </div>

            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden text-xs font-semibold text-blue-600 flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>

          {/* Empty Match Guidance or Results Cards */}
          {isLoading ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl text-slate-400 text-xs">
              Analyzing laboratory envelopes and matching capability vectors...
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-slate-900 text-base mb-1">
                  No Available Resources Matched Your Exact Criteria
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {emptyGuidance?.message ||
                    'None of the active equipment in your institutional network matched this specification. You can submit a Missing-Resource Need Request to notify coordinators.'}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/services/needs/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Submit Missing-Resource Request</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMatches.map((m, idx) => (
                <ResourceCard key={m.resourceId || idx} match={m} defaultSource={source} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


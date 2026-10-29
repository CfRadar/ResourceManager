import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, ArrowRight, Wrench, Microscope, Cpu, Layers } from 'lucide-react';
import { DemoTag } from '../../components/feedback/DemoTag';

export function LandingPage() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/resources?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const samplePrompts = [
    'Need high-precision FDM 3D printer for biocompatible PLA parts',
    'Scanning electron microscope with EDX for fracture analysis',
    '4-channel 200MHz digital oscilloscope with SPI decoding',
    '120W CO2 laser cutter for 6mm acrylic sheet prototyping',
  ];

  return (
    <div className="space-y-12 py-6">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI-Powered Cross-Institutional Laboratory Access</span>
          <DemoTag />
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Share Advanced Research Equipment Across Institutions
        </h1>

        <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Discover specialized machinery, verify deterministic safety eligibility, book working slots, and coordinate multi-facility research needs seamlessly.
        </p>

        {/* Search Bar with AI Need Parser support */}
        <form onSubmit={handleSearch} className="pt-4 max-w-2xl mx-auto">
          <div className="relative flex items-center shadow-lg rounded-2xl bg-white border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all p-1.5">
            <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe your research need in natural language..."
              className="w-full text-sm px-3 py-2.5 focus:outline-none text-slate-800 placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <span>Match Need</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Suggested Prompts */}
        <div className="pt-2 text-left max-w-2xl mx-auto">
          <p className="text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
            Try research queries:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setQuery(prompt);
                  navigate(`/resources?q=${encodeURIComponent(prompt)}`);
                }}
                className="text-[11px] bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-600 hover:text-blue-700 px-2.5 py-1 rounded-lg transition-colors text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Domains Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Wrench,
            name: 'Digital Fabrication',
            desc: '3D printers, laser cutters, CNC vertical mills',
            color: 'text-blue-600 bg-blue-50 border-blue-100',
            cat: 'fabrication',
          },
          {
            icon: Microscope,
            name: 'Microscopy & Imaging',
            desc: 'SEM, TEM, AFM, confocal fluorescence',
            color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
            cat: 'microscopy',
          },
          {
            icon: Cpu,
            name: 'Electronics & Sensors',
            desc: 'Oscilloscopes, logic analyzers, soldering stations',
            color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
            cat: 'test-equipment',
          },
          {
            icon: Layers,
            name: 'Materials Characterization',
            desc: 'FTIR, UV-Vis, tensile testers, rheometers',
            color: 'text-purple-600 bg-purple-50 border-purple-100',
            cat: 'spectroscopy',
          },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              onClick={() => navigate(`/resources?category=${item.cat}`)}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 border ${item.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                {item.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}

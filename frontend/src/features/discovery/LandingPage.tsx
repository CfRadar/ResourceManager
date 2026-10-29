import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Sparkles,
  ArrowRight,
  Wrench,
  Microscope,
  Cpu,
  Layers,
  ShieldCheck,
  Calendar,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { DemoTag } from '../../components/feedback/DemoTag';

export function LandingPage() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/discover?q=${encodeURIComponent(query.trim())}&ai=true`);
    } else {
      navigate('/discover');
    }
  };

  const samplePrompts = [
    '3D print small biocompatible gear components with 50 micron layer height',
    'Scanning electron microscope with EDX for fracture surface analysis',
    '4-channel 200MHz digital storage oscilloscope for SPI decoding',
    '120W CO2 laser cutter for 6mm cast acrylic sheet prototyping',
  ];

  const quickFilterChips = [
    { label: 'Fabrication', category: 'fabrication' },
    { label: 'Microscopy', category: 'microscopy' },
    { label: 'Electronics', category: 'test-equipment' },
    { label: 'Spectroscopy', category: 'spectroscopy' },
  ];

  return (
    <div className="space-y-16 py-6 max-w-6xl mx-auto px-4">
      {/* 1. Hero Section (Spec §5.1) */}
      <section className="text-center max-w-3xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cross-Institutional Laboratory Access & AI Capability Matching</span>
          <DemoTag />
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">
          Find equipment, tools, and labs you can use.
        </h1>

        <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Describe your research needs in natural language. Our semantic matching engine searches technical working envelopes across partner institutions to find available slots and verify eligibility.
        </p>

        {/* Natural Language Search Input Box */}
        <form onSubmit={handleSearch} className="pt-2 max-w-2xl mx-auto">
          <div className="relative flex items-center shadow-xl rounded-3xl bg-white border-2 border-slate-200 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100 transition-all p-2">
            <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe what you need... e.g. '3D print small SLA gears'"
              className="w-full text-sm px-3.5 py-3 focus:outline-none text-slate-800 placeholder:text-slate-400 font-medium"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs transition-colors flex items-center gap-2 shrink-0 shadow-xs"
            >
              <span>Find Equipment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Quick Filter Chips (Spec §5.1) */}
        <div className="flex items-center justify-center gap-2 flex-wrap pt-1 text-xs">
          <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
            Quick Categories:
          </span>
          {quickFilterChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => navigate(`/discover?category=${chip.category}`)}
              className="px-3 py-1 rounded-full bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700 font-medium transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Suggested Prompts */}
        <div className="pt-2 text-left max-w-2xl mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Try sample research queries:</span>
          </p>
          <div className="flex flex-col gap-1.5">
            {samplePrompts.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setQuery(prompt);
                  navigate(`/discover?q=${encodeURIComponent(prompt)}&ai=true`);
                }}
                className="text-xs text-slate-700 hover:text-blue-700 hover:bg-white p-1.5 rounded-lg transition-colors text-left font-medium flex items-center justify-between group"
              >
                <span>“{prompt}”</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. How It Works (Spec §5.1: 1. Find -> 2. Check Eligibility -> 3. Request Access) */}
      <section className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-xs">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
            Deterministic Access Lifecycle
          </h2>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            How The Network Works
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Fair-share access backed by automated eligibility, digital QR passes, and objective condition diffing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {[
            {
              step: '01',
              title: '1. Find & Match Needs',
              desc: 'Describe technical requirements in plain language. AI parses tolerances, materials, and envelope specs.',
              icon: Search,
              color: 'text-blue-600 bg-blue-50 border-blue-100',
            },
            {
              step: '02',
              title: '2. Verify Eligibility',
              desc: 'Deterministic 6-point verification checks affiliation, safety credentials, blackouts, and token balance.',
              icon: ShieldCheck,
              color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
            },
            {
              step: '03',
              title: '3. Request & Check-In',
              desc: 'Book exact slots, receive digital pass with geofenced QR check-in and tamper-evident condition signature.',
              icon: Calendar,
              color: 'text-purple-600 bg-purple-50 border-purple-100',
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-slate-50/70 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${item.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-2xl font-black text-slate-300">
                      {item.step}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base mb-1.5">{item.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Featured Resource Disciplines Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">Featured Laboratories & Categories</h3>
            <p className="text-xs text-slate-500">Explore shared facilities across the network</p>
          </div>
          <Link
            to="/discover"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All Equipment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              desc: 'Oscilloscopes, logic analyzers, RF analyzers',
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
                onClick={() => navigate(`/discover?category=${item.cat}`)}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 border ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                  {item.name}
                </h4>
                <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Partner Institutions Banner */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 text-center space-y-6">
        <div className="max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs text-blue-400 font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>Cross-Institutional Federation</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black">Connected Academic & Research Partners</h3>
          <p className="text-xs text-slate-400">
            Facilitating bilateral research exchanges under standardized safety, governance, and fair-use accounting.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-xs font-semibold">
          {[
            'Massachusetts Institute of Technology',
            'Harvard University Fabrication Labs',
            'State University Research Park',
            'Boston Community Innovation Hub',
          ].map((inst, i) => (
            <div
              key={i}
              className="p-3.5 bg-slate-800/80 border border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-slate-200"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-[11px]">{inst}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

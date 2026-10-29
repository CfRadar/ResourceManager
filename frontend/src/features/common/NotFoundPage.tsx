import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="text-center py-20 max-w-md mx-auto">
      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-black text-slate-900 mb-2">Page Not Found</h1>
      <p className="text-sm text-slate-500 mb-6">
        The route you requested does not exist or has been relocated within the network.
      </p>
      <Link
        to="/"
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
      >
        Return to Discovery Portal
      </Link>
    </div>
  );
}

import React from 'react';
import { Landmark, GraduationCap, FileText, Scale } from 'lucide-react';
import type { EligibilityIndicators as IndicatorsType } from '../../api/manage.api';

interface EligibilityIndicatorsProps {
  indicators: IndicatorsType;
}

export const EligibilityIndicators: React.FC<EligibilityIndicatorsProps> = ({ indicators }) => {
  const items = [
    {
      key: 'affiliation',
      label: 'Institution Affiliation',
      pass: indicators.affiliation,
      icon: Landmark,
    },
    {
      key: 'training',
      label: 'Prerequisite Safety Training',
      pass: indicators.training,
      icon: GraduationCap,
    },
    {
      key: 'documents',
      label: 'Signed Liability Documents',
      pass: indicators.documents,
      icon: FileText,
    },
    {
      key: 'fairUse',
      label: 'Weekly Fair-Use Quota',
      pass: indicators.fairUse,
      icon: Scale,
    },
  ];

  return (
    <div className="flex items-center gap-1.5" title="Eligibility Verification Status">
      {items.map((it) => {
        const IconComponent = it.icon;
        return (
          <div
            key={it.key}
            title={`${it.label}: ${it.pass ? 'PASS' : 'FLAGGED / OVERRIDE REQUIRED'}`}
            className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
              it.pass
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            <IconComponent className="w-3.5 h-3.5" />
          </div>
        );
      })}
    </div>
  );
};


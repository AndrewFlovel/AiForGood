import React from 'react';

const STYLES: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed:   'bg-green-100 text-green-800',
  partial:     'bg-purple-100 text-purple-800',
};

const LABELS: Record<string, string> = {
  pending:     'Pendiente',
  in_progress: 'En curso',
  completed:   'Completado',
  partial:     'Parcial',
};

interface StatusBadgeProps {
  status?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = STYLES[status ?? ''] ?? 'bg-gray-100 text-gray-700';
  const label = LABELS[status ?? ''] ?? status ?? '—';
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${styles}`}>
      {label}
    </span>
  );
};

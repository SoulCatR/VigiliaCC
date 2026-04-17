'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import apiClient from '@/lib/api';

interface HistoryItem {
  id: number;
  previous_status: string | null;
  new_status: string;
  changed_by_username: string;
  change_reason: string | null;
  changed_at: string;
}

interface AlertHistoryProps {
  alertId: number;
}

export default function AlertHistory({ alertId }: AlertHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [alertId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/alert-history/${alertId}`);
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      discarded: 'Descartada',
    };
    return labels[status] || status;
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Cargando historial...</p>;
  }

  if (history.length === 0) {
    return <p className="text-sm text-gray-500 italic">No hay cambios registrados</p>;
  }

  return (
    <div className="space-y-3">
      {history.map((item, index) => (
        <div key={item.id} className="flex gap-3">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
            {index < history.length - 1 && (
              <div className="w-0.5 h-full bg-gray-300 mt-1"></div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">{formatDate(item.changed_at)}</span>
            </div>
            <p className="text-sm text-gray-900">
              <span className="font-medium">{item.changed_by_username}</span>
              {' cambió el estado de '}
              {item.previous_status && (
                <>
                  <span className="font-medium">{getStatusLabel(item.previous_status)}</span>
                  {' a '}
                </>
              )}
              <span className="font-medium text-blue-600">{getStatusLabel(item.new_status)}</span>
            </p>
            {item.change_reason && (
              <p className="text-sm text-gray-600 mt-1 italic">
                Razón: {item.change_reason}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
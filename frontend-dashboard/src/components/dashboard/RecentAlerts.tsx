'use client';

import { Eye } from 'lucide-react';
import Link from 'next/link';

interface Alert {
  id: number;
  detected_at: string;
  camera_name: string;
  category_name: string;
  status: 'pending' | 'confirmed' | 'discarded';
}

interface RecentAlertsProps {
  alerts: Alert[];
  onViewAlert?: (alertId: number) => void;
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'Sin fecha';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch (error) {
    return 'Fecha inválida';
  }
};

const getStatusBadge = (status: string) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    discarded: 'bg-red-100 text-red-800',
  };
  const labels = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    discarded: 'Descartada',
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
};

export default function RecentAlerts({ alerts, onViewAlert }: RecentAlertsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Alertas Recientes</h2>
        <Link 
          href="/alertas"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          Ver todas →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Hora</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cámara</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tipo</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No hay alertas recientes
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr key={alert.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {formatDate(alert.detected_at)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {alert.camera_name || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {alert.category_name || 'Sin categoría'}
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(alert.status)}
                  </td>
                  <td className="py-3 px-4">
                    {/* ✅ Si hay callback, usarlo. Si no, ir a /alertas */}
                    {onViewAlert ? (
                      <button
                        onClick={() => onViewAlert(alert.id)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                    ) : (
                      <Link
                        href="/alertas"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
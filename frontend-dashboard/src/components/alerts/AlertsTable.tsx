'use client';

import { formatDate, getStatusBadgeColor, getConfidenceLabel } from '@/lib/utils';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface Alert {
  id: number;
  timestamp: string;
  cameraName: string;
  alertType: string;
  confidence: number;
  status: 'pending' | 'confirmed' | 'discarded';
}

interface AlertsTableProps {
  alerts: Alert[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewDetails: (alertId: number) => void;
}

const statusLabels = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  discarded: 'Descartada',
};

export default function AlertsTable({ 
  alerts, 
  currentPage, 
  totalPages, 
  onPageChange,
  onViewDetails 
}: AlertsTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                ID
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                Fecha/Hora
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                Cámara
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                Tipo de Alerta
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                Confianza
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                Estado
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">
                  No se encontraron alertas con los filtros aplicados
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr 
                  key={alert.id} 
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    #{alert.id}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {formatDate(alert.timestamp)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {alert.cameraName}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {alert.alertType}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            alert.confidence >= 0.8 ? 'bg-green-600' :
                            alert.confidence >= 0.6 ? 'bg-yellow-600' :
                            'bg-red-600'
                          }`}
                          style={{ width: `${alert.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">
                        {(alert.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(alert.status)}`}>
                      {statusLabels[alert.status]}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onViewDetails(alert.id)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
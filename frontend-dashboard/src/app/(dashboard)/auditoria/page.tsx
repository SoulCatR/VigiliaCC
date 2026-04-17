'use client';

import { useState, useEffect } from 'react';
import { Shield, Filter } from 'lucide-react';
import apiClient from '@/lib/api';

interface AuditLog {
  id: number;
  username: string;
  action: string;
  table_name: string;
  record_id: number;
  ip_address: string;
  created_at: string;
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const response = await apiClient.get('/audit/logs', {
        params: { limit: 100 }
      });
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auditoría del Sistema</h1>
        <p className="text-gray-600">Registro de todas las acciones realizadas</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha/Hora</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Usuario</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Acción</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tabla</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-sm">{new Date(log.created_at).toLocaleString()}</td>
                <td className="py-3 px-4 text-sm font-medium">{log.username}</td>
                <td className="py-3 px-4 text-sm">{log.action}</td>
                <td className="py-3 px-4 text-sm">{log.table_name}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{log.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
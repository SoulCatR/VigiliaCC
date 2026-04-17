'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, Eye, XCircle } from 'lucide-react';
import apiClient from '@/lib/api';
import toast from 'react-hot-toast';

interface Incident {
  id: number;
  alert_id: number;
  incident_type: string;
  severity: string;
  description: string;
  resolved: boolean;
  reported_at: string;
  reported_by_username: string;
  resolved_at?: string;
  resolved_by_username?: string;
  resolution_notes?: string;
  camera_name: string;
  zone_name: string;
  confidence: number;
  assigned_to_username?: string;
}

interface User {
  id: number;
  username: string;
  full_name: string;
  role_name: string;
}

export default function IncidentesPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    loadIncidents();
    loadUsers();
  }, [filter]);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (filter === 'open') params.resolved = 'false';
      if (filter === 'resolved') params.resolved = 'true';

      const response = await apiClient.get('/incidents', { params });
      setIncidents(response.data.incidents || []);
    } catch (error) {
      console.error('Error loading incidents:', error);
      toast.error('Error al cargar incidentes');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleResolve = async (incidentId: number) => {
    if (!resolutionNotes.trim()) {
      toast.error('Agrega notas de resolución');
      return;
    }

    try {
      await apiClient.patch(`/incidents/${incidentId}/resolve`, {
        resolution_notes: resolutionNotes,
      });
      toast.success('Incidente resuelto correctamente');
      loadIncidents();
      setSelectedIncident(null);
      setResolutionNotes('');
    } catch (error) {
      toast.error('Error al resolver incidente');
    }
  };

  const handleAssign = async (incidentId: number, userId: string) => {
    if (!userId) return;
    
    try {
      await apiClient.patch(`/incidents/${incidentId}/assign`, {
        assigned_to: parseInt(userId)
      });
      toast.success('Incidente asignado');
      loadIncidents();
      setSelectedIncident(null);
    } catch (error) {
      toast.error('Error al asignar');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const styles = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[severity as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Incidentes</h1>
        <p className="text-gray-600">Seguimiento de incidentes de seguridad confirmados</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Todos ({incidents.length})
        </button>
        <button
          onClick={() => setFilter('open')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'open' 
              ? 'bg-red-600 text-white' 
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Abiertos ({incidents.filter(i => !i.resolved).length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'resolved' 
              ? 'bg-green-600 text-white' 
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Resueltos ({incidents.filter(i => i.resolved).length})
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-red-900">Incidentes Abiertos</h3>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-900">
            {incidents.filter(i => !i.resolved).length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-900">Resueltos Hoy</h3>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">
            {incidents.filter(i => {
              if (!i.resolved_at) return false;
              const today = new Date().toDateString();
              return new Date(i.resolved_at).toDateString() === today;
            }).length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-900">Tiempo Promedio</h3>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">
            {(() => {
              const resolved = incidents.filter(i => i.resolved && i.resolved_at);
              if (resolved.length === 0) return '0h';
              const avgMs = resolved.reduce((sum, i) => {
                const start = new Date(i.reported_at).getTime();
                const end = new Date(i.resolved_at!).getTime();
                return sum + (end - start);
              }, 0) / resolved.length;
              const hours = Math.round(avgMs / (1000 * 60 * 60));
              return `${hours}h`;
            })()}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">ID</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tipo</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Severidad</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cámara</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Reportado</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-500">
                  Cargando incidentes...
                </td>
              </tr>
            ) : incidents.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-500">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p>No hay incidentes registrados</p>
                </td>
              </tr>
            ) : (
              incidents.map((incident) => (
                <tr key={incident.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">#{incident.id}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">{incident.incident_type}</td>
                  <td className="py-3 px-4">{getSeverityBadge(incident.severity)}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {incident.camera_name}
                    {incident.zone_name && (
                      <span className="block text-xs text-gray-500">{incident.zone_name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatDate(incident.reported_at)}
                    <span className="block text-xs text-gray-500">por {incident.reported_by_username}</span>
                  </td>
                  <td className="py-3 px-4">
                    {incident.resolved ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Resuelto
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-sm">
                        <XCircle className="w-4 h-4" />
                        Abierto
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setSelectedIncident(incident)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
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

      {/* Modal de detalle */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Detalle de Incidente #{selectedIncident.id}</h2>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Tipo de Incidente</p>
                    <p className="font-medium">{selectedIncident.incident_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Severidad</p>
                    {getSeverityBadge(selectedIncident.severity)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cámara</p>
                    <p className="font-medium">{selectedIncident.camera_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Zona</p>
                    <p className="font-medium">{selectedIncident.zone_name || 'N/A'}</p>
                  </div>
                </div>

                {selectedIncident.description && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Descripción</p>
                    <p className="text-gray-800 bg-gray-50 p-3 rounded">{selectedIncident.description}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">Información de Reporte</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Reportado por</p>
                      <p className="font-medium">{selectedIncident.reported_by_username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Asignado a</p>
                      <p className="font-medium">
                        {selectedIncident.assigned_to_username || 'Sin asignar'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Fecha de reporte</p>
                      <p className="font-medium">{formatDate(selectedIncident.reported_at)}</p>
                    </div>
                  </div>
                </div>

                {!selectedIncident.resolved && (
                  <div className="border-t pt-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Asignar a
                    </label>
                    <select
                      onChange={(e) => handleAssign(selectedIncident.id, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      defaultValue=""
                    >
                      <option value="">Seleccionar usuario</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.role_name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedIncident.resolved && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-green-900 mb-2">Información de Resolución</p>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Resuelto por</p>
                        <p className="font-medium">{selectedIncident.resolved_by_username}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Fecha de resolución</p>
                        <p className="font-medium">{formatDate(selectedIncident.resolved_at)}</p>
                      </div>
                    </div>
                    {selectedIncident.resolution_notes && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Notas de Resolución</p>
                        <p className="text-gray-800 bg-green-50 p-3 rounded">{selectedIncident.resolution_notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Resolver incidente */}
                {!selectedIncident.resolved && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas de Resolución *
                    </label>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Describe cómo se resolvió el incidente..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleResolve(selectedIncident.id)}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Marcar como Resuelto
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
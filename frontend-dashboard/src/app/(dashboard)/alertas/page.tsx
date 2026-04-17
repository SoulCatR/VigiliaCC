'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Eye, CheckCircle, XCircle, Calendar, Camera, Filter, MessageSquare, X, Clock } from 'lucide-react';
import apiClient from '@/lib/api';
import toast from 'react-hot-toast';

interface Alert {
  id: number;
  camera_id: number;
  camera_name: string;
  zone_name: string;
  category_name: string;
  severity: string;
  confidence: number;
  status: string;
  image_path: string | null;
  detected_at: string;
  confirmed_by_username: string | null;
  notes: string | null;
}

export default function AlertasPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    camera_id: 'all',
  });

  // ✅ ESTADOS PARA COMENTARIOS
  const [comments, setComments] = useState<Array<{
    id: number;
    comment: string;
    username: string;
    full_name: string;
    created_at: string;
  }>>([]);
  const [newComment, setNewComment] = useState('');

  // ✅ ESTADO PARA HISTORIAL
  const [history, setHistory] = useState<Array<{
    id: number;
    previous_status: string;
    new_status: string;
    changed_by_username: string;
    change_reason: string;
    changed_at: string;
  }>>([]);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const params: any = { limit: 100 };
      
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.camera_id !== 'all') params.camera_id = filters.camera_id;

      const response = await apiClient.get('/alerts', { params });
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast.error('Error al cargar alertas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (alertId: number) => {
    try {
      await apiClient.patch(`/alerts/${alertId}/confirm`, {
        notes: 'Confirmada desde interfaz'
      });

      try {
        await apiClient.post('/incidents', {
          alert_id: alertId,
          incident_type: selectedAlert?.category_name || 'suspicious_behavior',
          severity: selectedAlert?.confidence && selectedAlert.confidence > 0.8 ? 'high' : 'medium',
          description: `Incidente creado automáticamente desde alerta #${alertId}`,
        });
        toast.success('Alerta confirmada e incidente creado');
      } catch (incidentError) {
        console.error('Error creando incidente:', incidentError);
        toast.success('Alerta confirmada (incidente no pudo crearse)');
      }

      loadAlerts();
      setSelectedAlert(null);
    } catch (error) {
      toast.error('Error al confirmar alerta');
    }
  };

  const handleDiscard = async (alertId: number) => {
    try {
      await apiClient.patch(`/alerts/${alertId}/discard`, {
        reason: 'Falso positivo'
      });
      toast.success('Alerta descartada');
      loadAlerts();
      setSelectedAlert(null);
    } catch (error) {
      toast.error('Error al descartar alerta');
    }
  };

  const formatDate = (dateString: string) => {
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  // ✅ FUNCIONES PARA COMENTARIOS
  const loadComments = async (alertId: number) => {
    try {
      const response = await apiClient.get(`/comments/${alertId}`);
      setComments(response.data.comments || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  // ✅ FUNCIÓN PARA CARGAR HISTORIAL
  const loadHistory = async (alertId: number) => {
    try {
      const response = await apiClient.get(`/alert-history/${alertId}`);
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Error loading history:', error);
      setHistory([]);
    }
  };

  const handleAddComment = async () => {
    if (!selectedAlert || !newComment.trim()) return;
    
    try {
      await apiClient.post(`/comments/${selectedAlert.id}`, {
        comment: newComment.trim()
      });
      setNewComment('');
      loadComments(selectedAlert.id);
      toast.success('Comentario agregado');
    } catch (error) {
      toast.error('Error al agregar comentario');
    }
  };
  
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('¿Eliminar este comentario?')) return;
    
    try {
      await apiClient.delete(`/comments/${commentId}`);
      toast.success('Comentario eliminado');
      if (selectedAlert) {
        loadComments(selectedAlert.id);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('No tienes permiso para eliminar este comentario');
      } else {
        toast.error('Error al eliminar comentario');
      }
    }
  };
  // ✅ CARGAR COMENTARIOS CUANDO SE ABRE EL MODAL
  useEffect(() => {
    if (selectedAlert) {
      loadComments(selectedAlert.id);
      loadHistory(selectedAlert.id);
    } else {
      setComments([]);
      setNewComment('');
      setHistory([]);
    }
  }, [selectedAlert]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Alertas</h1>
        <p className="text-gray-600">Revisa y gestiona las alertas del sistema</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Todas</option>
              <option value="pending">Pendientes</option>
              <option value="confirmed">Confirmadas</option>
              <option value="discarded">Descartadas</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-end gap-2">
            <button
              onClick={loadAlerts}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Aplicar Filtros
            </button>
            <button
              onClick={() => {
                setFilters({ status: 'all', camera_id: 'all' });
                loadAlerts();
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de alertas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">ID</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha/Hora</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cámara</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tipo de Alerta</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Confianza</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Acción</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-500">
                  Cargando alertas...
                </td>
              </tr>
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-500">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p>No hay alertas registradas</p>
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr key={alert.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-900">#{alert.id}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">{formatDate(alert.detected_at)}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {alert.camera_name || 'N/A'}
                    {alert.zone_name && (
                      <span className="block text-xs text-gray-500">{alert.zone_name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {alert.category_name || 'Sin categoría'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${alert.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-700">{Math.round(alert.confidence * 100)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(alert.status)}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setSelectedAlert(alert)}
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
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Detalle de Alerta #{selectedAlert.id}</h2>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Imagen capturada */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Imagen Capturada</h3>
                {selectedAlert.image_path ? (
                  <div className="w-full bg-gray-100 rounded-lg overflow-hidden p-4">
                    <img
                      src={`http://localhost:3000${selectedAlert.image_path}`}
                      alt="Captura de alerta"
                      className="w-full h-auto max-h-96 object-contain mx-auto rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = '<p class="text-center text-red-500 py-8">Error al cargar la imagen</p>';
                        }
                        console.error('Error cargando imagen:', selectedAlert.image_path);
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">No hay imagen disponible</p>
                  </div>
                )}
              </div>

              {/* Información */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Fecha y Hora</p>
                  <p className="font-medium">{formatDate(selectedAlert.detected_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cámara</p>
                  <p className="font-medium">{selectedAlert.camera_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo de Alerta</p>
                  <p className="font-medium">{selectedAlert.category_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nivel de Confianza</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${selectedAlert.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-medium">{Math.round(selectedAlert.confidence * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              {selectedAlert.notes && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">Observaciones</p>
                  <p className="text-gray-800">{selectedAlert.notes}</p>
                </div>
              )}

              {/* ✅ SECCIÓN DE COMENTARIOS */}
              <div className="mb-6 border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comentarios ({comments.length})
                </h3>
                
                {/* Lista de comentarios */}
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No hay comentarios aún</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 p-3 rounded">
                        <div className="flex items-start justify-between mb-1">
                           <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">{comment.full_name}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.created_at).toLocaleString('es-PE', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {/* ✅ AGREGAR BOTÓN ELIMINAR */}
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-600 hover:text-red-800 text-xs"
                            title="Eliminar comentario"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-700">{comment.comment}</p>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Agregar comentario */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Escribe un comentario..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Enviar
                  </button>
                </div>
              </div>

              {/* ✅ SECCIÓN DE HISTORIAL */}
              <div className="mb-6 border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Historial de Cambios ({history.length})
                </h3>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No hay cambios registrados</p>
                  ) : (
                    history.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 text-sm border-l-2 border-blue-500 pl-3">
                        <div className="flex-1">
                          <p className="text-gray-900">
                            <span className="font-medium">{item.changed_by_username}</span> cambió de{' '}
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                              {item.previous_status}
                            </span>{' '}
                            a{' '}
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                              {item.new_status}
                            </span>
                          </p>
                          {item.change_reason && (
                            <p className="text-gray-600 text-xs mt-1 italic">"{item.change_reason}"</p>
                          )}
                          <p className="text-gray-500 text-xs mt-1">{formatDate(item.changed_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Acciones */}
              {selectedAlert.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDiscard(selectedAlert.id)}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Descartar
                  </button>
                  <button
                    onClick={() => handleConfirm(selectedAlert.id)}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirmar Incidente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
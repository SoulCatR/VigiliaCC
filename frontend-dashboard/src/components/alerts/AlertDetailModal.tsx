'use client';

import { useState } from 'react';
import { X, CheckCircle, XCircle, ZoomIn } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api';

interface Alert {
  id: number;
  timestamp: string;
  cameraName: string;
  alertType: string;
  confidence: number;
  status: 'pending' | 'confirmed' | 'discarded';
  captureUrl?: string;
  observations?: string;
}

interface AlertDetailModalProps {
  alert: Alert;
  onClose: () => void;
  onStatusChange: () => void;
}

export default function AlertDetailModal({ alert, onClose, onStatusChange }: AlertDetailModalProps) {
  const [observations, setObservations] = useState(alert.observations || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/alerts/${alert.id}/confirm`, { observations });
      toast.success('Incidente confirmado correctamente');
      onStatusChange();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al confirmar incidente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/alerts/${alert.id}/discard`, { observations });
      toast.success('Alerta descartada correctamente');
      onStatusChange();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al descartar alerta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Modal Principal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              Detalle de Alerta #{alert.id}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Imagen capturada */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Imagen Capturada
              </label>
              <div className="relative group">
                {alert.captureUrl ? (
                  <>
                    <img
                      src={alert.captureUrl}
                      alt="Captura de alerta"
                      className="w-full rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setShowImageModal(true)}
                    />
                    <button
                      onClick={() => setShowImageModal(true)}
                      className="absolute top-4 right-4 bg-white bg-opacity-90 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ZoomIn className="w-5 h-5 text-gray-700" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">No hay imagen disponible</p>
                  </div>
                )}
              </div>
            </div>

            {/* Información */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Fecha y Hora
                </label>
                <p className="text-gray-900">{formatDate(alert.timestamp)}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Cámara
                </label>
                <p className="text-gray-900">{alert.cameraName}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tipo de Alerta
                </label>
                <p className="text-gray-900">{alert.alertType}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nivel de Confianza
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        alert.confidence >= 0.8 ? 'bg-green-600' :
                        alert.confidence >= 0.6 ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}
                      style={{ width: `${alert.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {(alert.confidence * 100).toFixed(0)}% 
                    {alert.confidence >= 0.8 ? ' (Alta)' :
                     alert.confidence >= 0.6 ? ' (Media)' :
                     ' (Baja)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            {alert.status === 'pending' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder="Describe lo que observaste en esta alerta..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {observations.length}/500 caracteres
                </p>
              </div>
            )}

            {alert.status !== 'pending' && alert.observations && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Observaciones
                </label>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {alert.observations}
                </p>
              </div>
            )}
          </div>

          {/* Footer con botones */}
          {alert.status === 'pending' && (
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDiscard}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Descartar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {isSubmitting ? 'Confirmando...' : 'Confirmar Incidente'}
              </button>
            </div>
          )}

          {alert.status !== 'pending' && (
            <div className="flex p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de imagen ampliada */}
      {showImageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowImageModal(false)}
        >
          <img
            src={alert.captureUrl}
            alt="Captura ampliada"
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 p-2 bg-white rounded-lg hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </>
  );
}
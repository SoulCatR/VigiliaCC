'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertCircle } from 'lucide-react';
import apiClient from '@/lib/api';
import toast from 'react-hot-toast';

interface Setting {
  key: string;
  value: string;
  description: string;
  updated_at?: string;
}

interface SettingsState {
  [key: string]: {
    value: string;
    description: string;
    updated_at?: string;
  };
}

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<SettingsState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estados locales para cada configuración
  const [confidenceThreshold, setConfidenceThreshold] = useState('0.5');
  const [alertRetentionDays, setAlertRetentionDays] = useState('90');
  const [maxConcurrentStreams, setMaxConcurrentStreams] = useState('8');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [systemTimezone, setSystemTimezone] = useState('America/Lima');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/settings');
      setSettings(response.data);
      
      // Cargar valores en estados locales
      if (response.data.model_confidence_threshold) {
        setConfidenceThreshold(response.data.model_confidence_threshold.value);
      }
      if (response.data.alert_retention_days) {
        setAlertRetentionDays(response.data.alert_retention_days.value);
      }
      if (response.data.max_concurrent_streams) {
        setMaxConcurrentStreams(response.data.max_concurrent_streams.value);
      }
      if (response.data.notification_email) {
        setNotificationEmail(response.data.notification_email.value);
      }
      if (response.data.system_timezone) {
        setSystemTimezone(response.data.system_timezone.value);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await apiClient.put(`/settings/${key}`, { value });
      return true;
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
      return false;
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    
    try {
      const updates = [
        updateSetting('model_confidence_threshold', confidenceThreshold),
        updateSetting('alert_retention_days', alertRetentionDays),
        updateSetting('max_concurrent_streams', maxConcurrentStreams),
        updateSetting('notification_email', notificationEmail),
        updateSetting('system_timezone', systemTimezone),
      ];

      const results = await Promise.all(updates);
      
      if (results.every(r => r === true)) {
        toast.success('Configuración guardada correctamente');
        loadSettings();
      } else {
        toast.error('Hubo errores al guardar algunos valores');
      }
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No disponible';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-gray-600">Ajusta los parámetros del sistema de vigilancia</p>
        </div>
        <button
          onClick={loadSettings}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Recargar
        </button>
      </div>

      {/* Configuraciones de IA */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Configuración de Inteligencia Artificial</h2>
        </div>

        <div className="space-y-6">
          {/* Confidence Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Umbral de Confianza ({(parseFloat(confidenceThreshold) * 100).toFixed(0)}%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0.3"
                max="0.9"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(e.target.value)}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-gray-600 w-16 text-right">
                {(parseFloat(confidenceThreshold) * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Nivel mínimo de confianza para generar alertas. Valores más altos reducen falsos positivos.
            </p>
            {settings.model_confidence_threshold && (
              <p className="text-xs text-gray-400 mt-1">
                Última actualización: {formatDate(settings.model_confidence_threshold.updated_at)}
              </p>
            )}
          </div>

          {/* Max Concurrent Streams */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Streams Simultáneos Máximos
            </label>
            <input
              type="number"
              min="1"
              max="32"
              value={maxConcurrentStreams}
              onChange={(e) => setMaxConcurrentStreams(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              Número máximo de cámaras procesando simultáneamente. Afecta el rendimiento del servidor.
            </p>
          </div>
        </div>
      </div>

      {/* Configuraciones de Alertas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-gray-900">Gestión de Alertas</h2>
        </div>

        <div className="space-y-6">
          {/* Alert Retention */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Días de Retención de Alertas
            </label>
            <input
              type="number"
              min="7"
              max="365"
              value={alertRetentionDays}
              onChange={(e) => setAlertRetentionDays(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              Número de días antes de archivar alertas antiguas automáticamente.
            </p>
          </div>

          {/* Notification Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email para Notificaciones
            </label>
            <input
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="alertas@ejemplo.com"
              className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              Dirección de email que recibirá notificaciones de alertas críticas.
            </p>
          </div>
        </div>
      </div>

      {/* Configuraciones Generales */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Configuración General</h2>
        </div>

        <div className="space-y-6">
          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zona Horaria del Sistema
            </label>
            <select
              value={systemTimezone}
              onChange={(e) => setSystemTimezone(e.target.value)}
              className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="America/Lima">Lima (GMT-5)</option>
              <option value="America/New_York">New York (GMT-5)</option>
              <option value="America/Los_Angeles">Los Angeles (GMT-8)</option>
              <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
              <option value="America/Bogota">Bogotá (GMT-5)</option>
              <option value="America/Buenos_Aires">Buenos Aires (GMT-3)</option>
              <option value="Europe/Madrid">Madrid (GMT+1)</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Zona horaria utilizada para mostrar fechas y horas en el sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end gap-3">
        <button
          onClick={loadSettings}
          disabled={saving}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>⚠️ Importante:</strong> Los cambios en el umbral de confianza y streams simultáneos 
          requieren reiniciar el servicio de detección para aplicarse completamente.
        </p>
      </div>
    </div>
  );
}
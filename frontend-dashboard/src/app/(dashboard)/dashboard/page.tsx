'use client';

import { useEffect, useState } from 'react';
import StatsCard from '@/components/dashboard/StatsCard';
import RecentAlerts from '@/components/dashboard/RecentAlerts';
import { Bell, Camera, CheckCircle, Clock, XCircle, MapPin, Users } from 'lucide-react';
import apiClient from '@/lib/api';
import toast from 'react-hot-toast';

interface DashboardStats {
  alertsToday: number;
  activeCameras: string;
  confirmedIncidents: number;
  avgResponseTime: string;
}

interface Alert {
  id: number;
  detected_at: string;
  camera_name: string;
  zone_name: string;
  category_name: string;
  confidence: number;
  status: 'pending' | 'confirmed' | 'discarded';
  image_path: string | null;
  notes: string | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    alertsToday: 0,
    activeCameras: '0/0',
    confirmedIncidents: 0,
    avgResponseTime: '0 min',
  });

  // ✅ CORREGIDO: usar zone_name y alert_count
  const [topZoneData, setTopZoneData] = useState({ zone_name: 'N/A', alert_count: 0 });
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertsByZone, setAlertsByZone] = useState<Array<{ zone_name: string; alert_count: number }>>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [statsResponse, alertsResponse, topZoneResponse, activeUsersResponse, alertsByZoneResponse] = await Promise.all([
        apiClient.get('/reports/dashboard'),
        apiClient.get('/alerts', { params: { limit: 5 } }),
        apiClient.get('/reports/top-zone'),
        apiClient.get('/reports/active-users-today'),
        apiClient.get('/reports/alerts-by-zone'),
      ]);

      setStats(statsResponse.data);
      setRecentAlerts(alertsResponse.data.alerts || []);
      setTopZoneData(topZoneResponse.data);
      setActiveUsersCount(activeUsersResponse.data.count);
      setAlertsByZone(alertsByZoneResponse.data);
      
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      toast.error('Error al cargar datos del dashboard');
      
      setStats({
        alertsToday: 0,
        activeCameras: '0/0',
        confirmedIncidents: 0,
        avgResponseTime: '0 min',
      });
      setRecentAlerts([]);
      setTopZoneData({ zone_name: 'N/A', alert_count: 0 });
      setActiveUsersCount(0);
      setAlertsByZone([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAlert = async (alertId: number) => {
    try {
      const response = await apiClient.get(`/alerts?id=${alertId}`);
      const alert = response.data.alerts.find((a: Alert) => a.id === alertId);
      if (alert) {
        setSelectedAlert(alert);
      }
    } catch (error) {
      toast.error('Error al cargar detalles de alerta');
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Vista general del sistema de vigilancia</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Alertas del día"
            value={stats.alertsToday}
            icon={Bell}
            color="yellow"
            trend={{ value: '+12% vs ayer', isPositive: false }}
          />
          
          <StatsCard
            title="Cámaras activas"
            value={stats.activeCameras}
            icon={Camera}
            color="green"
          />
          
          <StatsCard
            title="Incidentes confirmados"
            value={stats.confirmedIncidents}
            icon={CheckCircle}
            color="red"
          />
          
          <StatsCard
            title="Tiempo promedio"
            value={stats.avgResponseTime}
            icon={Clock}
            color="blue"
          />

          {/* ✅ CARD 5: Zona Más Activa */}
          <StatsCard
            title="Zona Más Activa"
            value={`${topZoneData.zone_name} (${topZoneData.alert_count})`}
            icon={MapPin}
            color="blue"
          />

          {/* ✅ CARD 6: Usuarios Activos */}
          <StatsCard
            title="Usuarios Activos"
            value={activeUsersCount}
            icon={Users}
            color="green"
          />
        </div>

        <RecentAlerts alerts={recentAlerts} onViewAlert={handleViewAlert} />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Revisa las alertas pendientes en la sección de Alertas para mantener la seguridad actualizada.
          </p>
        </div>
      </div>

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

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Imagen Capturada</h3>
                {selectedAlert.image_path ? (
                  <div className="w-full bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={`http://localhost:3000${selectedAlert.image_path}`}
                      alt="Captura de alerta"
                      className="w-full h-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
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
                  <p className="font-medium">{Math.round(selectedAlert.confidence * 100)}%</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAlert(null)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
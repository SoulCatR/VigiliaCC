// =============================================
// src/types/camera.ts
// =============================================

export interface Camera {
  id: number;
  name: string;
  ip_address: string;
  rtsp_url?: string | null;
  zone_id?: number | null;
  zone_name?: string | null;      // Del JOIN con zones
  floor?: string | null;          // Del JOIN con zones
  status: 'active' | 'inactive' | 'maintenance';
  model?: string | null;
  resolution?: string | null;
  fps?: number | null;
  last_ping?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Zone {
  id: number;
  name: string;
  floor: string;
  description?: string;
}
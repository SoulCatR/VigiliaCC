export interface Alert {
  id: number;
  timestamp: string;
  cameraId: number;
  cameraName: string;
  alertType: string;
  confidence: number;
  status: 'pending' | 'confirmed' | 'discarded';
  captureUrl?: string;
  observations?: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface AlertFilters {
  startDate?: string;
  endDate?: string;
  cameraId?: number;
  status?: string;
  page?: number;
  limit?: number;
}
export { useSystemStatusStore } from '@/stores/system-status.store';
export type { BackendStatus } from '@/stores/system-status.store';

export type ConnectionQuality = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
export type ServiceStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
export interface MaintenanceInfo {
  reason?: string;
  expectedCompletion?: string;
  message?: string;
}
export interface BackendHealthDetails {
  databaseStatus: ServiceStatus;
  smtpStatus: ServiceStatus;
  tumaStatus: ServiceStatus;
  pesapalStatus: ServiceStatus;
}

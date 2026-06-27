import { checkBackendHealth } from '@/lib/api';
import { useSystemStatusStore } from '@/stores/system-status.store';

export function useBackendHealth() {
  const status = useSystemStatusStore((state) => state.status);
  const outageDuration = useSystemStatusStore((state) => state.outageDuration);
  const lastChecked = useSystemStatusStore((state) => state.lastFailedConnection || state.lastSuccessfulConnection || Date.now());

  const retry = async () => {
    try {
      await checkBackendHealth();
    } catch (error) {
      // Ignored, state will update automatically
    }
  };

  return {
    status,
    lastChecked,
    duration: outageDuration,
    retry,
  };
}

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Firmen, Ansprechpartner } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [firmen, setFirmen] = useState<Firmen[]>([]);
  const [ansprechpartner, setAnsprechpartner] = useState<Ansprechpartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [firmenData, ansprechpartnerData] = await Promise.all([
        LivingAppsService.getFirmen(),
        LivingAppsService.getAnsprechpartner(),
      ]);
      setFirmen(firmenData);
      setAnsprechpartner(ansprechpartnerData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [firmenData, ansprechpartnerData] = await Promise.all([
          LivingAppsService.getFirmen(),
          LivingAppsService.getAnsprechpartner(),
        ]);
        setFirmen(firmenData);
        setAnsprechpartner(ansprechpartnerData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const firmenMap = useMemo(() => {
    const m = new Map<string, Firmen>();
    firmen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [firmen]);

  return { firmen, setFirmen, ansprechpartner, setAnsprechpartner, loading, error, fetchAll, firmenMap };
}
import type { EnrichedAnsprechpartner } from '@/types/enriched';
import type { Ansprechpartner, Firmen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface AnsprechpartnerMaps {
  firmenMap: Map<string, Firmen>;
}

export function enrichAnsprechpartner(
  ansprechpartner: Ansprechpartner[],
  maps: AnsprechpartnerMaps
): EnrichedAnsprechpartner[] {
  return ansprechpartner.map(r => ({
    ...r,
    firmaName: resolveDisplay(r.fields.firma, maps.firmenMap, 'firmenname'),
  }));
}

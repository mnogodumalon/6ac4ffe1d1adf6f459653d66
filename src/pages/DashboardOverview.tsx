import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichAnsprechpartner } from '@/lib/enrich';
import type { EnrichedAnsprechpartner } from '@/types/enriched';
import type { Firmen } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { APP_IDS } from '@/types/app';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FirmenDialog } from '@/components/dialogs/FirmenDialog';
import { AnsprechpartnerDialog } from '@/components/dialogs/AnsprechpartnerDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconSearch,
  IconBuilding, IconUsers, IconPhone, IconMail, IconWorld,
  IconMapPin, IconUser,
} from '@tabler/icons-react';

const APPGROUP_ID = '6ac4ffe1d1adf6f459653d66';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const {
    firmen, ansprechpartner,
    firmenMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedAnsprechpartner = enrichAnsprechpartner(ansprechpartner, { firmenMap });

  const [search, setSearch] = useState('');
  const [selectedFirma, setSelectedFirma] = useState<Firmen | null>(null);

  // Firmen dialog state
  const [firmenDialog, setFirmenDialog] = useState<{ open: boolean; record?: Firmen }>({ open: false });
  // Ansprechpartner dialog state
  const [apDialog, setApDialog] = useState<{ open: boolean; record?: EnrichedAnsprechpartner; firmaId?: string }>({ open: false });
  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'firma' | 'ap'; id: string } | null>(null);

  const filteredFirmen = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return firmen;
    return firmen.filter(f =>
      (f.fields.firmenname ?? '').toLowerCase().includes(q) ||
      (f.fields.ort ?? '').toLowerCase().includes(q) ||
      (f.fields.postleitzahl ?? '').toLowerCase().includes(q)
    );
  }, [firmen, search]);

  const selectedAps = useMemo((): EnrichedAnsprechpartner[] => {
    if (!selectedFirma) return [];
    return enrichedAnsprechpartner.filter(ap => ap.firmaName === (selectedFirma.fields.firmenname ?? '') ||
      (ap.fields.firma && ap.fields.firma.includes(selectedFirma.record_id)));
  }, [selectedFirma, enrichedAnsprechpartner]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'firma') {
      await LivingAppsService.deleteFirmenEntry(deleteTarget.id);
      if (selectedFirma?.record_id === deleteTarget.id) setSelectedFirma(null);
    } else {
      await LivingAppsService.deleteAnsprechpartnerEntry(deleteTarget.id);
    }
    setDeleteTarget(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const totalAps = ansprechpartner.length;
  const firmenMitKontakt = firmen.filter(f =>
    enrichedAnsprechpartner.some(ap => ap.fields.firma && ap.fields.firma.includes(f.record_id))
  ).length;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Firmen"
          value={String(firmen.length)}
          description="Gesamt"
          icon={<IconBuilding size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Ansprechpartner"
          value={String(totalAps)}
          description="Gesamt"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Verknüpft"
          value={String(firmenMitKontakt)}
          description="Firmen mit Kontakt"
          icon={<IconUser size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Ø Kontakte"
          value={firmen.length > 0 ? (totalAps / firmen.length).toFixed(1) : '0'}
          description="pro Firma"
          icon={<IconPhone size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Master-Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 min-h-[520px]">
        {/* LEFT: Firmenliste */}
        <div className="flex flex-col gap-3 rounded-[20px] bg-card shadow-sm border border-border overflow-hidden">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-base text-foreground">Firmen</h2>
              <Button size="sm" onClick={() => setFirmenDialog({ open: true })}>
                <IconPlus size={14} className="mr-1 shrink-0" />
                <span className="hidden sm:inline">Neue Firma</span>
                <span className="sm:hidden">Neu</span>
              </Button>
            </div>
            <div className="relative">
              <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
              <Input
                placeholder="Firma suchen..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {filteredFirmen.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <IconBuilding size={36} stroke={1.5} />
                <p className="text-sm">{search ? 'Keine Treffer' : 'Noch keine Firmen'}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filteredFirmen.map(firma => {
                  const apCount = enrichedAnsprechpartner.filter(ap =>
                    ap.fields.firma && ap.fields.firma.includes(firma.record_id)
                  ).length;
                  const isSelected = selectedFirma?.record_id === firma.record_id;
                  return (
                    <li key={firma.record_id}>
                      <button
                        onClick={() => setSelectedFirma(isSelected ? null : firma)}
                        className={`w-full text-left px-4 py-3 transition-colors flex items-start justify-between gap-3 group ${
                          isSelected
                            ? 'bg-primary/8 border-l-2 border-primary'
                            : 'hover:bg-muted/50 border-l-2 border-transparent'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium text-sm truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {firma.fields.firmenname ?? '(Ohne Name)'}
                          </p>
                          {(firma.fields.ort || firma.fields.postleitzahl) && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              <IconMapPin size={11} className="inline mr-0.5" />
                              {[firma.fields.postleitzahl, firma.fields.ort].filter(Boolean).join(' ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {apCount > 0 && (
                            <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
                              {apCount}
                            </span>
                          )}
                          <div className="flex gap-1 opacity-100">
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={e => { e.stopPropagation(); setFirmenDialog({ open: true, record: firma }); }}
                              onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setFirmenDialog({ open: true, record: firma }); } }}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                              <IconPencil size={13} />
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'firma', id: firma.record_id }); }}
                              onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setDeleteTarget({ type: 'firma', id: firma.record_id }); } }}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                            >
                              <IconTrash size={13} />
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT: Detail / Ansprechpartner */}
        <div className="rounded-[20px] bg-card shadow-sm border border-border overflow-hidden flex flex-col">
          {!selectedFirma ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 gap-3 text-muted-foreground">
              <IconBuilding size={48} stroke={1.5} />
              <p className="text-sm font-medium">Firma auswählen</p>
              <p className="text-xs text-center max-w-xs">Klicke links auf eine Firma, um Kontakte und Details anzuzeigen.</p>
            </div>
          ) : (
            <>
              {/* Firma Header */}
              <div className="p-5 border-b border-border">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-foreground truncate">
                      {selectedFirma.fields.firmenname ?? '(Ohne Name)'}
                    </h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {(selectedFirma.fields.strasse || selectedFirma.fields.hausnummer || selectedFirma.fields.ort) && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <IconMapPin size={13} className="shrink-0" />
                          {[
                            selectedFirma.fields.strasse && `${selectedFirma.fields.strasse} ${selectedFirma.fields.hausnummer ?? ''}`.trim(),
                            selectedFirma.fields.postleitzahl,
                            selectedFirma.fields.ort,
                          ].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {selectedFirma.fields.telefon && (
                        <a href={`tel:${selectedFirma.fields.telefon}`} className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
                          <IconPhone size={13} className="shrink-0" />
                          {selectedFirma.fields.telefon}
                        </a>
                      )}
                      {selectedFirma.fields.email && (
                        <a href={`mailto:${selectedFirma.fields.email}`} className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
                          <IconMail size={13} className="shrink-0" />
                          {selectedFirma.fields.email}
                        </a>
                      )}
                      {selectedFirma.fields.website && (
                        <a href={selectedFirma.fields.website} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
                          <IconWorld size={13} className="shrink-0" />
                          {selectedFirma.fields.website.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </div>
                    {selectedFirma.fields.bemerkungen && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{selectedFirma.fields.bemerkungen}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setFirmenDialog({ open: true, record: selectedFirma })}>
                      <IconPencil size={14} className="mr-1 shrink-0" />Bearbeiten
                    </Button>
                    <Button size="sm" onClick={() => setApDialog({ open: true, firmaId: selectedFirma.record_id })}>
                      <IconPlus size={14} className="mr-1 shrink-0" />Kontakt
                    </Button>
                  </div>
                </div>
              </div>

              {/* Ansprechpartner Liste */}
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Ansprechpartner ({selectedAps.length})
                </h3>
                {selectedAps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                    <IconUsers size={32} stroke={1.5} />
                    <p className="text-sm">Noch keine Ansprechpartner</p>
                    <Button size="sm" variant="outline" onClick={() => setApDialog({ open: true, firmaId: selectedFirma.record_id })}>
                      <IconPlus size={14} className="mr-1" />Ersten Kontakt anlegen
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {selectedAps.map(ap => (
                      <div key={ap.record_id} className="rounded-xl border border-border bg-background p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">
                              {[ap.fields.vorname, ap.fields.nachname].filter(Boolean).join(' ') || '(Kein Name)'}
                            </p>
                            {ap.fields.position && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{ap.fields.position}</p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => setApDialog({ open: true, record: ap })}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <IconPencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'ap', id: ap.record_id })}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <IconTrash size={13} />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {ap.fields.telefon && (
                            <a href={`tel:${ap.fields.telefon}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                              <IconPhone size={12} className="shrink-0" />
                              <span className="truncate">{ap.fields.telefon}</span>
                            </a>
                          )}
                          {ap.fields.mobil && (
                            <a href={`tel:${ap.fields.mobil}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                              <IconPhone size={12} className="shrink-0" />
                              <span className="truncate">{ap.fields.mobil}</span>
                            </a>
                          )}
                          {ap.fields.email && (
                            <a href={`mailto:${ap.fields.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                              <IconMail size={12} className="shrink-0" />
                              <span className="truncate">{ap.fields.email}</span>
                            </a>
                          )}
                        </div>
                        {ap.fields.bemerkungen && (
                          <p className="text-xs text-muted-foreground line-clamp-2 border-t border-border pt-2">{ap.fields.bemerkungen}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Firmen Dialog */}
      <FirmenDialog
        open={firmenDialog.open}
        onClose={() => setFirmenDialog({ open: false })}
        onSubmit={async fields => {
          if (firmenDialog.record) {
            await LivingAppsService.updateFirmenEntry(firmenDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createFirmenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={firmenDialog.record?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Firmen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Firmen']}
      />

      {/* Ansprechpartner Dialog */}
      <AnsprechpartnerDialog
        open={apDialog.open}
        onClose={() => setApDialog({ open: false })}
        onSubmit={async fields => {
          if (apDialog.record) {
            await LivingAppsService.updateAnsprechpartnerEntry(apDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createAnsprechpartnerEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={
          apDialog.record
            ? apDialog.record.fields
            : apDialog.firmaId
            ? { firma: createRecordUrl(APP_IDS.FIRMEN, apDialog.firmaId) }
            : undefined
        }
        firmenList={firmen}
        enablePhotoScan={AI_PHOTO_SCAN['Ansprechpartner']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Ansprechpartner']}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.type === 'firma' ? 'Firma löschen' : 'Ansprechpartner löschen'}
        description={
          deleteTarget?.type === 'firma'
            ? 'Diese Firma und alle zugehörigen Daten werden dauerhaft gelöscht. Fortfahren?'
            : 'Dieser Ansprechpartner wird dauerhaft gelöscht. Fortfahren?'
        }
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 min-h-[520px]">
        <Skeleton className="rounded-[20px]" />
        <Skeleton className="rounded-[20px]" />
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}

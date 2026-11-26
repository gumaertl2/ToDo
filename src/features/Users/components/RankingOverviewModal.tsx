// [2026-11-26] - FEATURE: Admin-Löschbutton im Ansehen-Tab zum gezielten Zurücksetzen der Erwachsenen- oder Jugend-Rangliste (inkl. Sicherheitsabfrage & isSaving-Guard) ergänzt.
// [2026-11-25] - UX-IMPROVEMENT: Automatisches Zurücksetzen entfallener Ränge (ohne Checkbox), manuelle Dropdown-Zuordnung für unbekannte Namen direkt in der Vorschau und sauberer Scrollbalken-Abstand.
// [2026-11-25] - FEATURE: In-App Ranglisten-Modal (Erwachsene & Jugend) inkl. Copy-Paste-Import aus click-TT mit Live-Vorschau und Änderungs-Abgleich.
// src/features/Users/components/RankingOverviewModal.tsx
import React, { useMemo, useState } from 'react';
import { X, Award, ClipboardPaste, CheckCircle2, Search, Users, Save, Trash2 } from 'lucide-react';
import { useClubStore } from '../../../store/useClubStore';
import type { Helper } from '../../../core/types/models';
import {
  compareRankStrings,
  matchRankingEntriesToHelpers,
  parseClickTtRankingText,
  parseRankParts,
  type RankingCategory
} from '../utils/rankingUtils';

interface RankingOverviewModalProps {
  onClose: () => void;
  initialCategory?: RankingCategory;
  canManage?: boolean;
}

export const RankingOverviewModal: React.FC<RankingOverviewModalProps> = ({
  onClose,
  initialCategory = 'ADULT',
  canManage = false
}) => {
  const { helpers, updateHelper, user, roleProfiles } = useClubStore();

  const isAllowedToManage = useMemo(() => {
    if (canManage) return true;
    const profile = roleProfiles.find(p => p.id === user?.roleProfileId);
    return !!(user?.permissions?.manageMitglieder || profile?.permissions?.manageMitglieder || profile?.id === 'pro-admin');
  }, [canManage, user, roleProfiles]);

  const [activeTab, setActiveTab] = useState<'VIEW' | 'IMPORT'>('VIEW');
  const [viewCategory, setViewCategory] = useState<RankingCategory>(initialCategory);
  const [searchTerm, setSearchTerm] = useState('');

  // Import-State für Erwachsene & Jugend
  const [adultPasteText, setAdultPasteText] = useState('');
  const [youthPasteText, setYouthPasteText] = useState('');
  const [manualAdultMatches, setManualAdultMatches] = useState<Record<string, string>>({});
  const [manualYouthMatches, setManualYouthMatches] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const sortedHelperOptions = useMemo(() => {
    return [...helpers].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
  }, [helpers]);

  const adultRankedHelpers = useMemo(() => {
    return helpers
      .filter(h => !!parseRankParts(h.rankAdult))
      .sort((a, b) => compareRankStrings(a.rankAdult, b.rankAdult));
  }, [helpers]);

  const youthRankedHelpers = useMemo(() => {
    return helpers
      .filter(h => !!parseRankParts(h.rankYouth))
      .sort((a, b) => compareRankStrings(a.rankYouth, b.rankYouth));
  }, [helpers]);

  const visibleHelpers = useMemo(() => {
    const base = viewCategory === 'YOUTH' ? youthRankedHelpers : adultRankedHelpers;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return base;
    return base.filter(
      h =>
        (h.name || '').toLowerCase().includes(term) ||
        (h.alias || '').toLowerCase().includes(term) ||
        (viewCategory === 'YOUTH' ? h.rankYouth || '' : h.rankAdult || '').toLowerCase().includes(term)
    );
  }, [viewCategory, adultRankedHelpers, youthRankedHelpers, searchTerm]);

  const adultPreview = useMemo(() => {
    const parsed = parseClickTtRankingText(adultPasteText);
    return matchRankingEntriesToHelpers(parsed, helpers, 'ADULT').map(item => {
      if (item.matchedHelper) return item;
      const manualId = manualAdultMatches[item.rank];
      const manualHelper = manualId ? helpers.find(h => h.id === manualId) : undefined;
      if (!manualHelper) return item;
      const previousRank = manualHelper.rankAdult;
      return {
        ...item,
        matchedHelper: manualHelper,
        previousRank,
        status: previousRank === item.rank ? ('UNCHANGED' as const) : previousRank ? ('CHANGED' as const) : ('NEW' as const)
      };
    });
  }, [adultPasteText, helpers, manualAdultMatches]);

  const youthPreview = useMemo(() => {
    const parsed = parseClickTtRankingText(youthPasteText);
    return matchRankingEntriesToHelpers(parsed, helpers, 'YOUTH').map(item => {
      if (item.matchedHelper) return item;
      const manualId = manualYouthMatches[item.rank];
      const manualHelper = manualId ? helpers.find(h => h.id === manualId) : undefined;
      if (!manualHelper) return item;
      const previousRank = manualHelper.rankYouth;
      return {
        ...item,
        matchedHelper: manualHelper,
        previousRank,
        status: previousRank === item.rank ? ('UNCHANGED' as const) : previousRank ? ('CHANGED' as const) : ('NEW' as const)
      };
    });
  }, [youthPasteText, helpers, manualYouthMatches]);

  const countPendingUpdates = useMemo(() => {
    const updates = new Map<string, { rankAdult?: string | null; rankYouth?: string | null }>();

    if (adultPreview.length > 0) {
      const matchedIds = new Set<string>();
      adultPreview.forEach(item => {
        if (item.matchedHelper) {
          matchedIds.add(item.matchedHelper.id);
          if (item.status === 'NEW' || item.status === 'CHANGED') {
            updates.set(item.matchedHelper.id, {
              ...(updates.get(item.matchedHelper.id) || {}),
              rankAdult: item.rank
            });
          }
        }
      });
      // Die click-TT Rangliste ist führend: Wer dort nicht mehr vorkommt, verliert seinen Erwachsenen-Rang
      helpers.forEach(h => {
        if (h.rankAdult && !matchedIds.has(h.id)) {
          updates.set(h.id, { ...(updates.get(h.id) || {}), rankAdult: null });
        }
      });
    }

    if (youthPreview.length > 0) {
      const matchedIds = new Set<string>();
      youthPreview.forEach(item => {
        if (item.matchedHelper) {
          matchedIds.add(item.matchedHelper.id);
          if (item.status === 'NEW' || item.status === 'CHANGED') {
            updates.set(item.matchedHelper.id, {
              ...(updates.get(item.matchedHelper.id) || {}),
              rankYouth: item.rank
            });
          }
        }
      });
      // Die click-TT Rangliste ist führend: Wer dort nicht mehr vorkommt, verliert seinen Jugend-Rang
      helpers.forEach(h => {
        if (h.rankYouth && !matchedIds.has(h.id)) {
          updates.set(h.id, { ...(updates.get(h.id) || {}), rankYouth: null });
        }
      });
    }

    return updates;
  }, [adultPreview, youthPreview, helpers]);

  const handleApplyImport = async () => {
    if (countPendingUpdates.size === 0 || isSaving) return;
    setIsSaving(true);
    setSaveFeedback(null);

    let savedCount = 0;
    try {
      for (const [helperId, patch] of countPendingUpdates.entries()) {
        const target = helpers.find(h => h.id === helperId);
        if (!target) continue;

        const nextHelper: Helper = { ...target, lastActivityAt: Date.now() };
        if (patch.rankAdult !== undefined) {
          if (patch.rankAdult === null) delete nextHelper.rankAdult;
          else nextHelper.rankAdult = patch.rankAdult;
        }
        if (patch.rankYouth !== undefined) {
          if (patch.rankYouth === null) delete nextHelper.rankYouth;
          else nextHelper.rankYouth = patch.rankYouth;
        }

        // Leere Felder bei Bedarf über updateHelper entfernen (sanitizeForFirestore in DataProcessor)
        const payload: any = { ...target, lastActivityAt: Date.now() };
        if (patch.rankAdult !== undefined) payload.rankAdult = patch.rankAdult === null ? '' : patch.rankAdult;
        if (patch.rankYouth !== undefined) payload.rankYouth = patch.rankYouth === null ? '' : patch.rankYouth;

        await updateHelper(payload as Helper);
        savedCount++;
      }

      setSaveFeedback(`✓ ${savedCount} ${savedCount === 1 ? 'Mitglied' : 'Mitglieder'} erfolgreich aktualisiert.`);
      setAdultPasteText('');
      setYouthPasteText('');
      setManualAdultMatches({});
      setManualYouthMatches({});
      setActiveTab('VIEW');
    } catch (err) {
      console.error('Fehler beim Speichern der Rangliste:', err);
      setSaveFeedback('⚠️ Fehler beim Speichern. Bitte erneut versuchen.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCategoryRanking = async (category: RankingCategory) => {
    if (!isAllowedToManage || isSaving) return;
    const targets = category === 'YOUTH' ? youthRankedHelpers : adultRankedHelpers;
    if (targets.length === 0) return;

    const categoryLabel = category === 'YOUTH' ? 'Jugend-Rangliste' : 'Erwachsenen-Rangliste';
    if (!window.confirm(`Möchtest du wirklich alle ${targets.length} Einträge der ${categoryLabel} löschen?`)) {
      return;
    }

    setIsSaving(true);
    setSaveFeedback(null);

    try {
      for (const target of targets) {
        const payload: Helper = {
          ...target,
          lastActivityAt: Date.now(),
          ...(category === 'YOUTH' ? { rankYouth: '' } : { rankAdult: '' })
        };
        await updateHelper(payload);
      }
      setSaveFeedback(`✓ ${categoryLabel} (${targets.length} Einträge) wurde geleert.`);
    } catch (err) {
      console.error('Fehler beim Löschen der Rangliste:', err);
      setSaveFeedback('⚠️ Fehler beim Löschen der Rangliste. Bitte erneut versuchen.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/55 z-[120] flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">Vereins-Rangliste</h2>
              <p className="text-xs text-gray-500 truncate">
                Aufstellungs-Reihenfolge (Erwachsene: {adultRankedHelpers.length} · Jugend: {youthRankedHelpers.length})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAllowedToManage && (
              <div className="flex bg-gray-200/80 p-0.5 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('VIEW')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'VIEW' ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Ansehen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('IMPORT')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'IMPORT' ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Importieren</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-white">
          {saveFeedback && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{saveFeedback}</span>
            </div>
          )}

          {activeTab === 'VIEW' ? (
            <div className="space-y-4">
              {/* Umschalter Erwachsene / Jugend + Suche */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setViewCategory('ADULT')}
                    className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                      viewCategory === 'ADULT' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Erwachsene ({adultRankedHelpers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewCategory('YOUTH')}
                    className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                      viewCategory === 'YOUTH' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Jugend ({youthRankedHelpers.length})
                  </button>
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Spieler oder Rang suchen..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {visibleHelpers.length === 0 ? (
                <div className="text-center py-12 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Award className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-700">
                    {searchTerm
                      ? 'Keine passenden Spieler gefunden.'
                      : `Noch keine ${viewCategory === 'YOUTH' ? 'Jugend' : 'Erwachsenen'}-Rangliste hinterlegt.`}
                  </p>
                  {isAllowedToManage && !searchTerm && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('IMPORT')}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      Jetzt aus click-TT einfügen
                    </button>
                  )}
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
                          Rang
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Spieler
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                          Alias
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Zweit-Rang
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {visibleHelpers.map(h => {
                        const mainRank = viewCategory === 'YOUTH' ? h.rankYouth : h.rankAdult;
                        const secondaryRank = viewCategory === 'YOUTH' ? h.rankAdult : h.rankYouth;
                        const secondaryLabel = viewCategory === 'YOUTH' ? 'Erw.' : 'Jug.';
                        return (
                          <tr key={h.id} className="hover:bg-blue-50/40 transition-colors">
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-extrabold font-mono ${
                                  viewCategory === 'YOUTH'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {mainRank}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm font-bold text-gray-900">{h.name}</td>
                            <td className="px-4 py-2 text-xs font-semibold text-gray-500 hidden sm:table-cell">
                              {h.alias}
                            </td>
                            <td className="px-4 py-2 text-right whitespace-nowrap">
                              {secondaryRank ? (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                                  {secondaryLabel} {secondaryRank}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                <strong>So funktioniert&apos;s:</strong> Markiere in click-TT / myTischtennis einfach die Tabelle unter <em>Mannschaftsmeldungen</em> (<kbd className="px-1 py-0.5 bg-white border border-blue-200 rounded">Cmd+C</kbd>) und füge sie unten ein. Die App erkennt <strong>Rang</strong> und <strong>Name</strong> sofort und zeigt dir alle Änderungen vor dem Speichern an.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* FELD 1: ERWACHSENE */}
                <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-blue-900">1. Rangliste Erwachsene</h3>
                    {adultPreview.length > 0 && (() => {
                      const matchedCount = adultPreview.filter(i => !!i.matchedHelper).length;
                      const allMatched = matchedCount === adultPreview.length;
                      return (
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            allMatched
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {matchedCount} / {adultPreview.length} erkannt
                        </span>
                      );
                    })()}
                  </div>
                  <textarea
                    value={adultPasteText}
                    onChange={e => setAdultPasteText(e.target.value)}
                    rows={5}
                    placeholder={'Hier Tabelle aus click-TT einfügen...\nz. B.\n1.1\t1493\tMax Ertl\n1.2\t1490\tDirk Klapproth'}
                    className="w-full p-2.5 text-xs font-mono border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {adultPreview.length > 0 && (
                    <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-100 text-xs">
                      {adultPreview.map((item, idx) => (
                        <div key={`a-${idx}`} className="pl-2.5 pr-4 py-1.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-blue-700 shrink-0">{item.rank}</span>
                            <span className="truncate font-medium text-gray-800">{item.rawName}</span>
                          </div>
                          {item.status === 'UNMATCHED' ? (
                            <select
                              value={manualAdultMatches[item.rank] || ''}
                              onChange={e => setManualAdultMatches(prev => ({ ...prev, [item.rank]: e.target.value }))}
                              className="max-w-[140px] text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-amber-500 shrink-0"
                            >
                              <option value="">Zuordnen…</option>
                              {sortedHelperOptions.map(h => (
                                <option key={h.id} value={h.id}>{h.name}</option>
                              ))}
                            </select>
                          ) : item.status === 'UNCHANGED' ? (
                            <span className="text-[10px] text-gray-400 shrink-0">Unverändert</span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                              {item.previousRank ? `${item.previousRank} → ${item.rank}` : `Neu: ${item.rank}`}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* FELD 2: JUGEND */}
                <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-purple-900">2. Rangliste Jugend</h3>
                    {youthPreview.length > 0 && (() => {
                      const matchedCount = youthPreview.filter(i => !!i.matchedHelper).length;
                      const allMatched = matchedCount === youthPreview.length;
                      return (
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            allMatched
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {matchedCount} / {youthPreview.length} erkannt
                        </span>
                      );
                    })()}
                  </div>
                  <textarea
                    value={youthPasteText}
                    onChange={e => setYouthPasteText(e.target.value)}
                    rows={5}
                    placeholder={'Hier Jugend-Tabelle aus click-TT einfügen...\nz. B.\n1.1\t1304\tKorbinian Leitmeier\n1.2\t939\tStefan Kellerer'}
                    className="w-full p-2.5 text-xs font-mono border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />

                  {youthPreview.length > 0 && (
                    <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-100 text-xs">
                      {youthPreview.map((item, idx) => (
                        <div key={`y-${idx}`} className="pl-2.5 pr-4 py-1.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-purple-700 shrink-0">{item.rank}</span>
                            <span className="truncate font-medium text-gray-800">{item.rawName}</span>
                          </div>
                          {item.status === 'UNMATCHED' ? (
                            <select
                              value={manualYouthMatches[item.rank] || ''}
                              onChange={e => setManualYouthMatches(prev => ({ ...prev, [item.rank]: e.target.value }))}
                              className="max-w-[140px] text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-amber-500 shrink-0"
                            >
                              <option value="">Zuordnen…</option>
                              {sortedHelperOptions.map(h => (
                                <option key={h.id} value={h.id}>{h.name}</option>
                              ))}
                            </select>
                          ) : item.status === 'UNCHANGED' ? (
                            <span className="text-[10px] text-gray-400 shrink-0">Unverändert</span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                              {item.previousRank ? `${item.previousRank} → ${item.rank}` : `Neu: ${item.rank}`}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {activeTab === 'IMPORT' ? (
            <>
              <span className="text-xs text-gray-500">
                {countPendingUpdates.size > 0
                  ? `${countPendingUpdates.size} ${countPendingUpdates.size === 1 ? 'Änderung' : 'Änderungen'} bereit zum Speichern`
                  : 'Füge oben eine Tabelle ein, um Änderungen zu prüfen.'}
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  disabled={countPendingUpdates.size === 0 || isSaving}
                  onClick={handleApplyImport}
                  className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Speichert...' : `${countPendingUpdates.size} Ränge jetzt übernehmen`}
                </button>
              </div>
            </>
          ) : (
            <>
              {isAllowedToManage && (viewCategory === 'YOUTH' ? youthRankedHelpers.length > 0 : adultRankedHelpers.length > 0) && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleClearCategoryRanking(viewCategory)}
                  className="px-3 py-2 text-xs sm:text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? 'Löscht...'
                      : viewCategory === 'YOUTH'
                        ? 'Jugend-Rangliste löschen'
                        : 'Erwachsenen-Rangliste löschen'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="ml-auto px-5 py-2 text-sm font-bold text-gray-800 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Schließen
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---

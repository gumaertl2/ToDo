// [2026-10-15] - FIX: Import-Pfad für backupService auf '../../services/backupService' korrigiert.
// [2026-10-15] - FEATURE: Backup & Restore Tab für ReportsView erstellt (inkl. 1-Klick iCloud JSON-Backup, User-Reminder-Konfiguration und 2-Modi Restore für Test-/Prod-DB).
// src/features/Reports/BackupRestoreTab.tsx
import React, { useState, useRef } from 'react';
import { 
  Download, Upload, ShieldAlert, CheckCircle2, Bell, 
  Database, RefreshCw, Trash2, FileJson, Info, AlertTriangle, Check
} from 'lucide-react';
import { useClubStore } from '../../store/useClubStore';
import { DataProcessor } from '../../services/DataProcessor';
import type { User } from '../../core/types/models';
import { 
  exportFullDatabaseBackup, 
  parseAndValidateBackupFile, 
  restoreDatabaseBackup, 
  getLastBackupInfo,
  BACKUP_COLLECTIONS,
  type BackupPayload 
} from '../../services/backupService';

export const BackupRestoreTab: React.FC = () => {
  const { 
    user: currentUser, 
    users, 
    fetchUsersAndHelpers, 
    fetchGroups, 
    fetchTeams, 
    fetchEvents, 
    fetchTasks, 
    fetchCalendarData, 
    fetchTeamPins, 
    fetchMatchLineups 
  } = useClubStore();

  const currentProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'Unbekannt';

  // State für Backup-Export
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState(() => getLastBackupInfo());

  // State für User-Reminder-Einstellung
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  // State für Restore (Import)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupPayload | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'wipe'>('merge');
  const [confirmText, setConfirmText] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStatusText, setRestoreStatusText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Komplett-Backup herunterladen
  const handleDownloadBackup = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    setExportSuccessMsg(null);
    try {
      const meta = await exportFullDatabaseBackup(currentUser?.name);
      const totalDocs = Object.values(meta.counts).reduce((acc, val) => acc + val, 0);
      setLastBackup(getLastBackupInfo());
      setExportSuccessMsg(`Backup erfolgreich erstellt (${totalDocs} Datensätze aus ${BACKUP_COLLECTIONS.length} Tabellen).`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Fehler beim Erstellen des Backups.');
    } finally {
      setIsExporting(false);
    }
  };

  // 2. 12:00-Uhr-Reminder für einen App-Nutzer ein-/ausschalten
  const handleToggleUserReminder = async (targetUser: User) => {
    setSavingUserId(targetUser.id);
    setErrorMsg(null);
    try {
      const updatedUser: User = {
        ...targetUser,
        receiveBackupReminder: !targetUser.receiveBackupReminder,
        updatedAt: Date.now()
      };
      const res = await DataProcessor.saveDocument('users', targetUser.id, updatedUser, true);
      if (!res.success) {
        throw res.error;
      }
      if (fetchUsersAndHelpers) {
        await fetchUsersAndHelpers();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Fehler beim Speichern der Einstellung.');
    } finally {
      setSavingUserId(null);
    }
  };

  // 3. Backup-Datei auswählen & prüfen
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErrorMsg(null);
    setRestoreStatusText(null);
    setConfirmText('');
    if (!file) {
      setParsedBackup(null);
      setSelectedFileName(null);
      return;
    }

    try {
      const payload = await parseAndValidateBackupFile(file);
      setSelectedFileName(file.name);
      setParsedBackup(payload);
    } catch (err) {
      setParsedBackup(null);
      setSelectedFileName(null);
      setErrorMsg(err instanceof Error ? err.message : 'Ungültige Backup-Datei.');
    }
  };

  // 4. Restore starten
  const handleExecuteRestore = async () => {
    if (!parsedBackup) return;
    if (confirmText.trim().toUpperCase() !== 'RESTORE') return;

    setIsRestoring(true);
    setErrorMsg(null);
    try {
      await restoreDatabaseBackup(parsedBackup, restoreMode, (status) => {
        setRestoreStatusText(status);
      });

      // Danach Store komplett frisch synchronisieren
      setRestoreStatusText('Synchronisiere App-Speicher mit den neuen Daten...');
      await Promise.all([
        fetchUsersAndHelpers?.(),
        fetchGroups?.(),
        fetchTeams?.(),
        fetchEvents?.(),
        fetchTasks?.(),
        fetchCalendarData?.(),
        fetchTeamPins?.(),
        fetchMatchLineups?.()
      ]);

      setRestoreStatusText('Rücksicherung komplett abgeschlossen! Alle Ansichten sind auf dem neuesten Stand.');
      setConfirmText('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Fehler beim Einspielen des Backups.');
    } finally {
      setIsRestoring(false);
    }
  };

  const totalBackupDocs = parsedBackup 
    ? Object.values(parsedBackup.meta.counts || {}).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-6">
      
      {/* FEHLER-BANNER */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{errorMsg}</div>
        </div>
      )}

      {/* AKTUELLE DATENBANK-INFO */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">Aktuell verbundene Firebase-Datenbank</div>
            <div className="text-base font-extrabold text-gray-900 font-mono">{currentProjectId}</div>
          </div>
        </div>
        {lastBackup.timestamp && (
          <div className="text-xs text-gray-600 bg-white px-3 py-2 rounded-lg border border-indigo-100 shadow-2xs">
            Letzte Sicherung auf diesem Gerät:{' '}
            <span className="font-bold text-gray-900">
              {new Date(lastBackup.timestamp).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })} Uhr
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* KARTE 1: BACKUP ERSTELLEN (EXPORT AUF MAC / ICLOUD DRIVE) */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Download className="w-6 h-6 text-blue-600 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900">1. Datensicherung erstellen (Backup)</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Liest alle <strong>12 Datenbank-Tabellen</strong> (Mitglieder, Teams, Aufstellungen, Termine, Sitzungen, Aufgaben, PINs, Umfragen) direkt und ungefiltert aus Google Firestore aus und speichert sie als kompakte <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.json</code> Datei.
            </p>
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900 space-y-1.5 mb-6">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                Tipp für Mac & iPhone (iCloud Drive):
              </div>
              <p>
                Speichere die heruntergeladene Datei einfach in deinem Ordner <strong>iCloud Drive → PapaToDo-Backups</strong>. So hast du deine Sicherungen automatisch auf Mac und iPhone synchron.
              </p>
            </div>
          </div>

          <div>
            {exportSuccessMsg && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>{exportSuccessMsg}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={isExporting}
              className="w-full py-3 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Erstelle Komplett-Abzug aus Firestore...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Komplett-Backup jetzt herunterladen (.json)</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* KARTE 2: TÄGLICHE 12:00-UHR ERINNERUNG PRO USER */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Bell className="w-6 h-6 text-amber-500 shrink-0" />
              <h2 className="text-lg font-bold text-gray-900">2. Tägliche Backup-Erinnerung (ab 12:00 Uhr)</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Wähle aus, bei welchen App-Nutzern automatisch ab <strong>12:00 Uhr mittags</strong> ein dezentes Hinweis-Banner oben in der App erscheint, falls an diesem Tag noch keine Sicherung durchgeführt wurde.
            </p>

            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-[240px] overflow-y-auto custom-scrollbar">
              {users.map((u) => {
                const isChecked = !!u.receiveBackupReminder;
                const isSaving = savingUserId === u.id;
                return (
                  <label
                    key={u.id}
                    className={`flex items-center justify-between p-3 text-sm transition-colors cursor-pointer ${
                      isChecked ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-bold text-gray-900 truncate flex items-center gap-2">
                        <span>{u.name}</span>
                        {currentUser?.id === u.id && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-extrabold uppercase">
                            Ich
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{u.amt || u.rolle || u.email}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSaving && <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isSaving}
                        onChange={() => handleToggleUserReminder(u)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
            <span>Aktive Empfänger: <strong>{users.filter(u => u.receiveBackupReminder).length}</strong></span>
            <span>Prüfung erfolgt lokal pro Gerät (Mac / iPhone)</span>
          </div>
        </section>

      </div>

      {/* KARTE 3: RÜCKSICHERUNG / RESTORE (FÜR TEST- & PROD-DATENBANK) */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2.5 mb-2">
          <Upload className="w-6 h-6 text-indigo-600 shrink-0" />
          <h2 className="text-lg font-bold text-gray-900">3. Rücksicherung einspielen (Restore / Test-Datenbank klonen)</h2>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Lade eine zuvor gesicherte <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.json</code> Backup-Datei hoch, um den Datenbestand in die aktuell verbundene Datenbank (<strong>{currentProjectId}</strong>) einzuspielen.
        </p>

        {/* Datei-Auswahl */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRestoring}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl border border-gray-300 text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <FileJson className="w-4 h-4 text-indigo-600" />
            <span>Backup-Datei auswählen (.json)</span>
          </button>

          {selectedFileName ? (
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl truncate">
              <Check className="w-4 h-4 text-green-600 shrink-0" />
              <span className="truncate">{selectedFileName}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400 italic self-center">Noch keine Datei ausgewählt</span>
          )}
        </div>

        {/* Vorschau & Konfigurations-Assistent, sobald eine Datei geladen wurde */}
        {parsedBackup && (
          <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/60 space-y-6 animate-in fade-in duration-200">
            
            {/* Backup-Metadaten */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3">
                Inhalt der gewählten Sicherung ({totalBackupDocs} Datensätze gesamt)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-gray-400 block">Erstellt am:</span>
                  <strong className="text-gray-900">
                    {new Date(parsedBackup.meta.exportedAt).toLocaleString('de-DE')}
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-gray-400 block">Quell-Datenbank (Project-ID):</span>
                  <strong className="text-gray-900 font-mono">{parsedBackup.meta.projectId}</strong>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-gray-400 block">Exportiert von:</span>
                  <strong className="text-gray-900">{parsedBackup.meta.exportedBy || '-'}</strong>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(parsedBackup.meta.counts || {}).map(([col, count]) => (
                  <span key={col} className="text-[11px] bg-white border border-gray-200 px-2.5 py-1 rounded-full font-mono text-gray-700">
                    {col}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Auswahl des Einspiel-Modus (Merge vs. Wipe) */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3">
                Einspiel-Modus wählen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <label
                  onClick={() => setRestoreMode('merge')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    restoreMode === 'merge'
                      ? 'border-blue-600 bg-blue-50/40 shadow-2xs'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-blue-600" />
                      <span>Option A: Nur aktualisieren & ergänzen (Merge)</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Vorhandene Datensätze mit gleicher ID werden aktualisiert, fehlende hinzugefügt. Datensätze, die nur in der Zieldatenbank existieren, bleiben erhalten.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setRestoreMode('wipe')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    restoreMode === 'wipe'
                      ? 'border-red-600 bg-red-50/40 shadow-2xs'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    checked={restoreMode === 'wipe'}
                    onChange={() => setRestoreMode('wipe')}
                    className="mt-1 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-red-600" />
                      <span>Option B: Zieldatenbank vorher leeren (1:1 Spiegel)</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Löscht vor dem Einspielen alle bestehenden Dokumente in der Zieldatenbank. Ideal, um deine <strong>Test-Datenbank</strong> ohne alte Daten-Leichen exakt mit den Produktivdaten zu klonen.
                    </p>
                  </div>
                </label>

              </div>
            </div>

            {/* Sicherheits-Schranke & Start-Button */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong>Sicherheits-Bestätigung:</strong> Du bist dabei, Daten in die Datenbank{' '}
                  <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-300">{currentProjectId}</code>{' '}
                  einzuspielen ({restoreMode === 'wipe' ? 'Zieldatenbank wird vorher komplett geleert!' : 'Merge-Modus'}). Bitte tippe zur Bestätigung das Wort <strong>RESTORE</strong> in das Feld ein:
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  placeholder="RESTORE eingeben..."
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={isRestoring}
                  className="px-3.5 py-2 bg-white border border-amber-300 rounded-lg text-sm font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:w-56"
                />

                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={isRestoring || confirmText.trim().toUpperCase() !== 'RESTORE'}
                  className={`px-6 py-2.5 rounded-lg font-bold text-sm text-white shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    restoreMode === 'wipe' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Spiele Backup ein...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>
                        {restoreMode === 'wipe' 
                          ? 'Zieldatenbank leeren & Backup einspielen' 
                          : 'Backup jetzt einspielen (Merge)'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {restoreStatusText && (
                <div className="p-3 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span>{restoreStatusText}</span>
                </div>
              )}
            </div>

          </div>
        )}
      </section>

    </div>
  );
};
// --- END OF FILE ---
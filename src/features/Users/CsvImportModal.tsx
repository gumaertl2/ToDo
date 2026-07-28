// [2026-07-28] - FEATURE: CSV-Import um Aktenlage-Felder ('DSGVO Papier' und 'Erw. Führungszeugnis') erweitert.
// [2026-04-16] - FEATURE: CSV-Import um Eintrittsdatum und Mitgliedsstatus erweitert
// [2026-04-23] - FEATURE: CSV-Import um Feld telefonEltern erweitert
// [2026-04-25] - BUGFIX: sanitizePhone filtert nun fehlerhafte "nur +49" Nummern korrekt aus
// [2026-04-30] - FEATURE: CSV-Import um Feld emailEltern erweitert und in Vorschau aufgenommen
// src/features/Users/CsvImportModal.tsx
import React, { useState, useRef } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { X, Upload, Save, AlertCircle, AlertTriangle, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import type { Helper } from '../../core/types/models';

interface Props {
  onClose: () => void;
}

type ImportStatus = 'new' | 'update' | 'error';

interface PreviewRow {
  status: ImportStatus;
  message: string;
  data: Partial<Helper>;
  originalName: string;
}

export const CsvImportModal: React.FC<Props> = ({ onClose }) => {
  const { helpers, addHelpersBulk } = useClubStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [masterConsent, setMasterConsent] = useState(false);
  const [stats, setStats] = useState({ new: 0, update: 0, error: 0 });

  const parseDate = (dateStr: string) => {
    if (!dateStr) return '';
    const s = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; 
    const match = s.match(/^(\d{1,2})[\./-](\d{1,2})[\./-](\d{2}|\d{4})$/);
    if (match) {
      const d = match[1].padStart(2, '0');
      const m = match[2].padStart(2, '0');
      let y = match[3];
      
      if (y.length === 2) {
        const yearNum = parseInt(y, 10);
        y = yearNum < 30 ? `20${y}` : `19${y}`;
      }
      
      return `${y}-${m}-${d}`;
    }
    return '';
  };

  const sanitizePhone = (phoneStr: string) => {
    if (!phoneStr) return '';
    let f = phoneStr.trim().replace(/[^0-9+]/g, '');
    if (!f) return '';
    
    if (f.startsWith('00')) f = '+' + f.substring(2);
    else if (f.startsWith('0') && !f.startsWith('00')) f = '+49' + f.substring(1);
    
    if (f === '+49' || f === '+' || f.length < 5) {
      return '';
    }
    
    return f;
  };

  const generateUniqueAlias = (fullName: string, existingAliases: Set<string>, previewAliases: Set<string>) => {
    const parts = fullName.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

    let candidate = firstName;
    
    const isTaken = (a: string) => existingAliases.has(a.toLowerCase()) || previewAliases.has(a.toLowerCase());

    if (!isTaken(candidate)) return candidate;

    for (let i = 1; i <= lastName.length; i++) {
      candidate = `${firstName} ${lastName.substring(0, i)}`;
      if (!isTaken(candidate)) return candidate;
    }

    let counter = 2;
    while (isTaken(`${firstName} ${counter}`)) {
      counter++;
    }
    return `${firstName} ${counter}`;
  };

  const parseBooleanStr = (val: string) => {
    if (!val) return false;
    const lower = val.trim().toLowerCase();
    return ['ja', 'yes', 'true', '1', 'x', 'j'].includes(lower);
  };

  const processCSV = (text: string) => {
    setError(null);
    setIsProcessing(true);

    try {
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) throw new Error('Die Datei enthält keine Datenzeilen.');

      const delimiter = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());

      const mapIndex = (possibleNames: string[]) => headers.findIndex(h => possibleNames.some(pn => h.includes(pn)));
      
      const idxName = mapIndex(['name', 'vollname']);
      const idxEmail = mapIndex(['email', 'e-mail', 'mail']);
      const idxPhone = mapIndex(['telefon', 'handy', 'mobil', 'phone']);
      const idxBirth = mapIndex(['geburt', 'date', 'alter']);
      const idxBezug = mapIndex(['bezug', 'notiz', 'info', 'gruppe']);
      
      const idxEintritt = mapIndex(['eintritt', 'mitglied seit', 'join', 'eintrittsdatum']);
      const idxStatus = mapIndex(['status', 'mitgliedsart', 'art', 'typ']);
      
      const idxTelEltern = mapIndex(['eltern', 'tel. eltern', 'telefon eltern', 'elterntelefon', 'telefoneltern']);
      const idxEmailEltern = mapIndex(['email eltern', 'eltern email', 'e-mail eltern', 'eltern e-mail', 'elternmail']);
      
      // CHIRURGISCHER EINGRIFF: Aktenlage Indices
      const idxDsgvo = mapIndex(['dsgvo papier', 'dsgvo', 'papier', 'einwilligung']);
      const idxFz = mapIndex(['erw. führungszeugnis', 'führungszeugnis', 'unbedenklichkeit', 'jugendarbeit']);

      if (idxName === -1) throw new Error('Spalte "Name" wurde nicht gefunden.');

      const existingAliases = new Set(helpers.map(h => (h.alias || '').toLowerCase()));
      const previewAliases = new Set<string>();
      const parsedRows: PreviewRow[] = [];
      let cntNew = 0, cntUpdate = 0, cntErr = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length < headers.length) continue; 

        let rawName = cols[idxName];
        if (!rawName) continue;

        if (rawName.includes(',')) {
          const p = rawName.split(',');
          if (p.length === 2) rawName = `${p[1].trim()} ${p[0].trim()}`;
        }

        const rawPhone = idxPhone >= 0 ? cols[idxPhone] : '';
        const rawEmail = idxEmail >= 0 ? cols[idxEmail] : '';
        const rawBirth = idxBirth >= 0 ? cols[idxBirth] : '';
        const rawBezug = idxBezug >= 0 ? cols[idxBezug] : '';
        
        const rawEintritt = idxEintritt >= 0 ? cols[idxEintritt] : '';
        const rawStatus = idxStatus >= 0 ? cols[idxStatus] : '';
        
        const rawTelEltern = idxTelEltern >= 0 ? cols[idxTelEltern] : '';
        const rawEmailEltern = idxEmailEltern >= 0 ? cols[idxEmailEltern] : '';

        const rawDsgvo = idxDsgvo >= 0 ? cols[idxDsgvo] : '';
        const rawFz = idxFz >= 0 ? cols[idxFz] : '';

        const phone = sanitizePhone(rawPhone);
        const phoneEltern = sanitizePhone(rawTelEltern);
        const birth = parseDate(rawBirth);
        const eintritt = parseDate(rawEintritt);
        
        const isDsgvoPaper = parseBooleanStr(rawDsgvo);
        const isFzPaper = parseBooleanStr(rawFz);
        
        let parsedStatus: 'AKTIV' | 'PASSIV' | 'JUGEND' | undefined = undefined;
        if (rawStatus) {
          const s = rawStatus.toUpperCase();
          if (s.includes('PASSIV')) parsedStatus = 'PASSIV';
          else if (s.includes('JUGEND')) parsedStatus = 'JUGEND';
          else if (s.includes('AKTIV')) parsedStatus = 'AKTIV';
        }

        const existingMatch = helpers.find(h => h.name.toLowerCase() === rawName.toLowerCase());

        if (existingMatch) {
          parsedRows.push({
            status: 'update',
            message: 'Wird aktualisiert',
            originalName: rawName,
            data: {
              ...existingMatch,
              telefon: phone || existingMatch.telefon,
              telefonEltern: phoneEltern || existingMatch.telefonEltern,
              email: rawEmail || existingMatch.email,
              emailEltern: rawEmailEltern || existingMatch.emailEltern,
              geburtsdatum: birth || existingMatch.geburtsdatum,
              eintrittsdatum: eintritt || existingMatch.eintrittsdatum,
              memberStatus: parsedStatus || existingMatch.memberStatus || 'AKTIV',
              bezug: rawBezug || existingMatch.bezug,
              hasWrittenDsgvoConsent: isDsgvoPaper || existingMatch.hasWrittenDsgvoConsent,
              hasYouthWorkClearance: isFzPaper || existingMatch.hasYouthWorkClearance,
              lastActivityAt: Date.now()
            }
          });
          cntUpdate++;
        } else {
          const alias = generateUniqueAlias(rawName, existingAliases, previewAliases);
          previewAliases.add(alias);

          parsedRows.push({
            status: 'new',
            message: `Neu (Alias: ${alias})`,
            originalName: rawName,
            data: {
              id: `helper-${Date.now()}-${i}`,
              schemaVersion: '1.0',
              name: rawName,
              alias: alias,
              telefon: phone,
              telefonEltern: phoneEltern,
              email: rawEmail,
              emailEltern: rawEmailEltern,
              geburtsdatum: birth,
              eintrittsdatum: eintritt,
              memberStatus: parsedStatus || 'AKTIV',
              bezug: rawBezug,
              hasWrittenDsgvoConsent: isDsgvoPaper,
              hasYouthWorkClearance: isFzPaper,
              consentConfirmed: isDsgvoPaper, // Auto-Opt-In
              consentConfirmedAt: isDsgvoPaper ? Date.now() : undefined,
              consentConfirmedBy: isDsgvoPaper ? 'ADMIN' : undefined,
              lastActivityAt: Date.now(),
              retentionExpiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000)
            }
          });
          cntNew++;
        }
      }

      setPreviewData(parsedRows);
      setStats({ new: cntNew, update: cntUpdate, error: cntErr });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Lesen der CSV.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsText(file, 'ISO-8859-1'); 
    reader.onload = (evt) => {
      if (evt.target?.result) {
        processCSV(evt.target.result as string);
      }
    };
  };

  const executeImport = async () => {
    if (!masterConsent) {
      setError('Bitte bestätige die DSGVO-Vorgaben.');
      return;
    }
    
    const validHelpers = previewData
      .filter(r => r.status === 'new' || r.status === 'update')
      .map(r => {
        const dataObj = { ...r.data };
        return Object.fromEntries(Object.entries(dataObj).filter(([_, v]) => v !== undefined)) as unknown as Helper;
      });

    if (validHelpers.length === 0) return;

    setIsProcessing(true);
    const result = await addHelpersBulk(validHelpers);
    
    if (result.success) {
      onClose();
    } else {
      setError(result.error?.message || 'Fehler beim Speichern in der Datenbank.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Upload className="w-5 h-5 mr-2 text-blue-600" /> Mitglieder & Helfer aus CSV importieren
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isProcessing}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gray-50 flex flex-col">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center mb-4 border border-red-200 shrink-0">
              <AlertCircle className="w-5 h-5 mr-2" /> <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          {previewData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-xl p-8 text-center">
              <FileText className="w-12 h-12 text-blue-400 mb-3" />
              <h3 className="font-bold text-gray-800 mb-1">CSV-Datei hochladen</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md">Kopfzeilen: Name, Telefon, Tel. Eltern, Email, Email Eltern, Geburt, Eintritt, Status, DSGVO Papier, Führungszeugnis.</p>
              
              <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-sm"
              >
                Datei auswählen
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex gap-4 mb-4 shrink-0">
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex-1 text-center">
                  <div className="text-2xl font-black text-green-600">{stats.new}</div>
                  <div className="text-xs text-gray-500 font-bold uppercase">Neu anzulegen</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex-1 text-center">
                  <div className="text-2xl font-black text-blue-600">{stats.update}</div>
                  <div className="text-xs text-gray-500 font-bold uppercase">Aktualisierungen</div>
                </div>
              </div>

              <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex flex-col">
                <div className="overflow-x-auto flex-1 custom-scrollbar">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Alias</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Mitglieds-Status</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Papierakte</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Telefon</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">E-Mail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewData.map((row, idx) => (
                        <tr key={idx} className={row.status === 'new' ? 'bg-green-50/30' : 'bg-blue-50/30'}>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {row.status === 'new' ? <span className="flex items-center text-xs font-bold text-green-700"><CheckCircle className="w-3.5 h-3.5 mr-1"/> NEU</span> : <span className="flex items-center text-xs font-bold text-blue-700"><RefreshCw className="w-3.5 h-3.5 mr-1"/> UPDATE</span>}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{row.originalName}</td>
                          <td className="px-4 py-2 text-sm font-bold text-gray-900">{row.data.alias}</td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${row.data.memberStatus === 'PASSIV' ? 'bg-gray-200 text-gray-600' : row.data.memberStatus === 'JUGEND' ? 'bg-purple-200 text-purple-700' : 'bg-green-200 text-green-800'}`}>
                              {row.data.memberStatus}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm font-mono text-gray-600">
                            {row.data.hasWrittenDsgvoConsent ? 'DSGVO ✓ ' : ''} 
                            {row.data.hasYouthWorkClearance ? 'Führungszeugnis ✓' : ''}
                          </td>
                          <td className="px-4 py-2 text-sm font-mono text-gray-600">{row.data.telefon || '-'}</td>
                          <td className="px-4 py-2 text-sm font-mono text-gray-600">{row.data.email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4 shrink-0">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Massen-DSGVO Freigabe</h4>
                    <div className="mt-2 flex items-center">
                      <input
                        id="master-consent" type="checkbox" checked={masterConsent} onChange={(e) => setMasterConsent(e.target.checked)} disabled={isProcessing}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="master-consent" className="ml-2 text-sm text-yellow-900 block cursor-pointer font-bold">
                        Ich bestätige, dass für alle importierten Personen die Zustimmung zur Speicherung vorliegt.
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-white flex justify-end gap-3">
          <button onClick={onClose} disabled={isProcessing} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-bold transition">Abbrechen</button>
          <button 
            onClick={executeImport}
            disabled={previewData.length === 0 || !masterConsent || isProcessing}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold transition shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {isProcessing ? 'Importiert...' : `Import ausführen (${previewData.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---
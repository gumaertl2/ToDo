// [2026-10-18] - UX: Button-Beschriftung in der Historie von "Zurück in Offen" auf "Wieder aktivieren" angepasst.
// [2026-10-18] - FEAT: Verlaufs-Darstellung (Audit-Banner mit Zeitstempel, Bearbeiter & Status Gesendet/Verworfen), Wiederherstellen-Button und detaillierte Überfällig-Anzeige ergänzt.
// [2026-10-18] - REFACTOR: Einzelne Erinnerungs-Karte (UI, Status-Badges, WhatsApp-Vorschau und Snooze-/Versand-Steuerung) aus der RemindersView.tsx in eine dedizierte Komponente ausgelagert.
// src/features/Reminders/components/ReminderCard.tsx
import React from 'react';
import { 
  Send, Trash2, Clock, Info, Users, FileText, 
  Calendar as CalendarIcon, Smartphone, AlertTriangle, 
  AlertCircle, RefreshCw, CheckCircle2, XCircle, RotateCcw 
} from 'lucide-react';
import type { PendingReminderItem } from '../hooks/useRemindersData';

interface ReminderCardProps {
  reminder: PendingReminderItem;
  hasEditRights: boolean;
  isHistory?: boolean;
  snoozeValue: number;
  onSnoozeChange: (days: number) => void;
  onCardClick: () => void;
  onSend: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
  onRestore?: () => void;
}

export const ReminderCard: React.FC<ReminderCardProps> = ({
  reminder: rem,
  hasEditRights,
  isHistory = false,
  snoozeValue,
  onSnoozeChange,
  onCardClick,
  onSend,
  onSnooze,
  onDismiss,
  onRestore
}) => {
  const isDismissed = rem.action === 'DISMISSED';
  const sentDateStr = rem.sentAt
    ? new Date(rem.sentAt).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' Uhr'
    : 'Unbekannt';

  return (
    <div className={`bg-white border ${
      isHistory 
        ? (isDismissed ? 'border-gray-200 opacity-90' : 'border-green-200') 
        : (rem.diffDays < 0 ? 'border-red-300' : hasEditRights ? 'border-green-200' : 'border-blue-100')
    } rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row md:items-stretch transition-all hover:border-blue-300`}>
      <div 
        onClick={() => {
          if (!hasEditRights) return;
          onCardClick();
        }}
        className={`p-5 flex-1 border-b md:border-b-0 md:border-r border-gray-100 transition-colors ${hasEditRights ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center ${
                rem.type === 'Sitzung' ? 'bg-purple-100 text-purple-700' : 
                rem.type === 'Abo' ? 'bg-yellow-100 text-yellow-800' : 
                (rem.type === 'Agenda' || rem.type === 'Info' || rem.type === 'Beschluss') ? 'bg-indigo-100 text-indigo-700' :
                'bg-green-100 text-green-700'
              }`}>
                {rem.model === 'task' ? <FileText className="w-3 h-3 mr-1" /> : <CalendarIcon className="w-3 h-3 mr-1" />}
                {rem.type}
              </span>
              <span className="text-base font-bold text-gray-900">{rem.title}</span>
            </div>
            
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <div className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                Geplanter Absender: {rem.senderName}
              </div>
              {rem.isRecipient && (
                <div className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 flex items-center">
                  <Info className="w-2.5 h-2.5 mr-1" /> Du bist Empfänger
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end shrink-0 ml-2">
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200">
              Termin/Fällig: {new Date(rem.date).toLocaleDateString('de-DE')}
            </span>
            {isHistory ? (
              <span className={`text-xs font-bold mt-1.5 flex items-center ${isDismissed ? 'text-gray-600' : 'text-green-700'}`}>
                {isDismissed ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 mr-1 text-red-500" />
                    Verworfen
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" />
                    Versendet
                  </>
                )}
              </span>
            ) : (
              <span className={`text-xs font-bold mt-1.5 flex items-center ${rem.diffDays === 0 ? 'text-orange-600' : rem.diffDays < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {rem.diffDays < 0 ? <AlertTriangle className="w-3.5 h-3.5 mr-1" /> : null}
                {rem.diffDays === 0 
                  ? 'Heute fällig' 
                  : rem.diffDays > 0 
                    ? `Noch ${rem.diffDays} ${rem.diffDays === 1 ? 'Tag' : 'Tage'}` 
                    : `Überfällig (seit ${Math.abs(rem.diffDays)} ${Math.abs(rem.diffDays) === 1 ? 'Tag' : 'Tagen'})`}
              </span>
            )}
          </div>
        </div>

        {isHistory && (
          <div className={`mb-3 px-3 py-2 rounded-lg border text-xs flex items-center justify-between ${
            isDismissed 
              ? 'bg-gray-50 border-gray-200 text-gray-700' 
              : 'bg-green-50 border-green-200 text-green-800'
          }`}>
            <div className="flex items-center font-medium">
              {isDismissed ? (
                <XCircle className="w-4 h-4 mr-2 text-red-500 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-600 shrink-0" />
              )}
              <span>
                {isDismissed ? 'Verworfen' : 'Als gesendet markiert'} am <strong>{sentDateStr}</strong> von <strong>{rem.sentBy || 'Unbekannt'}</strong>
              </span>
            </div>
          </div>
        )}
        
        <div className="mb-3 flex items-center">
          <span className="text-sm text-gray-500 mr-2">Ziel:</span>
          <span className={`text-sm font-bold flex items-center ${rem.isDirect ? 'text-green-700' : 'text-blue-700'}`}>
            <Users className="w-4 h-4 mr-1.5 opacity-70" />
            {rem.targetsNames}
          </span>
        </div>

        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-inner">
          <p className="text-sm text-gray-700 font-mono whitespace-pre-wrap">
            {rem.text}
          </p>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 md:w-56 flex flex-col justify-center gap-3 shrink-0">
        {isHistory ? (
          hasEditRights ? (
            <>
              <button
                onClick={onSend}
                className="flex items-center justify-center w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs shadow-sm"
              >
                {rem.isDirect ? <Smartphone className="w-4 h-4 mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
                Nochmal senden
              </button>
              {onRestore && (
                <button
                  onClick={onRestore}
                  className="flex items-center justify-center w-full px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-bold text-xs shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Wieder aktivieren
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-2">
              <div className={`${isDismissed ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'} p-2 rounded-full mb-2`}>
                {isDismissed ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              </div>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">
                {isDismissed ? 'Erinnerung verworfen' : 'Bereits versendet'}
              </p>
              <p className="text-[9px] text-gray-400 mt-1 italic">
                Bearbeitet von {rem.sentBy || 'Unbekannt'}
              </p>
            </div>
          )
        ) : hasEditRights ? (
          <>
            <button
              onClick={onSend}
              className="flex items-center justify-center w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-sm"
            >
              {rem.isDirect ? <Smartphone className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Senden & Erledigt
            </button>
            
            <div className={`flex flex-col gap-2 border-t border-gray-200 pt-3 ${(rem.model === 'subscription' || rem.diffDays <= 0) ? 'opacity-30 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between text-xs text-gray-600 font-medium px-1">
                <span>Warten:</span>
                <div className="flex items-center">
                  <input 
                    type="number" 
                    min="1" 
                    className="w-12 p-1 border border-gray-300 rounded text-center text-xs font-bold"
                    value={snoozeValue}
                    onChange={(e) => onSnoozeChange(Number(e.target.value))}
                  />
                  <span className="ml-1.5 flex items-center"><RefreshCw className="w-3 h-3 mr-1" />Tage</span>
                </div>
              </div>
              <button
                onClick={onSnooze}
                className="flex items-center justify-center w-full px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-bold text-xs shadow-sm"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Erneut erinnern
              </button>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <button
                onClick={onDismiss}
                className="flex items-center justify-center w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Verwerfen
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-2">
            <div className="bg-blue-100 text-blue-700 p-2 rounded-full mb-2">
              <Info className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight flex items-center justify-center">
              <AlertCircle className="w-3 h-3 mr-1" /> Nur Information
            </p>
            <p className="text-[9px] text-gray-400 mt-1 italic">Du erhältst diese Nachricht demnächst via WhatsApp.</p>
          </div>
        )}
      </div>
    </div>
  );
};
// --- END OF FILE ---

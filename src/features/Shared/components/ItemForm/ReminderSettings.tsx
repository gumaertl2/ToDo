// 2026-05-12 13:40 - REFACTOR: Extraktion der WhatsApp-Reminder-Logik aus ItemFormModal.
// 2026-05-12 16:15 - FEATURE: Reminder-Sektion für alle Typen außer VORLAGE verfügbar gemacht.
// src/features/Shared/components/ItemForm/ReminderSettings.tsx
import React from 'react';
import { useClubStore } from '../../../../store/useClubStore';
import { MessageCircle } from 'lucide-react';

interface ReminderSettingsProps {
  reminderSenderUserId: string;
  setReminderSenderUserId: (id: string) => void;
  reminderLeadDays: string;
  setReminderLeadDays: (days: string) => void;
  assigneeUserIds: string[];
  isReadOnly: boolean;
  type: string;
}

export const ReminderSettings: React.FC<ReminderSettingsProps> = ({
  reminderSenderUserId,
  setReminderSenderUserId,
  reminderLeadDays,
  setReminderLeadDays,
  assigneeUserIds,
  isReadOnly,
  type
}) => {
  const { users, user } = useClubStore();

  // Reminder für alle Typen, explizit AUSSER VORLAGE (laut Anforderung)
  if (type === 'VORLAGE') return null;

  return (
    <div className="rounded-lg p-2.5 border bg-green-50/60 border-green-200">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <label className={`flex items-center cursor-pointer ${isReadOnly ? 'opacity-80' : ''}`}>
          <input 
            type="checkbox" 
            checked={!!reminderSenderUserId} 
            onChange={e => {
              if (e.target.checked) {
                // Default: Erster Zuweisungs-Nutzer oder aktuell eingeloggter Nutzer oder 'auto'
                setReminderSenderUserId(assigneeUserIds[0] || user?.id || 'auto');
              } else {
                setReminderSenderUserId('');
              }
            }} 
            disabled={isReadOnly} 
            className="w-4 h-4 mr-2 text-green-600 focus:ring-green-500 rounded" 
          />
          <span className="text-[13px] font-bold text-green-900 flex items-center whitespace-nowrap">
            <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp Reminder
          </span>
        </label>
        
        {!!reminderSenderUserId && (
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <select 
              value={reminderSenderUserId} 
              onChange={(e) => setReminderSenderUserId(e.target.value)}
              disabled={isReadOnly}
              className="flex-1 min-w-[150px] p-1.5 border border-green-300 rounded text-xs bg-white focus:border-green-500 focus:ring-green-500 font-medium"
            >
              <option value="auto">Auto (Erster App-Nutzer)</option>
              {assigneeUserIds.map(uId => {
                const usr = users.find(x => x.id === uId);
                return usr ? <option key={uId} value={uId}>{usr.name}</option> : null;
              })}
              {(!assigneeUserIds.length && user) && <option value={user.id}>{user.name}</option>}
            </select>
            <span className="text-[11px] font-bold text-green-800">in</span>
            <input 
              type="number" 
              min="1" max="365"
              value={reminderLeadDays} 
              onChange={(e) => setReminderLeadDays(e.target.value)}
              disabled={isReadOnly}
              className="w-14 p-1.5 border border-green-300 rounded text-center text-xs bg-white focus:border-green-500 font-bold"
            />
            <span className="text-[11px] font-bold text-green-800">Tagen davor</span>
          </div>
        )}
      </div>
    </div>
  );
};
// --- END OF FILE ---
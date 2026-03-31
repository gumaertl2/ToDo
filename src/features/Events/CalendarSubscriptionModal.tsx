// src/features/Events/CalendarSubscriptionModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { CalendarSubscription } from '../../core/types/models';
import { X, Save, AlertCircle, Trash2, Link as LinkIcon, Edit2, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const CalendarSubscriptionModal: React.FC<Props> = ({ onClose }) => {
  const { calendarSubscriptions, addCalendarSubscription, updateCalendarSubscription, deleteCalendarSubscription, syncSubscription } = useClubStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [color, setColor] = useState('#10b981');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim() || !url.trim()) {
      setError('Name und URL dürfen nicht leer sein.');
      return;
    }
    
    if (!url.startsWith('http') && !url.startsWith('webcal')) {
      setError('Die URL muss mit http://, https:// oder webcal:// beginnen.');
      return;
    }
    
    setIsSaving(true);
    setError(null);

    let targetSubId: string;

    if (editingId) {
      const existingSub = calendarSubscriptions.find(s => s.id === editingId);
      if (!existingSub) return;
      
      const updatedSub: CalendarSubscription = {
        ...existingSub,
        name: name.trim(),
        url: url.trim(),
        color,
      };

      const result = await updateCalendarSubscription(updatedSub);
      if (result.success) {
        targetSubId = updatedSub.id;
        cancelEdit();
      } else {
        setError(result.error?.message || 'Fehler beim Aktualisieren.');
        setIsSaving(false);
        return;
      }
    } else {
      const newSub: CalendarSubscription = {
        id: `sub-${Date.now()}`,
        schemaVersion: '1.0',
        name: name.trim(),
        url: url.trim(),
        color,
        isActive: true,
      };

      const result = await addCalendarSubscription(newSub);
      if (result.success) {
        targetSubId = newSub.id;
        cancelEdit();
      } else {
        setError(result.error?.message || 'Fehler beim Speichern.');
        setIsSaving(false);
        return;
      }
    }
    
    handleSync(targetSubId);
    setIsSaving(false);
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    const result = await syncSubscription(id);
    if (!result.success) setError(`Sync-Fehler: ${result.error?.message}`);
    setSyncingId(null);
  };

  // CHIRURGISCHER EINGRIFF: Logik für das Verschieben
  const moveSubscription = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= calendarSubscriptions.length) return;

    const items = [...calendarSubscriptions];
    const [movedItem] = items.splice(index, 1);
    items.splice(newIndex, 0, movedItem);

    // sortOrder für alle betroffenen Items neu setzen und speichern
    for (let i = 0; i < items.length; i++) {
      if (items[i].sortOrder !== i) {
        await updateCalendarSubscription({ ...items[i], sortOrder: i });
      }
    }
  };

  const handleEdit = (sub: CalendarSubscription) => {
    setEditingId(sub.id);
    setName(sub.name);
    setUrl(sub.url);
    setColor(sub.color || '#10b981');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setUrl('');
    setColor('#10b981');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Abo wirklich löschen?')) {
      await deleteCalendarSubscription(id);
    }
  };

  const formatSyncDate = (timestamp?: number) => {
    if (!timestamp) return 'Noch nie synchronisiert';
    const d = new Date(timestamp);
    return `Zuletzt: ${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'})}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <LinkIcon className="w-5 h-5 mr-2 text-green-600" />
            ICS Kalender-Abos
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
          {error && (
             <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center mb-4 border border-red-100 text-sm">
               <AlertCircle className="w-5 h-5 mr-2 shrink-0" /> {error}
             </div>
          )}

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6 text-sm">
            <h3 className="font-bold text-gray-700 mb-3">{editingId ? 'Abo bearbeiten' : 'Neues Abo hinzufügen'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-green-500" />
              </div>
              <div className="md:col-span-5">
                <label className="block text-xs font-medium text-gray-600 mb-1">ICS URL</label>
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-green-500" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Farbe</label>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-9 p-0.5 border border-gray-300 rounded cursor-pointer" />
              </div>
              <div className="md:col-span-2">
                <button onClick={handleSave} disabled={isSaving} className="w-full flex justify-center items-center px-3 py-2 bg-green-600 text-white rounded font-medium">
                  <Save className="w-4 h-4 mr-1" /> {editingId ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          </div>

          <h3 className="text-sm font-bold text-gray-700 mb-3">Aktive Abos ({calendarSubscriptions.length})</h3>
          <div className="space-y-2">
            {calendarSubscriptions.map((sub, index) => (
              <div key={sub.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center flex-1 overflow-hidden">
                  {/* CHIRURGISCHER EINGRIFF: Sortier-Buttons */}
                  <div className="flex flex-col mr-3 bg-gray-50 rounded border border-gray-100">
                    <button onClick={() => moveSubscription(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30"><ChevronUp className="w-4 h-4"/></button>
                    <button onClick={() => moveSubscription(index, 'down')} disabled={index === calendarSubscriptions.length - 1} className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30"><ChevronDown className="w-4 h-4"/></button>
                  </div>
                  <div className="w-4 h-4 rounded-full mr-3 shrink-0" style={{ backgroundColor: sub.color }}></div>
                  <div className="truncate">
                    <div className="font-medium text-gray-900 text-sm">{sub.name}</div>
                    <div className="text-xs text-gray-500 italic truncate">{formatSyncDate(sub.lastSyncedAt)}</div>
                  </div>
                </div>
                <div className="flex items-center shrink-0 ml-2">
                  <button onClick={() => handleSync(sub.id)} disabled={!!syncingId} className={`p-2 transition-colors ${syncingId === sub.id ? 'text-green-500' : 'text-gray-400 hover:text-green-600'}`}>
                    <RefreshCw className={`w-4 h-4 ${syncingId === sub.id ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={() => handleEdit(sub)} className="text-blue-400 hover:text-blue-600 p-2 mx-1"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(sub.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
// Zeilenzahl: 230
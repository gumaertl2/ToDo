// src/features/Templates/TemplatesView.tsx
import React, { useEffect, useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Plus } from 'lucide-react';
import { ItemFormModal } from '../Shared/ItemFormModal';
import { AgendaItemRow } from '../Shared/AgendaItemRow';
import type { AgendaItem } from '../../core/types/models';

export const TemplatesView: React.FC = () => {
  const { templates, fetchTemplatesAndRoutines, deleteAgendaItem, isTemplatesLoading, saveAgendaItem } = useClubStore();
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTemplatesAndRoutines();
  }, [fetchTemplatesAndRoutines]);

  const handleCreateTemplate = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Möchtest du die Vorlage "${title}" wirklich löschen?`)) {
      await deleteAgendaItem(id);
    }
  };

  const toggleAllExpanded = () => {
    const itemsWithDesc = templates.filter(i => !!i.description);
    if (expandedIds.size === itemsWithDesc.length && itemsWithDesc.length > 0) setExpandedIds(new Set());
    else setExpandedIds(new Set(itemsWithDesc.map(i => i.id)));
  };

  const toggleItemExpanded = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedIds(next);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Alle Vorlagen & Bausteine</h1>
        <div className="flex items-center gap-3">
          <button onClick={toggleAllExpanded} className="flex items-center justify-center w-10 h-10 bg-white text-gray-700 border border-gray-300 font-mono font-bold text-lg rounded-lg hover:bg-gray-50 shadow-sm transition-colors" title="Alle Details ein-/ausblenden">
            +/-
          </button>
          <button onClick={handleCreateTemplate} className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition">
            <Plus className="w-5 h-5 mr-2" />
            Neue Vorlage anlegen
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl shadow-inner border border-gray-200 flex-1 overflow-hidden flex flex-col p-4">
        {isTemplatesLoading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Lade Daten...</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {templates.length === 0 && <div className="p-8 text-center text-gray-500">Noch keine Vorlagen vorhanden.</div>}
            
            {templates.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-sm">
                {templates.map((t, index) => (
                  <AgendaItemRow 
                    key={t.id} 
                    item={t} 
                    index={index}
                    totalItems={templates.length}
                    isExpanded={expandedIds.has(t.id)}
                    onToggleExpand={toggleItemExpanded}
                    onEdit={(item) => { setEditingItem(item); setIsItemModalOpen(true); }} 
                    onDelete={handleDelete} 
                    onSaveInline={async (updatedItem) => {
                      await saveAgendaItem(updatedItem);
                      fetchTemplatesAndRoutines();
                    }}
                    isTemplateMode={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ItemFormModal 
        key={editingItem ? editingItem.id : 'new'}
        isOpen={isItemModalOpen} 
        existingItem={editingItem || { type: 'VORLAGE' }}
        isFixedType={true}
        onClose={() => setIsItemModalOpen(false)} 
        onSave={async (data) => { 
          const result = await saveAgendaItem(data);
          if (!result || (result && !result.success)) {
            throw new Error(result?.error?.message || "Fehler beim Speichern in Firebase.");
          }
          await fetchTemplatesAndRoutines(); 
          setIsItemModalOpen(false); 
        }} 
      />
    </div>
  );
};
// Exakte Zeilenzahl: 104
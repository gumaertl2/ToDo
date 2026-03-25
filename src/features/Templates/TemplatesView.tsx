// src/features/Templates/TemplatesView.tsx
import React, { useEffect, useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Plus } from 'lucide-react';
import { ItemFormModal } from '../Shared/ItemFormModal';
import { ItemCard } from '../Shared/ItemCard';
import type { AgendaItem } from '../../core/types/models';

export const TemplatesView: React.FC = () => {
  const { templates, fetchTemplatesAndRoutines, deleteAgendaItem, isTemplatesLoading, saveAgendaItem } = useClubStore();
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);

  useEffect(() => {
    fetchTemplatesAndRoutines();
  }, [fetchTemplatesAndRoutines]);

  const handleCreateTemplate = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleEditTemplate = (item: AgendaItem) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    const isConfirmed = window.confirm(`Möchtest du die Vorlage "${title}" wirklich löschen?`);
    if (isConfirmed) {
      await deleteAgendaItem(id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Alle Vorlagen & Bausteine</h1>
        <button
          onClick={handleCreateTemplate}
          className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Neue Vorlage anlegen
        </button>
      </div>

      <div className="bg-gray-50 rounded-xl shadow-inner border border-gray-200 flex-1 overflow-hidden flex flex-col p-4">
        {isTemplatesLoading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Lade Daten...</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {templates.length === 0 && <div className="p-8 text-center text-gray-500">Noch keine Vorlagen vorhanden.</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <ItemCard 
                  key={t.id} 
                  item={t} 
                  onEdit={handleEditTemplate} 
                  onDelete={handleDelete} 
                  className="!mb-0 h-full flex flex-col"
                />
              ))}
            </div>
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
// Exakte Zeilenzahl: 84
// src/features/Events/EventTemplateSidebar.tsx
import React from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Plus } from 'lucide-react';
import { ItemCard } from '../Shared/ItemCard';

interface EventTemplateSidebarProps {
  eventId: string;
}

export const EventTemplateSidebar: React.FC<EventTemplateSidebarProps> = ({ eventId }) => {
  const { templates, importTemplateToEvent } = useClubStore();

  return (
    <div className="w-full md:w-1/3 bg-gray-50 rounded-xl shadow-inner border border-gray-200 flex flex-col overflow-hidden transition-all print:!hidden print:!absolute print:!w-0 print:!h-0 print:!overflow-hidden print:!m-0 print:!p-0 print:!border-0">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-800">Vorlagen-Bibliothek</h2>
      </div>
      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {templates.map(t => (
          <div key={t.id} className="relative group">
            <ItemCard item={t} className="!mb-0 pr-12 border-blue-100 hover:border-blue-300" />
            <button 
              onClick={() => importTemplateToEvent(t, eventId)} 
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-sm transition-transform active:scale-95"
              title="Zur Agenda hinzufügen"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
// Exakte Zeilenzahl: 31
// 2026-04-22 19:15 - FEATURE: Volltextsuche für Vorlagen inkl. Match-Highlighting
// 2026-04-24 14:00 - UX-FIX: Vorlagen-Bibliothek gruppiert Vorlagen und importiert Paket (Eltern inkl. Kinder)
// src/features/Events/EventTemplateSidebar.tsx
import React, { useState, useMemo } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Plus, Search, X } from 'lucide-react';
import { ItemCard } from '../Shared/ItemCard';

interface EventTemplateSidebarProps {
  eventId: string;
}

export const EventTemplateSidebar: React.FC<EventTemplateSidebarProps> = ({ eventId }) => {
  const { templates, importTemplateToEvent } = useClubStore();
  const [searchTerm, setSearchTerm] = useState('');

  // CHIRURGISCHER EINGRIFF: Filter-Logik zeigt nur Hauptvorlagen an, sucht aber auch in Kindern
  const filteredTemplates = useMemo(() => {
    const parents = templates.filter(t => !t.isSubItem);
    
    if (!searchTerm.trim()) return parents;
    
    const term = searchTerm.toLowerCase();
    
    return parents.filter(p => {
      // Treffer im Oberpunkt?
      if (p.title.toLowerCase().includes(term) || (p.description && p.description.toLowerCase().includes(term))) {
        return true;
      }
      // Treffer in einem der Unterpunkte?
      const children = templates.filter(c => c.isSubItem && c.parentItemId === p.id);
      return children.some(c => c.title.toLowerCase().includes(term) || (c.description && c.description.toLowerCase().includes(term)));
    });
  }, [templates, searchTerm]);

  const renderMatchSnippet = (text?: string) => {
    if (!text || !searchTerm.trim()) return null;
    const term = searchTerm.toLowerCase();
    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(term);
    
    if (index === -1) return null;

    const start = Math.max(0, index - 40);
    const end = Math.min(text.length, index + term.length + 40);
    let snippet = text.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    const safeTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeTerm})`, 'gi');
    const parts = snippet.split(regex);

    return (
      <div className="p-2 bg-yellow-50 border border-yellow-200 border-t-0 rounded-b-lg text-xs text-gray-700 shadow-sm relative z-0">
        <span className="font-bold text-yellow-800 uppercase text-[9px] block mb-0.5">Treffer in Beschreibung:</span>
        <div className="italic break-words">
          {parts.map((part, i) => 
            regex.test(part) ? <mark key={i} className="bg-yellow-300 font-bold px-0.5 rounded">{part}</mark> : part
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full md:w-1/3 bg-gray-50 rounded-xl shadow-inner border border-gray-200 flex flex-col overflow-hidden transition-all print:!hidden print:!absolute print:!w-0 print:!h-0 print:!overflow-hidden print:!m-0 print:!p-0 print:!border-0">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-800 mb-3">Vorlagen-Bibliothek</h2>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Vorlagen durchsuchen..."
            className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {filteredTemplates.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            Keine Vorlagen gefunden.
          </div>
        ) : (
          filteredTemplates.map(t => {
            const childrenCount = templates.filter(c => c.isSubItem && c.parentItemId === t.id).length;
            const isTitleMatch = searchTerm.trim() !== '' && t.title.toLowerCase().includes(searchTerm.toLowerCase());
            const hasDescriptionMatch = searchTerm.trim() !== '' && t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            // Wenn Kind matcht, Elternteil leicht hervorheben
            const children = templates.filter(c => c.isSubItem && c.parentItemId === t.id);
            const hasChildMatch = searchTerm.trim() !== '' && children.some(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()) || (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase())));
            
            const isHighlighted = isTitleMatch || hasChildMatch;

            return (
              <div key={t.id} className="relative group flex flex-col">
                <div className={`relative transition-all ${isHighlighted ? 'ring-2 ring-yellow-400 rounded-lg shadow-md' : ''} ${hasDescriptionMatch && !isHighlighted ? 'rounded-b-none' : ''}`}>
                  <ItemCard 
                    item={t} 
                    className={`!mb-0 pr-12 border-blue-100 hover:border-blue-300 ${hasDescriptionMatch ? 'rounded-b-none border-b-0' : ''}`} 
                  />
                  {/* CHIRURGISCHER EINGRIFF: Indikator für Unterpunkte */}
                  {childrenCount > 0 && (
                    <span className="absolute bottom-2 right-14 text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200">
                      +{childrenCount} Unterpunkte
                    </span>
                  )}
                  <button 
                    onClick={() => importTemplateToEvent(t, eventId)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-sm transition-transform active:scale-95 z-10"
                    title={childrenCount > 0 ? "Vorlage inkl. Unterpunkte zur Agenda hinzufügen" : "Zur Agenda hinzufügen"}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                
                {hasDescriptionMatch && renderMatchSnippet(t.description)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
// --- END OF FILE ---
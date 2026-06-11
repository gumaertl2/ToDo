// 2026-05-12 16:45 - RESTORE: Ursprüngliche ItemMetadata.tsx wiederhergestellt (Layout-Beruhigung).
// src/features/Shared/components/AgendaItem/ItemMetadata.tsx
import React from 'react';
import { Clock } from 'lucide-react';
import type { AgendaItem } from '../../../../core/types/models';

interface ItemMetadataProps {
  item: AgendaItem;
  isTemplateMode: boolean;
  historyCount: number;
  onOpenHistory?: (item: AgendaItem) => void;
}

export const ItemMetadata: React.FC<ItemMetadataProps> = ({ item, isTemplateMode, historyCount, onOpenHistory }) => {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5 truncate pl-1 flex-wrap print:!pl-0 print:!gap-1"> 
      {isTemplateMode && item.durationEstimate ? (
        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 font-bold rounded print:!border print:!border-gray-300 print:!bg-transparent print:!text-gray-800">
          {item.durationEstimate} Min.
        </span>
      ) : null} 

      {item.type === 'BESCHLUSS' && (
        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 font-bold rounded print:!border print:!border-gray-300 print:!bg-transparent print:!text-gray-800">
          Beschluss
        </span>
      )} 
      
      {item.baseItemId && item.type === 'AUFGABE' && ( 
        <span 
          onClick={(e) => { e.stopPropagation(); onOpenHistory && onOpenHistory(item); }} 
          className="flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold rounded cursor-pointer hover:bg-blue-200 transition-colors print:!border print:!border-gray-300 print:!bg-transparent print:!text-gray-800" 
          title="Historie anzeigen"
        > 
          <Clock className="w-3 h-3 mr-1 shrink-0 print:!hidden" /> Historie {historyCount > 0 ? `(${historyCount})` : ''} 
        </span> 
      )} 
    </div>
  );
};
// --- END OF FILE ---
// 2026-05-12 15:20 - REFACTOR: Extraktion der Highlighting-Logik (Fuse.js) in Utilities.
// src/features/Shared/utils/textUtils.tsx
import React from 'react';
import Fuse from 'fuse.js';

/**
 * Hebt Suchbegriffe in einem Text hervor. 
 * Nutzt Fuse.js für fuzzy matching und einen Regex-Fallback für exakte Treffer.
 */
export const highlightText = (text: string, query?: string): React.ReactNode => {
  if (!query || !text) return text;

  const fuse = new Fuse([{ text }], {
    keys: ['text'],
    includeMatches: true,
    threshold: 0.3,
    ignoreLocation: true
  });

  const result = fuse.search(query);
  
  if (result.length === 0 || !result[0].matches || result[0].matches.length === 0) {
     const parts = text.split(new RegExp(`(${query})`, 'gi'));
     if (parts.length > 1) {
        return (
          <>
            {parts.map((part, i) =>
              part.toLowerCase() === query.toLowerCase()
                ? <mark key={i} className="bg-yellow-200 text-gray-900 rounded-sm px-0.5">{part}</mark>
                : part
            )}
          </>
        );
     }
     return text;
  }

  const indices = result[0].matches[0].indices;
  let lastIndex = 0;
  const elements: React.ReactNode[] = [];

  indices.forEach(([start, end], i) => {
    if (start > lastIndex) {
      elements.push(<span key={`text-${i}`}>{text.substring(lastIndex, start)}</span>);
    }
    elements.push(<mark key={`mark-${i}`} className="bg-yellow-200 text-gray-900 rounded-sm px-0.5">{text.substring(start, end + 1)}</mark>);
    lastIndex = end + 1;
  });

  if (lastIndex < text.length) {
    elements.push(<span key={`text-end`}>{text.substring(lastIndex)}</span>);
  }

  return <>{elements}</>;
};
// --- END OF FILE ---
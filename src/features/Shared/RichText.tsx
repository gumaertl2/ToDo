// [2026-06-01] - UX-FEATURE: Highlighting für Fundstellen (Volltextsuche) nahtlos in den originalen Renderer integriert, ohne die Formatierungs- oder Indentation-Logik zu beeinträchtigen.
// [2026-05-29] - BUGFIX: Whitespace/Indentation in Print. 'whitespace-pre-wrap' ergänzt und Einrückungs-Level bei Listenpunkten berechnet, damit Formatierungen im Ausdruck nicht verloren gehen.
// 2026-04-17 11:15 - FIX: Toolbar Focus-Klau behoben & Auto-Save stabilisiert
// 2026-04-22 17:00 - FEATURE: Smart-List Verhalten bei Enter-Taste in Textarea
// 2026-04-22 19:00 - FIX: Original Renderer wiederhergestellt, Button-Newline-Bug behoben
// 2026-04-23 18:00 - UX-FEATURE: Auto-Resize für die Textarea eingebaut (passt sich dem Inhalt an)
// 2026-05-09 11:30 - UX-FIX: Cursor springt bei autoFocus in der Textarea nun immer ans Ende des Textes
// src/features/Shared/RichText.tsx
import React, { useRef, useEffect } from 'react';
import { Bold, Italic, List } from 'lucide-react';

interface EditorProps {
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const RichTextEditor: React.FC<EditorProps> = ({ value, onChange, onBlur, placeholder, disabled, autoFocus }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-Resize Logik
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto'; // Zuerst zurücksetzen
      el.style.height = `${el.scrollHeight}px`; // Dann an den Inhalt anpassen
    }
  };

  // Wird bei jedem Rendern/Inhaltswechsel aufgerufen
  useEffect(() => {
    adjustHeight();
  }, [value]);

  // CHIRURGISCHER EINGRIFF: Cursor beim Mount ans Ende setzen, wenn autoFocus an ist
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      const el = textareaRef.current;
      const length = el.value.length;
      el.focus();
      // Setzt den Cursor exakt hinter das letzte Zeichen
      el.setSelectionRange(length, length);
    }
    // Dieser Effect soll absichtlich NUR einmal beim Mounten laufen, nicht bei jeder value-Änderung!
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current || disabled) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = textareaRef.current.value;
    
    let actualPrefix = prefix;
    if (prefix === '\n- ') {
      if (start === 0 || text.substring(start - 1, start) === '\n') {
        actualPrefix = '- ';
      }
    }

    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    const newText = before + actualPrefix + selected + suffix + after;
    onChange(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + actualPrefix.length, end + actualPrefix.length);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (!textareaRef.current || disabled) return;
      
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const text = textareaRef.current.value;
      
      const lastNewlineIndex = text.lastIndexOf('\n', start - 1);
      const currentLineStart = lastNewlineIndex !== -1 ? lastNewlineIndex + 1 : 0;
      const currentLine = text.substring(currentLineStart, start);

      if (currentLine.trimStart().startsWith('- ')) {
        e.preventDefault(); 
        
        const match = currentLine.match(/^(\s*)- /);
        const prefix = match ? match[0] : '- ';

        if (currentLine === prefix) {
          const before = text.substring(0, currentLineStart);
          const after = text.substring(end);
          onChange(before + '\n' + after);
          
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(currentLineStart + 1, currentLineStart + 1);
            }
          }, 10);
        } else {
          const before = text.substring(0, start);
          const after = text.substring(end);
          const newText = before + '\n' + prefix + after;
          onChange(newText);
          
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              const newPos = start + 1 + prefix.length;
              textareaRef.current.setSelectionRange(newPos, newPos);
            }
          }, 10);
        }
      }
    }
  };

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden flex flex-col bg-white focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 ${disabled ? 'bg-gray-50 opacity-80' : ''}`}>
      
      <div 
        className="bg-gray-50 border-b border-gray-200 p-1 flex items-center gap-1"
        onMouseDown={(e) => e.preventDefault()}
      >
        <button
          type="button"
          onClick={() => insertFormatting('**', '**')}
          disabled={disabled}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
          title="Fett (Markierten Text)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => insertFormatting('_', '_')}
          disabled={disabled}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
          title="Kursiv (Markierten Text)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => insertFormatting('\n- ', '')}
          disabled={disabled}
          className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
          title="Spiegelstrich / Liste"
        >
          <List className="w-4 h-4" />
        </button>
      </div>
      
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (onBlur) onBlur();
        }}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="w-full p-2 outline-none text-sm bg-transparent resize-none overflow-hidden"
      />
    </div>
  );
};

interface RendererProps {
  text: string;
  className?: string;
  searchQuery?: string; // CHIRURGISCHER EINGRIFF: Suchbegriff für Highlighting hinzugefügt
}

export const RichTextRenderer: React.FC<RendererProps> = ({ text, className = '', searchQuery }) => {
  if (!text) return null;

  // CHIRURGISCHER EINGRIFF: Interne Hilfsfunktion für das gelbe Markieren von Textabschnitten
  const applyHighlight = (content: string) => {
    if (!searchQuery || !searchQuery.trim()) return content as any;
    
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = content.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-200 text-gray-900 rounded-sm px-0.5 font-bold">{part}</mark> : part
    );
  };

  const renderLine = (line: string, index: number) => {
    let isListItem = false;
    let processedLine = line;
    let indentSpaces = 0; 

    const match = line.match(/^(\s*)-\s+/);
    if (match) {
      isListItem = true;
      indentSpaces = match[1].length; 
      processedLine = line.substring(match[0].length); 
    }

    const parts = processedLine.split(/(\*\*.*?\*\*)/g);
    const formattedLine = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        const inner = part.substring(2, part.length - 2);
        const italicParts = inner.split(/(_.*?_)/g);
        return (
          <strong key={i}>
            {italicParts.map((ip, j) => {
              if (ip.startsWith('_') && ip.endsWith('_') && ip.length > 2) {
                // CHIRURGISCHER EINGRIFF: Highlighting auf Text angewendet
                return <em key={j}>{applyHighlight(ip.substring(1, ip.length - 1))}</em>;
              }
              return applyHighlight(ip);
            })}
          </strong>
        );
      }
      const italicParts = part.split(/(_.*?_)/g);
      return italicParts.map((ip, j) => {
        if (ip.startsWith('_') && ip.endsWith('_') && ip.length > 2) {
          // CHIRURGISCHER EINGRIFF: Highlighting auf Text angewendet
          return <em key={`${i}-${j}`}>{ip.substring(1, ip.length - 1)}</em>;
        }
        return applyHighlight(ip);
      });
    });

    if (isListItem) {
      return (
        <li key={index} style={{ marginLeft: `${1 + (indentSpaces * 0.5)}rem` }} className="list-disc pl-1 marker:text-gray-400 whitespace-pre-wrap">
          {formattedLine}
        </li>
      );
    }

    return (
      <div key={index} className="min-h-[1.25rem] whitespace-pre-wrap">
        {formattedLine}
      </div>
    );
  };

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    if (line.match(/^(\s*)-\s+/)) {
      currentList.push(renderLine(line, index));
    } else {
      if (currentList.length > 0) {
        elements.push(<ul key={`ul-${index}`} className="my-1">{currentList}</ul>);
        currentList = [];
      }
      elements.push(renderLine(line, index));
    }
  });

  if (currentList.length > 0) {
    elements.push(<ul key={`ul-end`} className="my-1">{currentList}</ul>);
  }

  return <div className={`text-sm space-y-0.5 ${className}`}>{elements}</div>;
};
// --- END OF FILE ---
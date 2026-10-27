// [2026-10-27] - MOBILE-UX: Button "↳ Als Unterpunkt" in der Notiz-Werkzeugleiste auf dem Smartphone ausgeblendet (hidden md:inline-flex), damit er nur ab iPad/Desktop erscheint.
// [2026-10-26] - UX-FEATURE: Button "↳ Als Unterpunkt" in der Notiz-Werkzeugleiste ergänzt (ruft extractSelectionOrBlockFromEditor aus noteExtractorUtils.ts auf).
// [2026-10-25] - UX-UPGRADE: Ruhige, ablenkungsfreie WYSIWYG-Werkzeugleiste (Fett, Kursiv, Unterstrichen | Aufzählungspunkte, Nummerierte Liste | Notiztext leeren & Undo) ohne bunte Farbpunkte; sauberer hängender Einzug für Punkte und Nummerierungen.
// [2026-10-25] - UX-FEATURE: 1-Klick "Notiztext leeren"-Button mit direkter "Text wiederherstellen (Undo)"-Funktion (bis zum Verlassen des Feldes via onBlur) in der Notiz-Werkzeugleiste ergänzt.
// [2026-06-01] - UX-FEATURE: Highlighting für Fundstellen (Volltextsuche) nahtlos in den originalen Renderer integriert, ohne die Formatierungs- oder Indentation-Logik zu beeinträchtigen.
// [2026-05-29] - BUGFIX: Whitespace/Indentation in Print. 'whitespace-pre-wrap' ergänzt und Einrückungs-Level bei Listenpunkten berechnet, damit Formatierungen im Ausdruck nicht verloren gehen.
// src/features/Shared/RichText.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Eraser, RotateCcw, CornerDownRight } from 'lucide-react';
import { extractSelectionOrBlockFromEditor } from './noteExtractorUtils';

interface EditorProps {
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  searchQuery?: string;
  onExtractSubItem?: (extractedText: string, remainingMarkdown: string) => void;
}

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const formatInlineMarkdownToHtml = (line: string): string => {
  // Entferne evtl. alte Farb-Tags rückstandslos, falls vorhanden
  let cleanLine = line.replace(/\[color:(?:red|blue|green|amber)\]([\s\S]*?)\[\/color\]/g, '$1');
  let html = escapeHtml(cleanLine);

  // Fett: **...**
  html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');

  // Unterstrichen: ++...++
  html = html.replace(/\+\+([\s\S]+?)\+\+/g, '<u>$1</u>');

  // Kursiv: _..._
  html = html.replace(/_([^_\n]+?)_/g, '<em>$1</em>');

  return html;
};

const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  const lines = markdown.split('\n');
  const htmlParts: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ulMatch = line.match(/^(\s*)-\s+(.*)$/);
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);

    if (ulMatch) {
      if (listType !== 'ul') {
        if (listType) htmlParts.push(`</${listType}>`);
        htmlParts.push('<ul>');
        listType = 'ul';
      }
      const content = formatInlineMarkdownToHtml(ulMatch[2]);
      htmlParts.push(`<li>${content || '<br>'}</li>`);
    } else if (olMatch) {
      if (listType !== 'ol') {
        if (listType) htmlParts.push(`</${listType}>`);
        htmlParts.push('<ol>');
        listType = 'ol';
      }
      const content = formatInlineMarkdownToHtml(olMatch[2]);
      htmlParts.push(`<li>${content || '<br>'}</li>`);
    } else {
      if (listType) {
        htmlParts.push(`</${listType}>`);
        listType = null;
      }
      const content = formatInlineMarkdownToHtml(line);
      htmlParts.push(`<div>${content || '<br>'}</div>`);
    }
  }

  if (listType) {
    htmlParts.push(`</${listType}>`);
  }

  return htmlParts.join('');
};

const serializeInlineNodes = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || '').replace(/\u00A0/g, ' ');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === 'br') {
    return '';
  }

  let inner = '';
  el.childNodes.forEach(child => {
    inner += serializeInlineNodes(child);
  });

  if (!inner) return '';

  const textDecoration = el.style?.textDecoration || el.style?.textDecorationLine || '';
  if (tag === 'u' || textDecoration.includes('underline')) {
    inner = `++${inner}++`;
  }

  const fontWeight = el.style?.fontWeight;
  if (tag === 'strong' || tag === 'b' || fontWeight === 'bold' || Number(fontWeight) >= 600) {
    inner = `**${inner}**`;
  }

  if (tag === 'em' || tag === 'i' || el.style?.fontStyle === 'italic') {
    inner = `_${inner}_`;
  }

  return inner;
};

const htmlToMarkdown = (root: HTMLElement): string => {
  const lines: string[] = [];

  const processBlockNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const txt = (node.textContent || '').replace(/\u00A0/g, ' ');
      if (txt.trim().length > 0) {
        lines.push(txt);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'ul') {
      el.childNodes.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === 'li') {
          const liContent = serializeInlineNodes(child).trim();
          lines.push(`- ${liContent}`);
        } else {
          processBlockNode(child);
        }
      });
      return;
    }

    if (tag === 'ol') {
      let itemIndex = 1;
      el.childNodes.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === 'li') {
          const liContent = serializeInlineNodes(child).trim();
          lines.push(`${itemIndex}. ${liContent}`);
          itemIndex += 1;
        } else {
          processBlockNode(child);
        }
      });
      return;
    }

    if (tag === 'li') {
      const liContent = serializeInlineNodes(el).trim();
      lines.push(`- ${liContent}`);
      return;
    }

    if (tag === 'div' || tag === 'p') {
      const hasBlockChildren = Array.from(el.children).some(c =>
        ['ul', 'ol', 'div', 'p', 'li'].includes(c.tagName.toLowerCase())
      );
      if (hasBlockChildren) {
        el.childNodes.forEach(processBlockNode);
      } else {
        lines.push(serializeInlineNodes(el));
      }
      return;
    }

    const inlineText = serializeInlineNodes(el);
    if (inlineText) {
      if (lines.length === 0) {
        lines.push(inlineText);
      } else {
        lines[lines.length - 1] += inlineText;
      }
    }
  };

  root.childNodes.forEach(processBlockNode);

  return lines.join('\n').replace(/\n+$/, '');
};

export const RichTextEditor: React.FC<EditorProps> = ({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  autoFocus,
  onExtractSubItem
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef<boolean>(false);
  const lastSyncedValueRef = useRef<string>(value);
  const [undoBuffer, setUndoBuffer] = useState<string | null>(null);

  // Synchronisiere HTML nur dann von außen, wenn nicht aktiv im Feld getippt wird (verhindert Cursor-Sprünge)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    if (!isFocusedRef.current && value !== lastSyncedValueRef.current) {
      el.innerHTML = markdownToHtml(value);
      lastSyncedValueRef.current = value;
    }
  }, [value]);

  // Initiales Befüllen beim ersten Mounten
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(value);
      lastSyncedValueRef.current = value;

      if (autoFocus && !disabled) {
        editorRef.current.focus();
        const sel = window.getSelection();
        if (sel) {
          sel.selectAllChildren(editorRef.current);
          sel.collapseToEnd();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncFromDom = () => {
    if (!editorRef.current || disabled) return;
    const md = htmlToMarkdown(editorRef.current);
    lastSyncedValueRef.current = md;
    onChange(md);
  };

  const execEditorCommand = (command: string, arg?: string) => {
    if (disabled || !editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, arg);
    syncFromDom();
  };

  const handleExtractToSubItem = () => {
    if (disabled || !editorRef.current || !onExtractSubItem) return;
    const result = extractSelectionOrBlockFromEditor(editorRef.current, htmlToMarkdown);
    if (!result) {
      alert('Bitte markiere zuerst den gewünschten Textabschnitt im Notizfeld oder setze den Cursor in den Aufzählungspunkt, den du als Unterpunkt auslagern möchtest.');
      return;
    }
    onExtractSubItem(result.extractedText, result.remainingMarkdown);
  };

  const handleClearText = () => {
    if (disabled || !value) return;
    setUndoBuffer(value);
    lastSyncedValueRef.current = '';
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      editorRef.current.focus();
    }
    onChange('');
  };

  const handleUndoClear = () => {
    if (disabled || undoBuffer === null) return;
    const restored = undoBuffer;
    setUndoBuffer(null);
    lastSyncedValueRef.current = restored;
    if (editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(restored);
      editorRef.current.focus();
      const sel = window.getSelection();
      if (sel) {
        sel.selectAllChildren(editorRef.current);
        sel.collapseToEnd();
      }
    }
    onChange(restored);
  };

  const isEmpty = !value || value.trim().length === 0;

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden flex flex-col bg-white focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 ${disabled ? 'bg-gray-50 opacity-80' : ''}`}>
      
      <div 
        className="bg-gray-50 border-b border-gray-200 p-1 flex items-center justify-between gap-1 flex-wrap"
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-0.5 flex-wrap">
          <button
            type="button"
            onClick={() => execEditorCommand('bold')}
            disabled={disabled}
            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
            title="Fett (Markierten Text)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execEditorCommand('italic')}
            disabled={disabled}
            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
            title="Kursiv (Markierten Text)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execEditorCommand('underline')}
            disabled={disabled}
            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
            title="Unterstrichen (Markierten Text)"
          >
            <Underline className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => execEditorCommand('insertUnorderedList')}
            disabled={disabled}
            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
            title="Aufzählungspunkte (• Liste)"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => execEditorCommand('insertOrderedList')}
            disabled={disabled}
            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
            title="Nummerierte Liste (1. 2. 3.)"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          {!disabled && onExtractSubItem && !isEmpty && (
            <>
              <div className="hidden md:block w-px h-4 bg-gray-300 mx-1" />
              <button
                type="button"
                onClick={handleExtractToSubItem}
                className="hidden md:inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors shadow-xs"
                title="Markierten Text oder aktuellen Aufzählungspunkt in einen neuen Unterpunkt auslagern"
              >
                <CornerDownRight className="w-3.5 h-3.5" />
                <span>Als Unterpunkt</span>
              </button>
            </>
          )}
        </div>

        {!disabled && (
          <div className="flex items-center">
            {undoBuffer !== null ? (
              <button
                type="button"
                onClick={handleUndoClear}
                className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors shadow-xs"
                title="Gelöschten Notiztext sofort wiederherstellen"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Text wiederherstellen (Undo)</span>
              </button>
            ) : !isEmpty ? (
              <button
                type="button"
                onClick={handleClearText}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                title="Gesamten Beschreibungstext in diesem Feld leeren (ohne Papierkorb)"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Notiztext leeren</span>
              </button>
            ) : null}
          </div>
        )}
      </div>
      
      <div className="relative w-full">
        {isEmpty && placeholder && (
          <div className="pointer-events-none absolute left-2.5 top-2 text-sm text-gray-400 italic select-none">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={syncFromDom}
          onFocus={() => {
            isFocusedRef.current = true;
          }}
          onBlur={() => {
            syncFromDom();
            isFocusedRef.current = false;
            setUndoBuffer(null);
            if (onBlur) onBlur();
          }}
          className="w-full p-2.5 outline-none text-sm text-gray-900 min-h-[2.25rem] leading-relaxed [&_ul]:list-disc [&_ul]:list-outside [&_ul]:ml-5 [&_ul]:my-0.5 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:list-outside [&_ol]:ml-5 [&_ol]:my-0.5 [&_ol]:space-y-0.5 [&_li]:pl-1 [&_li]:marker:text-gray-400"
        />
      </div>
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

  const renderItalicAndHighlight = (segment: string, keyPrefix: string): React.ReactNode => {
    const italicParts = segment.split(/(_.*?_)/g);
    return italicParts.map((ip, j) => {
      if (ip.startsWith('_') && ip.endsWith('_') && ip.length > 2) {
        return <em key={`${keyPrefix}-i-${j}`}>{applyHighlight(ip.substring(1, ip.length - 1))}</em>;
      }
      return applyHighlight(ip);
    });
  };

  const renderUnderlineAndInner = (segment: string, keyPrefix: string): React.ReactNode => {
    const underlineParts = segment.split(/(\+\+.*?\+\+)/g);
    return underlineParts.map((up, k) => {
      if (up.startsWith('++') && up.endsWith('++') && up.length > 4) {
        return <u key={`${keyPrefix}-u-${k}`}>{renderItalicAndHighlight(up.substring(2, up.length - 2), `${keyPrefix}-u-${k}`)}</u>;
      }
      return renderItalicAndInner(up, `${keyPrefix}-nu-${k}`);
    });
  };

  const renderItalicAndInner = (segment: string, keyPrefix: string): React.ReactNode =>
    renderItalicAndHighlight(segment, keyPrefix);

  const renderInlineStyles = (segment: string, keyPrefix: string): React.ReactNode => {
    const cleanSegment = segment.replace(/\[color:(?:red|blue|green|amber)\]([\s\S]*?)\[\/color\]/g, '$1');
    const parts = cleanSegment.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        const inner = part.substring(2, part.length - 2);
        return (
          <strong key={`${keyPrefix}-b-${i}`}>
            {renderUnderlineAndInner(inner, `${keyPrefix}-b-${i}`)}
          </strong>
        );
      }
      return renderUnderlineAndInner(part, `${keyPrefix}-nb-${i}`);
    });
  };

  const renderLine = (line: string, index: number, listKind?: 'ul' | 'ol') => {
    let processedLine = line;
    let indentSpaces = 0; 

    if (listKind === 'ul') {
      const match = line.match(/^(\s*)-\s+/);
      if (match) {
        indentSpaces = match[1].length;
        processedLine = line.substring(match[0].length);
      }
    } else if (listKind === 'ol') {
      const match = line.match(/^(\s*)\d+\.\s+/);
      if (match) {
        indentSpaces = match[1].length;
        processedLine = line.substring(match[0].length);
      }
    }

    const formattedLine = renderInlineStyles(processedLine, `line-${index}`);

    if (listKind === 'ul') {
      return (
        <li
          key={index}
          style={{ marginLeft: `${1.25 + (indentSpaces * 0.5)}rem` }}
          className="list-disc list-outside pl-1 marker:text-gray-400 whitespace-pre-wrap leading-relaxed"
        >
          {formattedLine}
        </li>
      );
    }

    if (listKind === 'ol') {
      return (
        <li
          key={index}
          style={{ marginLeft: `${1.25 + (indentSpaces * 0.5)}rem` }}
          className="list-decimal list-outside pl-1 marker:text-gray-500 whitespace-pre-wrap leading-relaxed"
        >
          {formattedLine}
        </li>
      );
    }

    return (
      <div
        key={index}
        className="min-h-[1.35rem] whitespace-pre-wrap leading-relaxed"
      >
        {formattedLine}
      </div>
    );
  };

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let currentListKind: 'ul' | 'ol' | null = null;

  const flushList = (keySuffix: string | number) => {
    if (currentList.length === 0 || !currentListKind) return;
    if (currentListKind === 'ul') {
      elements.push(<ul key={`ul-${keySuffix}`} className="my-0.5 space-y-0.5">{currentList}</ul>);
    } else {
      elements.push(<ol key={`ol-${keySuffix}`} className="my-0.5 space-y-0.5">{currentList}</ol>);
    }
    currentList = [];
    currentListKind = null;
  };

  lines.forEach((line, index) => {
    if (line.match(/^(\s*)-\s+/)) {
      if (currentListKind !== 'ul') flushList(index);
      currentListKind = 'ul';
      currentList.push(renderLine(line, index, 'ul'));
    } else if (line.match(/^(\s*)\d+\.\s+/)) {
      if (currentListKind !== 'ol') flushList(index);
      currentListKind = 'ol';
      currentList.push(renderLine(line, index, 'ol'));
    } else {
      flushList(index);
      elements.push(renderLine(line, index));
    }
  });

  flushList('end');

  return <div className={`text-sm space-y-0.5 ${className}`}>{elements}</div>;
};
// --- END OF FILE ---
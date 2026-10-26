// [2026-10-26] - FEATURE: Eigene Hilfsdatei für das Auslagern von Notiz-Textabschnitten oder Aufzählungspunkten in eigenständige Unterpunkte (inkl. <=80/>80 Zeichen-Regel, Verantwortlichen- und Datumserkennung sowie verlustfreier Berechnung des verbleibenden Notiztexts).
// src/features/Shared/noteExtractorUtils.ts

import type { AgendaItem, Event, User } from '../../core/types/models';

export interface ExtractedNoteResult {
  extractedText: string;
  remainingMarkdown: string;
}

/**
 * Liest aus dem aktiven contentEditable-Editor entweder die aktuelle Text-Markierung
 * oder (falls nichts markiert ist, aber der Cursor im Editor steht) den aktuellen
 * Aufzählungspunkt (<li>) bzw. Absatz (<div>/<p>) aus.
 *
 * Wichtig: Das echte Editor-DOM wird dabei NICHT verändert, sondern die Löschung
 * wird auf einem unsichtbaren Klon ausgeführt, damit der Originaltext erst dann
 * verschwindet, wenn der Nutzer im Detail-Fenster wirklich auf "Speichern" klickt!
 */
export const extractSelectionOrBlockFromEditor = (
  editorEl: HTMLDivElement,
  htmlToMarkdownFn: (root: HTMLElement) => string
): ExtractedNoteResult | null => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (!editorEl.contains(range.commonAncestorContainer)) return null;

  // Hilfsfunktion: Pfad eines Knotens relativ zu editorEl bestimmen, um ihn im Klon wiederzufinden
  const getNodePath = (root: Node, target: Node): number[] => {
    const path: number[] = [];
    let curr: Node | null = target;
    while (curr && curr !== root) {
      const parent: Node | null = curr.parentNode;
      if (!parent) break;
      const idx = Array.from(parent.childNodes).indexOf(curr as ChildNode);
      path.unshift(idx);
      curr = parent;
    }
    return path;
  };

  const resolveNodePath = (root: Node, path: number[]): Node | null => {
    let curr: Node | null = root;
    for (const idx of path) {
      if (!curr || !curr.childNodes || idx < 0 || idx >= curr.childNodes.length) return null;
      curr = curr.childNodes[idx];
    }
    return curr;
  };

  const cloneRoot = editorEl.cloneNode(true) as HTMLDivElement;

  let extractedRaw = '';

  if (!range.collapsed && range.toString().trim().length > 0) {
    extractedRaw = range.toString().trim();

    const startPath = getNodePath(editorEl, range.startContainer);
    const endPath = getNodePath(editorEl, range.endContainer);
    const cloneStart = resolveNodePath(cloneRoot, startPath);
    const cloneEnd = resolveNodePath(cloneRoot, endPath);

    if (cloneStart && cloneEnd) {
      const cloneRange = document.createRange();
      cloneRange.setStart(cloneStart, range.startOffset);
      cloneRange.setEnd(cloneEnd, range.endOffset);
      cloneRange.deleteContents();

      // Entferne durch das Ausschneiden leer gewordene <li>, <div> oder <p> Elemente im Klon
      Array.from(cloneRoot.querySelectorAll('li, div, p')).forEach((el) => {
        if ((el.textContent || '').trim() === '') {
          el.remove();
        }
      });
      Array.from(cloneRoot.querySelectorAll('ul, ol')).forEach((listEl) => {
        if (listEl.querySelectorAll('li').length === 0) {
          listEl.remove();
        }
      });
    }
  } else {
    // Keine Markierung -> Nimm das aktuelle <li> oder den aktuellen Block (<div>/<p>) unter dem Cursor
    let targetNode: Node | null = range.startContainer;
    let blockEl: HTMLElement | null = null;

    while (targetNode && targetNode !== editorEl) {
      if (targetNode.nodeType === Node.ELEMENT_NODE) {
        const tag = (targetNode as HTMLElement).tagName.toLowerCase();
        if (tag === 'li' || tag === 'div' || tag === 'p') {
          blockEl = targetNode as HTMLElement;
          break;
        }
      }
      targetNode = targetNode.parentNode;
    }

    if (blockEl) {
      extractedRaw = (blockEl.innerText || blockEl.textContent || '').trim();
      const blockPath = getNodePath(editorEl, blockEl);
      const cloneBlock = resolveNodePath(cloneRoot, blockPath) as HTMLElement | null;
      if (cloneBlock) {
        const parentList = cloneBlock.parentElement;
        cloneBlock.remove();
        if (
          parentList &&
          (parentList.tagName.toLowerCase() === 'ul' || parentList.tagName.toLowerCase() === 'ol') &&
          parentList.querySelectorAll('li').length === 0
        ) {
          parentList.remove();
        }
      }
    } else {
      // Fallback: Gesamter Text im Editor ist eine einzige Text-Zeile ohne Block-Tag
      extractedRaw = (editorEl.innerText || editorEl.textContent || '').trim();
      if (!extractedRaw) return null;
      cloneRoot.innerHTML = '';
    }
  }

  // Bereinige führende Aufzählungszeichen ("- ", "• ", "1. ") und Markdown-Fettdruck-Sterne am Rand
  const cleanedText = extractedRaw
    .replace(/^(\s*[-•*]\s+|\s*\d+\.\s+)/, '')
    .replace(/^\*\*(.*)\*\*$/s, '$1')
    .trim();

  if (!cleanedText) return null;

  const remainingMarkdown = htmlToMarkdownFn(cloneRoot).trim();

  return {
    extractedText: cleanedText,
    remainingMarkdown
  };
};

/**
 * Erkennt im ausgelagerten Text automatisch erwähnte Vereins-Benutzer (über Vorname oder Vollname).
 * Nutzt Wortgrenzen, damit "Max" niemals fälschlich bei "Maxi" anschlägt!
 */
const detectAssigneeUserIdsFromText = (text: string, users: User[], fallbackIds: string[] = []): string[] => {
  if (!text || !users || users.length === 0) return fallbackIds;

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matchedIds = new Set<string>();

  // Sortiere längere Vornamen zuerst (z.B. "Maximilian" / "Maxi" vor "Max"),
  // wobei die Wortgrenzen-Regex ohnehin exakt trennt.
  users.forEach((u) => {
    if (!u.name) return;
    const fullName = u.name.trim();
    const firstName = fullName.split(/\s+/)[0];

    const candidates = [fullName, firstName].filter((c) => c.length >= 3);
    if (firstName.toLowerCase() === 'maximilian') {
      candidates.push('Maxi');
    }

    for (const candidate of candidates) {
      const regex = new RegExp(`(?:^|[^a-zA-ZäöüÄÖÜß])(${escapeRegExp(candidate)})(?=[^a-zA-ZäöüÄÖÜß]|$)`, 'i');
      if (regex.test(text)) {
        matchedIds.add(u.id);
        break;
      }
    }
  });

  if (matchedIds.size > 0) {
    return Array.from(matchedIds);
  }
  return fallbackIds;
};

/**
 * Erkennt ein Datum im Format "TT.MM.JJJJ" oder "TT.MM." im Text
 * (z.B. "am 6.1.2027", "am 29.11.", "bis zum 31.10.") und gibt einen Timestamp zurück.
 */
const detectDueDateFromText = (text: string, referenceTimeMs?: number): number | undefined => {
  if (!text) return undefined;

  // 1. Vollständiges Datum: DD.MM.YYYY oder DD.MM.YY
  const fullDateMatch = /(?:^|\s|am\s+|bis\s+)(\d{1,2})\.(\d{1,2})\.(20\d{2}|\d{2})(?!\d)/i.exec(text);
  if (fullDateMatch) {
    const day = parseInt(fullDateMatch[1], 10);
    const month = parseInt(fullDateMatch[2], 10) - 1;
    let year = parseInt(fullDateMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day, 12, 0, 0, 0);
    if (!isNaN(d.getTime()) && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return d.getTime();
    }
  }

  // 2. Kurzdatum ohne Jahr: DD.MM. (z.B. "am 29.11." oder "am 19.12.")
  const shortDateMatch = /(?:^|\s|am\s+|bis\s+)(\d{1,2})\.(\d{1,2})\.(?!\d)/i.exec(text);
  if (shortDateMatch) {
    const day = parseInt(shortDateMatch[1], 10);
    const month = parseInt(shortDateMatch[2], 10) - 1;
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const refDate = referenceTimeMs ? new Date(referenceTimeMs) : new Date();
      let year = refDate.getFullYear();
      let candidate = new Date(year, month, day, 12, 0, 0, 0);
      // Falls das Datum mehr als 6 Monate vor dem Referenzdatum liegt, ist das Folgejahr gemeint
      if (candidate.getTime() < refDate.getTime() - 180 * 24 * 60 * 60 * 1000) {
        candidate = new Date(year + 1, month, day, 12, 0, 0, 0);
      }
      return candidate.getTime();
    }
  }

  return undefined;
};

/**
 * Erzeugt aus dem Ursprungspunkt und dem markierten Textabschnitt einen vorausgefüllten
 * Unterpunkt-Entwurf für das ItemFormModal:
 * - <= 80 Zeichen: Text wird direkt als Titel übernommen, Notizfeld bleibt leer.
 * - > 80 Zeichen: Titel wird vom Ursprungspunkt übernommen, der lange Text landet in den Notizen.
 */
export const buildDraftSubItemFromExtractedText = (
  sourceItem: AgendaItem,
  extractedText: string,
  users: User[],
  currentEvent?: Event | null
): Partial<AgendaItem> => {
  const isLongText = extractedText.length > 80;

  const title = isLongText ? sourceItem.title : extractedText;
  const description = isLongText ? extractedText : '';

  // Wenn aus einem Hauptpunkt ausgelagert wird -> Unterpunkt unter diesem Hauptpunkt.
  // Wenn aus einem bereits bestehenden Unterpunkt ausgelagert wird -> Geschwister-Unterpunkt unter demselben Hauptpunkt.
  const targetParentId = sourceItem.isSubItem && sourceItem.parentItemId
    ? sourceItem.parentItemId
    : sourceItem.id;

  const detectedAssignees = detectAssigneeUserIdsFromText(
    extractedText,
    users,
    sourceItem.assigneeUserIds || []
  );

  const detectedDueDate =
    detectDueDateFromText(extractedText, Date.now()) ||
    currentEvent?.plannedStartTime ||
    sourceItem.dueDate;

  return {
    eventId: sourceItem.eventId,
    type: 'AUFGABE',
    status: 'OFFEN',
    progress: 0,
    isSubItem: true,
    parentItemId: targetParentId,
    title,
    description,
    durationEstimate: 5,
    assigneeUserIds: detectedAssignees,
    assigneeGroupIds: sourceItem.assigneeGroupIds || [],
    assigneeHelperIds: [],
    dueDate: detectedDueDate,
    isRoutine: false,
    mustBeDoneBeforeEvent: false,
    isDueNextMeeting: false
  };
};
// --- END OF FILE ---

// [2026-11-25] - UX-IMPROVEMENT: Nachname + Vornamen-Teilwort-Matching ergänzt (z. B. "Hans Jörg Herlan" <-> "Jörg Herlan").
// [2026-11-25] - FEATURE: Zentrale Ranglisten-Logik (numerische Sortierung 1.1 < 2.1 < 10.1, Team-Kategorie-Erkennung für Erwachsene/Jugend sowie Copy-Paste-Parser für click-TT Meldungen).
// src/features/Users/utils/rankingUtils.ts
import type { Helper, Team } from '../../../core/types/models';

export type RankingCategory = 'ADULT' | 'YOUTH';
export type RankingSortMode = 'ADULT' | 'YOUTH' | 'COMBINED';

export interface ParsedRankEntry {
  rank: string;
  name: string;
}

export interface RankMatchPreviewItem {
  rank: string;
  rawName: string;
  matchedHelper?: Helper;
  previousRank?: string;
  status: 'NEW' | 'CHANGED' | 'UNCHANGED' | 'UNMATCHED';
}

/** Parst einen click-TT Rang (z.B. "1.1", "10.3") in ein numerisches Paar [Mannschaft, Position]. */
export const parseRankParts = (rank?: string): [number, number] | null => {
  if (!rank) return null;
  const cleaned = rank.trim().replace(',', '.');
  const match = /^(\d+)(?:\.(\d+))?$/.exec(cleaned);
  if (!match) return null;
  const teamNum = parseInt(match[1], 10);
  const posNum = match[2] ? parseInt(match[2], 10) : 0;
  if (Number.isNaN(teamNum) || Number.isNaN(posNum)) return null;
  return [teamNum, posNum];
};

/** Vergleicht zwei Rang-Strings numerisch (1.1 < 1.2 < 2.1 < 10.1). Fehlendes Feld landet am Ende. */
export const compareRankStrings = (rankA?: string, rankB?: string): number => {
  const partsA = parseRankParts(rankA);
  const partsB = parseRankParts(rankB);
  if (!partsA && !partsB) return 0;
  if (!partsA) return 1;
  if (!partsB) return -1;
  if (partsA[0] !== partsB[0]) return partsA[0] - partsB[0];
  if (partsA[1] !== partsB[1]) return partsA[1] - partsB[1];
  return 0;
};

/** Ermittelt, ob ein Team zur Jugend- oder Erwachsenen-Rangliste gehört (explizit oder per Namensmuster J1/J2/Jugend). */
export const inferTeamRankingCategory = (team?: Pick<Team, 'name' | 'rankingCategory'> | null): RankingCategory => {
  if (team?.rankingCategory === 'YOUTH' || team?.rankingCategory === 'ADULT') {
    return team.rankingCategory;
  }
  const name = (team?.name || '').trim().toLowerCase();
  if (/^j\s*\d+/.test(name) || /jugend|jungen|mädchen|maedchen|u\d{2}/.test(name)) {
    return 'YOUTH';
  }
  return 'ADULT';
};

/** Sortiert zwei Mitglieder nach Rangliste (ADULT, YOUTH oder COMBINED: erst Erwachsene, dann Jugend, dann A-Z). */
export const compareHelpersByRank = (a: Helper, b: Helper, mode: RankingSortMode = 'ADULT'): number => {
  if (mode === 'COMBINED') {
    const aAdult = parseRankParts(a.rankAdult);
    const bAdult = parseRankParts(b.rankAdult);
    if (aAdult && bAdult) {
      const cmp = compareRankStrings(a.rankAdult, b.rankAdult);
      if (cmp !== 0) return cmp;
    } else if (aAdult && !bAdult) {
      return -1;
    } else if (!aAdult && bAdult) {
      return 1;
    } else {
      const aYouth = parseRankParts(a.rankYouth);
      const bYouth = parseRankParts(b.rankYouth);
      if (aYouth && bYouth) {
        const cmp = compareRankStrings(a.rankYouth, b.rankYouth);
        if (cmp !== 0) return cmp;
      } else if (aYouth && !bYouth) {
        return -1;
      } else if (!aYouth && bYouth) {
        return 1;
      }
    }
    return (a.name || '').localeCompare(b.name || '', 'de');
  }

  const primaryA = mode === 'YOUTH' ? a.rankYouth : a.rankAdult;
  const primaryB = mode === 'YOUTH' ? b.rankYouth : b.rankAdult;
  const hasPrimaryA = !!parseRankParts(primaryA);
  const hasPrimaryB = !!parseRankParts(primaryB);

  if (hasPrimaryA && hasPrimaryB) {
    const cmp = compareRankStrings(primaryA, primaryB);
    if (cmp !== 0) return cmp;
    return (a.name || '').localeCompare(b.name || '', 'de');
  }
  if (hasPrimaryA) return -1;
  if (hasPrimaryB) return 1;

  // Fallback auf die jeweils andere Rangliste, falls nur dort ein Rang gepflegt ist
  const fallbackA = mode === 'YOUTH' ? a.rankAdult : a.rankYouth;
  const fallbackB = mode === 'YOUTH' ? b.rankAdult : b.rankYouth;
  const cmpFallback = compareRankStrings(fallbackA, fallbackB);
  if (cmpFallback !== 0) return cmpFallback;

  return (a.name || '').localeCompare(b.name || '', 'de');
};

const normalizePersonName = (raw: string): string => {
  let clean = (raw || '').trim();
  if (clean.includes(',')) {
    const parts = clean.split(',');
    if (parts.length === 2) {
      clean = `${parts[1].trim()} ${parts[0].trim()}`;
    }
  }
  return clean
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();
};

/** Parst kopierte click-TT-Meldungstabellen (Rang, Q-TTR, Name, Status). */
export const parseClickTtRankingText = (rawText: string): ParsedRankEntry[] => {
  if (!rawText || !rawText.trim()) return [];
  const lines = rawText.split(/\r?\n/);
  const entries: ParsedRankEntry[] = [];
  const seenRanks = new Set<string>();

  const cleanPlayerName = (candidate: string): string => {
    // Entfernt nachgestellte Status-Spalten (RES, SBEM, WES, Nachmeldung ab ...) falls per Leerzeichen statt Tab getrennt
    let name = candidate
      .replace(/\s+(?:RES|SBEM|WES|JES|SPV|A|S|Nachmeldung\b.*)$/i, '')
      .trim();
    // Falls am Anfang versehentlich ein Q-TTR-Wert oder Bindestrich steht
    name = name.replace(/^(?:\d{3,4}|-|–)\s+/, '').trim();
    return name;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 1. Tab-separiertes Standardformat aus Browser-Copy-Paste: "1.1\t1493\tMax Ertl\t..."
    if (line.includes('\t')) {
      const cols = line.split('\t').map(c => c.trim());
      const rankMatch = /^(\d+\.\d+)$/.exec(cols[0] || '');
      if (rankMatch) {
        const rank = rankMatch[1];
        // Name ist meist Spalte 2 (nach Q-TTR), oder Spalte 1 falls kein Q-TTR vorhanden
        let rawName = '';
        for (let c = 1; c < cols.length; c++) {
          const cell = cols[c];
          if (!cell || /^\d{3,4}$/.test(cell) || cell === '-' || cell === '–') continue;
          if (/^(RES|SBEM|WES|JES|SPV)$/i.test(cell)) continue;
          rawName = cell;
          break;
        }
        const cleanedName = cleanPlayerName(rawName);
        if (cleanedName && !seenRanks.has(rank)) {
          seenRanks.add(rank);
          entries.push({ rank, name: cleanedName });
        }
        continue;
      }
    }

    // 2. Leerzeichen-separiertes Format: "1.1 1493 Max Ertl RES" oder "1.1 Max Ertl"
    const spaceMatch = /^(\d+\.\d+)\s+(?:(?:\d{3,4}|-|–)\s+)?(.+)$/.exec(line);
    if (spaceMatch) {
      const rank = spaceMatch[1];
      const cleanedName = cleanPlayerName(spaceMatch[2]);
      if (cleanedName && !/^(Q-TTR|Name|Status)$/i.test(cleanedName) && !seenRanks.has(rank)) {
        seenRanks.add(rank);
        entries.push({ rank, name: cleanedName });
      }
      continue;
    }

    // 3. Mehrzeiliges Copy-Paste (Rang alleine auf Zeile, darunter Q-TTR und Name)
    if (/^(\d+\.\d+)$/.test(line)) {
      const rank = line;
      let rawName = '';
      for (let lookahead = 1; lookahead <= 3 && i + lookahead < lines.length; lookahead++) {
        const nextLine = lines[i + lookahead].trim();
        if (!nextLine || /^\d{3,4}$/.test(nextLine) || nextLine === '-' || nextLine === '–') continue;
        if (/^\d+\.\d+$/.test(nextLine)) break;
        rawName = nextLine;
        break;
      }
      const cleanedName = cleanPlayerName(rawName);
      if (cleanedName && !seenRanks.has(rank)) {
        seenRanks.add(rank);
        entries.push({ rank, name: cleanedName });
      }
    }
  }

  return entries.sort((a, b) => compareRankStrings(a.rank, b.rank));
};

/** Gleicht geparste Einträge gegen vorhandene Mitglieder (helpers) ab. */
export const matchRankingEntriesToHelpers = (
  entries: ParsedRankEntry[],
  helpers: Helper[],
  category: RankingCategory
): RankMatchPreviewItem[] => {
  const helperByNormName = new Map<string, Helper>();
  const helpersByLastName = new Map<string, Helper[]>();

  helpers.forEach(h => {
    const norm = normalizePersonName(h.name || '');
    if (!norm) return;
    helperByNormName.set(norm, h);
    const tokens = norm.split(' ');
    const lastName = tokens[tokens.length - 1];
    if (lastName) {
      const list = helpersByLastName.get(lastName) || [];
      list.push(h);
      helpersByLastName.set(lastName, list);
    }
  });

  const findFuzzyMatch = (normEntry: string): Helper | undefined => {
    const exact = helperByNormName.get(normEntry);
    if (exact) return exact;

    const entryTokens = normEntry.split(' ').filter(Boolean);
    if (entryTokens.length < 2) return undefined;
    const entryLastName = entryTokens[entryTokens.length - 1];
    const entryFirstTokens = entryTokens.slice(0, -1);

    const candidates = helpersByLastName.get(entryLastName) || [];
    const matchingCandidates = candidates.filter(candidate => {
      const candTokens = normalizePersonName(candidate.name || '').split(' ').filter(Boolean);
      if (candTokens.length < 2) return false;
      const candFirstTokens = candTokens.slice(0, -1);
      // Mindestens ein Vorname-Wort stimmt exakt überein (z.B. "Hans Jörg Herlan" <-> "Jörg Herlan")
      return entryFirstTokens.some(t => candFirstTokens.includes(t));
    });

    return matchingCandidates.length === 1 ? matchingCandidates[0] : undefined;
  };

  return entries.map(entry => {
    const normEntry = normalizePersonName(entry.name);
    const matched = findFuzzyMatch(normEntry);
    if (!matched) {
      return {
        rank: entry.rank,
        rawName: entry.name,
        status: 'UNMATCHED'
      };
    }

    const previousRank = category === 'YOUTH' ? matched.rankYouth : matched.rankAdult;
    let status: RankMatchPreviewItem['status'] = 'NEW';
    if (previousRank === entry.rank) {
      status = 'UNCHANGED';
    } else if (previousRank) {
      status = 'CHANGED';
    }

    return {
      rank: entry.rank,
      rawName: entry.name,
      matchedHelper: matched,
      previousRank,
      status
    };
  });
};
// --- END OF FILE ---

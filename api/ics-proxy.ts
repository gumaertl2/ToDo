// api/ics-proxy.ts
// [2026-11-07] - FIX (HTTP 429 Cloudflare): Entfernt künstliche '_t'-Cache-Buster-Parameter vor dem Abruf und nutzt authentische deutsche Browser- bzw. Apple-CalendarAgent-Header aus Region fra1 (Frankfurt).
// [2026-11-07] - FEATURE: Interner Vercel-Endpunkt zum zuverlässigen Abrufen externer .ics-Kalenderfeeds (z. B. myTischtennis.de / Feiertage) ohne Browser-CORS-Sperren oder Firewall-Blockaden von Drittanbieter-Proxies.

export const config = {
  regions: ['fra1']
};

const isBlockedHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase().trim();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    return true;
  }
  return false;
};

const fetchWithTimeout = async (url: string, headers: Record<string, string>, timeoutMs = 12000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

export default async function handler(req: any, res: any) {
  try {
    const rawUrl = req?.query?.url;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    let targetUrl = rawUrl.trim();
    if (targetUrl.toLowerCase().startsWith('webcal://')) {
      targetUrl = 'https://' + targetUrl.substring(9);
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid url parameter' });
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Unsupported protocol' });
    }

    if (isBlockedHost(parsedUrl.hostname)) {
      return res.status(403).json({ error: 'Forbidden host' });
    }

    // Künstliche Cache-Buster (_t=...) restlos entfernen, damit Cloudflare nicht wegen Cache-Bypass mit HTTP 429 blockiert
    parsedUrl.searchParams.delete('_t');
    const cleanUrl = parsedUrl.toString();

    const isMyTT = parsedUrl.hostname.toLowerCase().includes('mytischtennis.de');

    // Profil 1: Authentischer deutscher Desktop-Browser
    const browserHeaders: Record<string, string> = {
      'Accept': 'text/calendar,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      ...(isMyTT ? { 'Referer': 'https://www.mytischtennis.de/' } : {})
    };

    let upstreamRes = await fetchWithTimeout(cleanUrl, browserHeaders);

    // Profil 2 (Fallback bei 403/429): Offizieller Apple macOS/iOS Kalender-Client nach kurzer Atempause
    if (upstreamRes.status === 429 || upstreamRes.status === 403) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      upstreamRes = await fetchWithTimeout(cleanUrl, {
        'Accept': 'text/calendar, text/plain, */*',
        'Accept-Language': 'de-DE,de;q=0.9',
        'User-Agent': 'Mac+OS+X/15.1 (24B83) CalendarAgent/1161'
      });
    }

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({
        error: `Upstream HTTP ${upstreamRes.status}`
      });
    }

    const textData = (await upstreamRes.text()).trim();

    // Sicherheitsprüfung: Nur gültige iCalendar-Daten durchlassen (kein Missbrauch als allgemeiner Web-Proxy)
    if (!textData.includes('BEGIN:VCALENDAR')) {
      return res.status(422).json({ error: 'Upstream response is not a valid VCALENDAR file' });
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).send(textData);
  } catch (error: any) {
    console.error('ICS Proxy Error:', error);
    const status = error?.name === 'AbortError' ? 504 : 502;
    return res.status(status).json({
      error: error?.name === 'AbortError' ? 'Upstream timeout' : 'Upstream fetch failed'
    });
  }
}
// --- END OF FILE ---

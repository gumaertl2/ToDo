// api/ics-proxy.ts
// [2026-11-07] - FEATURE: Interner Vercel-Endpunkt zum zuverlässigen Abrufen externer .ics-Kalenderfeeds (z. B. myTischtennis.de / Feiertage) ohne Browser-CORS-Sperren oder Firewall-Blockaden von Drittanbieter-Proxies.

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(parsedUrl.toString(), {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'Accept': 'text/calendar, text/plain;q=0.9, */*;q=0.8',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) CalendarSync/1.0'
        }
      });
    } finally {
      clearTimeout(timeoutId);
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

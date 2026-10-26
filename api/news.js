/* HEADLINES, SERVER-SIDE. ONE ROUTE, NO DEPENDENCIES, NO MIDDLEMAN.
 *
 * WHY THIS FILE EXISTS.
 *
 * The page used to reach api.rss2json.com from the browser, because RSS is a
 * server-to-server format and not one crypto outlet sends an
 * Access-Control-Allow-Origin header. That worked until it didn't: rss2json is
 * now behind a Cloudflare interactive challenge and answers 403 to anything
 * that isn't a human with a cookie jar. A cross-origin fetch() cannot solve an
 * interactive challenge - there is no JS context, no cookie, nothing to click -
 * so the headlines had been gone for a while without anybody being told.
 *
 * Reaching for a second free proxy would buy the same bug on a different timer.
 * CORS is a BROWSER rule. It does not exist here. So this route reads the real
 * feeds directly, server to server, the way RSS was always meant to be read,
 * and hands the page plain JSON on its own origin.
 *
 * Checked, not assumed, 2026-10-26: watcher.guru/feed, theblock.co/rss.xml and
 * decrypt.co/feed all return valid RSS 200 to a direct server fetch. The feeds
 * were never the problem. The middleman was.
 *
 * NO package.json, DELIBERATELY. This machine runs npm `omit=dev` with
 * NODE_ENV=production, which has broken local installs on other projects here.
 * A route with zero dependencies cannot be broken by a dependency flag. Node 24
 * on Vercel has global fetch, URL and dns/promises, which is all of it. Vercel
 * zero-config picks up /api/*.js with no framework and no build step, so the
 * project stays "one static file" in every way that mattered.
 */

const dns = require('dns').promises;
const net = require('net');

/* Five minutes at the edge is the cadence the page already polled at, so
 * upstream sees roughly one request per feed per five minutes however many
 * overlays are open. stale-while-revalidate is a free last-good cache: for an
 * hour after a feed goes quiet the edge keeps serving the last good answer
 * while it retries behind the scenes, so a brief outage never reaches the
 * screen. The client keeps its own cache for the longer outages.
 */
const EDGE_CACHE = 'public, s-maxage=300, stale-while-revalidate=3600';

const FEED_TIMEOUT_MS = 8000;
const MAX_FEEDS = 4;                    // the cap the page always had
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ITEMS = 40;
const SUMMARY_CHARS = 220;

const DEFAULT_FEEDS = [
  'https://watcher.guru/feed',
  'https://www.theblock.co/rss.xml',
  'https://decrypt.co/feed'
];

/* THIS ROUTE IS PUBLIC, SO IT MUST NOT BECOME AN OPEN PROXY.
 *
 * `newsfeed=` is a real feature - somebody running an esports stream should be
 * able to point this at an esports feed - so an allowlist of three hosts would
 * break the thing on purpose. But "fetch any URL I give you" on a public
 * endpoint is an SSRF hole, and the classic move is to ask it for
 * 169.254.169.254 and read the cloud metadata service.
 *
 * So: https only, and the hostname is RESOLVED and its addresses checked before
 * any fetch goes out. A name landing on loopback, link-local or an RFC1918
 * range is refused. That keeps the feature and closes the hole.
 */
function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    if (p[0] === 10 || p[0] === 127 || p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true;            // cloud metadata
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;
    if (p[0] >= 224) return true;
    return false;
  }
  const s = String(ip).toLowerCase();
  if (s === '::' || s === '::1') return true;
  if (s.startsWith('fe80') || s.startsWith('fc') || s.startsWith('fd')) return true;
  if (s.startsWith('::ffff:')) return isPrivateAddress(s.slice(7));
  return false;
}

async function assertPublicUrl(raw) {
  let u;
  try { u = new URL(raw); } catch (e) { throw new Error('not a url'); }
  if (u.protocol !== 'https:') throw new Error('https only');

  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') ||
      host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('blocked host');
  }
  // An IP literal needs no resolving, and is the likeliest abuse shape.
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('blocked address');
    return u.href;
  }
  const addrs = await dns.lookup(host, { all: true });
  if (!addrs.length) throw new Error('no address');
  for (const a of addrs) {
    if (isPrivateAddress(a.address)) throw new Error('blocked address');
  }
  return u.href;
}

/* ---------------- a small, tolerant feed parser ----------------
 *
 * Deliberately not an XML parser. Feeds in the wild are full of unescaped
 * ampersands and mismatched namespaces that a strict parser rejects outright,
 * and the cost of being wrong here is one missing headline, not a wrong number.
 * Tag soup read loosely beats correct XML that throws.
 */
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  laquo: '«', raquo: '»', deg: '°', eacute: 'é',
  trade: '™', reg: '®', copy: '©', middot: '·',
  bull: '•', prime: '′', euro: '€', pound: '£'
};

function decodeEntities(s) {
  return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, body) => {
    if (body[0] === '#') {
      const code = (body[1] === 'x' || body[1] === 'X')
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      if (!isFinite(code) || code <= 0 || code > 0x10ffff) return m;
      try { return String.fromCodePoint(code); } catch (e) { return m; }
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named === undefined ? m : named;
  });
}

function stripCdata(s) {
  return String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

function toText(s) {
  return decodeEntities(
    stripCdata(s)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
  ).replace(/\s+/g, ' ').trim();
}

/** First matching tag's inner text, namespace prefix tolerated. */
function tagText(xml, names) {
  for (const name of names) {
    const re = new RegExp(
      '<(?:[a-zA-Z0-9]+:)?' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9]+:)?' + name + '>',
      'i'
    );
    const m = xml.match(re);
    if (m && toText(m[1])) return toText(m[1]);
  }
  return '';
}

/** RSS puts the URL in the element, Atom puts it in a href attribute. */
function linkOf(xml) {
  const rel = xml.match(/<(?:[a-zA-Z0-9]+:)?link[^>]*\brel=["']alternate["'][^>]*\bhref=["']([^"']+)["']/i);
  if (rel) return decodeEntities(rel[1]).trim();
  const plain = xml.match(/<(?:[a-zA-Z0-9]+:)?link(?:\s[^>]*)?>([\s\S]*?)<\/(?:[a-zA-Z0-9]+:)?link>/i);
  if (plain && toText(plain[1])) return toText(plain[1]);
  const href = xml.match(/<(?:[a-zA-Z0-9]+:)?link[^>]*\bhref=["']([^"']+)["']/i);
  if (href) return decodeEntities(href[1]).trim();
  const guid = xml.match(/<(?:[a-zA-Z0-9]+:)?guid[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9]+:)?guid>/i);
  if (guid) {
    const g = toText(guid[1]);
    if (/^https?:\/\//i.test(g)) return g;
  }
  return '';
}

function parseFeed(xml) {
  const blocks = xml.match(
    /<(?:[a-zA-Z0-9]+:)?(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:[a-zA-Z0-9]+:)?(?:item|entry)>/gi
  ) || [];
  const out = [];
  for (const b of blocks.slice(0, MAX_ITEMS)) {
    const title = tagText(b, ['title']);
    if (!title) continue;
    const when = tagText(b, ['pubDate', 'published', 'updated', 'date', 'created']);
    const at = Date.parse(when);
    // A headline whose feed gives no usable date is worse than no headline: it
    // sorts to the top or bottom of a merged list at random.
    if (!isFinite(at)) continue;
    let summary = tagText(b, ['description', 'summary', 'encoded', 'content', 'subtitle']);
    if (summary.length > SUMMARY_CHARS) {
      summary = summary.slice(0, SUMMARY_CHARS).replace(/\s+\S*$/, '') + '…';
    }
    out.push({ title, link: linkOf(b), summary, at });
  }
  return out;
}

async function pullOne(feedUrl) {
  let host = 'news';
  try { host = new URL(feedUrl).hostname.replace(/^www\./, ''); } catch (e) {}

  let safeUrl;
  try {
    safeUrl = await assertPublicUrl(feedUrl);
  } catch (e) {
    return { host: host, ok: false, reason: e.message, items: [] };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, FEED_TIMEOUT_MS);
  try {
    const r = await fetch(safeUrl, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        // Some outlets serve a challenge page to a bare client. A plain desktop
        // UA with an RSS Accept header is what a feed reader sends, and is what
        // they answer normally.
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
      }
    });
    if (!r.ok) return { host: host, ok: false, reason: 'http ' + r.status, items: [] };

    // A feed is tens of kilobytes. Read with a ceiling so a misconfigured or
    // hostile URL cannot stream until the function times out.
    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return { host: host, ok: false, reason: 'too large', items: [] };
    }
    const items = parseFeed(Buffer.from(buf).toString('utf8'))
      .map(function (it) { return Object.assign({ source: host }, it); });
    if (!items.length) return { host: host, ok: false, reason: 'no items parsed', items: [] };
    return { host: host, ok: true, reason: '', items: items };
  } catch (e) {
    const reason = (e && e.name === 'AbortError')
      ? 'timeout'
      : ((e && e.message) || 'fetch failed');
    return { host: host, ok: false, reason: reason, items: [] };
  } finally {
    clearTimeout(timer);
  }
}

function feedsFromQuery(q) {
  const list = String(q || '').split(',')
    .map(function (s) { return s.trim(); })
    .filter(Boolean)
    .slice(0, MAX_FEEDS);
  return list.length ? list : DEFAULT_FEEDS.slice();
}

module.exports = async function handler(req, res) {
  // The overlay is often loaded from a file on disk in OBS, which is origin
  // `null`. A wildcard is right here: this route reads public feeds and returns
  // public headlines. There is nothing to protect and no cookie in play.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.statusCode = 204;
    return res.end();
  }

  const url = new URL(req.url, 'http://localhost');
  const feeds = feedsFromQuery(url.searchParams.get('feeds'));
  const results = await Promise.all(feeds.map(pullOne));

  const seen = Object.create(null);
  const items = [];
  for (const r of results) {
    for (const it of r.items) {
      // Two outlets, one story: first in wins.
      const key = it.title.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen[key]) continue;
      seen[key] = 1;
      items.push(it);
    }
  }
  items.sort(function (a, b) { return b.at - a.at; });

  const live = results.filter(function (r) { return r.ok; });
  const body = {
    ok: items.length > 0,
    degraded: live.length > 0 && live.length < results.length,
    fetchedAt: Date.now(),
    sources: results.map(function (r) {
      return { host: r.host, ok: r.ok, count: r.items.length, reason: r.reason };
    }),
    items: items.slice(0, MAX_ITEMS)
  };

  /* A total failure is NOT an HTTP error. The client has to tell "the feeds are
   * quiet" apart from "this route is gone", and it can only do that if a feed
   * outage still returns readable JSON saying so. Erroring here would collapse
   * both cases back into one opaque network failure - the exact shape of the
   * bug this file replaces.
   *
   * No edge caching of a failure, though: a thirty-second blip must not be
   * pinned in front of viewers for five minutes.
   */
  res.setHeader('Cache-Control', body.ok ? EDGE_CACHE : 'no-store');
  res.statusCode = 200;
  res.end(JSON.stringify(body));
};

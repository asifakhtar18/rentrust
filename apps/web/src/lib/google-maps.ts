export interface GoogleMapDetails { latitude: number; longitude: number; placeName?: string }

/** Read coordinates already embedded in a Google Maps URL; no API key needed. */
export function parseGoogleMapsUrl(raw: string): GoogleMapDetails | null {
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  const host = url.hostname.toLowerCase();
  const trusted = host === 'goo.gl' || host.endsWith('.goo.gl') || host === 'google.com' || host.endsWith('.google.com') || host === 'google.co.in' || host.endsWith('.google.co.in');
  if (!trusted || url.protocol !== 'https:' || url.username || url.password) return null;
  const candidates = [
    /@(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/.exec(url.href),
    /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/.exec(url.href),
  ];
  const queryPoint = url.searchParams.get('query') || url.searchParams.get('q') || url.searchParams.get('ll') || url.searchParams.get('center');
  if (queryPoint) candidates.push(/(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/.exec(queryPoint));
  const pair = candidates.find((candidate) => candidate);
  if (!pair) return null;
  const latitude = Number(pair[1]); const longitude = Number(pair[2]);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  const placeSegment = url.pathname.split('/').find((segment) => segment === 'place');
  const placeIndex = placeSegment ? url.pathname.split('/').indexOf(placeSegment) : -1;
  const encodedName = placeIndex >= 0 ? url.pathname.split('/')[placeIndex + 1] : '';
  const placeName = encodedName ? decodeURIComponent(encodedName.replaceAll('+', ' ')).replaceAll('+', ' ').trim() : undefined;
  return { latitude, longitude, ...(placeName ? { placeName } : {}) };
}

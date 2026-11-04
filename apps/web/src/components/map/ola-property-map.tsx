'use client';

import Script from 'next/script';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LocateFixed, Loader2, Minus, Plus } from 'lucide-react';
import { apiFetch, qs } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface PropertyPin {
  id: string;
  displayName: string;
  slug: string;
  propertyType: string;
  latitude: number;
  longitude: number;
  localityName: string | null;
}
interface MapPoint {
  lat: number;
  lng: number;
}
interface ProjectedPoint {
  x: number;
  y: number;
}
interface OlaBounds {
  getNorthEast(): MapPoint;
  getSouthWest(): MapPoint;
}
interface OlaMarker {
  remove(): void;
}
interface OlaMarkerBuilder {
  setLngLat(coordinates: [number, number]): OlaMarkerBuilder;
  addTo(map: OlaMap): OlaMarker;
}
interface OlaMap {
  on(event: string, listener: (event?: unknown) => void): void;
  getBounds(): OlaBounds;
  getZoom(): number;
  project(coordinates: [number, number]): ProjectedPoint;
  setCenter(center: [number, number]): void;
  setZoom(zoom: number): void;
  flyTo(options: { center: [number, number]; zoom: number }): void;
  zoomIn(): void;
  zoomOut(): void;
  remove(): void;
}
interface OlaMapsRuntime {
  init(options: {
    style: string;
    container: HTMLElement;
    center: [number, number];
    zoom: number;
  }): Promise<OlaMap>;
}
interface OlaMapsClass {
  new (options: { apiKey: string }): OlaMapsRuntime;
  Marker: new (options: { element: HTMLElement; anchor?: string }) => OlaMarkerBuilder;
}
declare global {
  interface Window {
    OlaMaps?: OlaMapsClass;
  }
}

const SCRIPT_ID = 'rentrust-ola-maps-sdk';
const STYLE_URL = 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json';

export function OlaPropertyMap({
  apiKey,
  onProviderFailure,
}: {
  apiKey: string;
  onProviderFailure: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OlaMap | null>(null);
  const markersRef = useRef<OlaMarker[]>([]);
  const userMarkerRef = useRef<OlaMarker | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const initialFocusRef = useRef(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState(
    'Loading the map. Property pins will follow the visible area.',
  );

  const loadPins = useCallback(async (map: OlaMap) => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      requestAbortRef.current?.abort();
      const controller = new AbortController();
      requestAbortRef.current = controller;
      const requestId = ++requestIdRef.current;
      const bounds = map.getBounds();
      const northEast = bounds.getNorthEast();
      const southWest = bounds.getSouthWest();
      if (southWest.lng >= northEast.lng) return;
      const query = {
        west: southWest.lng,
        south: southWest.lat,
        east: northEast.lng,
        north: northEast.lat,
      };
      setLoading(true);
      void apiFetch<PropertyPin[]>(`/properties/map${qs(query)}`, { signal: controller.signal })
        .then(({ data, meta }) => {
          if (controller.signal.aborted || requestId !== requestIdRef.current) return;
          markersRef.current.forEach((marker) => marker.remove());
          markersRef.current = [];
          const zoom = map.getZoom();
          const groups = new Map<string, { points: PropertyPin[]; pixel: ProjectedPoint }>();
          for (const property of data) {
            const pixel = map.project([property.longitude, property.latitude]);
            const key =
              zoom >= 12 ? property.id : `${Math.floor(pixel.x / 64)}:${Math.floor(pixel.y / 64)}`;
            const group = groups.get(key) ?? { points: [], pixel };
            group.points.push(property);
            groups.set(key, group);
          }
          for (const group of groups.values()) {
            const element = document.createElement(group.points.length > 1 ? 'button' : 'a');
            element.className =
              group.points.length > 1 ? 'rentrust-map-cluster' : 'rentrust-map-pin';
            element.setAttribute(
              'aria-label',
              group.points.length > 1
                ? `${group.points.length} properties nearby`
                : `Open ${group.points[0].displayName}`,
            );
            if (group.points.length > 1) {
              element.textContent = String(group.points.length);
              (element as HTMLButtonElement).type = 'button';
              element.addEventListener('click', () => {
                const lat =
                  group.points.reduce((sum, item) => sum + item.latitude, 0) / group.points.length;
                const lng =
                  group.points.reduce((sum, item) => sum + item.longitude, 0) / group.points.length;
                map.setCenter([lng, lat]);
                map.setZoom(Math.min(18, zoom + 2));
              });
            } else {
              const property = group.points[0];
              (element as HTMLAnchorElement).href = `/properties/${property.id}`;
              element.textContent = property.displayName;
              element.title = `${property.displayName}${property.localityName ? ` · ${property.localityName}` : ''}`;
            }
            const marker = new window.OlaMaps!.Marker({
              element,
              anchor: group.points.length > 1 ? 'center' : 'bottom',
            })
              .setLngLat(
                group.points.length > 1
                  ? [
                      group.points.reduce((sum, item) => sum + item.longitude, 0) /
                        group.points.length,
                      group.points.reduce((sum, item) => sum + item.latitude, 0) /
                        group.points.length,
                    ]
                  : [group.points[0].longitude, group.points[0].latitude],
              )
              .addTo(map);
            markersRef.current.push(marker);
          }
          const truncated = meta?.truncated === true;
          setMessage(
            data.length
              ? `${data.length}${truncated ? '+' : ''} ${data.length === 1 ? 'property' : 'properties'} with map pins in this view.${truncated ? ' Zoom in to narrow the list.' : ''}`
              : 'No properties with map pins in this view yet. Move or zoom to explore another area.',
          );
          if (!initialFocusRef.current) {
            initialFocusRef.current = true;
            if (data.length === 1) {
              map.flyTo({ center: [data[0].longitude, data[0].latitude], zoom: 12 });
            }
          }
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted && requestId === requestIdRef.current)
            setMessage(cause instanceof Error ? cause.message : 'Could not load property pins.');
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false);
        });
    }, 450);
  }, []);

  const startMap = useCallback(async () => {
    if (!containerRef.current || mapRef.current || !window.OlaMaps) return;
    setLoading(true);
    try {
      const sdk = new window.OlaMaps({ apiKey });
      const map = await sdk.init({
        style: STYLE_URL,
        container: containerRef.current,
        center: [79.1, 22.8],
        zoom: 5,
      });
      mapRef.current = map;
      map.on('error', (event) => {
        const details =
          typeof event === 'object' && event !== null && 'error' in event
            ? String((event as { error: unknown }).error)
            : String(event ?? '');
        if (
          /source layer .* does not exist|could not be loaded|failed to load sprite|style.*(invalid|failed)|unauthori[sz]ed|\b(401|403)\b/i.test(
            details,
          )
        ) {
          onProviderFailure();
        }
      });
      map.on('moveend', () => loadPins(map));
      void loadPins(map);
      setMessage('Browse property pins around India, or share your location to jump nearby.');
    } catch {
      onProviderFailure();
      setMessage('The map is temporarily unavailable.');
      setLoading(false);
    }
  }, [apiKey, loadPins, onProviderFailure]);

  useEffect(() => {
    if (scriptReady) void startMap();
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      requestAbortRef.current?.abort();
      requestAbortRef.current = null;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [scriptReady, startMap]);

  function useLocation() {
    if (!navigator.geolocation) {
      setMessage('This browser does not support location. You can still pan and zoom.');
      return;
    }
    setLocating(true);
    setMessage('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const map = mapRef.current;
        if (map && window.OlaMaps) {
          map.flyTo({ center: [coords.longitude, coords.latitude], zoom: 14 });
          const element = document.createElement('span');
          element.className = 'rentrust-map-user-dot';
          element.setAttribute('aria-label', 'Your current location');
          userMarkerRef.current?.remove();
          userMarkerRef.current = new window.OlaMaps.Marker({ element, anchor: 'center' })
            .setLngLat([coords.longitude, coords.latitude])
            .addTo(map);
        }
        setMessage('Map centered on your location. The location dot stays on this device.');
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Location access is blocked. In your browser’s site controls beside the address bar, set Location to Allow, reload, and try again. You can still pan the map.'
            : 'Could not read your location. Check browser location settings or pan the map manually.',
        );
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  return (
    <section
      aria-label="Map of rental properties"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <Script
        id={SCRIPT_ID}
        src="https://www.unpkg.com/olamaps-web-sdk@latest/dist/olamaps-web-sdk.umd.js"
        strategy="lazyOnload"
        onLoad={() => setScriptReady(true)}
        onError={() => {
          onProviderFailure();
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p role="status" aria-live="polite" className="min-w-0 flex-1 t-meta">
          {message}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={useLocation} loading={locating}>
            <LocateFixed className="size-4" aria-hidden />
            My location
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="Zoom in"
          >
            <Plus className="size-4" aria-hidden />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="Zoom out"
          >
            <Minus className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
      <div className="relative h-[min(68vh,680px)] min-h-[420px] bg-[#e8eee5]">
        <div ref={containerRef} className="absolute inset-0" />
        {loading && (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1.5 t-helper shadow-sm">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Loading map and pins…
          </span>
        )}
        <Link
          href="https://maps.olakrutrim.com"
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-1 right-1 z-10 rounded bg-card/90 px-1.5 py-0.5 text-[10px] text-foreground underline"
        >
          Map data © Ola Maps
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 t-helper">
        <span>Drag to explore · Scroll or use + / − to zoom</span>
        <span>
          Map and location requests are subject to Ola Maps terms and your browser permissions.
        </span>
      </div>
      <style jsx global>{`
        .rentrust-map-pin {
          display: block;
          max-width: 190px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          border: 1px solid #cdd8d2;
          border-radius: 999px;
          background: #fff;
          color: #19332e;
          padding: 6px 10px;
          font: 600 12px/1.2 system-ui;
          box-shadow: 0 2px 8px #0002;
          cursor: pointer;
          text-decoration: none;
        }
        .rentrust-map-cluster {
          width: 42px;
          height: 42px;
          border: 2px solid #fff;
          border-radius: 50%;
          background: #176b55;
          color: #fff;
          font: 700 13px system-ui;
          box-shadow: 0 2px 8px #0003;
          cursor: pointer;
        }
        .rentrust-map-user-dot {
          display: block;
          width: 18px;
          height: 18px;
          border: 3px solid #fff;
          border-radius: 50%;
          background: #2563eb;
          box-shadow:
            0 0 0 7px #2563eb33,
            0 2px 8px #0004;
        }
      `}</style>
    </section>
  );
}

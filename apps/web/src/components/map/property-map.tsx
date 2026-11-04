'use client';

/* eslint-disable @next/next/no-img-element -- Map tiles must load directly from the tile provider to honor its cache policy. */

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from 'react';
import { LocateFixed, Loader2, MapPin, Minus, Plus } from 'lucide-react';
import { apiFetch, qs } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { OlaPropertyMap } from './ola-property-map';

interface MapProperty {
  id: string;
  displayName: string;
  slug: string;
  propertyType: string;
  latitude: number;
  longitude: number;
  localityName: string | null;
}
interface Point {
  latitude: number;
  longitude: number;
}
interface Size {
  width: number;
  height: number;
}
interface Tile {
  x: number;
  worldX: number;
  y: number;
  left: number;
  top: number;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;

function toWorld(point: Point, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const latitude = Math.max(-85.0511, Math.min(85.0511, point.latitude));
  const sin = Math.sin((latitude * Math.PI) / 180);
  return {
    x: ((point.longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function fromWorld(x: number, y: number, zoom: number): Point {
  const scale = TILE_SIZE * 2 ** zoom;
  const wrappedX = ((x % scale) + scale) % scale;
  const latitude = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI;
  return { latitude, longitude: (wrappedX / scale) * 360 - 180 };
}

function boundsFor(center: Point, zoom: number, size: Size) {
  const world = toWorld(center, zoom);
  const northWest = fromWorld(world.x - size.width / 2, world.y - size.height / 2, zoom);
  const southEast = fromWorld(world.x + size.width / 2, world.y + size.height / 2, zoom);
  return {
    west: Math.min(northWest.longitude, southEast.longitude),
    south: Math.min(northWest.latitude, southEast.latitude),
    east: Math.max(northWest.longitude, southEast.longitude),
    north: Math.max(northWest.latitude, southEast.latitude),
  };
}

function OpenStreetMapPropertyMap() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [center, setCenter] = useState<Point>({ latitude: 22.8, longitude: 79.1 });
  const [zoom, setZoom] = useState(5);
  const [properties, setProperties] = useState<MapProperty[]>([]);
  const [userLocation, setUserLocation] = useState<Point | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(
    'Browse property pins around India, or share your location to jump nearby.',
  );
  const initialFocusRef = useRef(false);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const bounds = useMemo(
    () => (size.width ? boundsFor(center, zoom, size) : null),
    [center, size, zoom],
  );
  useEffect(() => {
    if (!bounds) return;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(() => {
      void apiFetch<MapProperty[]>(`/properties/map${qs(bounds)}`, { signal: controller.signal })
        .then(({ data, meta }) => {
          if (active) {
            setProperties(data);
            const truncated = meta?.truncated === true;
            setMessage(
              data.length
                ? `${data.length}${truncated ? '+' : ''} ${data.length === 1 ? 'property' : 'properties'} with map pins in this view.${truncated ? ' Zoom in to narrow the list.' : ''}`
                : 'No properties with map pins in this view yet. Move or zoom the map to explore another area.',
            );
            if (!initialFocusRef.current) {
              initialFocusRef.current = true;
              if (data.length === 1) {
                setCenter({ latitude: data[0].latitude, longitude: data[0].longitude });
                setZoom(12);
              }
            }
          }
        })
        .catch((cause: unknown) => {
          if (active && !controller.signal.aborted)
            setMessage(cause instanceof Error ? cause.message : 'Could not load property pins.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 450);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [bounds]);

  const world = useMemo(() => toWorld(center, zoom), [center, zoom]);
  const scale = TILE_SIZE * 2 ** zoom;
  const tiles = useMemo(() => {
    if (!size.width || !size.height) return [] as Tile[];
    const left = world.x - size.width / 2;
    const top = world.y - size.height / 2;
    const firstX = Math.floor(left / TILE_SIZE) - 1;
    const lastX = Math.floor((left + size.width) / TILE_SIZE) + 1;
    const firstY = Math.max(0, Math.floor(top / TILE_SIZE) - 1);
    const lastY = Math.min(2 ** zoom - 1, Math.floor((top + size.height) / TILE_SIZE) + 1);
    const result: Tile[] = [];
    for (let x = firstX; x <= lastX; x += 1) {
      for (let y = firstY; y <= lastY; y += 1) {
        result.push({
          x: ((x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom,
          worldX: x,
          y,
          left: x * TILE_SIZE - left,
          top: y * TILE_SIZE - top,
        });
      }
    }
    return result;
  }, [size, world, zoom]);

  const position = useCallback(
    (point: Point) => {
      const projected = toWorld(point, zoom);
      let deltaX = projected.x - world.x;
      if (deltaX > scale / 2) deltaX -= scale;
      if (deltaX < -scale / 2) deltaX += scale;
      return { left: size.width / 2 + deltaX, top: size.height / 2 + projected.y - world.y };
    },
    [scale, size, world, zoom],
  );

  const markers = useMemo(() => {
    const groups = new Map<string, { properties: MapProperty[]; x: number; y: number }>();
    for (const property of properties) {
      const point = position({ latitude: property.latitude, longitude: property.longitude });
      if (
        point.left < -40 ||
        point.left > size.width + 40 ||
        point.top < -48 ||
        point.top > size.height + 20
      )
        continue;
      const cell =
        zoom >= 10
          ? `${property.id}`
          : `${Math.floor(point.left / 64)}:${Math.floor(point.top / 64)}`;
      const group = groups.get(cell) ?? { properties: [], x: 0, y: 0 };
      group.properties.push(property);
      group.x += point.left;
      group.y += point.top;
      groups.set(cell, group);
    }
    return Array.from(groups.entries()).map(([key, group]) => ({
      key,
      properties: group.properties,
      point: { left: group.x / group.properties.length, top: group.y / group.properties.length },
    }));
  }, [position, properties, size.height, size.width, zoom]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('a,button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: world.x,
      y: world.y,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = fromWorld(
      drag.x - (event.clientX - drag.startX),
      drag.y - (event.clientY - drag.startY),
      zoom,
    );
    setCenter(point);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setZoom((current) =>
      Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current + (event.deltaY < 0 ? 1 : -1))),
    );
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setMessage('This browser does not support location. You can still drag and zoom the map.');
      return;
    }
    setLocating(true);
    setMessage('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = { latitude: coords.latitude, longitude: coords.longitude };
        setUserLocation(point);
        setCenter(point);
        setZoom(14);
        setMessage('The blue dot shows your location on this device only.');
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
            onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + 1))}
            aria-label="Zoom in"
          >
            <Plus className="size-4" aria-hidden />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - 1))}
            aria-label="Zoom out"
          >
            <Minus className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
      <div
        ref={wrapperRef}
        className="relative h-[min(68vh,680px)] min-h-[420px] touch-none select-none overflow-hidden bg-[#e8eee5] cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {tiles.map((tile) => (
          <img
            key={`${zoom}:${tile.worldX}:${tile.y}`}
            src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{ width: TILE_SIZE, height: TILE_SIZE, left: tile.left, top: tile.top }}
          />
        ))}
        {markers.map(({ key, properties: groupedProperties, point }) => {
          if (groupedProperties.length > 1) {
            const latitude =
              groupedProperties.reduce((sum, property) => sum + property.latitude, 0) /
              groupedProperties.length;
            const longitude =
              groupedProperties.reduce((sum, property) => sum + property.longitude, 0) /
              groupedProperties.length;
            return (
              <button
                key={key}
                type="button"
                title={`${groupedProperties.length} properties nearby`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => {
                  setCenter({ latitude, longitude });
                  setZoom((current) => Math.min(MAX_ZOOM, current + 2));
                }}
                className="absolute z-10 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-primary text-xs font-bold text-primary-foreground shadow-lg"
                style={{ left: point.left, top: point.top }}
              >
                {groupedProperties.length}
              </button>
            );
          }
          const property = groupedProperties[0];
          return (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              title={`${property.displayName}${property.localityName ? ` · ${property.localityName}` : ''}`}
              onPointerDown={(event) => event.stopPropagation()}
              className="absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center text-primary drop-shadow"
              style={{ left: point.left, top: point.top }}
            >
              <span className="max-w-48 truncate rounded-full border border-primary/20 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground shadow">
                {property.displayName}
              </span>
              <MapPin className="size-7 fill-primary text-card" aria-hidden />
            </Link>
          );
        })}
        {userLocation &&
          (() => {
            const point = position(userLocation);
            return (
              <span
                title="Your location on this device"
                className="absolute z-20 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-blue-600 shadow-[0_0_0_7px_rgba(37,99,235,0.2)]"
                style={{ left: point.left, top: point.top }}
              />
            );
          })()}
        {loading && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1.5 t-helper shadow-sm">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Loading pins…
          </span>
        )}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute bottom-1 right-1 z-30 rounded bg-card/90 px-1.5 py-0.5 text-[10px] text-foreground underline"
        >
          © OpenStreetMap contributors
        </a>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 t-helper">
        <span>Drag to explore · Scroll or use + / − to zoom</span>
        <a
          href="https://www.openstreetmap.org/fixthemap"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Report a map issue
        </a>
      </div>
    </section>
  );
}

export function PropertyMap() {
  const apiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
  const [providerFailed, setProviderFailed] = useState(false);
  const handleProviderFailure = useCallback(() => setProviderFailed(true), []);
  if (!apiKey || providerFailed)
    return <OpenStreetMapPropertyMap />;
  return <OlaPropertyMap apiKey={apiKey} onProviderFailure={handleProviderFailure} />;
}

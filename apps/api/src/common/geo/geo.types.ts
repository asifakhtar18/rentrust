/**
 * Shared geospatial value types used across properties, localities, and search.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface RadiusQuery extends Coordinates {
  /** Search radius in metres. */
  radiusMeters: number;
}

export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export function isValidCoordinates(c: Partial<Coordinates>): c is Coordinates {
  return (
    typeof c.latitude === 'number' &&
    typeof c.longitude === 'number' &&
    c.latitude >= -90 &&
    c.latitude <= 90 &&
    c.longitude >= -180 &&
    c.longitude <= 180
  );
}

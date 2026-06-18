// ============================================================
// OSM Service — সম্পূর্ণ ফ্রি geocoding + routing (card/billing ছাড়া)
//
//   Photon (komoot)   → autocomplete search + reverse/details
//   GraphHopper       → route (key থাকলে — Dhaka-তে ভালো, ঘুরপথ কম)
//   OSRM (demo)       → route fallback (key ছাড়া)
//
// Google Places/Directions billing লাগে; এটা সেই দরকার ছাড়াই চলে।
// placesService / directionsService এই service-এ fallback করে — তাই
// Google key না থাকলে বা "enable Billing" দিলে app তবু search/route পায়।
//
// Dhaka-তে যাচাই করা (2026-06): Banani, Kuril, AIUB, Dhanmondi সবই পায়।
// ============================================================
import ENV from '@/config/env';

// public demo endpoints — key লাগে না। (পরে নিজের host বসানো যাবে।)
const PHOTON_BASE = 'https://photon.komoot.io/api';
const PHOTON_REVERSE = 'https://photon.komoot.io/reverse';
// OSRM demo: https কখনো SSL hiccup করে → http দিলে demo server স্থির কাজ করে।
const OSRM_BASE = 'http://router.project-osrm.org/route/v1/driving';
// GraphHopper — key থাকলে এটাই route দেয় (OSRM-এর চেয়ে ভালো, ঘুরপথ কম)।
const GRAPHHOPPER_BASE = 'https://graphhopper.com/api/1/route';

// বাংলাদেশ bias — Dhaka কেন্দ্র; দূরের একই-নামের জায়গা নিচে নামায়।
const BD_CENTER = { lat: 23.78, lon: 90.4 };

const num = (v: unknown, d = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// Photon feature → আমাদের suggestion shape। description Google-এর মতো
// "name, area, city" বানাই যাতে UI-তে আগের মতোই দেখায়।
type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }; // [lon, lat]
  properties?: Record<string, any>;
};

const buildLabel = (p: Record<string, any>) => {
  const name =
    p.name ||
    [p.housenumber, p.street].filter(Boolean).join(' ') ||
    p.street ||
    p.suburb ||
    p.city ||
    'Unknown place';
  const areaParts = [p.suburb, p.district, p.city, p.state].filter(
    (x, i, a) => x && a.indexOf(x) === i && x !== name,
  );
  return { primary: String(name), secondary: areaParts.join(', ') };
};

// Photon-এর কোনো stable place_id নেই → lon,lat থেকে নিজেরা বানাই।
// placesService.getPlaceDetails এই id parse করে সরাসরি coord ফেরত দেয়
// (আবার network call ছাড়া — দ্রুত ও ফ্রি)।
const makeId = (lon: number, lat: number, name: string) =>
  `osm:${lon.toFixed(6)},${lat.toFixed(6)}:${encodeURIComponent(name).slice(0, 40)}`;

export const parseOsmId = (
  id: string,
): { lat: number; lon: number; name: string } | null => {
  if (!id.startsWith('osm:')) return null;
  try {
    const body = id.slice(4);
    const [coord, rawName = ''] = body.split(':');
    const [lonStr, latStr] = coord.split(',');
    return {
      lon: num(lonStr),
      lat: num(latStr),
      name: decodeURIComponent(rawName),
    };
  } catch {
    return null;
  }
};

class OsmService {
  /** autocomplete — Photon. placesService.autocomplete-এর সমান output. */
  async autocomplete(params: {
    input: string;
    latitude?: number;
    longitude?: number;
    limit?: number;
  }): Promise<
    Array<{ placeId: string; primaryText: string; secondaryText: string; description: string }>
  > {
    const lat = params.latitude ?? BD_CENTER.lat;
    const lon = params.longitude ?? BD_CENTER.lon;
    const url =
      `${PHOTON_BASE}/?q=${encodeURIComponent(params.input.trim())}` +
      `&lat=${lat}&lon=${lon}&limit=${params.limit ?? 8}&lang=en`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Photon autocomplete HTTP ${res.status}`);
    const data = (await res.json()) as { features?: PhotonFeature[] };

    return (data.features ?? [])
      .map((f) => {
        const p = f.properties ?? {};
        const coords = f.geometry?.coordinates ?? [lon, lat];
        const { primary, secondary } = buildLabel(p);
        return {
          placeId: makeId(num(coords[0]), num(coords[1]), primary),
          primaryText: primary,
          secondaryText: secondary,
          description: [primary, secondary].filter(Boolean).join(', '),
        };
      })
      // country=Bangladesh উপরে — bias। (Photon নিজেই lat/lon দিয়ে কাছেরটা আগে দেয়।)
      .slice(0, params.limit ?? 8);
  }

  /** place details — osm: id হলে coord সরাসরি; নাহলে reverse geocode. */
  async getPlaceDetails(placeId: string): Promise<{
    placeId: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  }> {
    const parsed = parseOsmId(placeId);
    if (parsed) {
      // reverse দিয়ে সুন্দর address আনার চেষ্টা (fail করলে নাম-ই address)।
      let address = parsed.name;
      try {
        const res = await fetch(
          `${PHOTON_REVERSE}/?lat=${parsed.lat}&lon=${parsed.lon}&lang=en`,
        );
        if (res.ok) {
          const d = (await res.json()) as { features?: PhotonFeature[] };
          const p = d.features?.[0]?.properties;
          if (p) {
            const { primary, secondary } = buildLabel(p);
            address = [primary, secondary].filter(Boolean).join(', ');
          }
        }
      } catch {
        /* address = name থাকবে */
      }
      return {
        placeId,
        name: parsed.name || address,
        address,
        latitude: parsed.lat,
        longitude: parsed.lon,
      };
    }
    throw new Error('Not an OSM placeId');
  }

  /** driving route — GraphHopper (key থাকলে) → নাহলে OSRM. Google getRoute-এর সমান output. */
  async getRoute(params: {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
  }): Promise<{
    summary: string;
    polyline: string; // encoded polyline (precision 5 — Google-compatible)
    distanceText: string;
    distanceMeters: number;
    durationText: string;
    durationSeconds: number;
    startAddress: string;
    endAddress: string;
  }> {
    // GraphHopper key থাকলে আগে সেটা (ভালো route) — fail করলে OSRM।
    if (ENV.graphHopperApiKey) {
      try {
        return await this.graphHopperRoute(params);
      } catch {
        /* OSRM-এ গড়িয়ে যায় */
      }
    }
    return this.osrmRoute(params);
  }

  private fmt(meters: number, secs: number) {
    return {
      summary: '',
      distanceText:
        meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`,
      distanceMeters: meters,
      durationText: `${Math.max(1, Math.round(secs / 60))} min`,
      durationSeconds: secs,
      startAddress: '',
      endAddress: '',
    };
  }

  /** GraphHopper route — points=encoded polyline (precision 5)। */
  private async graphHopperRoute(params: {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
  }) {
    const { origin, destination } = params;
    const url =
      `${GRAPHHOPPER_BASE}?point=${origin.latitude},${origin.longitude}` +
      `&point=${destination.latitude},${destination.longitude}` +
      `&vehicle=car&locale=en&points_encoded=true&key=${ENV.graphHopperApiKey}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`GraphHopper HTTP ${res.status}`);
    const data = (await res.json()) as {
      paths?: Array<{ distance?: number; time?: number; points?: string }>;
      message?: string;
    };
    const p = data.paths?.[0];
    if (!p?.points) throw new Error(data.message || 'GraphHopper no path');
    const meters = num(p.distance);
    const secs = num(p.time) / 1000; // GraphHopper time = ms
    return { polyline: p.points, ...this.fmt(meters, secs) };
  }

  /** OSRM route fallback — key লাগে না। */
  private async osrmRoute(params: {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
  }) {
    const { origin, destination } = params;
    const url =
      `${OSRM_BASE}/${origin.longitude},${origin.latitude};` +
      `${destination.longitude},${destination.latitude}` +
      `?overview=full&geometries=polyline`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{ distance?: number; duration?: number; geometry?: string }>;
    };
    if (data.code !== 'Ok' || !data.routes?.length) {
      throw new Error(`OSRM code ${data.code ?? 'none'}`);
    }
    const r = data.routes[0];
    return { polyline: r.geometry ?? '', ...this.fmt(num(r.distance), num(r.duration)) };
  }
}

const osmService = new OsmService();
export default osmService;

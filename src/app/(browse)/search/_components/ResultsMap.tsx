"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRouter, useSearchParams } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Source,
  type LayerProps,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import { parseBbox, parseSearchParams } from "@/lib/domain/search";
import { filterToParams, petKeys } from "@/lib/query-keys";
import { fetchSearchPage } from "@/lib/search-client";
import { usePetHover } from "./hover-context";

/* Keyless OSM raster style; attribution required and rendered by the control. */
const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/* Map paint can't read CSS variables — terracotta/ink literals from the palette. */
const ACCENT = "#E07A5F";
const ACCENT_DEEP = "#A84B35";
const INK = "#2D2A26";

const clusterLayer: LayerProps = {
  id: "clusters",
  type: "circle",
  source: "pets",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": ACCENT,
    "circle-opacity": 0.85,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#FFFFFF",
    // Count is encoded in size (no symbol text: keyless styles lack glyphs).
    "circle-radius": ["step", ["get", "point_count"], 14, 5, 18, 15, 24, 50, 30],
  },
};

const pinLayer: LayerProps = {
  id: "pins",
  type: "circle",
  source: "pets",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": ["case", ["boolean", ["feature-state", "hovered"], false], ACCENT_DEEP, ACCENT],
    "circle-radius": ["case", ["boolean", ["feature-state", "hovered"], false], 11, 8],
    "circle-stroke-width": 2,
    "circle-stroke-color": "#FFFFFF",
  },
};

/* Pre-fit fallback only — the mount effect below aims the camera at the URL
   bbox, the near-me origin, or the data itself as soon as it can. */
const NORTH_AMERICA = { longitude: -96, latitude: 42, zoom: 3 };

export default function ResultsMap() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mapRef = useRef<MapRef | null>(null);
  const { hoveredPetId } = usePetHover();
  const [, setBbox] = useQueryState("bbox", parseAsString.withOptions({ shallow: true, throttleMs: 400 }));

  const filter = useMemo(
    () => parseSearchParams(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );

  // Same key and fetcher as ResultsGrid — one cache entry feeds both panes.
  const query = useInfiniteQuery({
    queryKey: petKeys.search(filter),
    queryFn: ({ pageParam }) => fetchSearchPage(filterToParams(filter, pageParam)),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: keepPreviousData,
  });

  const geojson = useMemo(() => {
    const pets = query.data?.pages.flatMap((p) => p.results) ?? [];
    return {
      type: "FeatureCollection" as const,
      features: pets
        .filter((p) => p.lat !== null && p.lon !== null)
        .map((p) => ({
          type: "Feature" as const,
          id: p.id,
          geometry: { type: "Point" as const, coordinates: [p.lon!, p.lat!] },
          properties: { id: p.id, name: p.name },
        })),
    };
  }, [query.data]);

  /* One-time camera aim, priority: URL bbox (shared links restore their
     viewport) > near-me origin > bounds of the loaded data. Never re-aims on
     filter changes — the user owns the camera after first contact. */
  const [mapReady, setMapReady] = useState(false);
  const aimedRef = useRef(false);
  const programmaticMove = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || aimedRef.current) return;
    const box = parseBbox(filter.bbox);
    if (box) {
      programmaticMove.current = true;
      map.fitBounds(
        [[box.minLon, box.minLat], [box.maxLon, box.maxLat]],
        { duration: 0 },
      );
      aimedRef.current = true;
    } else if (filter.lat !== undefined && filter.lon !== undefined) {
      programmaticMove.current = true;
      map.jumpTo({ center: [filter.lon, filter.lat], zoom: 9 });
      aimedRef.current = true;
    } else if (geojson.features.length > 0) {
      const lons = geojson.features.map((f) => f.geometry.coordinates[0]!);
      const lats = geojson.features.map((f) => f.geometry.coordinates[1]!);
      programmaticMove.current = true;
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { padding: 48, maxZoom: 10, duration: 0 },
      );
      aimedRef.current = true;
    }
  }, [mapReady, filter.bbox, filter.lat, filter.lon, geojson]);

  // Card hover -> pin highlight via feature-state.
  const prevHovered = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (prevHovered.current && prevHovered.current !== hoveredPetId) {
      map.setFeatureState({ source: "pets", id: prevHovered.current }, { hovered: false });
    }
    if (hoveredPetId) {
      map.setFeatureState({ source: "pets", id: hoveredPetId }, { hovered: true });
    }
    prevHovered.current = hoveredPetId;
  }, [hoveredPetId]);

  const onClick = async (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    const current = mapRef.current;
    if (!feature || !current) return;
    if (feature.layer.id === "clusters") {
      const clusterId = feature.properties?.cluster_id as number;
      const source = current.getSource("pets");
      if (source && "getClusterExpansionZoom" in source) {
        const zoom = await (source as { getClusterExpansionZoom: (id: number) => Promise<number> })
          .getClusterExpansionZoom(clusterId);
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
        current.easeTo({ center: [lng!, lat!], zoom });
      }
    } else if (feature.layer.id === "pins") {
      router.push(`/pets/${feature.properties?.id as string}`);
    }
  };

  return (
    <Map
      ref={mapRef}
      initialViewState={NORTH_AMERICA}
      mapStyle={MAP_STYLE}
      style={{ width: "100%", height: "100%" }}
      interactiveLayerIds={["clusters", "pins"]}
      onLoad={() => setMapReady(true)}
      onClick={onClick}
      onMouseEnter={() => {
        const canvas = mapRef.current?.getCanvas();
        if (canvas) canvas.style.cursor = "pointer";
      }}
      onMouseLeave={() => {
        const canvas = mapRef.current?.getCanvas();
        if (canvas) canvas.style.cursor = "";
      }}
      onMoveEnd={() => {
        // A camera aim isn't a user gesture — don't turn it into a filter.
        if (programmaticMove.current) {
          programmaticMove.current = false;
          return;
        }
        const bounds = mapRef.current?.getBounds();
        if (!bounds) return;
        const box = [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ]
          .map((n) => n.toFixed(3))
          .join(",");
        void setBbox(box);
      }}
    >
      <Source
        id="pets"
        type="geojson"
        data={geojson}
        cluster
        clusterRadius={50}
        clusterMaxZoom={13}
        promoteId="id"
      >
        <Layer {...clusterLayer} />
        <Layer {...pinLayer} />
      </Source>
    </Map>
  );
}

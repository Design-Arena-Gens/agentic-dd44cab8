"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { Icon } from "leaflet";

import { subscribeToDriverLocations } from "@/lib/firebase-client";
import { Driver } from "@/lib/types";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

type Props = {
  drivers: Driver[];
};

export function DriverMap({ drivers }: Props) {
  const [locations, setLocations] = useState(drivers);
  const [icons, setIcons] = useState<Record<string, Icon | undefined>>({});

  useEffect(() => {
    setLocations(drivers);
  }, [drivers]);

  useEffect(() => {
    let mounted = true;
    if (typeof window !== "undefined") {
      import("leaflet").then((leaflet) => {
        if (!mounted) return;
        setIcons({
          active: new leaflet.Icon({
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          }),
          idle: new leaflet.Icon({
            iconUrl: "https://unpkg.com/pigeon-maps@0.21.0/assets/map-marker-green.png",
            iconSize: [30, 30],
            iconAnchor: [12, 30],
          }),
          offline: new leaflet.Icon({
            iconUrl: "https://unpkg.com/pigeon-maps@0.21.0/assets/map-marker-grey.png",
            iconSize: [30, 30],
            iconAnchor: [12, 30],
          }),
        });
      });
    }

    const unsubscribe = subscribeToDriverLocations((updates) => {
      if (!updates.length) return;
      setLocations((prev) =>
        prev.map((driver) => {
          const update = updates.find((item) => item.id === driver.id);
          if (!update) return driver;
          return {
            ...driver,
            lastKnownLocation: update.lastKnownLocation,
            status: "active",
          };
        })
      );
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const center = useMemo(() => {
    if (!locations.length) {
      return [6.5244, 3.3792];
    }
    const avgLat =
      locations.reduce((total, driver) => total + driver.lastKnownLocation.latitude, 0) /
      locations.length;
    const avgLng =
      locations.reduce((total, driver) => total + driver.lastKnownLocation.longitude, 0) /
      locations.length;
    return [avgLat, avgLng];
  }, [locations]);

  return (
    <section className="col-span-4 flex h-[420px] flex-col rounded-2xl border border-slate-800 bg-slate-900/60">
      <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Live Driver Map</h2>
          <p className="text-xs text-slate-400">Realtime location feed via Firebase</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Active</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> Idle</span>
        </div>
      </header>
      <div className="relative flex-1 overflow-hidden rounded-b-2xl">
        <MapContainer
          center={center as [number, number]}
          zoom={12}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {locations.map((driver) => (
            <Marker
              key={driver.id}
              position={[driver.lastKnownLocation.latitude, driver.lastKnownLocation.longitude]}
              icon={icons[driver.status] ?? icons.active}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-slate-900">{driver.name}</p>
                  <p className="text-slate-600">{driver.vehiclePlate}</p>
                  <p className="text-xs text-slate-500">Updated {new Date(driver.lastKnownLocation.updatedAt).toLocaleTimeString()}</p>
                  <p className="text-xs text-slate-500">Open orders: {driver.currentOrderIds.join(", ") || "None"}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}

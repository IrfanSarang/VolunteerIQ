"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import styles from "./page.module.css";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Incident {
  id: string;
  category: string;
  description: string;
  address: string;
  urgency_score: number;
  created_at: string;
  status: string;
  assigned_volunteer_id: string | null;
  latitude: number | null;
  longitude: number | null;
}

type FilterTab = "score" | "nearest" | "accepted";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function urgencyColor(score: number): string {
  if (score >= 8) return "#ef4444";
  if (score >= 5) return "#f97316";
  return "#22c55e";
}

function deriveTitle(category: string): string {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lat2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VolunteerPage() {
  const { user, profile, signOut } = useAuth();
  const role = profile?.role;
  const router = useRouter();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("score");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (user === null || profile === null) return;
    if (role !== "volunteer") router.replace("/login");
  }, [user, profile, role, router]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_online")
        .eq("id", user.id)
        .single();
      if (data) setIsOnline(data.is_online ?? false);
    })();
  }, [user]);

  const fetchIncidents = useCallback(async () => {
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .in("status", ["ai_scored", "reported", "assigned"])
      .order("urgency_score", { ascending: false });

    if (!error && data) setIncidents(data as Incident[]);
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    const channel = supabase
      .channel("incidents-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const incident = payload.new as Incident;
            if (["ai_scored", "reported"].includes(incident.status)) {
              setIncidents((prev) => {
                if (prev.find((i) => i.id === incident.id)) return prev;
                return [incident, ...prev];
              });
            }
          }

          if (payload.eventType === "UPDATE") {
            const updated = payload.new as Incident;
            setIncidents((prev) =>
              prev.map((i) => (i.id === updated.id ? updated : i))
            );
          }

          if (payload.eventType === "DELETE") {
            setIncidents((prev) => prev.filter((i) => i.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleToggleOnline = async () => {
    if (!user) return;
    const next = !isOnline;
    setIsOnline(next);
    await supabase.from("profiles").update({ is_online: next }).eq("id", user.id);
  };

  const handleAccept = async (incident: Incident) => {
    if (!user) return;
    setLoadingIds((s) => new Set(s).add(incident.id));

    await supabase
      .from("incidents")
      .update({ status: "assigned", assigned_volunteer_id: user.id })
      .eq("id", incident.id);

    await supabase.from("task_updates").insert({
      incident_id: incident.id,
      volunteer_id: user.id,
      action: "accepted",
    });

    setLoadingIds((s) => {
      const n = new Set(s);
      n.delete(incident.id);
      return n;
    });
  };

  const handleDecline = (incidentId: string) => {
    setIncidents((prev) => prev.filter((i) => i.id !== incidentId));
  };

  const handleArrived = async (incident: Incident) => {
    if (!user) return;
    await supabase.from("task_updates").insert({
      incident_id: incident.id,
      volunteer_id: user.id,
      action: "arrived",
    });
  };

  const handleComplete = async (incident: Incident) => {
    if (!user) return;

    await supabase
      .from("incidents")
      .update({ status: "resolved" })
      .eq("id", incident.id);

    await supabase.from("task_updates").insert({
      incident_id: incident.id,
      volunteer_id: user.id,
      action: "completed",
    });

    setIncidents((prev) => prev.filter((i) => i.id !== incident.id));
  };

  const openOSM = (incident: Incident) => {
    if (incident.latitude && incident.longitude) {
      window.open(
        `https://www.openstreetmap.org/directions?to=${incident.latitude},${incident.longitude}`,
        "_blank"
      );
    }
  };

  const filtered = (() => {
    let list = [...incidents];

    if (activeTab === "accepted") {
      list = list.filter((i) => i.assigned_volunteer_id === user?.id);
    } else if (activeTab === "nearest" && userLocation) {
      list = list
        .map((i) => ({
          ...i,
          _dist:
            i.latitude && i.longitude
              ? haversineKm(
                userLocation.lat,
                userLocation.lng,
                i.latitude,
                i.longitude
              )
              : Infinity,
        }))
        .sort((a: any, b: any) => a._dist - b._dist);
    } else {
      list = list.sort((a, b) => b.urgency_score - a.urgency_score);
    }

    return list;
  })();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Volunteer Dashboard</h1>

         <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={handleToggleOnline}>
            {isOnline ? "Online" : "Offline"}
          </button>
          <button onClick={signOut} style={{ background: 'none', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
            Sign Out
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        {(["score", "nearest", "accepted"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? styles.activeTab : ""}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* FEED */}
      <div className={styles.feed}>
        {filtered.length === 0 && (
          <p className={styles.empty}>No tasks available.</p>
        )}

        {!isOnline && (
          <p
            style={{
              fontSize: "0.75rem",
              color: "#f97316",
              textAlign: "center",
              margin: "8px 0",
            }}
          >
            Go online to accept tasks
          </p>
        )}

        {filtered.map((incident) => {
          const loading = loadingIds.has(incident.id);

          return (
            <div key={incident.id} className={styles.card}>
              <h3>{deriveTitle(incident.category)}</h3>
              <p>{incident.description}</p>

              <button
                disabled={loading || !isOnline}
                onClick={() => handleAccept(incident)}
              >
                Accept
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
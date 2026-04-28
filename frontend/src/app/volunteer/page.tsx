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
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VolunteerPage() {
  const { user, profile } = useAuth();
  const role = profile?.role;
  const router = useRouter();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("score");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ─── Auth Guard ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user === null || profile === null) return;
    if (role !== "volunteer") router.replace("/login");
  }, [user, profile, role, router]);

  // ─── Browser Geolocation ───────────────────────────────────────────────────

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, []);

  // ─── Load Online Status ────────────────────────────────────────────────────

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

  // ─── Fetch Incidents ───────────────────────────────────────────────────────

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

  // ─── Realtime Subscription ─────────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel('incidents-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const incident = payload.new as Incident;
            if (["ai_scored", "reported"].includes(incident.status)) {
              setIncidents((prev) => {
                if (prev.find((i) => i.id === incident.id)) return prev;
                return [incident, ...prev];
              });
            }
          }
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Incident;
            setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
          }
          if (payload.eventType === 'DELETE') {
            setIncidents(prev => prev.filter(i => i.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ─── Online / Offline Toggle ───────────────────────────────────────────────

  const handleToggleOnline = async () => {
    if (!user) return;
    const next = !isOnline;
    setIsOnline(next);
    await supabase
      .from("profiles")
      .update({ is_online: next })
      .eq("id", user.id);
  };

  // ─── Accept ───────────────────────────────────────────────────────────────

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
    setLoadingIds((s) => { const n = new Set(s); n.delete(incident.id); return n; });
  };

  // ─── Decline ──────────────────────────────────────────────────────────────

  const handleDecline = (incidentId: string) => {
    setIncidents((prev) => prev.filter((i) => i.id !== incidentId));
  };

  // ─── Arrived ─────────────────────────────────────────────────────────────

  const handleArrived = async (incident: Incident) => {
    if (!user) return;
    await supabase.from("task_updates").insert({
      incident_id: incident.id,
      volunteer_id: user.id,
      action: "arrived",
    });
  };

  // ─── Complete ─────────────────────────────────────────────────────────────

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

  // ─── Open OSM ─────────────────────────────────────────────────────────────

  const openOSM = (incident: Incident) => {
    if (incident.latitude && incident.longitude) {
      window.open(
        `https://www.openstreetmap.org/directions?to=${incident.latitude},${incident.longitude}`,
        "_blank"
      );
    }
  };

  // ─── Filtered & Sorted List ───────────────────────────────────────────────

  const filtered = (() => {
    let list = [...incidents];

    if (activeTab === "accepted") {
      list = list.filter((i) => i.assigned_volunteer_id === user?.id);
    } else if (activeTab === "nearest" && userLocation) {
      list = list
        .filter((i) => i.status !== "resolved")
        .map((i) => ({
          ...i,
          _dist:
            i.latitude && i.longitude
              ? haversineKm(userLocation.lat, userLocation.lng, i.latitude, i.longitude)
              : Infinity,
        }))
        .sort((a: any, b: any) => a._dist - b._dist);
    } else {
      // score: default, filter out resolved (unless accepted tab)
      list = list
        .filter((i) => i.status !== "resolved")
        .sort((a, b) => b.urgency_score - a.urgency_score);
    }

    return list;
  })();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.heading}>Volunteer Dashboard</h1>
        <div className={styles.toggleWrapper}>
          <span className={styles.toggleLabel}>
            {isOnline ? "Online" : "Offline"}
          </span>
          <button
            className={`${styles.toggleBtn} ${isOnline ? styles.toggleOn : styles.toggleOff}`}
            onClick={handleToggleOnline}
            aria-label="Toggle online status"
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={styles.tabs}>
        {(["score", "nearest", "accepted"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "score"
              ? "AI Score (High to Low)"
              : tab === "nearest"
                ? "Nearest"
                : "Accepted"}
          </button>
        ))}
      </div>

      {/* Task Feed */}
      <div className={styles.feed}>
        {filtered.length === 0 && (
          <p className={styles.empty}>No tasks available.</p>
        )}

        {filtered.map((incident) => {
          const isAccepted =
            incident.status === "assigned" &&
            incident.assigned_volunteer_id === user?.id;
          const loading = loadingIds.has(incident.id);
          const dist =
            userLocation && incident.latitude && incident.longitude
              ? haversineKm(
                userLocation.lat,
                userLocation.lng,
                incident.latitude,
                incident.longitude
              ).toFixed(1) + " km"
              : "—";

          return (
            <div
              key={incident.id}
              className={styles.card}
              style={{ borderLeftColor: urgencyColor(incident.urgency_score) }}
            >
              {/* Card Top */}
              <div className={styles.cardTop}>
                <div>
                  <h2 className={styles.cardTitle}>
                    {deriveTitle(incident.category)}
                  </h2>
                  <p className={styles.cardAddress}>{incident.address}</p>
                </div>
                <div className={styles.cardMeta}>
                  <span
                    className={styles.scoreBadge}
                    style={{ backgroundColor: urgencyColor(incident.urgency_score) }}
                  >
                    AI SCORE: {incident.urgency_score}/10
                  </span>
                  {isAccepted && (
                    <span className={styles.acceptedBadge}>ACCEPTED</span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className={styles.cardDesc}>{incident.description}</p>

              {/* Footer row */}
              <div className={styles.cardFooter}>
                <span className={styles.metaInfo}>📍 {dist}</span>
                <span className={styles.metaInfo}>
                  🕐 {timeAgo(incident.created_at)}
                </span>
                <button
                  className={styles.osmBtn}
                  onClick={() => openOSM(incident)}
                  title="Open in OpenStreetMap"
                >
                  🗺 Navigate
                </button>
              </div>

              {/* Action Buttons */}
              <div className={styles.actions}>
                {!isAccepted ? (
                  <>
                    <button
                      className={styles.btnAccept}
                      disabled={loading || !isOnline}
                      onClick={() => handleAccept(incident)}
                    >
                      {loading ? "Accepting…" : "Accept"}
                    </button>
                    <button
                      className={styles.btnDecline}
                      onClick={() => handleDecline(incident.id)}
                    >
                      Decline
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={styles.btnArrived}
                      onClick={() => handleArrived(incident)}
                    >
                      Arrived
                    </button>
                    <button
                      className={styles.btnComplete}
                      onClick={() => handleComplete(incident)}
                    >
                      Complete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
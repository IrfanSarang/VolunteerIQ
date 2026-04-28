"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

interface Incident {
  id: string;
  description: string;
  urgency_score: number;
  category: string;
  status: string;
  latitude?: number;
  longitude?: number;
  reported_at?: string;
  updated_at?: string;
}

interface Volunteer {
  id: string;
  full_name: string;
  skills: string[];
  latitude?: number;
  longitude?: number;
  is_online?: boolean;
}

function urgencyColor(score: number) {
  if (score >= 8) return "#ef4444";
  if (score >= 5) return "#f97316";
  return "#22c55e";
}

export default function AdminPage() {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [assignModal, setAssignModal] = useState<Incident | null>(null);
  const { signOut, user, profile } = useAuth();
  const router = useRouter();

  // 🔒 ROLE GUARD — redirects non-admins away
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.role !== 'admin') {
      router.replace('/login');
    }
  }, [user, profile, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [{ data: inc, error: incErr }, { data: vol, error: volErr }] = await Promise.all([
          supabase.from("incidents").select("*").order("created_at", { ascending: false }),
          supabase.from("profiles").select("*").eq("role", "volunteer"),
        ]);

        if (incErr) console.error("Error fetching incidents:", incErr);
        if (volErr) console.error("Error fetching volunteers:", volErr);

        setIncidents(inc || []);
        setVolunteers(vol || []);
      } catch (err) {
        console.error("Critical error in fetchData:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    const channel = supabase
      .channel("admin-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        (payload) => {
          if (payload.eventType === "INSERT") setIncidents(prev => [payload.new as Incident, ...prev]);
          if (payload.eventType === "UPDATE") setIncidents(prev => prev.map(i => i.id === payload.new.id ? payload.new as Incident : i));
          if (payload.eventType === "DELETE") setIncidents(prev => prev.filter(i => i.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const L = require("leaflet");

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([20.5937, 78.9629], 5);
    mapRef.current = map;

    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      map.setView([coords.latitude, coords.longitude], 10);
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const L = require("leaflet");
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer((layer: any) => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    incidents.forEach((inc) => {
      if (!inc.latitude || !inc.longitude) return;
      const color = urgencyColor(inc.urgency_score);

      L.circleMarker([inc.latitude, inc.longitude], {
        radius: 28, color, fillColor: color, fillOpacity: 0.12, weight: 0,
      }).addTo(map);
      L.circleMarker([inc.latitude, inc.longitude], {
        radius: 16, color, fillColor: color, fillOpacity: 0.2, weight: 0,
      }).addTo(map);
      L.circleMarker([inc.latitude, inc.longitude], {
        radius: 8, color, fillColor: color, fillOpacity: 0.85, weight: 2,
      })
        .bindPopup(`<b>${inc.status.toUpperCase()}</b><br/>Urgency: <b>${inc.urgency_score}/10</b><br/>${inc.description}`)
        .addTo(map);
    });

    volunteers.forEach((vol) => {
      if (!vol.latitude || !vol.longitude) return;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:32px;border-radius:50%;background:#3b82f6;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 6px rgba(0,0,0,0.3)"><span class='material-symbols-outlined' style='color:#fff;font-size:18px'>person</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker([vol.latitude, vol.longitude], { icon })
        .bindPopup(`<b>${vol.full_name}</b><br/>Skills: ${(vol.skills || []).join(", ") || "—"}`)
        .addTo(map);
    });
  }, [incidents, volunteers]);

  async function handleExport() {
    setExporting(true);
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: incs, error } = await supabase.from("incidents").select("*").eq("status", "resolved").gte("updated_at", since);
      if (error) { alert("Export failed"); return; }
      const rows: Incident[] = incs || [];
      const header = ["ID", "Category", "Urgency", "Status", "Description"];
      const csvContent = [header.join(","), ...rows.map(inc => [inc.id, inc.category, inc.urgency_score, inc.status, `"${inc.description}"`].join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setExporting(false);
    }
  }

  async function handleAssign(incidentId: string, volunteerId: string) {
    await supabase.from("incidents").update({ status: "assigned", assigned_volunteer_id: volunteerId }).eq("id", incidentId);
    setAssignModal(null);
  }

  return (
    <div className={styles.dashboardLayout}>
      <header className={styles.topBar}>
        <div className={styles.topBarLogo}>VolunteerIQ</div>
        <div className={styles.topBarActions}>
          <button className={styles.iconBtn}>
            <span className="material-symbols-outlined">notifications</span>
            <span className={styles.notifDot} />
          </button>
          <button className={styles.iconBtn}>
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button className={styles.avatarBtn} onClick={signOut} title="Sign Out">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      <div className={styles.mainArea}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarProfile}>
            <div className={styles.profileIcon}>
              <span className="material-symbols-outlined">admin_panel_settings</span>
            </div>
            <div className={styles.sidebarTitle}>Admin Command</div>
            <div className={styles.sidebarSubtitle}>Global Oversight</div>
          </div>
          <nav className={styles.sidebarNav}>
            <button className={`${styles.navItem} ${styles.navItemActive}`}>
              <span className="material-symbols-outlined">map</span> Live Map
            </button>
            <button className={styles.navItem}>
              <span className="material-symbols-outlined">analytics</span> Statistics
            </button>
            <button className={styles.navItem}>
              <span className="material-symbols-outlined">group</span> Volunteers
            </button>
          </nav>
          <div className={styles.sidebarFooter}>
            <button className={styles.exportBtn} onClick={handleExport} disabled={exporting}>
              <span className="material-symbols-outlined">download</span>
              {exporting ? "Exporting..." : "Export Impact"}
            </button>
          </div>
        </aside>

        <div className={styles.mapContainer}>
          <div ref={containerRef} className={styles.mapVisual} style={{ width: "100%", height: "100%" }} />
        </div>

        <aside className={styles.rightPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderLeft}>
              <div className={styles.panelHeaderIcon}>🔥</div>
              <div className={styles.panelTitle}>Top Urgent</div>
            </div>
          </div>
          <div className={styles.actionItems}>
            {incidents.filter(i => i.status !== "resolved").sort((a, b) => b.urgency_score - a.urgency_score).slice(0, 5).map((inc) => (
              <div key={inc.id} className={styles.actionItem}>
                <div className={styles.itemHeader}>
                  <span className={`${styles.itemTag} ${inc.urgency_score >= 8 ? styles.tagMedical : styles.tagLogistics}`}>
                    URGENCY {inc.urgency_score}/10
                  </span>
                </div>
                <div className={styles.itemTitle}>{inc.category || "Incident"}</div>
                <div className={styles.itemDesc}>{inc.description.slice(0, 60)}...</div>
                <div className={styles.itemFooter}>
                  <button className={styles.assignBtn} onClick={() => setAssignModal(inc)}>
                    Assign Volunteer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {assignModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#1e293b", padding: 24, borderRadius: 12, width: 440, border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 style={{ margin: "0 0 16px", color: "#fff" }}>Assign to {assignModal.category}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto" }}>
              {volunteers.map((vol) => (
                <div key={vol.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 600 }}>{vol.full_name}</div>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>{vol.skills?.join(", ")}</div>
                  </div>
                  <button onClick={() => handleAssign(assignModal.id, vol.id)} style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer" }}>Assign</button>
                </div>
              ))}
            </div>
            <button onClick={() => setAssignModal(null)} style={{ marginTop: 16, width: "100%", background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", padding: 10, borderRadius: 6, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
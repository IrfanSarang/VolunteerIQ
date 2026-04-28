"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

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

// ─── Supabase client (adjust import to your project) ─────────────────────────
// import { supabase } from "@/lib/supabase";
// For now we'll import it inline — replace with your actual client:
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function exportImpactCSV() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: incidents, error } = await supabase
    .from("incidents")
    .select("*")
    .eq("status", "resolved")
    .gte("updated_at", since);

  if (error) {
    alert("Failed to fetch incidents: " + error.message);
    return;
  }

  const rows: Incident[] = incidents || [];
  const header = ["ID", "Category", "Urgency", "Status", "Description", "Reported At", "Resolved At"];
  const csvContent = [
    header.join(","),
    ...rows.map(inc => [
      inc.id,
      inc.category || "",
      inc.urgency_score || 0,
      inc.status || "",
      `"${(inc.description || "").replace(/"/g, '""')}"`,
      inc.reported_at || "",
      inc.updated_at || ""
    ].join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `VolunteerIQ_Impact_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Admin Page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [assignModal, setAssignModal] = useState<Incident | null>(null);

  // Derived stats
  const total = incidents.length;
  const resolved = incidents.filter((i) => i.status === "resolved").length;
  const highUrgency = incidents.filter((i) => i.urgency_score >= 8).length;
  const onlineVols = volunteers.filter((v) => v.is_online).length;

  // ── Fetch data & Subscriptions ──
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [{ data: inc }, { data: vol }] = await Promise.all([
        supabase.from("incidents").select("*").order("reported_at", { ascending: false }),
        supabase.from("volunteers").select("*"),
      ]);
      setIncidents(inc || []);
      setVolunteers(vol || []);
      setLoading(false);
    }
    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel('admin-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setIncidents(prev => [payload.new as Incident, ...prev]);
          }
          if (payload.eventType === 'UPDATE') {
            setIncidents(prev =>
              prev.map(i => i.id === payload.new.id ? payload.new as Incident : i)
            );
          }
          if (payload.eventType === 'DELETE') {
            setIncidents(prev => prev.filter(i => i.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Map ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const L = require("leaflet");

    // Leaflet icon fix
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

  // ── Export handler ──
  async function handleExport() {
    setExporting(true);
    try {
      await exportImpactCSV();
    } finally {
      setExporting(false);
    }
  }

  // ── Assign handler ──
  async function handleAssign(incidentId: string, volunteerId: string) {
    await supabase.from("incidents").update({ status: "assigned", assigned_volunteer_id: volunteerId }).eq("id", incidentId);
    setIncidents(prev => prev.map(i => i.id === incidentId ? { ...i, status: "assigned" } : i));
    setAssignModal(null);
  }

  // ── UI ──
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Top Bar */}
      <div style={{
        background: "#1e293b",
        padding: "16px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      }}>
        <div>
          <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.3px" }}>
            VolunteerIQ
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 12, margin: "2px 0 0", fontWeight: 400 }}>
            Admin Dashboard
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            background: exporting ? "#475569" : "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontWeight: 600,
            fontSize: 14,
            cursor: exporting ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "background 0.2s",
          }}
        >
          <span style={{ fontSize: 16 }}>📄</span>
          {exporting ? "Generating..." : "Export CSV"}
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, padding: "24px 28px 0" }}>
        {[
          { label: "Total Incidents", value: loading ? "—" : total, color: "#3b82f6", icon: "🚨" },
          { label: "Resolved", value: loading ? "—" : resolved, color: "#22c55e", icon: "✅" },
          { label: "High Urgency", value: loading ? "—" : highUrgency, color: "#ef4444", icon: "⚡" },
          { label: "Online Volunteers", value: loading ? "—" : onlineVols, color: "#f97316", icon: "🙋" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "18px 20px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              borderLeft: `4px solid ${stat.color}`,
            }}
          >
            <div style={{ fontSize: 24 }}>{stat.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", marginTop: 4 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Map & Top 3 Right Panel */}
      <div style={{ display: "flex", gap: 20, padding: "20px 28px 28px" }}>
        {/* Map */}
        <div style={{
          flex: 1,
          background: "#fff",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          border: "1px solid #e2e8f0",
        }}>
          <div style={{
            padding: "14px 18px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>🗺️</span>
            <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 15 }}>Live Incident Map</span>
            <span style={{
              marginLeft: "auto",
              fontSize: 11,
              background: "#f1f5f9",
              color: "#64748b",
              padding: "3px 10px",
              borderRadius: 20,
            }}>
              🔴 High &nbsp; 🟠 Medium &nbsp; 🟢 Low &nbsp; 🔵 Volunteer
            </span>
          </div>
          <div ref={containerRef} style={{ width: "100%", height: 460, zIndex: 0 }} />
        </div>

        {/* Right Panel: Top 3 Urgency */}
        <div style={{
          width: 320,
          background: "#fff",
          borderRadius: 14,
          padding: 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
        }}>
          <h3 style={{ margin: "0 0 16px", color: "#1e293b", fontSize: 16 }}>🔥 Top 3 Urgent Incidents</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", maxHeight: 420 }}>
            {incidents.filter(i => i.status !== "resolved")
              .sort((a,b) => b.urgency_score - a.urgency_score)
              .slice(0, 3)
              .map(inc => (
                <div key={inc.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>{inc.category || "General"}</span>
                    <span style={{ color: urgencyColor(inc.urgency_score), fontWeight: 700, fontSize: 13 }}>{inc.urgency_score}/10</span>
                  </div>
                  <p style={{ margin: "0 0 10px", fontSize: 13, color: "#64748b", lineHeight: 1.4 }}>{inc.description.slice(0, 60)}{inc.description.length > 60 ? "..." : ""}</p>
                  <button 
                    onClick={() => setAssignModal(inc)}
                    style={{ background: "#f1f5f9", color: "#3b82f6", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%", transition: "0.2s" }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#e2e8f0"}
                    onMouseOut={(e) => e.currentTarget.style.background = "#f1f5f9"}
                  >
                    Assign Volunteer
                  </button>
                </div>
            ))}
            {incidents.length === 0 && <p style={{ fontSize: 14, color: "#94a3b8" }}>No active incidents.</p>}
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div style={{ padding: "0 28px 40px" }}>
        <div style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0" }}>
            <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 15 }}>
              📋 Recent Incidents
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["ID", "Category", "Urgency", "Status", "Description"].map((h) => (
                    <th key={h} style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      color: "#64748b",
                      fontWeight: 600,
                      borderBottom: "1px solid #e2e8f0",
                      whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
                      Loading incidents...
                    </td>
                  </tr>
                ) : incidents.slice(0, 10).map((inc, i) => (
                  <tr key={inc.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "10px 14px", color: "#475569", fontFamily: "monospace" }}>
                      {inc.id.slice(0, 8)}…
                    </td>
                    <td style={{ padding: "10px 14px", color: "#1e293b" }}>
                      {inc.category || "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        background: urgencyColor(inc.urgency_score) + "20",
                        color: urgencyColor(inc.urgency_score),
                        padding: "2px 10px",
                        borderRadius: 20,
                        fontWeight: 700,
                        fontSize: 12,
                      }}>
                        {inc.urgency_score}/10
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        background: inc.status === "resolved" ? "#dcfce7" : "#fef3c7",
                        color: inc.status === "resolved" ? "#166534" : "#92400e",
                        padding: "2px 10px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                      }}>
                        {inc.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#475569", maxWidth: 260 }}>
                      {(inc.description || "—").slice(0, 80)}
                      {inc.description?.length > 80 ? "…" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, width: 440, boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 16px", color: "#1e293b", fontSize: 18 }}>Assign Volunteer to {assignModal.category || "Incident"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto", paddingRight: 8 }}>
              {volunteers.map(vol => (
                <div key={vol.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", border: "1px solid #e2e8f0", borderRadius: 8, background: vol.is_online ? "#fff" : "#f8fafc" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>
                      {vol.full_name} {vol.is_online && <span style={{ color: "#22c55e", fontSize: 10 }}>● Online</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Skills: {vol.skills?.join(", ") || "None"}</div>
                  </div>
                  <button 
                    onClick={() => handleAssign(assignModal.id, vol.id)} 
                    style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: 600, cursor: "pointer", transition: "0.2s" }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#2563eb"}
                    onMouseOut={(e) => e.currentTarget.style.background = "#3b82f6"}
                  >
                    Assign
                  </button>
                </div>
              ))}
              {volunteers.length === 0 && <p style={{ color: "#94a3b8", fontSize: 14 }}>No volunteers available.</p>}
            </div>
            <button 
              onClick={() => setAssignModal(null)} 
              style={{ marginTop: 20, width: "100%", padding: 12, background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", transition: "0.2s" }}
              onMouseOver={(e) => e.currentTarget.style.background = "#e2e8f0"}
              onMouseOut={(e) => e.currentTarget.style.background = "#f1f5f9"}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
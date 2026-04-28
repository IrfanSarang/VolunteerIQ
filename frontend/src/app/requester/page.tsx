"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const navItems = [
  { icon: "sensors", label: "Live Feed" },
  { icon: "radar", label: "Volunteer Radar" },
  { icon: "assessment", label: "Impact Reports" },
  { icon: "monitor_heart", label: "System Health" },
];

export default function RequesterPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.role !== 'requester' && profile.role !== 'receiver') {
      router.replace('/login');
    }
  }, [user, profile, router]);

  const [activeNav, setActiveNav] = useState(-1);
  const [reportText, setReportText] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [latestIncident, setLatestIncident] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const audioInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- GEOLOCATION ---------------- */
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
        alert("Location access denied");
      }
    );
  };

  /* ---------------- FETCH LATEST INCIDENT ---------------- */
  useEffect(() => {
    if (!user) return;

    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setLatestIncident(data);
      }
    };

    fetchLatest();
  }, [user]);

  /* ---------------- REALTIME ---------------- */
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("requester-incidents")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "incidents",
          filter: `requester_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setLatestIncident(payload.new as any);
          }
          if (payload.eventType === "DELETE") {
            setLatestIncident(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  /* ---------------- SUBMIT ---------------- */
  const handleSubmitReport = async () => {
    if (!user || !reportText.trim()) return;

    setSubmitting(true);

    const { data, error } = await supabase
      .from("incidents")
      .insert({
        requester_id: user.id,
        description: reportText,
        status: "reported",
        category: "other",
        address: "User Location",
        latitude: userLocation?.lat ?? null,
        longitude: userLocation?.lng ?? null,
      })
      .select()
      .single();

    if (!error && data) {
      setLatestIncident(data);
      setReportText("");
    }

    setSubmitting(false);
  };

  /* ---------------- SPEECH ---------------- */
  const { startListening, stopListening, isListening, isSupported } =
    useSpeechRecognition({
      onTranscript: (text) => {
        setReportText((prev) => prev + (prev ? " " : "") + text);
      },
    });

  const handleMicClick = () => {
    if (!isSupported) return;
    isListening ? stopListening() : startListening();
  };

  /* ---------------- AUDIO ---------------- */
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const incidentId = latestIncident?.id || crypto.randomUUID();
    const path = `${user?.id || "anonymous"}/${incidentId}.webm`;

    await supabase.storage.from("voice-notes").upload(path, file, { upsert: true });

    e.target.value = "";
  };

  /* ---------------- UI ---------------- */
  return (
    <div className={styles.dashboardLayout}>
      <header className={styles.topBar}>
        <div className={styles.topBarLogo}>VolunteerIQ</div>
        <button
          onClick={signOut}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          <span className="material-symbols-outlined">logout</span>
          Sign Out
        </button>
      </header>

      <div className={styles.mainArea}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <nav className={styles.sidebarNav}>
            {navItems.map((item, i) => (
              <button
                key={item.label}
                className={`${styles.navItem} ${i === activeNav ? styles.navItemActive : ""}`}
                onClick={() => setActiveNav(i)}
              >
                <span className="material-symbols-outlined">
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ✅ CENTER CONTENT FIX */}
        <div className={styles.centerContent}>
          {activeNav === -1 && (
            <div style={{ padding: 24, color: "#64748b", textAlign: "center" }}>
              Select a view from the sidebar
            </div>
          )}

          {activeNav === 0 && (
            <div style={{ padding: 24, color: "#94a3b8" }}>
              <h3>Live Feed</h3>
              <p>Real-time incident updates appear here.</p>
            </div>
          )}

          {activeNav === 1 && (
            <div style={{ padding: 24, color: "#94a3b8" }}>
              <h3>Volunteer Radar</h3>
              <p>Active volunteer locations shown here.</p>
            </div>
          )}

          {activeNav === 2 && (
            <div style={{ padding: 24, color: "#94a3b8" }}>
              <h3>Impact Reports</h3>
              <p>Analytics and reports will appear here.</p>
            </div>
          )}

          {activeNav === 3 && (
            <div style={{ padding: 24, color: "#94a3b8" }}>
              <h3>System Health</h3>
              <p>System metrics and uptime info here.</p>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <aside className={styles.rightPanel}>
          <div className={styles.incidentCard}>
            <h2>New Incident Report</h2>

            <textarea
              placeholder="Describe the situation..."
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
            />

            <button onClick={handleMicClick}>
              {isListening ? "Stop Mic" : "Start Mic"}
            </button>

            <button onClick={handleLocateMe}>
              {locationLoading
                ? "Locating..."
                : userLocation
                  ? "Location Set ✓"
                  : "Use My Location"}
            </button>

            <button
              onClick={handleSubmitReport}
              disabled={submitting || !reportText.trim()}
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>

            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              style={{ display: "none" }}
              onChange={handleAudioUpload}
            />
          </div>

          <div className={styles.statusCard}>
            <div>
              {latestIncident
                ? `INC-${latestIncident.id.slice(0, 4).toUpperCase()}`
                : "NO ACTIVE REPORT"}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
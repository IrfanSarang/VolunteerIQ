"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { icon: "sensors", label: "Live Feed" },
  { icon: "radar", label: "Volunteer Radar" },
  { icon: "assessment", label: "Impact Reports" },
  { icon: "monitor_heart", label: "System Health" },
];

const progressSteps = [
  { icon: "check_circle", status: "completed", label: "Submitted" },
  { icon: "settings", status: "active", label: "Processing" },
  { icon: "group", status: "pending", label: "Assigned" },
  { icon: "verified", status: "pending", label: "Verified" },
];

// Dynamic values now handle the user and incident ids

export default function RequesterPage() {
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState(-1);
  const [reportText, setReportText] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [latestIncident, setLatestIncident] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    
    // Fetch latest incident
    const fetchLatest = async () => {
      const { data } = await supabase
        .from("incidents")
        .select("*")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) setLatestIncident(data);
    };
    fetchLatest();

    // Subscribe to changes on user's incidents
    const channel = supabase
      .channel("requester-incidents")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents", filter: `requester_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLatestIncident(payload.new);
          }
          if (payload.eventType === "UPDATE") {
            setLatestIncident(payload.new);
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
  }, [user, latestIncident?.id]);

  const handleSubmitReport = async () => {
    if (!user || !reportText.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("incidents")
      .insert({
        requester_id: user.id,
        description: reportText,
        status: "reported",
        category: "other", // Default fallback
        address: "User Location", // Default fallback
      })
      .select()
      .single();

    if (data) {
      setLatestIncident(data);
      setReportText("");
    }
    setSubmitting(false);
  };

  const { startListening, stopListening, isListening, isSupported } =
    useSpeechRecognition({
      onTranscript: (text) => {
        setReportText((prev) => prev + (prev ? " " : "") + text);
      },
    });

  const handleMicClick = () => {
    if (!isSupported) return;
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    setUploadError(null);

    // Simulate progress (Supabase JS v2 doesn't support real upload progress)
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null || prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    try {
      const incidentId = latestIncident?.id || "temp_incident";
      const path = `${user?.id || "anonymous"}/${incidentId}.webm`;
      const { error } = await supabase.storage
        .from("voice-notes")
        .upload(path, file, { upsert: true });

      clearInterval(progressInterval);

      if (error) {
        setUploadError("Upload failed: " + error.message);
        setUploadProgress(null);
      } else {
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(null), 2000);
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setUploadError("Unexpected error during upload.");
      setUploadProgress(null);
    }

    // Reset input so same file can be re-uploaded if needed
    e.target.value = "";
  };

  return (
    <div className={styles.dashboardLayout}>
      {/* ---- Top Bar ---- */}
      <header className={styles.topBar}>
        <div className={styles.topBarLogo}>VolunteerIQ</div>
        <div className={styles.topBarActions}>
          <button className={styles.iconBtn} aria-label="Notifications">
            <span className="material-symbols-outlined">notifications</span>
            <span className={styles.notifDot} />
          </button>
          <button className={styles.iconBtn} aria-label="Settings">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button className={styles.avatarBtn} aria-label="Profile">
            <span className="material-symbols-outlined">person</span>
          </button>
        </div>
      </header>

      {/* ---- Main Area ---- */}
      <div className={styles.mainArea}>
        {/* ---- Sidebar ---- */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarProfile}>
            <div className={styles.sidebarTitleGroup}>
              <div className={styles.profileIcon}>
                <span className="material-symbols-outlined">hub</span>
              </div>
              <div className={styles.sidebarTitleText}>
                <div className={styles.sidebarTitle}>Command Center</div>
                <div className={styles.sidebarSubtitle}>Regional Sector Alpha</div>
              </div>
            </div>
          </div>

          <nav className={styles.sidebarNav}>
            {navItems.map((item, i) => (
              <button
                key={item.label}
                className={`${styles.navItem} ${i === activeNav ? styles.navItemActive : ""
                  }`}
                onClick={() => setActiveNav(i)}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className={styles.sidebarFooter}>
            <button className={styles.exportBtn}>
              <span className="material-symbols-outlined">download</span>
              Export Impact
            </button>
          </div>
        </aside>

        {/* ---- Center ---- */}
        <div className={styles.centerContent} />

        {/* ---- Right Panel ---- */}
        <aside className={styles.rightPanel}>
          {/* Active Alert Banner */}
          <div className={styles.alertBanner}>
            <span className={`material-symbols-outlined ${styles.alertIcon}`}>
              warning
            </span>
            <div className={styles.alertContent}>
              <div className={styles.alertTitle}>
                Active Alert: Heavy Flooding in Sector 4
              </div>
              <div className={styles.alertDesc}>
                Please prioritize water rescue and shelter requests in this area.
              </div>
            </div>
          </div>

          {/* New Incident Report */}
          <div className={styles.incidentCard}>
            <h2 className={styles.incidentTitle}>New Incident Report</h2>

            <div className={styles.textareaWrapper}>
              <textarea
                className={styles.incidentTextarea}
                placeholder="Describe the situation... (e.g., 'Need 50 packets of dry food...')"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
              />

              {/* Mic Button */}
              <div className={styles.micWrapper}>
                <button
                  className={`${styles.micBtn} ${isListening ? styles.micBtnActive : ""
                    }`}
                  aria-label="Voice input"
                  onClick={handleMicClick}
                  title={
                    !isSupported
                      ? "Voice input not supported in this browser"
                      : isListening
                        ? "Stop listening"
                        : "Start voice input"
                  }
                >
                  <span className="material-symbols-outlined">
                    {isListening ? "mic_off" : "mic"}
                  </span>
                </button>

                {/* Upload Audio fallback */}
                <button
                  className={styles.uploadAudioLink}
                  onClick={() => audioInputRef.current?.click()}
                  type="button"
                >
                  Upload Audio
                </button>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  style={{ display: "none" }}
                  onChange={handleAudioUpload}
                />
              </div>
            </div>

            {/* Upload progress */}
            {uploadProgress !== null && (
              <div className={styles.uploadProgressWrapper}>
                <div className={styles.uploadProgressBar}>
                  <div
                    className={styles.uploadProgressFill}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className={styles.uploadProgressText}>
                  {uploadProgress < 100
                    ? `Uploading... ${uploadProgress}%`
                    : "Upload complete ✓"}
                </span>
              </div>
            )}
            {uploadError && (
              <div className={styles.uploadError}>{uploadError}</div>
            )}

            <div className={styles.actionRow}>
              <button className={styles.locationBtn}>
                <span className="material-symbols-outlined">my_location</span>
                Use My Location
              </button>
              <button 
                className={styles.submitBtn} 
                onClick={handleSubmitReport}
                disabled={submitting || !reportText.trim()}
              >
                <span className="material-symbols-outlined">emergency</span>
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>

          {/* Recent Report Status */}
          <div className={styles.statusCard}>
            <div className={styles.statusHeader}>
              <div className={styles.statusTitle}>Recent Report Status</div>
              <span className={styles.incidentBadge}>
                {latestIncident ? `INC-${latestIncident.id.slice(0, 4).toUpperCase()}` : "NO ACTIVE REPORT"}
              </span>
            </div>

            <div className={styles.progressTracker}>
              {(() => {
                const status = latestIncident?.status || "none";
                const steps = [
                  { 
                    icon: "check_circle", 
                    status: status !== "none" ? "completed" : "pending", 
                    label: "Submitted" 
                  },
                  { 
                    icon: "settings", 
                    status: ["ai_scored", "assigned", "resolved"].includes(status) ? "completed" : (status === "reported" ? "active" : "pending"), 
                    label: "Processing" 
                  },
                  { 
                    icon: "group", 
                    status: ["resolved"].includes(status) ? "completed" : (status === "assigned" ? "active" : "pending"), 
                    label: "Assigned" 
                  },
                  { 
                    icon: "verified", 
                    status: status === "resolved" ? "completed" : "pending", 
                    label: "Resolved" 
                  },
                ];

                return steps.map((step, i) => (
                  <div key={step.label} className={styles.progressStep}>
                    <div
                      className={`${styles.stepCircle} ${step.status === "completed"
                          ? styles.stepCompleted
                          : step.status === "active"
                            ? styles.stepActive
                            : styles.stepPending
                        }`}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "1.1rem" }}
                      >
                        {step.icon}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className={`${styles.stepConnector} ${step.status === "completed"
                            ? styles.connectorCompleted
                            : styles.connectorPending
                          }`}
                      />
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
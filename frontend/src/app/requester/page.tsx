"use client";

import React, { useState } from "react";
import styles from "./page.module.css";

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

export default function RequesterPage() {
  const [activeNav, setActiveNav] = useState(-1);
  const [reportText, setReportText] = useState("");

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
                className={`${styles.navItem} ${i === activeNav ? styles.navItemActive : ""}`}
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

        {/* ---- Center (empty area) ---- */}
        <div className={styles.centerContent} />

        {/* ---- Right Panel ---- */}
        <aside className={styles.rightPanel}>
          {/* Active Alert Banner */}
          <div className={styles.alertBanner}>
            <span className={`material-symbols-outlined ${styles.alertIcon}`}>warning</span>
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
              <button className={styles.micBtn} aria-label="Voice input">
                <span className="material-symbols-outlined">mic</span>
              </button>
            </div>

            <div className={styles.actionRow}>
              <button className={styles.locationBtn}>
                <span className="material-symbols-outlined">my_location</span>
                Use My Location
              </button>
              <button className={styles.submitBtn}>
                <span className="material-symbols-outlined">emergency</span>
                Submit Report
              </button>
            </div>
          </div>

          {/* Recent Report Status */}
          <div className={styles.statusCard}>
            <div className={styles.statusHeader}>
              <div className={styles.statusTitle}>Recent Report Status</div>
              <span className={styles.incidentBadge}>INC-8492</span>
            </div>

            <div className={styles.progressTracker}>
              {progressSteps.map((step, i) => (
                <div key={step.label} className={styles.progressStep}>
                  <div
                    className={`${styles.stepCircle} ${
                      step.status === "completed"
                        ? styles.stepCompleted
                        : step.status === "active"
                          ? styles.stepActive
                          : styles.stepPending
                    }`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>
                      {step.icon}
                    </span>
                  </div>
                  {i < progressSteps.length - 1 && (
                    <div
                      className={`${styles.stepConnector} ${
                        step.status === "completed"
                          ? styles.connectorCompleted
                          : styles.connectorPending
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

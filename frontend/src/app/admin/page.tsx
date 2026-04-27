"use client";

import React, { useState } from "react";
import styles from "./page.module.css";

const navItems = [
  { icon: "sensors", label: "Live Feed" },
  { icon: "radar", label: "Volunteer Radar" },
  { icon: "assessment", label: "Impact Reports" },
  { icon: "monitor_heart", label: "System Health" },
];

const actionItems = [
  {
    type: "medical",
    tag: "URGENT MEDICAL",
    tagClass: styles.tagMedical,
    itemClass: styles.itemMedical,
    time: "2m ago",
    title: "Insulin Supply Required",
    desc: "Elderly patient stranded in Sector B requires immediate temperature-controlled insulin...",
    footerType: "assign",
    avatarCount: 1,
  },
  {
    type: "logistics",
    tag: "LOGISTICS",
    tagClass: styles.tagLogistics,
    itemClass: styles.itemLogistics,
    time: "15m ago",
    title: "Route Blockage Reported",
    desc: "Main arterial road 45 flooded. Rerouting required for all incoming supply convoys.",
    footerType: "viewMap",
    unitText: "0 units assigned",
  },
  {
    type: "evacuation",
    tag: "EVACUATION",
    tagClass: styles.tagEvacuation,
    itemClass: styles.itemEvacuation,
    time: "42m ago",
    title: "Community Center Prep",
    desc: "St. Jude's center needs 50 cots and blanket kits setup before nightfall.",
    footerType: "status",
    avatarCount: 2,
  },
];

export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState(0);

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
            <div className={styles.profileIcon}>
              <span className="material-symbols-outlined">hub</span>
            </div>
            <div className={styles.sidebarTitle}>Command Center</div>
            <div className={styles.sidebarSubtitle}>Regional Sector Alpha</div>
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

        {/* ---- Map Container ---- */}
        <div className={styles.mapContainer}>
          <div className={styles.mapVisual}>
            {/* Grid overlay */}
            <div className={styles.mapGrid} />

            {/* Road network */}
            <div className={styles.mapRoads}>
              <div className={`${styles.roadLine} ${styles.roadH1}`} />
              <div className={`${styles.roadLine} ${styles.roadH2}`} />
              <div className={`${styles.roadLine} ${styles.roadH3}`} />
              <div className={`${styles.roadLine} ${styles.roadV1}`} />
              <div className={`${styles.roadLine} ${styles.roadV2}`} />
              <div className={`${styles.roadLine} ${styles.roadV3}`} />
              <div className={`${styles.roadLine} ${styles.roadD1}`} />
              <div className={`${styles.roadLine} ${styles.roadD2}`} />
            </div>

            {/* Sector Badge */}
            <div className={styles.sectorBadge}>
              <div className={styles.sectorDot} />
              <span>SECTOR ALPHA ACTIVE</span>
            </div>

            {/* Map Controls */}
            <div className={styles.mapControls}>
              <button className={styles.mapControlBtn} aria-label="Zoom in">+</button>
              <button className={styles.mapControlBtn} aria-label="Zoom out">−</button>
              <div className={styles.mapControlDivider} />
              <button className={styles.mapControlBtn} aria-label="My location">
                <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>
                  my_location
                </span>
              </button>
            </div>

            {/* Map Markers */}
            <div className={`${styles.mapMarker} ${styles.marker1}`}>
              <div className={`${styles.markerIcon} ${styles.markerAlert}`}>
                <span className="material-symbols-outlined">warning</span>
              </div>
            </div>
            <div className={`${styles.mapMarker} ${styles.marker2}`}>
              <div className={`${styles.markerIcon} ${styles.markerInfo}`}>
                <span className="material-symbols-outlined">local_hospital</span>
              </div>
            </div>
            <div className={`${styles.mapMarker} ${styles.marker3}`}>
              <div className={`${styles.markerIcon} ${styles.markerWarning}`}>
                <span className="material-symbols-outlined">priority_high</span>
              </div>
            </div>
            <div className={`${styles.mapMarker} ${styles.marker4}`}>
              <div className={`${styles.markerIcon} ${styles.markerLocation}`}>
                <span className="material-symbols-outlined">location_on</span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Right Panel ---- */}
        <aside className={styles.rightPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderLeft}>
              <div className={styles.panelHeaderIcon}>
                <span className="material-symbols-outlined">dashboard</span>
              </div>
              <div className={styles.panelTitle}>
                AI Priority
                <br />
                Dashboard
              </div>
            </div>
            <div className={styles.panelBadge}>
              TOP 3 ACTION
              <br />
              ITEMS
            </div>
          </div>

          <div className={styles.actionItems}>
            {actionItems.map((item) => (
              <div key={item.title} className={`${styles.actionItem} ${item.itemClass}`}>
                <div className={styles.itemHeader}>
                  <span className={`${styles.itemTag} ${item.tagClass}`}>{item.tag}</span>
                  <span className={styles.itemTime}>
                    <span className="material-symbols-outlined">schedule</span>
                    {item.time}
                  </span>
                </div>
                <div className={styles.itemTitle}>{item.title}</div>
                <div className={styles.itemDesc}>{item.desc}</div>
                <div className={styles.itemFooter}>
                  <div className={styles.unitInfo}>
                    {item.avatarCount &&
                      Array.from({ length: item.avatarCount }).map((_, idx) => (
                        <div key={idx} className={styles.unitAvatar} />
                      ))}
                    {item.unitText && <span className={styles.unitText}>{item.unitText}</span>}
                  </div>
                  {item.footerType === "assign" && (
                    <button className={styles.assignBtn}>Assign Unit</button>
                  )}
                  {item.footerType === "viewMap" && (
                    <button className={styles.viewMapBtn}>View Map</button>
                  )}
                  {item.footerType === "status" && (
                    <button className={styles.assignBtn}>In Progress</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

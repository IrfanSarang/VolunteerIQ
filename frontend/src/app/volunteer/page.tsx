"use client";

import React, { useState } from "react";
import styles from "./page.module.css";

const navItems = [
  { icon: "sensors", label: "Live Feed" },
  { icon: "radar", label: "Volunteer Radar" },
  { icon: "assignment", label: "Tasks" },
  { icon: "monitor_heart", label: "System Health" },
];

const tasks = [
  {
    id: 1,
    aiScore: 9,
    scoreLevel: "high",
    distance: "0.4 miles away",
    time: "2m ago",
    title: "Medical Transport Required",
    desc: "Patient requires immediate transport to General Hospital. Non-critical but immobile. Requires vehicle with rear access.",
    address: "452 West Market St",
    addressSub: "Entrance B, Alleyway",
    status: "pending",
    urgency: "urgent",
  },
  {
    id: 2,
    aiScore: 6,
    scoreLevel: "medium",
    distance: "1.2 miles away",
    time: "8m ago",
    title: "Supply Drop: Water",
    desc: "Deliver 4 cases of bottled water to shelter location. Contact point is Coordinator Sarah.",
    address: "789 Riverside Dr",
    addressSub: "Community Shelter, Main Entrance",
    status: "accepted",
    urgency: "medium",
  },
  {
    id: 3,
    aiScore: 4,
    scoreLevel: "low",
    distance: "2.8 miles away",
    time: "25m ago",
    title: "Debris Clearing Assistance",
    desc: "Help needed clearing fallen tree branches from residential street. Bring work gloves if available.",
    address: "156 Oak Avenue",
    addressSub: "Near intersection with Pine St",
    status: "pending",
    urgency: "medium",
  },
];

const filterOptions = ["AI Score (High to Low)", "Nearest", "Accepted"];

export default function VolunteerPage() {
  const [activeNav, setActiveNav] = useState(2);
  const [activeFilter, setActiveFilter] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

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
        </aside>

        {/* ---- Content Panel ---- */}
        <main className={styles.contentPanel}>
          {/* Header */}
          <div className={styles.contentHeader}>
            <div className={styles.contentHeaderLeft}>
              <h1>Urgent Tasks</h1>
              <p>Active region: Downtown Sector</p>
            </div>

            <div className={styles.availabilityToggle}>
              <span className={styles.availabilityLabel}>Availability:</span>
              <button
                className={`${styles.toggleSwitch} ${isOnline ? styles.toggleSwitchActive : ""}`}
                onClick={() => setIsOnline(!isOnline)}
                aria-label="Toggle availability"
              >
                <div className={styles.toggleKnob}>
                  {isOnline && (
                    <span className="material-symbols-outlined">check</span>
                  )}
                </div>
              </button>
              <span
                className={`${styles.statusText} ${isOnline ? styles.statusOnline : styles.statusOffline}`}
              >
                {isOnline ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className={styles.filterTabs}>
            {filterOptions.map((filter, i) => (
              <button
                key={filter}
                className={`${styles.filterTab} ${i === activeFilter ? styles.filterTabActive : ""}`}
                onClick={() => setActiveFilter(i)}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Task List */}
          <div className={styles.taskList}>
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`${styles.taskCard} ${
                  task.urgency === "urgent" ? styles.taskCardUrgent : styles.taskCardMedium
                }`}
              >
                {/* Task Header */}
                <div className={styles.taskHeader}>
                  <div className={styles.taskMeta}>
                    <span
                      className={`${styles.aiScoreBadge} ${
                        task.scoreLevel === "high"
                          ? styles.scoreHigh
                          : task.scoreLevel === "medium"
                            ? styles.scoreMedium
                            : styles.scoreLow
                      }`}
                    >
                      <span className="material-symbols-outlined">warning</span>
                      AI SCORE: {task.aiScore}/10
                    </span>
                    <span className={styles.distanceText}>{task.distance}</span>
                  </div>
                  {task.status === "accepted" ? (
                    <span className={styles.acceptedBadge}>ACCEPTED</span>
                  ) : (
                    <span className={styles.taskTime}>{task.time}</span>
                  )}
                </div>

                {/* Task Body */}
                <div className={styles.taskTitle}>{task.title}</div>
                <div className={styles.taskDesc}>{task.desc}</div>

                {/* Location Bar */}
                <div className={styles.locationBar}>
                  <div className={styles.locationInfo}>
                    <div className={styles.locationPin}>
                      <span className="material-symbols-outlined">location_on</span>
                    </div>
                    <div className={styles.locationDetails}>
                      <span className={styles.locationAddr}>{task.address}</span>
                      <span className={styles.locationSub}>{task.addressSub}</span>
                    </div>
                  </div>
                  <button className={styles.mapBtn}>
                    <span className="material-symbols-outlined">map</span>
                    OSM
                  </button>
                </div>

                {/* Actions */}
                <div className={styles.taskActions}>
                  <button className={styles.acceptBtn}>
                    <span className="material-symbols-outlined">check_circle</span>
                    Accept
                  </button>
                  <button className={styles.declineBtn}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

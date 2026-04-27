"use client";

import React, { useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const roles = ["Volunteer", "Requestor", "Admin"];

export default function LoginPage() {
  const [activeRole, setActiveRole] = useState(0);

  return (
    <div className={styles.pageWrapper}>
      {/* Branding */}
      <div className={styles.branding}>
        <div className={styles.logoIcon}>
          <span className="material-symbols-outlined">volunteer_activism</span>
        </div>
        <div className={styles.logoText}>VolunteerIQ</div>
        <div className={styles.logoSubtext}>Authority and Precision in Coordination</div>
      </div>

      {/* Card */}
      <div className={styles.card}>
        {/* Role Selector */}
        <div className={styles.roleSection}>
          <div className={styles.roleLabel}>SELECT ROLE</div>
          <div className={styles.roleTabs}>
            {roles.map((role, i) => (
              <button
                key={role}
                className={`${styles.roleTab} ${i === activeRole ? styles.roleTabActive : ""}`}
                onClick={() => setActiveRole(i)}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Email Field */}
        <div className={styles.formGroup}>
          <div className={styles.formLabelRow}>
            <label className={styles.formLabel}>Email / Username</label>
          </div>
          <div className={styles.inputWrapper}>
            <span className={`material-symbols-outlined ${styles.inputIcon}`}>person</span>
            <input
              type="email"
              className={styles.formInput}
              placeholder="user@example.com"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className={styles.formGroup}>
          <div className={styles.formLabelRow}>
            <label className={styles.formLabel}>Password</label>
            <a href="#" className={styles.forgotLink}>Forgot Password?</a>
          </div>
          <div className={styles.inputWrapper}>
            <span className={`material-symbols-outlined ${styles.inputIcon}`}>lock</span>
            <input
              type="password"
              className={styles.formInput}
              placeholder="••••••••"
            />
          </div>
        </div>

        {/* Submit */}
        <button className={styles.submitBtn}>
          Login
          <span className="material-symbols-outlined">login</span>
        </button>

        <div className={styles.divider} />

        {/* Bottom Link */}
        <div className={styles.bottomLink}>
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </div>
      </div>

      {/* Footer Badge */}
      <div className={styles.footerBadge}>
        <span className="material-symbols-outlined">shield</span>
        Secure Institutional Access
      </div>
    </div>
  );
}

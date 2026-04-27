"use client";

import React, { useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const roles = [
  { icon: "assignment_ind", label: "Requestor" },
  { icon: "volunteer_activism", label: "Volunteer" },
  { icon: "admin_panel_settings", label: "Admin" },
];

export default function SignupPage() {
  const [activeRole, setActiveRole] = useState(1);
  const [agreed, setAgreed] = useState(false);

  return (
    <div className={styles.pageWrapper}>
      {/* Branding */}
      <div className={styles.branding}>
        <div className={styles.logoRow}>
          <span className={`material-symbols-outlined ${styles.logoIcon}`}>
            volunteer_activism
          </span>
          <span className={styles.logoText}>VolunteerIQ</span>
        </div>
        <h1 className={styles.heading}>Create your account</h1>
        <p className={styles.subheading}>Join our network of responders and coordinators.</p>
      </div>

      {/* Card */}
      <div className={styles.card}>
        {/* Role Selector */}
        <div className={styles.roleSection}>
          <div className={styles.roleLabel}>SELECT YOUR ROLE</div>
          <div className={styles.roleCards}>
            {roles.map((role, i) => (
              <button
                key={role.label}
                className={`${styles.roleCard} ${i === activeRole ? styles.roleCardActive : ""}`}
                onClick={() => setActiveRole(i)}
              >
                <span className="material-symbols-outlined">{role.icon}</span>
                {role.label}
              </button>
            ))}
          </div>
        </div>

        {/* Full Name */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Full Name</label>
          <div className={styles.inputWrapper}>
            <span className={`material-symbols-outlined ${styles.inputIcon}`}>person</span>
            <input
              type="text"
              className={styles.formInput}
              placeholder="Jane Doe"
            />
          </div>
        </div>

        {/* Email Address */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Email Address</label>
          <div className={styles.inputWrapper}>
            <span className={`material-symbols-outlined ${styles.inputIcon}`}>mail</span>
            <input
              type="email"
              className={styles.formInput}
              placeholder="jane.doe@example.com"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Phone Number</label>
          <div className={styles.inputWrapper}>
            <span className={`material-symbols-outlined ${styles.inputIcon}`}>call</span>
            <input
              type="tel"
              className={styles.formInput}
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>

        {/* Primary Skills */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Primary Skills <span className={styles.formLabelNote}>(Volunteer specific)</span>
          </label>
          <div className={styles.inputWrapper}>
            <span className={`material-symbols-outlined ${styles.inputIcon}`}>settings_accessibility</span>
            <input
              type="text"
              className={styles.formInput}
              placeholder="e.g., First Aid, Logistics, Translation"
            />
          </div>
        </div>

        {/* Password */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Password</label>
          <div className={styles.inputWrapper}>
            <span className={`material-symbols-outlined ${styles.inputIcon}`}>lock</span>
            <input
              type="password"
              className={styles.formInput}
              placeholder="••••••••"
            />
          </div>
        </div>

        {/* Terms Checkbox */}
        <div className={styles.checkboxRow}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            id="terms"
          />
          <label htmlFor="terms" className={styles.checkboxText}>
            I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </label>
        </div>

        {/* Submit */}
        <button className={styles.submitBtn}>
          Create Account
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>

        {/* Bottom Link */}
        <div className={styles.bottomLink}>
          Already have an account? <Link href="/login">Login here</Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError || !data.user) {
        if (signInError?.message === "Failed to fetch") {
          setError("Cannot connect to database. Please check your Supabase configuration.");
        } else {
          setError(signInError?.message || "Login failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        setError("Could not fetch user profile. Please contact support.");
        setLoading(false);
        return;
      }

      router.push(`/${profile.role}`);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.branding}>
        <div className={styles.logoIcon}>
          <span className="material-symbols-outlined">hub</span>
        </div>
        <div className={styles.logoText}>VolunteerIQ</div>
        <div className={styles.logoSubtext}>Secure Access Portal</div>
      </div>

      <div className={styles.card}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <div className={styles.formLabelRow}>
              <label className={styles.formLabel} htmlFor="email">Email Address</label>
            </div>
            <div className={styles.inputWrapper}>
              <span className={`material-symbols-outlined ${styles.inputIcon}`}>mail</span>
              <input
                id="email"
                type="email"
                className={styles.formInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.formLabelRow}>
              <label className={styles.formLabel} htmlFor="password">Password</label>
              <a href="#" className={styles.forgotLink}>Forgot?</a>
            </div>
            <div className={styles.inputWrapper}>
              <span className={`material-symbols-outlined ${styles.inputIcon}`}>lock</span>
              <input
                id="password"
                type="password"
                className={styles.formInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                color: "#c62828",
                fontSize: "0.85rem",
                marginTop: "1rem",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : "Sign In"}
            {!loading && <span className="material-symbols-outlined">login</span>}
          </button>
        </form>

        <div className={styles.divider} />

        <div className={styles.bottomLink}>
          Don't have an account?{" "}
          <a href="/signup">Sign up</a>
        </div>
      </div>

      <div className={styles.footerBadge}>
        <span className="material-symbols-outlined">shield</span>
        Protected by enterprise-grade security
      </div>
    </div>
  );
}
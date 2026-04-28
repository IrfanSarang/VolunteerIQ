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
      console.log("Attempting sign in for:", email);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError || !data.user) {
        console.error("Sign in error:", signInError);
        if (signInError?.message === "Failed to fetch") {
          setError("Cannot connect to database. Please check your Supabase configuration.");
        } else {
          setError(signInError?.message || "Login failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      console.log("Sign in successful, fetching profile for:", data.user.id);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        console.error("Profile fetch error:", profileError);
        setError("Could not fetch user profile. Please contact support.");
        setLoading(false);
        return;
      }

      console.log("Profile found, role:", profile.role);
      
      // Normalize role and determine target path
      const role = (profile.role || "").toLowerCase().trim();
      let targetPath = `/${role}`;
      
      if (role === "receiver" || role === "requester") {
        targetPath = "/requester";
      } else if (role === "volunteer" || role === "volunterr") {
        targetPath = "/volunteer";
      } else if (role === "admin") {
        targetPath = "/admin";
      } else {
        console.warn("Unknown role detected, falling back to root:", role);
        targetPath = "/";
      }

      console.log("Redirecting to target path:", targetPath);
      router.push(targetPath);
      // Fallback: forcefully change location if router.push fails to trigger
      setTimeout(() => {
        if (window.location.pathname === "/login") {
          console.log("Router push might have stalled, using window.location...");
          window.location.href = targetPath;
        }
      }, 2000);
    } catch (err: any) {
      console.error("Unexpected login error:", err);
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
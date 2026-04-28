"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./page.module.css";


type Role = "volunteer" | "requester";

interface FormErrors {
  full_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  skills?: string;
  role?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [skills, setSkills] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!fullName.trim()) newErrors.full_name = "Full name is required.";
    if (!email.trim()) newErrors.email = "Email is required.";
    if (!phone.trim()) newErrors.phone = "Phone is required.";
    if (password.length < 6) newErrors.password = "Password must be at least 6 characters.";
    if (!skills.trim() && role === "volunteer") newErrors.skills = "Please enter at least one skill.";
    if (!role) newErrors.role = "Please select a role.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError || !data.user) {
        if (signUpError?.message === "Failed to fetch") {
          setSubmitError("Cannot connect to database. Please check your Supabase configuration.");
        } else {
          setSubmitError(signUpError?.message || "Signup failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        phone,
        role,
        skills: skills ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });

      if (profileError) {
        setSubmitError(profileError.message || "Failed to create profile.");
        setLoading(false);
        return;
      }

      router.push("/login?registered=1");
    } catch (err: any) {
      setSubmitError(err?.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.branding}>
        <div className={styles.logoRow}>
          <span className={`material-symbols-outlined ${styles.logoIcon}`}>emergency</span>
          <div className={styles.logoText}>VolunteerIQ</div>
        </div>
      </div>

      <div className={styles.card}>
        <h1 className={styles.heading}>Create Account</h1>
        <p className={styles.subheading}>Join VolunteerIQ today</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.roleSection}>
            <div className={styles.roleLabel}>Select Role</div>
            <div className={styles.roleCards}>
              {/* ✅ only 2 roles now */}
              {(["volunteer", "requester"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`${styles.roleCard} ${role === r ? styles.roleCardActive : ""}`}
                  onClick={() => setRole(r)}
                >
                  <span className="material-symbols-outlined">
                    {r === "volunteer" ? "volunteer_activism" : "person_alert"}
                  </span>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            {errors.role && (
              <div style={{ color: "#c62828", fontSize: "0.75rem", marginTop: "4px" }}>
                {errors.role}
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="full_name">Full Name</label>
            <div className={styles.inputWrapper}>
              <span className={`material-symbols-outlined ${styles.inputIcon}`}>person</span>
              <input
                id="full_name"
                type="text"
                className={styles.formInput}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            {errors.full_name && <div style={{ color: "#c62828", fontSize: "0.75rem" }}>{errors.full_name}</div>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="email">Email</label>
            <div className={styles.inputWrapper}>
              <span className={`material-symbols-outlined ${styles.inputIcon}`}>mail</span>
              <input
                id="email"
                type="email"
                className={styles.formInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            {errors.email && <div style={{ color: "#c62828", fontSize: "0.75rem" }}>{errors.email}</div>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="phone">Phone Number</label>
            <div className={styles.inputWrapper}>
              <span className={`material-symbols-outlined ${styles.inputIcon}`}>call</span>
              <input
                id="phone"
                type="tel"
                className={styles.formInput}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            {errors.phone && <div style={{ color: "#c62828", fontSize: "0.75rem" }}>{errors.phone}</div>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="password">Password</label>
            <div className={styles.inputWrapper}>
              <span className={`material-symbols-outlined ${styles.inputIcon}`}>lock</span>
              <input
                id="password"
                type="password"
                className={styles.formInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
              />
            </div>
            {errors.password && <div style={{ color: "#c62828", fontSize: "0.75rem" }}>{errors.password}</div>}
          </div>

          {role === "volunteer" && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="skills">
                Skills <span className={styles.formLabelNote}>(comma-separated)</span>
              </label>
              <div className={styles.inputWrapper}>
                <span className={`material-symbols-outlined ${styles.inputIcon}`}>build</span>
                <input
                  id="skills"
                  type="text"
                  className={styles.formInput}
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. first-aid, driving, logistics"
                />
              </div>
              {errors.skills && <div style={{ color: "#c62828", fontSize: "0.75rem" }}>{errors.skills}</div>}
            </div>
          )}

          <div className={styles.checkboxRow}>
            <input
              id="terms"
              type="checkbox"
              className={styles.checkbox}
              checked={termsChecked}
              onChange={(e) => setTermsChecked(e.target.checked)}
            />
            <label htmlFor="terms" className={styles.checkboxText}>
              I agree to the <a href="#">Terms & Conditions</a> and <a href="#">Privacy Policy</a>.
            </label>
          </div>

          {submitError && (
            <div style={{ color: "#c62828", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center", fontWeight: 600 }}>
              {submitError}
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={!termsChecked || loading}>
            {loading ? (
              <span className="material-symbols-outlined" style={{ animation: "spin 1s linear infinite" }}>
                sync
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className={styles.bottomLink}>
          Already have an account? <a href="/login">Sign in</a>
        </div>
      </div>
    </div>
  );
}
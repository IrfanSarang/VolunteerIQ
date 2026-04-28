"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./page.module.css";

type Role = "volunteer" | "requester" | "admin";

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
    if (!skills.trim()) newErrors.skills = "Please enter at least one skill.";
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
      // Step a: Sign up
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

      // Step b: Insert profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        phone,
        role,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      });

      if (profileError) {
        setSubmitError(profileError.message || "Failed to create profile.");
        setLoading(false);
        return;
      }

      // Step c: Redirect
      router.push("/login?registered=1");
    } catch (err: any) {
      setSubmitError(err?.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>Join VolunteerIQ today</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Full Name */}
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="full_name">Full Name</label>
            <input
              id="full_name"
              type="text"
              className={styles.input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
            {errors.full_name && <span className={styles.fieldError}>{errors.full_name}</span>}
          </div>

          {/* Email */}
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
          </div>

          {/* Phone */}
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
            />
            {errors.phone && <span className={styles.fieldError}>{errors.phone}</span>}
          </div>

          {/* Password */}
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
            />
            {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
          </div>

          {/* Skills */}
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="skills">Skills (comma-separated)</label>
            <input
              id="skills"
              type="text"
              className={styles.input}
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. teaching, first-aid, driving"
            />
            {errors.skills && <span className={styles.fieldError}>{errors.skills}</span>}
          </div>

          {/* Role Cards */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Select Role</label>
            <div className={styles.roleCards}>
              {(["volunteer", "requester", "admin"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`${styles.roleCard} ${role === r ? styles.activeRole : ""}`}
                  onClick={() => setRole(r)}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
            {errors.role && <span className={styles.fieldError}>{errors.role}</span>}
          </div>

          {/* Terms */}
          <div className={styles.checkboxGroup}>
            <input
              id="terms"
              type="checkbox"
              checked={termsChecked}
              onChange={(e) => setTermsChecked(e.target.checked)}
            />
            <label htmlFor="terms" className={styles.checkboxLabel}>
              I agree to the Terms & Conditions
            </label>
          </div>

          {submitError && <div className={styles.errorMsg}>{submitError}</div>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!termsChecked || loading}
          >
            {loading ? <span className={styles.spinner} /> : "Create Account"}
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account?{" "}
          <a href="/login" className={styles.link}>Sign in</a>
        </p>
      </div>
    </div>
  );
}
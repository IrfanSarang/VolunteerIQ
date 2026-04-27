"use client";

import React from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

const VolunteerIQ: React.FC = () => {
  const router = useRouter();

  return (
    <div className={styles.appContainer}>
      {/* Header */}
      <header className={styles.headerContainer}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>VolunteerIQ</div>

          <nav className={styles.navLinks}>
            <a href="#mission">Mission</a>
            <a href="#roles">Roles</a>
          </nav>

          <div className={styles.authButtons}>
            <button
              className={styles.btnText}
              onClick={() => router.push("/login")}
            >
              Login
            </button>

            <button
              className={styles.btnPrimary}
              onClick={() => router.push("/signup")}
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroGrid}>
            <div>
              <div className={styles.badgeEmergency}>
                <span className="material-symbols-outlined">emergency</span>
                SYSTEM ACTIVE: LEVEL 1 RESPONSE
              </div>

              <h1 className={styles.heroHeading}>
                Rapid Response, <br />
                <span className={styles.textSecondary}>Local Action.</span>
              </h1>

              <p className={styles.bodyLg}>
                Reducing crisis response time through hyper-local coordination
                and real-time data intelligence. Every second counts in
                emergency management.
              </p>

              <div className={styles.heroActions}>
                <button
                  className={styles.btnPrimaryLg}
                  onClick={() => router.push("/signup")}
                >
                  Sign Up
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </button>

                <button
                  className={styles.btnOutlineLg}
                  onClick={() => router.push("/login")}
                >
                  Login
                </button>
              </div>
            </div>

            {/* Right */}
            <div className={styles.visualContainer}>
              <div className={styles.imageBlob}>
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDG70Gob64mu7W_JUQpyM7NpppOdHYMffdr3-gHUfOMRbKOHtBdmlo_VJju4_Ppv6UZYQfWmVlfeaMZd2bz2MuLZwPmZfIM9ld16XmNiWW8xjpDGITcY8NZymuk_Mg8LZt-2o2los_E4qRo4boKkM0KgmEh9YZ8lmnTDGuA1mA-YDzhOZSyh4mZ-HMmnWsNx6dv4kEKedQTXqbDH3ZIZMJ_j8TMSi3xsI8UxnAT1G8st9R1yYzlm6RiASZdMiaNITFq6MpicheEQ"
                  alt="Emergency responders coordinating at a crisis site"
                />
              </div>

              <div className={styles.realTimeCard}>
                <div className={styles.statusIndicator}>
                  <div className={styles.pulseDot}></div>
                  <span className={styles.labelCaps}>REAL-TIME FEED</span>
                </div>
                <p>
                  Incident #842 reported in Downtown Sector. Nearest responder:
                  4.2m away.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Ecosystem Section */}
        <section id="roles" className={styles.ecosystem}>
          <div className={styles.sectionHeader}>
            <h2>Ecosystem of Action</h2>
            <p
              className={styles.bodyLg}
              style={{ margin: "0.75rem auto 0", textAlign: "center" }}
            >
              Specialized tools for every role in the response lifecycle.
            </p>
          </div>

          <div className={styles.cardGrid}>
            <div className={styles.actionCard}>
              <div className={`${styles.iconBox} ${styles.primaryBg}`}>
                <span className="material-symbols-outlined">campaign</span>
              </div>
              <h3>Requestors</h3>
              <p>Report critical needs in real-time with GPS accuracy.</p>
              <button className={styles.linkBtn}>
                Explore Requestor Tools
              </button>
            </div>

            <div
              className={`${styles.actionCard} ${styles.highlightSecondary}`}
            >
              <div className={`${styles.iconBox} ${styles.secondaryBg}`}>
                <span className="material-symbols-outlined">
                  volunteer_activism
                </span>
              </div>
              <h3>Volunteers</h3>
              <p>
                Receive proximity alerts based on verified skill sets and
                availability.
              </p>
              <button className={`${styles.linkBtn} ${styles.textSecondary}`}>
                Join Response Force
              </button>
            </div>

            <div className={styles.actionCard}>
              <div className={`${styles.iconBox} ${styles.dimBg}`}>
                <span className="material-symbols-outlined">insights</span>
              </div>
              <h3>Admins</h3>
              <p>Coordinate with data-driven insights and resource tracking.</p>
              <button className={styles.linkBtn}>Command Dashboard Demo</button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footerContainer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <strong>VolunteerIQ</strong>
            <span>© 2026. Professional Response Management.</span>
          </div>

          <div className={styles.footerLinks}>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default VolunteerIQ;

'use client';

import { SignIn, SignUp, useAuth, useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import { onboardUser, getMe } from "@/lib/api";

function LoginContent({ defaultMode = "login" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlMode = searchParams?.get("mode") || defaultMode;

  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const [authMode, setAuthMode] = useState(urlMode === "signup" ? "signup" : "login");
  const [signRole, setSignRole] = useState("caregiver"); // "caregiver" | "child"
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const syncedRef = useRef(false);

  // Clear broken Clerk hash loops (e.g. #/continue?redirect_url=...)
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      if (window.location.hash.includes("continue") || window.location.hash.includes("redirect_url")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, []);

  // After Clerk sign-in completes, onboard and redirect
  useEffect(() => {
    if (!isLoaded || !isSignedIn || syncedRef.current) return;

    async function syncWithBackend() {
      syncedRef.current = true;
      setSyncing(true);
      setError("");
      setStatus("Syncing with backend…");

      try {
        const role = signRole === "caregiver" ? "CAREGIVER" : "CHILD";
        try {
          await onboardUser(getToken, role);
        } catch (e) {
          if (!/HTTP (400|409)/.test(e.message)) throw e;
        }

        const me = await getMe(getToken);
        const userRole = String(me?.role || "")
          .split(".")
          .pop()
          .toUpperCase();

        const sessionData = {
          email: user?.primaryEmailAddress?.emailAddress || "",
          name: user?.firstName || user?.username || "User",
          role: userRole === "CAREGIVER" ? "caregiver" : "child",
          userId: me?.id,
          clerkUserId: me?.clerk_user_id,
        };
        localStorage.setItem("focus-buddy-session", JSON.stringify(sessionData));

        setStatus("Welcome! Redirecting…");
        window.location.href = "/";
      } catch (e) {
        syncedRef.current = false;
        setError(e.message);
        setStatus("");
      } finally {
        setSyncing(false);
      }
    }

    syncWithBackend();
  }, [isLoaded, isSignedIn, getToken, user, signRole]);

  // If already signed in and synced, redirect
  useEffect(() => {
    if (isLoaded && isSignedIn && !syncing) {
      try {
        const sess = JSON.parse(localStorage.getItem("focus-buddy-session"));
        if (sess?.userId) {
          window.location.href = "/";
        }
      } catch {}
    }
  }, [isLoaded, isSignedIn, syncing]);

  if (!isLoaded) {
    return (
      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ fontWeight: 700, color: "#64748b" }}>Loading Focus Buddy…</p>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          background: var(--bg-gradient, #0f172a);
          overflow-y: auto;
          box-sizing: border-box;
        }

        .auth-shell {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          justify-content: center;
          gap: 64px;
          width: 100%;
          max-width: 1060px;
          margin: auto;
        }

        .auth-brand {
          flex: 1;
          max-width: 440px;
          position: sticky;
          top: 32px;
          display: flex;
          flex-direction: column;
        }

        .brand-header {
          margin-bottom: 24px;
        }

        .brand-title {
          font-size: 2.75rem;
          font-family: var(--f-head, system-ui);
          font-weight: 800;
          margin: 12px 0 6px;
          line-height: 1.15;
          background: linear-gradient(135deg, #6366f1, #f59e0b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-subtitle {
          color: #94a3b8;
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0;
          line-height: 1.5;
        }

        .brand-features {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 12px;
        }

        .feature-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 18px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
        }

        .feature-icon {
          font-size: 1.5rem;
          line-height: 1;
        }

        .feature-head {
          font-weight: 700;
          font-size: 0.95rem;
          color: #f8fafc;
          margin-bottom: 2px;
        }

        .feature-desc {
          font-size: 0.85rem;
          color: #94a3b8;
          line-height: 1.4;
        }

        .auth-panel {
          flex: 1;
          max-width: 440px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .auth-toggle-bar {
          display: flex;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          padding: 5px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 16px;
          width: 100%;
        }

        .toggle-tab {
          flex: 1;
          padding: 10px 16px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: #94a3b8;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toggle-tab.active {
          background: #6366f1;
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
        }

        .role-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          width: 100%;
          padding: 8px 12px;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .role-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: #a5b4fc;
        }

        .role-tab {
          flex: 1;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: #94a3b8;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .role-tab.active {
          background: #6366f1;
          color: white;
        }

        .auth-status {
          background: #eef2ff;
          color: #3730a3;
          padding: 10px 16px;
          border-radius: 12px;
          margin-bottom: 12px;
          font-weight: 700;
          width: 100%;
          text-align: center;
          box-sizing: border-box;
        }

        .auth-error {
          background: #fff1f2;
          color: #9f1239;
          padding: 10px 16px;
          border-radius: 12px;
          margin-bottom: 12px;
          font-weight: 700;
          width: 100%;
          text-align: center;
          box-sizing: border-box;
        }

        .clerk-container {
          width: 100%;
        }

        .auth-footer-note {
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 16px;
          font-weight: 600;
          text-align: center;
        }

        @media (max-width: 880px) {
          .auth-page {
            padding: 24px 16px;
            align-items: flex-start;
          }
          .auth-shell {
            flex-direction: column;
            align-items: center;
            gap: 24px;
          }
          .auth-brand {
            position: static;
            max-width: 440px;
            text-align: center;
            align-items: center;
          }
          .brand-title {
            font-size: 2.2rem;
          }
          .brand-features {
            display: none;
          }
        }
      `}</style>

      <div className="auth-shell">
        {/* LEFT COLUMN: BRANDING (Sticky on desktop, never scrolls off) */}
        <div className="auth-brand">
          <div className="brand-header">
            {/* Buddy SVG */}
            <svg viewBox="0 0 120 120" width="100" height="100" aria-label="Buddy the Dog">
              <ellipse cx="60" cy="112" rx="35" ry="6" fill="currentColor" opacity="0.1" />
              <g>
                <path d="M30 45C15 25 5 50 15 75Q25 65 35 60Z" fill="#f59e0b" />
                <path d="M90 45C105 25 115 50 105 75Q95 65 85 60Z" fill="#f59e0b" />
                <path d="M30 45C30 15 90 15 90 45 100 75 85 95 60 95 35 95 20 75 30 45Z" fill="#FFE4B5" />
                <path d="M25 45C25 35 50 35 50 50 50 65 30 65 25 45Z" fill="#f59e0b" />
                <circle cx="38" cy="48" r="5" fill="#451A03" />
                <circle cx="82" cy="48" r="5" fill="#451A03" />
                <circle cx="36.5" cy="46" r="1.5" fill="#fff" />
                <circle cx="80.5" cy="46" r="1.5" fill="#fff" />
                <ellipse cx="60" cy="72" rx="22" ry="16" fill="#FFF8DC" />
                <path d="M52 65Q60 62 68 65C68 76 52 76 52 65" fill="#451A03" />
                <path d="M50 78C55 86 65 86 70 78" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </g>
            </svg>

            <h1 className="brand-title">Focus Buddy</h1>
            <p className="brand-subtitle">
              Your personal coaching dog for getting things done.
            </p>
          </div>

          <div className="brand-features">
            <div className="feature-card">
              <span className="feature-icon">🐾</span>
              <div>
                <div className="feature-head">ADHD-Friendly Micro Steps</div>
                <div className="feature-desc">Breaks big overwhelming tasks into simple, bite-sized actions.</div>
              </div>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🐶</span>
              <div>
                <div className="feature-head">AI Mascot & Buddy Coach</div>
                <div className="feature-desc">Provides instant help and gentle hints whenever you feel stuck.</div>
              </div>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🏆</span>
              <div>
                <div className="feature-head">Streaks & Motivating Rewards</div>
                <div className="feature-desc">Celebrates every small victory to keep focus and confidence high.</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AUTH PANEL */}
        <div className="auth-panel">
          {/* Mode Switcher */}
          <div className="auth-toggle-bar">
            <button
              onClick={() => {
                if (typeof window !== "undefined" && window.location.hash) {
                  window.history.replaceState(null, "", window.location.pathname);
                }
                setAuthMode("login");
              }}
              className={`toggle-tab ${authMode === "login" ? "active" : ""}`}
            >
              Log in
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined" && window.location.hash) {
                  window.history.replaceState(null, "", window.location.pathname);
                }
                setAuthMode("signup");
              }}
              className={`toggle-tab ${authMode === "signup" ? "active" : ""}`}
            >
              Create account
            </button>
          </div>

          {/* Role selector on signup */}
          {authMode === "signup" && (
            <div className="role-selector">
              <span className="role-label">I am a:</span>
              <button
                onClick={() => setSignRole("caregiver")}
                className={`role-tab ${signRole === "caregiver" ? "active" : ""}`}
              >
                Caregiver / Parent
              </button>
              <button
                onClick={() => setSignRole("child")}
                className={`role-tab ${signRole === "child" ? "active" : ""}`}
              >
                Child
              </button>
            </div>
          )}

          {/* Status & Error alerts */}
          {status && <div className="auth-status">{status}</div>}
          {error && <div className="auth-error">{error}</div>}

          {/* Clerk Component */}
          <div className="clerk-container">
            {authMode === "signup" ? (
              <SignUp
                routing="hash"
                fallbackRedirectUrl="/"
              />
            ) : (
              <SignIn
                routing="hash"
                fallbackRedirectUrl="/"
              />
            )}
          </div>

          <p className="auth-footer-note">
            Development mode · Passwords & security handled by Clerk
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading…</div>}>
      <LoginContent defaultMode="login" />
    </Suspense>
  );
}

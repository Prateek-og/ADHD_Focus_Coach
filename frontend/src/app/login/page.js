'use client';

import { SignIn, SignUp, useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onboardUser, getMe } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const [authMode, setAuthMode] = useState("login"); // "login" | "signup"
  const [signRole, setSignRole] = useState("child"); // "child" | "caregiver"
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);

  // After Clerk sign-in completes, onboard and redirect
  useEffect(() => {
    if (!isLoaded || !isSignedIn || syncing) return;

    async function syncWithBackend() {
      setSyncing(true);
      setError("");
      setStatus("Syncing with backend…");

      try {
        // Try onboard (idempotent — won't fail if already onboarded)
        const role = signRole === "caregiver" ? "CAREGIVER" : "CHILD";
        try {
          await onboardUser(getToken, role);
        } catch (e) {
          // 400/409 means already onboarded — that's fine
          if (!/HTTP (400|409)/.test(e.message)) throw e;
        }

        // Fetch user info
        const me = await getMe(getToken);
        const userRole = String(me?.role || "")
          .split(".")
          .pop()
          .toUpperCase();

        // Save session info to localStorage for the main app
        const sessionData = {
          email: user?.primaryEmailAddress?.emailAddress || "",
          name: user?.firstName || user?.username || "User",
          role: userRole === "CAREGIVER" ? "caregiver" : "child",
          userId: me?.id,
          clerkUserId: me?.clerk_user_id,
        };
        localStorage.setItem("focus-buddy-session", JSON.stringify(sessionData));

        setStatus("Welcome! Redirecting…");
        router.replace("/");
      } catch (e) {
        setError(e.message);
        setStatus("");
      } finally {
        setSyncing(false);
      }
    }

    syncWithBackend();
  }, [isLoaded, isSignedIn, getToken, user, router, signRole, syncing]);

  // If already signed in and synced, redirect
  useEffect(() => {
    if (isLoaded && isSignedIn && !syncing) {
      try {
        const sess = JSON.parse(localStorage.getItem("focus-buddy-session"));
        if (sess?.userId) {
          router.replace("/");
        }
      } catch {}
    }
  }, [isLoaded, isSignedIn, syncing, router]);

  if (!isLoaded) {
    return (
      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main
      style={{
        flex: 1,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg-gradient, #f8fafc)",
      }}
    >
      {/* Buddy SVG */}
      <svg viewBox="0 0 120 120" width="120" height="120" style={{ marginBottom: 16 }} aria-label="Buddy the Dog">
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

      <h1
        style={{
          fontSize: "2.5rem",
          fontFamily: "var(--f-head, system-ui)",
          fontWeight: 800,
          marginBottom: 8,
          background: "linear-gradient(135deg, #6366f1, #f59e0b)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Focus Buddy
      </h1>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: "1.1rem", fontWeight: 600 }}>
        Your personal coaching dog for getting things done.
      </p>

      {/* Auth mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setAuthMode("login")}
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: authMode === "login" ? "#6366f1" : "white",
            color: authMode === "login" ? "white" : "#1e293b",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Log in
        </button>
        <button
          onClick={() => setAuthMode("signup")}
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: authMode === "signup" ? "#6366f1" : "white",
            color: authMode === "signup" ? "white" : "#1e293b",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Create account
        </button>
      </div>

      {/* Role picker (only for signup) */}
      {authMode === "signup" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <span style={{ fontWeight: 700, color: "#64748b", alignSelf: "center" }}>I am a:</span>
          <button
            onClick={() => setSignRole("child")}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: signRole === "child" ? "#6366f1" : "white",
              color: signRole === "child" ? "white" : "#1e293b",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Child
          </button>
          <button
            onClick={() => setSignRole("caregiver")}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: signRole === "caregiver" ? "#6366f1" : "white",
              color: signRole === "caregiver" ? "white" : "#1e293b",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Caregiver
          </button>
        </div>
      )}

      {/* Status / Error messages */}
      {status && (
        <div style={{ background: "#eef2ff", color: "#3730a3", padding: "10px 16px", borderRadius: 10, marginBottom: 12, fontWeight: 600 }}>
          {status}
        </div>
      )}
      {error && (
        <div style={{ background: "#fff1f2", color: "#9f1239", padding: "10px 16px", borderRadius: 10, marginBottom: 12, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Clerk widget */}
      <div style={{ maxWidth: 440 }}>
        {authMode === "signup" ? (
          <SignUp
            routing="hash"
            afterSignUpUrl="/"
            signInUrl="/login"
          />
        ) : (
          <SignIn
            routing="hash"
            afterSignInUrl="/"
            signUpUrl="/login"
          />
        )}
      </div>

      <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 16, fontWeight: 600 }}>
        Development only · Passwords are handled by Clerk
      </p>
    </main>
  );
}

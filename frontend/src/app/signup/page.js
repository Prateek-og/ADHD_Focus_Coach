'use client';

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
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
      <h1
        style={{
          fontSize: "2rem",
          fontFamily: "var(--f-head, system-ui)",
          fontWeight: 800,
          marginBottom: 24,
          background: "linear-gradient(135deg, #6366f1, #f59e0b)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Create Account
      </h1>
      <SignUp routing="hash" signInUrl="/login" afterSignUpUrl="/" />
    </main>
  );
}


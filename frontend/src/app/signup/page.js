'use client';

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login?mode=signup");
  }, [router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0f172a" }}>
      <p style={{ color: "#94a3b8", fontWeight: 700 }}>Redirecting to sign up…</p>
    </div>
  );
}

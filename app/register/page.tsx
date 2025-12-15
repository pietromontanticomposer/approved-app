"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the unified login page in signup mode, then forward to complete-profile
    const target = `/login?signup=1&next=/register/complete`;
    router.replace(target);
  }, [router]);

  return (
    <div style={{ padding: 24 }}>
      Redirecting to registration…
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /search now lives on /memories. Client-side redirect — server-side
// redirect() doesn't work under output: 'export'.
export default function SearchPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/memories");
  }, [router]);
  return null;
}

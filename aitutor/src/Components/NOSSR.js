"use client";
import { useEffect, useState } from "react";

export default function NoSSR({ children }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // This part renders on the server. We return null or a simple loader
    // to ensure the server-side HTML is minimal and won't mismatch.
    return null; 
  }

  return <>{children}</>;
}
"use client";
import { useState } from "react";

export default function NoSSR({ children }) {
  const [isClient, setIsClient] = useState(false);

  if (typeof window !== 'undefined' && !isClient) {
    setIsClient(true);
  }

  if (!isClient) {
    return null;
  }

  return <>{children}</>;
}
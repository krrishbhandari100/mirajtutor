"use client";

import { io } from "socket.io-client";

export const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000", {
  autoConnect: false  // Don't connect automatically
});
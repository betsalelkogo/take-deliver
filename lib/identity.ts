"use client";

import { useEffect, useState } from "react";

export interface Identity {
  name: string;
  phone: string;
}

const KEY = "td_identity_v1";

export function useIdentity() {
  const [identity, setIdentityState] = useState<Identity | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setIdentityState(JSON.parse(raw) as Identity);
    } catch {
      // ignore corrupt/unavailable storage
    }
    setLoaded(true);
  }, []);

  const setIdentity = (next: Identity) => {
    setIdentityState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  return { identity, setIdentity, loaded };
}

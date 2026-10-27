"use client";

import { createContext, useContext } from "react";
import type { Community } from "@/lib/communities";

const CommunityContext = createContext<Community | null>(null);

export const CommunityProvider = CommunityContext.Provider;

export function useCommunity(): Community {
  const community = useContext(CommunityContext);
  if (!community) throw new Error("useCommunity must be used inside a CommunityProvider");
  return community;
}

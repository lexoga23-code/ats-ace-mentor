import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Region = "FR" | "CH";

interface RegionContextType {
  region: Region;
  toggleRegion: () => void;
  currency: string;
  prices: { single: number; pro: number; human: number };
  flag: string;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

const PRICES = {
  FR: { single: 4, pro: 12, human: 29 },
  CH: { single: 4, pro: 14, human: 35 },
};

export const RegionProvider = ({ children }: { children: ReactNode }) => {
  const [region, setRegion] = useState<Region>(() => {
    if (typeof navigator !== "undefined" && navigator.language?.includes("CH")) return "CH";
    return "FR";
  });

  const toggleRegion = () => setRegion((r) => (r === "FR" ? "CH" : "FR"));

  const value: RegionContextType = {
    region,
    toggleRegion,
    currency: region === "CH" ? "CHF" : "€",
    prices: PRICES[region],
    flag: region === "CH" ? "🇨🇭" : "🇫🇷",
  };

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
};

export const useRegion = () => {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error("useRegion must be used within RegionProvider");
  return ctx;
};

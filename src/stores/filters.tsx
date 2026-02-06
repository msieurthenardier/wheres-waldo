"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { CommodityId } from "@/lib/commodity";
import { COMMODITY_IDS } from "@/lib/commodity";

export type SelectionType = "vessel" | "port" | null;

interface FilterState {
  /** Active commodity filters — if empty, all shown */
  activeCommodities: Set<CommodityId>;
  /** Search query for vessels/ports */
  searchQuery: string;
  /** Currently selected item ID (MMSI for vessel, port name for port) */
  selectedId: string | null;
  /** Type of the selected item */
  selectedType: SelectionType;
}

interface FilterActions {
  toggleCommodity: (id: CommodityId) => void;
  setSearchQuery: (query: string) => void;
  selectItem: (id: string | null, type: SelectionType) => void;
  clearFilters: () => void;
}

type FilterContextValue = FilterState & FilterActions;

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [activeCommodities, setActiveCommodities] = useState<Set<CommodityId>>(
    new Set(COMMODITY_IDS)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<SelectionType>(null);

  const toggleCommodity = useCallback((id: CommodityId) => {
    setActiveCommodities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectItem = useCallback((id: string | null, type: SelectionType) => {
    setSelectedId(id);
    setSelectedType(type);
  }, []);

  const clearFilters = useCallback(() => {
    setActiveCommodities(new Set(COMMODITY_IDS));
    setSearchQuery("");
  }, []);

  const value = useMemo<FilterContextValue>(
    () => ({
      activeCommodities,
      searchQuery,
      selectedId,
      selectedType,
      toggleCommodity,
      setSearchQuery,
      selectItem,
      clearFilters,
    }),
    [activeCommodities, searchQuery, selectedId, selectedType, toggleCommodity, selectItem, clearFilters]
  );

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}

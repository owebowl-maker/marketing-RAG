"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { MarkedExtension } from "marked";
import { buildMatcher, glossaryExtension } from "@/lib/glossary-match";
import type { GlossaryEntry } from "@/lib/types";

interface GlossaryState {
  byId: Map<string, GlossaryEntry>;
  /** 传给 XMarkdown 的 config；没有词条时为 undefined */
  markedConfig?: MarkedExtension;
  isSample: boolean;
}

const GlossaryCtx = createContext<GlossaryState>({ byId: new Map(), isSample: false });

export function GlossaryProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [isSample, setIsSample] = useState(false);

  useEffect(() => {
    fetch("/api/glossary")
      .then((r) => (r.ok ? r.json() : { entries: [], isSample: false }))
      .then((d: { entries: GlossaryEntry[]; isSample: boolean }) => {
        setEntries(d.entries);
        setIsSample(d.isSample);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<GlossaryState>(() => {
    const matcher = buildMatcher(entries);
    return {
      byId: new Map(entries.map((e) => [e.id, e])),
      markedConfig: matcher ? glossaryExtension(matcher) : undefined,
      isSample,
    };
  }, [entries, isSample]);

  return <GlossaryCtx.Provider value={value}>{children}</GlossaryCtx.Provider>;
}

export const useGlossary = () => useContext(GlossaryCtx);

import { create } from "zustand";

export interface KnowledgeTag {
  label: string;
  isAI: boolean;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  type: "pdf" | "word" | "web" | "markdown" | "txt" | "csv" | "image";
  fileSize: string | null;
  summary: string;
  tags: KnowledgeTag[];
  space: string;
  uploadedAt: string;
  status: "uploading" | "parsing" | "ready" | "error";
  pageCount?: number;
  originalUrl?: string;
  content?: string;
}

export type ViewMode = "grid" | "list";
export type SortBy = "recent" | "oldest" | "title";

interface KnowledgeState {
  items: KnowledgeItem[];
  viewMode: ViewMode;
  sortBy: SortBy;
  filterFormat: string;
  filterSpace: string;
  filterTags: string[];
  searchQuery: string;
  loading: boolean;
  setItems: (items: KnowledgeItem[]) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sort: SortBy) => void;
  setFilterFormat: (format: string) => void;
  setFilterSpace: (space: string) => void;
  toggleFilterTag: (tag: string) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useKnowledgeStore = create<KnowledgeState>((set) => ({
  items: [],
  viewMode: "grid",
  sortBy: "recent",
  filterFormat: "all",
  filterSpace: "all",
  filterTags: [],
  searchQuery: "",
  loading: false,
  setItems: (items) => set({ items }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSortBy: (sortBy) => set({ sortBy }),
  setFilterFormat: (filterFormat) => set({ filterFormat }),
  setFilterSpace: (filterSpace) => set({ filterSpace }),
  toggleFilterTag: (tag) =>
    set((state) => ({
      filterTags: state.filterTags.includes(tag)
        ? state.filterTags.filter((t) => t !== tag)
        : [...state.filterTags, tag],
    })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLoading: (loading) => set({ loading }),
}));

import { create } from 'zustand'
import type { SaveStatus } from '@/types'

type UiState = {
  selectedIds: string[]
  editingNodeId: string | null
  editingEdgeId: string | null
  shareOpen: boolean
  helpOpen: boolean
  settingsOpen: boolean
  onboardingOpen: boolean
  specOpen: boolean
  saveStatus: SaveStatus
  syncError: string | null
  zoom: number
  connectMode: boolean
  addMenuOpen: boolean
  setSelectedIds: (ids: string[]) => void
  setEditingNodeId: (id: string | null) => void
  setEditingEdgeId: (id: string | null) => void
  setShareOpen: (open: boolean) => void
  setHelpOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setOnboardingOpen: (open: boolean) => void
  setSpecOpen: (open: boolean) => void
  setSaveStatus: (status: SaveStatus) => void
  setSyncError: (message: string | null) => void
  setZoom: (zoom: number) => void
  setConnectMode: (on: boolean) => void
  setAddMenuOpen: (open: boolean) => void
  clearSelection: () => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedIds: [],
  editingNodeId: null,
  editingEdgeId: null,
  shareOpen: false,
  helpOpen: false,
  settingsOpen: false,
  onboardingOpen: false,
  specOpen: false,
  saveStatus: 'saved',
  syncError: null,
  zoom: 1,
  connectMode: false,
  addMenuOpen: false,
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  setEditingNodeId: (id) => set({ editingNodeId: id, editingEdgeId: null }),
  setEditingEdgeId: (id) => set({ editingEdgeId: id, editingNodeId: null }),
  setShareOpen: (open) => set({ shareOpen: open }),
  setHelpOpen: (open) => set({ helpOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setOnboardingOpen: (open) => set({ onboardingOpen: open }),
  setSpecOpen: (open) => set({ specOpen: open }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setSyncError: (message) => set({ syncError: message }),
  setZoom: (zoom) => set({ zoom }),
  setConnectMode: (on) => set({ connectMode: on }),
  setAddMenuOpen: (open) => set({ addMenuOpen: open }),
  clearSelection: () =>
    set({
      selectedIds: [],
      editingNodeId: null,
      editingEdgeId: null,
    }),
}))

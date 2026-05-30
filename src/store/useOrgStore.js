import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Customer-side org context. Set when a QR-scan URL like
// `/order/<orgSlug>/<tableNo>` is opened, or when the customer manually
// enters their table on the welcome page.
export const useOrgStore = create(
  persist(
    (set) => ({
      // The org "key" — either id (org_*) or slug — that the backend
      // accepts via the `x-organization-id` header.
      orgKey: null,
      // Branding payload fetched from /api/organizations/:slug/branding.
      branding: null,
      setOrg: (orgKey, branding = null) => set({ orgKey, branding }),
      clearOrg: () => set({ orgKey: null, branding: null }),
    }),
    { name: 'masala-story-org' },
  ),
)

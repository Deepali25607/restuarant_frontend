import { useEffect } from 'react'
import { useOrgStore } from '../store/useOrgStore'
import { useAuthStore } from '../store/useAuthStore'
import { usePlatformStore } from '../store/usePlatformStore'

// Keeps the document <title> and favicon in sync with whichever org is
// currently in context — branding store for customer pages, auth store's
// org payload for admin pages. Falls back to the platform name (managed by
// super-admin) when nothing more specific is loaded.

function setFavicon(href) {
  let link = document.querySelector("link[rel='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = href
}

export default function WhitelabelHead() {
  const branding = useOrgStore((s) => s.branding)
  const userOrg = useAuthStore((s) => s.user?.organization)
  const platform = usePlatformStore((s) => s.platform)
  const active = userOrg || branding || platform

  useEffect(() => {
    const name = active?.name || platform?.name || 'Masala Story'
    document.title = name
    const logoUrl = active?.logoUrl || platform?.logoUrl
    if (logoUrl) setFavicon(logoUrl)
    else {
      // Curry-orange flame as a tiny SVG data-URI fallback. Kept inline so
      // the browser doesn't choke when no logo is configured anywhere.
      const colour = active?.themeColor || platform?.themeColor || '#ea580c'
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='32' r='30' fill='${encodeURIComponent(colour)}'/><text x='32' y='42' font-size='34' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='bold'>🌶</text></svg>`
      setFavicon(`data:image/svg+xml,${svg}`)
    }
  }, [active?.name, active?.logoUrl, active?.themeColor, platform?.name, platform?.logoUrl, platform?.themeColor])

  return null
}

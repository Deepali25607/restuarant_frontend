import { useState, useEffect } from 'react'
import { Utensils } from 'lucide-react'

// Renders a dish photo with a graceful saffron-gradient fallback when the
// image is missing (empty/null src) or fails to load (broken/404 CDN). The
// fallback shows the first letter of the dish name + a utensil icon so the
// card still reads as food rather than a broken-image glyph.
export default function DishImage({ src, alt, className }) {
  const [failed, setFailed] = useState(!src)

  useEffect(() => {
    setFailed(!src)
  }, [src])

  if (failed) {
    const initial = (alt || '?').trim().charAt(0).toUpperCase()
    return (
      <div
        className={
          'flex items-center justify-center bg-gradient-to-br from-saffron-200 via-saffron-300 to-chilli-300 dark:from-masala-700 dark:via-masala-800 dark:to-masala-900 text-white ' +
          (className || '')
        }
        aria-label={alt}
      >
        <div className="flex flex-col items-center gap-1 opacity-90">
          <Utensils className="h-6 w-6" />
          <span className="font-display text-2xl">{initial}</span>
        </div>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

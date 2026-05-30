import { Flame } from 'lucide-react'
import clsx from 'clsx'

export default function SpiceMeter({ level = 0, size = 12 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Spice level ${level} of 3`}>
      {[1, 2, 3].map((i) => (
        <Flame
          key={i}
          className={clsx(
            'transition-colors',
            i <= level ? 'text-chilli-600' : 'text-chilli-200',
          )}
          style={{ height: size, width: size }}
          fill={i <= level ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  )
}

import { Sun, Moon } from 'lucide-react'
import clsx from 'clsx'
import { useThemeStore } from '../store/useThemeStore'

export default function ThemeToggle({ size = 'md', className }) {
  const { theme, toggle } = useThemeStore()
  const isDark = theme === 'dark'
  const dims = size === 'sm' ? 'h-9 w-9' : 'h-10 w-10'

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light' : 'Switch to dark'}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={clsx(
        'rounded-full border flex items-center justify-center transition',
        dims,
        'border-saffron-200 dark:border-masala-700',
        'bg-white hover:bg-saffron-50 dark:bg-masala-800 dark:hover:bg-masala-700',
        'text-masala-800 dark:text-saffron-200',
        className,
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

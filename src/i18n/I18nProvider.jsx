import { IntlProvider } from 'react-intl'
import { useLocaleStore } from '../store/useLocaleStore'
import en from './locales/en.json'
import hi from './locales/hi.json'
import bn from './locales/bn.json'

const MESSAGES = { en, hi, bn }

export default function I18nProvider({ children }) {
  const locale = useLocaleStore((s) => s.locale)
  const messages = MESSAGES[locale] || MESSAGES.en
  return (
    <IntlProvider
      locale={locale}
      messages={messages}
      defaultLocale="en"
      onError={(err) => {
        // Don't crash UI if a string is missing — fall back to the key.
        if (err.code === 'MISSING_TRANSLATION') return
        console.warn('intl error:', err)
      }}
    >
      {children}
    </IntlProvider>
  )
}

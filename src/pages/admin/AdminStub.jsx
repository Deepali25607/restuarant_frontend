import { Construction } from 'lucide-react'

export default function AdminStub({ title, hint }) {
  return (
    <div className="card p-10 text-center">
      <Construction className="mx-auto h-10 w-10 text-saffron-600" />
      <h2 className="font-display text-2xl text-masala-900 mt-3">{title}</h2>
      <p className="text-masala-700 mt-1 max-w-md mx-auto">{hint}</p>
    </div>
  )
}

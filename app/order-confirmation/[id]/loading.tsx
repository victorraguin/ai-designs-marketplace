import { Loader2 } from 'lucide-react'

export default function LoadingPage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}
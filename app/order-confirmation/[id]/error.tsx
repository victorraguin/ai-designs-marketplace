'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] py-8">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Something went wrong!</h2>
          <p className="text-muted-foreground">
            There was an error loading the order details.
          </p>
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </div>
    </div>
  )
}
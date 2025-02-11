'use client'

import { Card, CardContent } from '@/components/ui/card'

export function LoadingPlaceholder() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2].map(i => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="aspect-square w-full bg-muted animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-8 w-full bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
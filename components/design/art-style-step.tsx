'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ArtStyle, artStyleLabels, styleDescriptions } from '@/types/design'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel'

interface ArtStyleStepProps {
  onSelect: (style: ArtStyle) => void
  selectedStyle?: ArtStyle
}

export function ArtStyleStep({ onSelect, selectedStyle }: ArtStyleStepProps) {
  const styles: ArtStyle[] = ['flat', 'symbols', 'mystic', 'free']

  const styleImages: Record<ArtStyle, string[]> = {
    flat: ['/styles/flat.webp', '/styles/flat-2.webp', '/styles/flat-3.webp'],
    symbols: [
      '/styles/symbols.webp',
      '/styles/symbols-2.webp',
      '/styles/symbols-3.webp'
    ],
    mystic: [
      '/styles/mystic.webp',
      '/styles/mystic-2.webp',
      '/styles/mystic-3.webp'
    ],
    free: [
      '/styles/free.webp',
      '/styles/free-2.webp',
      '/styles/free-3.webp'
    ]
  }

  const handleCardClick = (style: ArtStyle, event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('button')) {
      return
    }
    onSelect(style)
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <h2 className="text-2xl font-bold">Choose your artistic style</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {styles.map(style => (
          <Card
            key={style}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedStyle === style ? 'ring-2 ring-primary' : ''
            }`}
            onClick={e => handleCardClick(style, e)}
          >
            <CardContent className="p-0">
              <Carousel
                className="w-full"
                opts={{
                  align: 'start',
                  loop: true
                }}
              >
                <CarouselContent>
                  {styleImages[style].map((image, idx) => (
                    <CarouselItem key={idx}>
                      <div className="aspect-square w-full">
                        <img
                          src={image}
                          alt={`${artStyleLabels[style]} - Example ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
              </Carousel>
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{artStyleLabels[style]}</h3>
                <p className="text-sm text-muted-foreground">{styleDescriptions[style]}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
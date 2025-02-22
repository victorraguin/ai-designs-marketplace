export type Step = 'style' | 'text' | 'description' | 'validation' | 'result'

export type ArtStyle = 'flat' | 'symbols' | 'mystic' | 'free'

export type DesignStatus = 'temp' | 'private' | 'pending' | 'marketplace'

export interface DesignOptions {
  tshirtColor: string
  designText: string | null
  side: 'front' | 'back'
  artStyle?: ArtStyle
  clothingType: string | null
}

export const artStyleLabels: Record<ArtStyle, string> = {
  flat: 'Flat Design',
  symbols: 'Symbols & Doodles',
  mystic: 'Mystic Art',
  free: 'Free Style'
}

export const stepLabels: Record<Step, string> = {
  style: 'Style',
  text: 'Text',
  description: 'Description',
  validation: 'Validation',
  result: 'Result'
}

export const styleDescriptions: Record<ArtStyle, string> = {
  flat: 'Geometric and minimalist illustrations with bold colors',
  symbols: 'Artistic designs filled with symbols and doodles',
  mystic: 'Mystical designs with esoteric symbols and patterns',
  free: 'Complete creative freedom - no style constraints'
}

export interface Design {
  id: string
  image_url: string
  prompt: string
  title?: string
  description?: string
  price?: number
  status: string
  created_at: string
  creator_id: string
  category: string
  likes_count?: number
}

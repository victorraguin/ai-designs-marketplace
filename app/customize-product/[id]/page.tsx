'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Loader2, Truck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GelatoProduct } from '@/lib/gelato'
import { useAuth } from '@/components/auth-provider'
import { ProductCustomizer } from '@/components/product-customizer'
import { toast } from 'sonner'
import { getCountryName } from '@/lib/countries'

interface Design {
  id: string
  image_url: string
  prompt: string
}

// Utilitaire pour récupérer un emoji de drapeau à partir du code pays (ex. 'FR' -> 🇫🇷)
function getFlagEmoji (countryCode: string) {
  if (!countryCode) return '🏳️'
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

// Format translations with metric and imperial units
const formatTranslations: { [key: string]: string } = {
  '200x200-mm-8x8-inch': '20x20cm / 8x8 "',
  '11x14-inch-270x350-mm': '27x35cm / 11x14"',
  '12x12-inch-300x300-mm': '30x30cm / 12x12"',
  '12x16-inch-300x400-mm': '30x40cm / 12x16"',
  '12x18-inch-300x450-mm': '30x45cm / 12x18"',
  '12x24-inch-300x600-mm': '30x60cm / 12x24"',
  '12x36-inch-300x900-mm': '30x90cm / 12x36"',
  '12x40-inch-300x1000-mm': '30x100cm / 12x40"',
  '16x16-inch-400x400-mm': '40x40cm / 16x16"',
  '16x20-inch-400x500-mm': '40x50cm / 16x20"',
  '16x24-inch-400x600-mm': '40x60cm / 16x24"',
  '16x32-inch-400x800-mm': '40x80cm / 16x32"',
  '18x24-inch-450x600-mm': '45x60cm / 18x24"'
}

const orientationTranslations: { [key: string]: string } = {
  hor: 'Horizontal',
  ver: 'Vertical'
}

const thicknessTranslations: { [key: string]: string } = {
  'wood-fsc-slim': 'Slim (2cm)',
  'wood-fsc-thick': 'Thick (4cm)'
}

export default function CustomizeProductPage () {
  const params = useParams()
  const [design, setDesign] = useState<Design | null>(null)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<GelatoProduct[]>([])
  const { user } = useAuth()

  // Product customization state
  const [selectedFormat, setSelectedFormat] = useState<string>('')
  const [selectedOrientation, setSelectedOrientation] = useState<string>('')
  const [selectedThickness, setSelectedThickness] = useState<string>('')
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [filteredProduct, setFilteredProduct] = useState<GelatoProduct | null>(
    null
  )

  // Extraire le pays de l'utilisateur (exemple basé sur user_metadata)
  const userCountry = (user?.user_metadata?.country as string) || 'FR'
  const flagEmoji = getFlagEmoji(userCountry)

  useEffect(() => {
    loadDesign()
    loadGelatoProducts()
  }, [])

  async function loadDesign () {
    try {
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('id', params.id)
        .single()
      if (error) throw error
      setDesign(data)
    } catch (error: any) {
      toast.error('Error loading design')
    }
  }

  async function loadGelatoProducts () {
    try {
      const res = await fetch('/api/gelato/products')
      if (!res.ok) throw new Error('Error loading products')
      const prods: GelatoProduct[] = await res.json()
      const canvasProducts = prods.filter(
        p => p.category.toLowerCase() === 'canvas'
      )
      setProducts(canvasProducts)

      // Récupère les listes uniques de formats, orientations, épaisseurs
      const formats = Array.from(
        new Set(canvasProducts.map(p => p.attributes.UnifiedCanvasFormat))
      )
      const orientations = Array.from(
        new Set(canvasProducts.map(p => p.attributes.Orientation))
      )
      const thicknesses = Array.from(
        new Set(canvasProducts.map(p => p.attributes.CanvasThicknessType))
      )

      // Définit les valeurs par défaut
      setSelectedFormat(formats[0] || '')
      setSelectedOrientation(orientations[0] || '')
      setSelectedThickness(thicknesses[0] || '')
    } catch (error) {
      console.error('Error loading products:', error)
      toast.error('Error loading products')
    } finally {
      setLoading(false)
    }
  }

  // Met à jour le produit filtré quand les sélections changent
  useEffect(() => {
    if (!selectedFormat || !selectedOrientation || !selectedThickness) return
    const prod = products.find(
      p =>
        p.attributes.UnifiedCanvasFormat === selectedFormat &&
        p.attributes.Orientation === selectedOrientation &&
        p.attributes.CanvasThicknessType === selectedThickness
    )
    setFilteredProduct(prod || null)
    if (prod && prod?.variants?.length > 0) {
      setSelectedVariant(prod.variants[0])
    } else {
      setSelectedVariant(null)
    }
  }, [selectedFormat, selectedOrientation, selectedThickness, products])

  const handleCustomizationComplete = async (data: {
    variant: any
    printArea: any
  }) => {
    if (!design || !user || !data.variant) {
      toast.error("Please ensure you're logged in and a product is selected")
      return
    }
    console.log('run order', data)
    try {
      // Create Gelato order
      const gelatoOrder = await fetch('/api/gelato/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: 'order',
          currency: 'EUR',
          items: [
            {
              productUid: data.variant.sku,
              quantity: 1,
              files: [
                {
                  url: design.image_url,
                  type: 'default'
                }
              ]
            }
          ],
          shippingAddress: {
            firstName:
              user.user_metadata?.full_name?.split(' ')[0] || 'Customer',
            lastName:
              user.user_metadata?.full_name?.split(' ').slice(1).join(' ') ||
              'Name',
            email: user.email || '',
            phone: '0662398343',
            street: '8 impasse charlemagne',
            city: 'Chaumes en Retz',
            country: userCountry,
            postCode: '44320',
            state: ''
          }
        })
      })
      if (!gelatoOrder.ok) {
        throw new Error('Error creating Gelato order')
      }
      // Create order in database
      const { error: orderError } = await supabase.from('orders').insert([
        {
          design_id: design.id,
          buyer_id: user.id,
          product_type: data.variant.sku,
          total_amount: data.variant.price,
          order_status: 'pending'
        }
      ])
      console.log(orderError)
      if (orderError) throw orderError

      toast.success('Order created successfully!')
    } catch (error: any) {
      console.error('Order creation error:', error)
      toast.error('Error creating order. Please try again.')
    }
  }

  if (loading || !design || !user) {
    return (
      <div className='flex h-[calc(100vh-3.5rem)] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    )
  }

  // Pré-calculer les choix possibles (pour hide/show dropdown)
  const formatOptions = Array.from(
    new Set(products.map(p => p.attributes.UnifiedCanvasFormat))
  )
  const orientationOptions = Array.from(
    new Set(products.map(p => p.attributes.Orientation))
  )
  const thicknessOptions = Array.from(
    new Set(products.map(p => p.attributes.CanvasThicknessType))
  )

  return (
    <div className='min-h-[calc(100vh-3.5rem)] py-8'>
      <div className='container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* Left side - Canvas Editor */}
          <div className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Canvas Editor</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredProduct && (
                  <ProductCustomizer
                    products={[filteredProduct]}
                    designUrl={design.image_url}
                    onCustomizationComplete={handleCustomizationComplete}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right side - Product Configuration */}
          <div className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center justify-between'>
                  Product Configuration
                </CardTitle>
              </CardHeader>

              <CardContent className='space-y-6'>
                {/* Expédition vers le pays de l'utilisateur */}
                <div className='flex items-center gap-2 text-sm mb-3 font-medium'>
                  <span className='text-xl'>{flagEmoji}</span>
                  <span>Ship to {flagEmoji}</span>
                </div>

                {/* Format Selection */}
                <div className='space-y-2'>
                  <Label>Format</Label>
                  <Select
                    value={selectedFormat}
                    onValueChange={setSelectedFormat}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select format' />
                    </SelectTrigger>
                    <SelectContent>
                      {formatOptions.map(format => (
                        <SelectItem key={format} value={format}>
                          {formatTranslations[format] || format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Orientation Selection - masquer si un seul choix */}
                <div className='space-y-2'>
                  <Label>Orientation</Label>
                  {orientationOptions.length > 1 ? (
                    <Select
                      value={selectedOrientation}
                      onValueChange={setSelectedOrientation}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select orientation' />
                      </SelectTrigger>
                      <SelectContent>
                        {orientationOptions.map(ori => (
                          <SelectItem key={ori} value={ori}>
                            {orientationTranslations[ori] || ori}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className='p-2 rounded border text-sm text-foreground/80'>
                      {orientationTranslations[orientationOptions[0]] ||
                        orientationOptions[0]}
                    </div>
                  )}
                </div>

                {/* Thickness Selection - masquer si un seul choix */}
                <div className='space-y-2'>
                  <Label>Thickness</Label>
                  {thicknessOptions.length > 1 ? (
                    <Select
                      value={selectedThickness}
                      onValueChange={setSelectedThickness}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select thickness' />
                      </SelectTrigger>
                      <SelectContent>
                        {thicknessOptions.map(th => (
                          <SelectItem key={th} value={th}>
                            {thicknessTranslations[th] || th}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className='p-2 rounded border text-sm text-foreground/80'>
                      {thicknessTranslations[thicknessOptions[0]] ||
                        thicknessOptions[0]}
                    </div>
                  )}
                </div>

                {/* Price Display */}
                {selectedVariant && (
                  <div className='bg-secondary p-4 rounded-lg text-center'>
                    <p className='text-2xl font-bold'>
                      {selectedVariant.price.toFixed(2)} €
                    </p>
                  </div>
                )}

                {/* Shipping Information */}
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <Truck className='h-4 w-4' />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className='text-left cursor-pointer underline decoration-dotted'>
                        Economy shipping: estimated delivery in 3-4 business
                        days
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className='max-w-xs'>
                          Delivery time includes receiving your order,
                          production and final shipping. Times are estimates and
                          may vary.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Product Information */}
                <Accordion type='single' collapsible className='w-full'>
                  <AccordionItem value='description'>
                    <AccordionTrigger>Description</AccordionTrigger>
                    <AccordionContent>
                      <div className='space-y-4 text-sm text-muted-foreground'>
                        <p>
                          Elevate your space with our premium-quality canvas
                          prints. The subtle texture of the canvas enriches
                          every detail of the artwork, creating a captivating
                          and immersive viewing experience:
                        </p>
                        <ul className='list-disc pl-4 space-y-2'>
                          <li>
                            <strong>Canvas Material:</strong> Responsibly
                            sourced, FSC-certified wood stretcher bars, with a
                            cotton-polyester blend (300–350gsm, 350–400
                            microns).
                          </li>
                          <li>
                            <strong>Thickness:</strong> Available in Slim (2cm)
                            and Thick (4cm) options.
                          </li>
                          <li>
                            <strong>Sizes:</strong> Multiple sizes in inches
                            (US/CA) and centimeters (international).
                          </li>
                          <li>
                            <strong>Hanging Kit:</strong> Included in every
                            order (specifics may vary by region).
                          </li>
                          <li>
                            <strong>On-Demand Printing:</strong> No minimum
                            orders, printed and shipped on demand.
                          </li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value='compliance'>
                    <AccordionTrigger>
                      EU GPSR Compliance Information
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className='space-y-4 text-sm text-muted-foreground'>
                        <p className='font-medium'>
                          Manufacturer Contact Information
                        </p>
                        <ul className='space-y-1'>
                          <li>Name: Gelato</li>
                          <li>Email address: support@gelato.com</li>
                          <li>
                            Postal address: Dronning Eufemias gate 8, 0191 Oslo,
                            Norway
                          </li>
                          <li>Age Guidelines: For adults</li>
                          <li>Warranty (consumer sales): 2 years</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value='packaging'>
                    <AccordionTrigger>Packaging</AccordionTrigger>
                    <AccordionContent>
                      <p className='text-sm text-muted-foreground'>
                        Each canvas print is carefully packaged with reinforced
                        edges for protection. We add bubble wrap or kraft paper
                        to keep your print safe during shipping.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

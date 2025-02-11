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
import { Loader2, Truck, Flag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { GelatoProduct } from '@/lib/gelato'
import { useAuth } from '@/components/auth-provider'
import { ProductCustomizer } from '@/components/product-customizer'
import { toast } from 'sonner'

interface Design {
  id: string
  image_url: string
  prompt: string
}

// Format translations with metric and imperial units
const formatTranslations: { [key: string]: string } = {
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

      // Set default selections if products exist
      if (canvasProducts.length > 0) {
        const formats = Array.from(
          new Set(canvasProducts.map(p => p.attributes.UnifiedCanvasFormat))
        )
        const orientations = Array.from(
          new Set(canvasProducts.map(p => p.attributes.Orientation))
        )
        const thicknesses = Array.from(
          new Set(canvasProducts.map(p => p.attributes.CanvasThicknessType))
        )
        setSelectedFormat(formats[0] || '')
        setSelectedOrientation(orientations[0] || '')
        setSelectedThickness(thicknesses[0] || '')
      }
    } catch (error) {
      console.error('Error loading products:', error)
      toast.error('Error loading products')
    } finally {
      setLoading(false)
    }
  }

  // Update filtered product when selections change
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
    try {
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
      if (orderError) throw orderError

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
              variantUid: data.variant.id,
              quantity: 1,
              files: [
                {
                  url: design.image_url,
                  type: 'preview',
                  printArea: data.printArea
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
            phone: '',
            street: '123 Example Street',
            city: 'Paris',
            country: 'FR',
            zipCode: '75001',
            state: ''
          }
        })
      })
      if (!gelatoOrder.ok) {
        throw new Error('Error creating Gelato order')
      }
      toast.success('Order created successfully!')
    } catch (error: any) {
      console.error('Order creation error:', error)
      toast.error('Error creating order. Please try again.')
    }
  }

  if (loading || !design) {
    return (
      <div className='flex h-[calc(100vh-3.5rem)] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    )
  }

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
                  <Flag className='h-6 w-6 text-blue-600' />
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-6'>
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
                      {Array.from(
                        new Set(
                          products.map(p => p.attributes.UnifiedCanvasFormat)
                        )
                      ).map(format => (
                        <SelectItem key={format} value={format}>
                          {formatTranslations[format] || format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Orientation Selection */}
                <div className='space-y-2'>
                  <Label>Orientation</Label>
                  <Select
                    value={selectedOrientation}
                    onValueChange={setSelectedOrientation}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select orientation' />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        new Set(products.map(p => p.attributes.Orientation))
                      ).map(ori => (
                        <SelectItem key={ori} value={ori}>
                          {orientationTranslations[ori] || ori}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Thickness Selection */}
                <div className='space-y-2'>
                  <Label>Thickness</Label>
                  <Select
                    value={selectedThickness}
                    onValueChange={setSelectedThickness}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select thickness' />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        new Set(
                          products.map(p => p.attributes.CanvasThicknessType)
                        )
                      ).map(th => (
                        <SelectItem key={th} value={th}>
                          {thicknessTranslations[th] || th}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Display */}
                {selectedVariant && (
                  <div className='bg-secondary p-4 rounded-lg'>
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
                      <TooltipTrigger className='text-left'>
                        Economy shipping: estimated delivery in 3-4 business
                        days
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className='max-w-xs'>
                          Delivery time includes us receiving your order,
                          production and delivery to your customer. Delivery
                          times are estimates and cannot be guaranteed.
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
                          Enhanced texture and timeless beauty with our canvas
                          print. The canvas texture enhances the image's natural
                          look and feel, creating a truly immersive art
                          experience:
                        </p>
                        <ul className='list-disc pl-4 space-y-2'>
                          <li>
                            Canvas Material: Responsibly sourced FSC-certified
                            wood stretcher bars, cotton-polyester blend
                            (300-350gsm, 350-400 microns).
                          </li>
                          <li>
                            Thickness: Slim (2cm) and Thick (4cm) options.
                          </li>
                          <li>
                            Available Sizes: 26 sizes in inches (US & Canada)
                            and cms (rest of the world).
                          </li>
                          <li>Hanging Kit: Included, varies by country.</li>
                          <li>
                            No minimum orders, printed and shipped on demand.
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
                          Manufacturer contact information
                        </p>
                        <ul className='space-y-1'>
                          <li>Name: Gelato</li>
                          <li>Email address: support@gelato.com</li>
                          <li>
                            Postal address: Dronning Eufemias gate 8, 0191 Oslo,
                            Norway
                          </li>
                          <li>Age guidelines: For adults</li>
                          <li>Warranty (consumer-sales only): 2 years</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value='packaging'>
                    <AccordionTrigger>Packaging</AccordionTrigger>
                    <AccordionContent>
                      <p className='text-sm text-muted-foreground'>
                        Canvas prints are packaged with strong edges to protect
                        the items. In addition, we wrap the items in bubble wrap
                        or kraft paper for additional protection.
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

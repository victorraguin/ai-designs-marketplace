// File: app/customize-product/[id]/page.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
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
import { AlertCircle, Loader2, Truck } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { GelatoProduct } from '@/lib/gelato'
import { useAuth } from '@/components/auth-provider'
import { ProductCustomizer, GelatoPrintArea } from '@/components/product-customizer'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AddressSelector } from '@/components/address-selector'
import Script from 'next/script'
import {
  calculateCanvasDimensions,
  CanvasDimensions
} from '@/lib/gelato-dimensions'

const supabase = createClient()

// --- Types ---
interface Design {
  id: string
  image_url: string
  prompt: string
}

interface ShippingAddress {
  id: string
  is_default: boolean
  first_name: string
  last_name: string
  company_name: string | null
  address_line1: string
  address_line2: string | null
  city: string
  state: string | null
  post_code: string
  country: string
  email: string
  phone: string | null
}

// --- Constants & Helpers ---
const TRANSLATIONS = {
  formats: {
    '200x200-mm-8x8-inch': '20x20cm / 8x8"',
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
  } as Record<string, string>,
  orientations: {
    hor: 'Horizontal',
    ver: 'Vertical'
  } as Record<string, string>,
  thicknesses: {
    'wood-fsc-slim': 'Slim (2cm)',
    'wood-fsc-thick': 'Thick (4cm)'
  } as Record<string, string>
}

const getFlagEmoji = (countryCode: string) => {
  if (!countryCode) return ''
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

const getUniqueAttributes = (products: GelatoProduct[], attribute: string) => {
  return Array.from(new Set(products.map(p => p.attributes[attribute])))
}

// --- Main Component ---
export default function CustomizeProductPage() {
  const params = useParams()
  const { user } = useAuth()
  const router = useRouter()

  // --- States ---
  const [design, setDesign] = useState<Design | null>(null)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<GelatoProduct[]>([])
  const [selectedFormat, setSelectedFormat] = useState<string>('')
  const [selectedOrientation, setSelectedOrientation] = useState<'hor' | 'ver'>('hor')
  const [selectedThickness, setSelectedThickness] = useState<string>('wood-fsc-slim')
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [filteredProduct, setFilteredProduct] = useState<GelatoProduct | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<ShippingAddress | null>(null)
  const [orderProcessing, setOrderProcessing] = useState(false)
  const [finalPrice, setFinalPrice] = useState<number | null>(null)
  const [discountCode, setDiscountCode] = useState<string>('')
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null)

  const userCountry = (user?.user_metadata?.country as string) || 'FR'
  const flagEmoji = getFlagEmoji(userCountry)

  // Calculate dimensions based on selected format, orientation, and thickness
  const canvasDimensions: CanvasDimensions = useMemo(() => {
    return calculateCanvasDimensions(
      selectedFormat,
      selectedOrientation,
      selectedThickness
    )
  }, [selectedFormat, selectedOrientation, selectedThickness])

  // --- Data Loading ---
  useEffect(() => {
    async function loadData() {
      await Promise.all([loadDesign(), loadGelatoProducts()])
    }
    loadData()
  }, [params.id])

  const loadDesign = async () => {
    try {
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('id', params.id)
        .single()
      if (error) throw error
      setDesign(data)
    } catch (error) {
      console.error('Error loading design:', error)
      toast.error('Error loading design')
    }
  }

  const loadGelatoProducts = async () => {
    try {
      const res = await fetch('/api/gelato/products')
      if (!res.ok) throw new Error('Error loading products')
      const prods: GelatoProduct[] = await res.json()

      const canvasProducts = prods.filter(
        p => p.category.toLowerCase() === 'canvas'
      )
      setProducts(canvasProducts)

      // Default selection
      const formats = getUniqueAttributes(canvasProducts, 'UnifiedCanvasFormat')
      const orientations = getUniqueAttributes(canvasProducts, 'Orientation')
      const thicknesses = getUniqueAttributes(canvasProducts, 'CanvasThicknessType')

      if (formats.length > 0) setSelectedFormat(formats[0])
      if (orientations.length > 0) setSelectedOrientation(orientations[0] as 'hor' | 'ver')
      if (thicknesses.length > 0) setSelectedThickness(thicknesses[0])
    } catch (error) {
      console.error('Error loading products:', error)
      toast.error('Error loading products')
    } finally {
      setLoading(false)
    }
  }

  // --- Product Filtering ---
  useEffect(() => {
    if (!selectedFormat || !selectedOrientation || !selectedThickness) return

    const prod = products.find(
      p =>
        p.attributes.UnifiedCanvasFormat === selectedFormat &&
        p.attributes.Orientation === selectedOrientation &&
        p.attributes.CanvasThicknessType === selectedThickness
    )
    setFilteredProduct(prod || null)
    setSelectedVariant(prod?.variants?.[0] || null)
  }, [selectedFormat, selectedOrientation, selectedThickness, products])

  // --- Price Calculation ---
  useEffect(() => {
    if (selectedVariant && selectedVariant.price) {
      getFinalPrice()
    }
  }, [selectedVariant, discountCode])

  const getFinalPrice = async () => {
    try {
      const priceResponse = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basePrice: selectedVariant.price,
          currency: 'EUR',
          discountCode: discountCode
        })
      })
      if (!priceResponse.ok) {
        throw new Error('Error calculating price')
      }
      const { price: calculatedPrice } = await priceResponse.json()
      setFinalPrice(calculatedPrice)
    } catch (error: any) {
      console.error('Price calculation error:', error)
      toast.error(error.message || 'Error calculating price')
    }
  }

  // --- Order Creation ---
  const handleCustomizationComplete = async (data: { printArea: GelatoPrintArea }) => {
    if (!design || !user || !selectedAddress) {
      toast.error('Please select a shipping address')
      return
    }

    if (!filteredProduct || !selectedVariant) {
      toast.error('Please select a product configuration')
      return
    }

    try {
      setOrderProcessing(true)

      // Recalculate final price
      const priceResponse = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basePrice: selectedVariant.price,
          currency: 'EUR',
          discountCode: discountCode
        })
      })
      if (!priceResponse.ok) {
        throw new Error('Error calculating price')
      }
      const { price: calculatedPrice } = await priceResponse.json()
      setFinalPrice(calculatedPrice)

      // Upload the print-ready image if available
      let printImageUrl = design.image_url
      if (data.printArea.exportedImageDataUrl) {
        toast.loading('Uploading print image...')
        const uploadResponse = await fetch('/api/upload-print-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageDataUrl: data.printArea.exportedImageDataUrl,
            designId: design.id,
            format: selectedFormat,
            orientation: selectedOrientation
          })
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          printImageUrl = uploadData.url
          toast.dismiss()
        } else {
          console.warn('Failed to upload print image, using original design URL')
          toast.dismiss()
        }
      }

      // Create Gelato order with the print-ready image
      const gelatoOrderResponse = await fetch('/api/gelato/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: 'order',
          currency: 'EUR',
          orderReferenceId: `order-${user.id}-${Date.now()}`,
          items: [
            {
              productUid: filteredProduct.productUid,
              quantity: 1,
              files: [
                {
                  url: printImageUrl,
                  type: 'default'
                }
              ]
            }
          ],
          shippingAddress: {
            firstName: selectedAddress.first_name,
            lastName: selectedAddress.last_name,
            email: selectedAddress.email,
            phone: selectedAddress.phone || '',
            street: selectedAddress.address_line1,
            streetAdditional: selectedAddress.address_line2 || '',
            city: selectedAddress.city,
            state: selectedAddress.state || '',
            postCode: selectedAddress.post_code,
            country: selectedAddress.country
          },
          // Include print area data for reference
          printAreaData: {
            canvasWidth: data.printArea.canvasWidth,
            canvasHeight: data.printArea.canvasHeight,
            designArea: {
              x: data.printArea.x,
              y: data.printArea.y,
              width: data.printArea.width,
              height: data.printArea.height,
              rotation: data.printArea.rotation
            },
            dpi: data.printArea.dpi,
            format: selectedFormat,
            orientation: selectedOrientation,
            thickness: selectedThickness,
            dimensions: {
              visibleMm: `${canvasDimensions.visibleArea.widthMm}x${canvasDimensions.visibleArea.heightMm}`,
              totalMm: `${canvasDimensions.totalPrintArea.widthMm}x${canvasDimensions.totalPrintArea.heightMm}`,
              wrapMm: canvasDimensions.wrapAround.sizeMm
            }
          }
        })
      })

      if (!gelatoOrderResponse.ok) {
        const errorData = await gelatoOrderResponse.json()
        throw new Error(errorData.message || 'Error creating Gelato order')
      }
      const gelatoOrderData = await gelatoOrderResponse.json()

      // Extract and fallback data returned by Gelato
      const firstItem = gelatoOrderData.items?.[0]
      const firstPreview = firstItem?.previews?.[0]?.url ?? firstItem?.fileUrl ?? null
      const orderReferenceId = gelatoOrderData.orderReferenceId ?? `order-${user.id}-${Date.now()}`
      const customerReferenceId = gelatoOrderData.customerReferenceId ?? `user-${Date.now()}`
      const trackingCode = gelatoOrderData.shipment?.packages?.[0]?.trackingCode ?? null
      const trackingUrl = gelatoOrderData.shipment?.packages?.[0]?.trackingUrl ?? null
      const billingCompany = gelatoOrderData.billingEntity?.companyName || 'N/A'
      const marginRate = gelatoOrderData.marginRate ?? 0
      const promotionId = gelatoOrderData.promotionId ?? 'N/A'
      const productionFacilityId = gelatoOrderData.shipment?.fulfillmentFacilityId ?? 'N/A'

      // Insert order into Supabase
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            design_id: design.id,
            buyer_id: user.id,
            product_type: filteredProduct.productUid,
            base_price: selectedVariant.price,
            final_price: calculatedPrice,
            discount_code: discountCode,
            discount_rate: appliedDiscount,
            total_amount: selectedVariant.price,
            order_status: gelatoOrderData.fulfillmentStatus || 'created',
            gelato_order_id: gelatoOrderData.id,
            fulfillment_status: gelatoOrderData.fulfillmentStatus,
            financial_status: gelatoOrderData.financialStatus,
            currency: gelatoOrderData.currency,
            total_price: gelatoOrderData.receipts?.[0]?.productsPrice || 0,
            total_vat: gelatoOrderData.receipts?.[0]?.totalVat || 0,
            total_shipping: gelatoOrderData.receipts?.[0]?.shippingPrice || 0,
            total_packaging: gelatoOrderData.receipts?.[0]?.packagingPrice || 0,
            shipment_method_name: gelatoOrderData.shipment?.shipmentMethodName,
            shipment_method_uid: gelatoOrderData.shipment?.shipmentMethodUid,
            production_country: gelatoOrderData.shipment?.fulfillmentCountry,
            tracking_code: trackingCode,
            tracking_url: trackingUrl,
            shipping_addresses_id: selectedAddress.id,
            preview_url: firstPreview,
            order_reference_id: orderReferenceId,
            customer_reference_id: customerReferenceId,
            billing_company_name: billingCompany,
            margin_rate: marginRate,
            promotion_id: promotionId,
            production_facility_id: productionFacilityId
          }
        ])
        .select()
        .single()

      if (orderError) throw orderError

      toast.success('Order created successfully!')
      router.push(`/order-confirmation/${orderData.id}`)
    } catch (error: any) {
      console.error('Order creation error:', error)
      toast.error(error.message || 'Error creating order. Please try again.')
    } finally {
      setOrderProcessing(false)
    }
  }

  if (loading || !design || !user) {
    return (
      <div className='flex h-[calc(100vh-3.5rem)] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    )
  }

  // Options for selects
  const formatOptions = getUniqueAttributes(products, 'UnifiedCanvasFormat')
  const orientationOptions = getUniqueAttributes(products, 'Orientation')
  const thicknessOptions = getUniqueAttributes(products, 'CanvasThicknessType')

  return (
    <>
      <Script
        src='https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js'
        strategy='beforeInteractive'
      />
      <div className='min-h-[calc(100vh-3.5rem)] py-8'>
        <div className='container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
            {/* Left side – Canvas Editor */}
            <div className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle>Editeur de Canvas</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedFormat && (
                    <ProductCustomizer
                      key={`${selectedFormat}-${selectedOrientation}-${selectedThickness}`}
                      designUrl={design.image_url}
                      dimensions={canvasDimensions}
                      onCustomizationComplete={handleCustomizationComplete}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Adresse de livraison</CardTitle>
                </CardHeader>
                <CardContent>
                  <AddressSelector
                    onSelect={address => setSelectedAddress(address)}
                  />
                  {!selectedAddress && (
                    <Alert className='mt-4'>
                      <AlertCircle className='h-4 w-4' />
                      <AlertDescription>
                        Veuillez sélectionner une adresse de livraison pour continuer
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right side – Product Configuration */}
            <div className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center justify-between'>
                    Configuration du produit
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='space-y-2'>
                    <Label>Format</Label>
                    <Select
                      value={selectedFormat}
                      onValueChange={setSelectedFormat}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Sélectionner le format' />
                      </SelectTrigger>
                      <SelectContent>
                        {formatOptions.map(format => (
                          <SelectItem key={format} value={format}>
                            {TRANSLATIONS.formats[format] || format}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-2'>
                    <Label>Orientation</Label>
                    {orientationOptions.length > 1 ? (
                      <Select
                        value={selectedOrientation}
                        onValueChange={(v) => setSelectedOrientation(v as 'hor' | 'ver')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Sélectionner l orientation' />
                        </SelectTrigger>
                        <SelectContent>
                          {orientationOptions.map(ori => (
                            <SelectItem key={ori} value={ori}>
                              {TRANSLATIONS.orientations[ori] || ori}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className='p-2 rounded border text-sm text-foreground/80'>
                        {TRANSLATIONS.orientations[orientationOptions[0]] ||
                          orientationOptions[0]}
                      </div>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label>Epaisseur</Label>
                    {thicknessOptions.length > 1 ? (
                      <Select
                        value={selectedThickness}
                        onValueChange={setSelectedThickness}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Sélectionner l épaisseur' />
                        </SelectTrigger>
                        <SelectContent>
                          {thicknessOptions.map(th => (
                            <SelectItem key={th} value={th}>
                              {TRANSLATIONS.thicknesses[th] || th}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className='p-2 rounded border text-sm text-foreground/80'>
                        {TRANSLATIONS.thicknesses[thicknessOptions[0]] ||
                          thicknessOptions[0]}
                      </div>
                    )}
                  </div>

                  {/* Dimensions info */}
                  <div className='bg-muted p-4 rounded-lg space-y-2'>
                    <h4 className='font-medium text-sm'>Dimensions d'impression</h4>
                    <div className='grid grid-cols-2 gap-2 text-sm text-muted-foreground'>
                      <div>Zone visible:</div>
                      <div className='font-mono'>
                        {canvasDimensions.visibleArea.widthMm}x{canvasDimensions.visibleArea.heightMm}mm
                      </div>
                      <div>Bord replié:</div>
                      <div className='font-mono'>{canvasDimensions.wrapAround.sizeMm}mm</div>
                      <div>Total (avec bords):</div>
                      <div className='font-mono'>
                        {canvasDimensions.totalPrintArea.widthMm}x{canvasDimensions.totalPrintArea.heightMm}mm
                      </div>
                      <div>Résolution:</div>
                      <div className='font-mono'>
                        {canvasDimensions.totalPrintArea.widthPx}x{canvasDimensions.totalPrintArea.heightPx}px
                      </div>
                    </div>
                  </div>

                  {finalPrice !== null && (
                    <div className='bg-secondary p-4 rounded-lg text-center'>
                      <p className='text-2xl font-bold'>{finalPrice.toFixed(2)} EUR</p>
                    </div>
                  )}

                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Truck className='h-4 w-4' />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className='text-left cursor-pointer underline decoration-dotted'>
                          Livraison économique: 3-4 jours ouvrés
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className='max-w-xs'>
                            Le délai de livraison comprend la réception de votre
                            commande, la production et l'expédition finale. Les
                            délais sont estimatifs et peuvent varier.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <Accordion type='single' collapsible className='w-full'>
                    <AccordionItem value='description'>
                      <AccordionTrigger>Description</AccordionTrigger>
                      <AccordionContent>
                        <div className='space-y-4 text-sm text-muted-foreground'>
                          <p>
                            Sublimez votre intérieur avec nos impressions sur
                            toile de qualité premium. La texture subtile de la
                            toile enrichit chaque détail de l'œuvre, créant une
                            expérience visuelle captivante et immersive:
                          </p>
                          <ul className='list-disc pl-4 space-y-2'>
                            <li>
                              <strong>Matériau:</strong> Châssis en bois certifié
                              FSC, toile coton-polyester (300-350gsm, 350-400
                              microns).
                            </li>
                            <li>
                              <strong>Epaisseur:</strong> Disponible en Slim
                              (2cm) et Thick (4cm).
                            </li>
                            <li>
                              <strong>Tailles:</strong> Multiples tailles en
                              pouces et centimètres.
                            </li>
                            <li>
                              <strong>Kit d'accrochage:</strong> Inclus dans
                              chaque commande.
                            </li>
                            <li>
                              <strong>Impression à la demande:</strong> Pas de
                              minimum de commande.
                            </li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value='compliance'>
                      <AccordionTrigger>
                        Conformité EU GPSR
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className='space-y-4 text-sm text-muted-foreground'>
                          <p className='font-medium'>
                            Informations du fabricant
                          </p>
                          <ul className='space-y-1'>
                            <li>Nom: Gelato</li>
                            <li>Email: support@gelato.com</li>
                            <li>
                              Adresse: Dronning Eufemias gate 8, 0191 Oslo,
                              Norvège
                            </li>
                            <li>Public cible: Adultes</li>
                            <li>Garantie: 2 ans</li>
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value='packaging'>
                      <AccordionTrigger>Emballage</AccordionTrigger>
                      <AccordionContent>
                        <p className='text-sm text-muted-foreground'>
                          Chaque impression sur toile est soigneusement emballée
                          avec des bords renforcés pour la protection. Nous
                          ajoutons du papier bulle ou du papier kraft pour
                          protéger votre impression pendant l'expédition.
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
    </>
  )
}

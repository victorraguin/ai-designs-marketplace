// lib/gelato.ts

import { toast } from 'sonner'

export interface GelatoProduct {
  productUid: string
  name: string
  description: string
  category: string
  attributes: Record<string, string>
  variants: GelatoVariant[]
  supportedCountries: string[]
}

export interface GelatoVariant {
  id: string
  sku: string
  size: string
  color: string
  price: number
}

export interface PrintArea {
  width: number
  height: number
  x: number
  y: number
  rotation: number
}

export interface GelatoShippingAddress {
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  street: string
  streetAdditional?: string
  city: string
  state?: string
  country: string
  zipCode: string
}

export interface GelatoOrderItem {
  productUid: string
  variantUid: string
  quantity: number
  files: {
    url: string
    type: 'preview' | 'print'
    printArea?: PrintArea
  }[]
}

export interface GelatoOrder {
  orderType: 'order' | 'sample'
  currency: string
  items: GelatoOrderItem[]
  shippingAddress: GelatoShippingAddress
}

class GelatoClient {
  private readonly apiUrl = 'https://product.gelatoapis.com'
  private readonly apiKey = process.env.GELATO_API_KEY || 'mock-key'

  private async fetch (endpoint: string, options: RequestInit = {}) {
    try {
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        ...options,
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          error.message || "Une erreur est survenue avec l'API Gelato"
        )
      }
      return response.json()
    } catch (error) {
      console.error('Gelato API error:', error)
      throw error
    }
  }

  async getCatalogs () {
    // L'API retourne désormais un objet contenant "data"
    return this.fetch('/v3/catalogs')
  }

  async getCatalogDetails (catalogUid: string) {
    return this.fetch(`/v3/catalogs/${catalogUid}`)
  }

  async searchProducts (catalogUid: string, filters: Record<string, any> = {}) {
    return this.fetch(`/v3/catalogs/${catalogUid}/products:search`, {
      method: 'POST',
      body: JSON.stringify({
        attributeFilters: filters,
        limit: 50,
        offset: 0
      })
    })
  }

  async getProductDetails (productUid: string) {
    return this.fetch(`/v3/products/${productUid}`)
  }

  async getProductCoverDimensions (productUid: string, pageCount?: number) {
    let url = `/v3/products/${productUid}/cover-dimensions`
    if (pageCount) url += `?pageCount=${pageCount}`
    return this.fetch(url)
  }

  async getProductPrices (productUid: string) {
    return this.fetch(`/v3/products/${productUid}/prices`)
  }

  async getStockAvailability (products: string[]) {
    return this.fetch('/v3/stock/region-availability', {
      method: 'POST',
      body: JSON.stringify({ products })
    })
  }

  async getShipmentMethods () {
    return this.fetch('https://shipment.gelatoapis.com/v1/shipment-methods')
  }

  async getProducts (): Promise<GelatoProduct[]> {
    try {
      const catalogsResponse = await this.getCatalogs()
      const catalogs: any[] = Array.isArray(catalogsResponse)
        ? catalogsResponse
        : catalogsResponse.data || catalogsResponse.catalogs

      if (!catalogs || (Array.isArray(catalogs) && catalogs.length === 0)) {
        throw new Error('Aucun catalogue retourné par l’API')
      }

      // On cible ici les catalogues "t-shirts" et "canvas"
      const targetCatalogUids = ['canvas']
      const targetCatalogs = catalogs.filter((c: any) =>
        targetCatalogUids.includes(c.catalogUid)
      )
      if (!targetCatalogs || targetCatalogs.length === 0) {
        throw new Error(
          `Aucun catalogue correspondant aux catalogues cibles (${targetCatalogUids.join(
            ', '
          )}) n'a été trouvé`
        )
      }

      let combinedProducts: GelatoProduct[] = []
      for (const targetCatalog of targetCatalogs) {
        const catalogUid = targetCatalog.catalogUid
        const searchResponse = await this.searchProducts(catalogUid, {
          Orientation: ['hor', 'ver']
        })
        const products = searchResponse.products
        if (!products || products.length === 0) {
          console.warn(`Aucun produit retourné pour le catalogue ${catalogUid}`)
          continue
        }
        const productsWithDetails = await Promise.all(
          products.map(async (product: any) => {
            const details = await this.getProductDetails(product.productUid)
            const prices = await this.getProductPrices(product.productUid)
            return {
              productUid: product.productUid,
              name: targetCatalog.title || catalogUid,
              description: `Produit ${targetCatalog.title}`,
              category: catalogUid,
              attributes: details.attributes,
              variants: prices.map((price: any) => ({
                id: `${product.productUid}-${price.quantity}`,
                sku: product.productUid,
                size: details.attributes?.UnifiedCanvasFormat || 'Standard',
                color: details.attributes?.ColorType || 'White',
                price: price.price
              })),
              supportedCountries: details.supportedCountries || []
            }
          })
        )
        combinedProducts = combinedProducts.concat(productsWithDetails)
      }

      return combinedProducts
    } catch (error) {
      console.error('Error fetching products:', error)
      throw new Error('Erreur lors de la récupération des produits')
    }
  }

  async createOrder (order: GelatoOrder) {
    try {
      return await this.fetch('https://order.gelatoapis.com/v4/orders', {
        method: 'POST',
        body: JSON.stringify(order)
      })
    } catch (error) {
      console.error('Error creating order:', error)
      throw new Error('Échec de la création de la commande')
    }
  }
}

export const gelato = new GelatoClient()

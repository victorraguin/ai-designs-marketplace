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
  quantity: number
  files: {
    url: string
    type: string
  }[]
}

export interface GelatoOrder {
  orderType: string
  currency: string
  orderReferenceId?: string
  customerReferenceId?: string
  items: GelatoOrderItem[]
  shippingAddress: GelatoShippingAddress
}

class GelatoClient {
  private readonly apiUrl = 'https://product.gelatoapis.com'
  private readonly apiKey = process.env.GELATO_API_KEY || ''

  private async fetch (endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || 'API error')
    }
    return response
  }

  async getCatalogs () {
    return (await this.fetch('/v3/catalogs')).json()
  }

  async getCatalogDetails (catalogUid: string) {
    return (await this.fetch(`/v3/catalogs/${catalogUid}`)).json()
  }

  async searchProducts (catalogUid: string, filters: Record<string, any> = {}) {
    return (
      await this.fetch(`/v3/catalogs/${catalogUid}/products:search`, {
        method: 'POST',
        body: JSON.stringify({
          attributeFilters: filters,
          limit: 50,
          offset: 0
        })
      })
    ).json()
  }

  async getProductDetails (productUid: string) {
    return (await this.fetch(`/v3/products/${productUid}`)).json()
  }

  async getProductCoverDimensions (productUid: string, pageCount?: number) {
    let url = `/v3/products/${productUid}/cover-dimensions`
    if (pageCount) url += `?pageCount=${pageCount}`
    return (await this.fetch(url)).json()
  }

  async getProductPrices (productUid: string) {
    return (await this.fetch(`/v3/products/${productUid}/prices`)).json()
  }

  async getStockAvailability (products: string[]) {
    return (
      await this.fetch('/v3/stock/region-availability', {
        method: 'POST',
        body: JSON.stringify({ products })
      })
    ).json()
  }

  async getShipmentMethods () {
    return fetch('https://shipment.gelatoapis.com/v1/shipment-methods', {
      headers: {
        'X-API-KEY': this.apiKey
      }
    }).then(r => r.json())
  }

  async getProducts (userCountry: string): Promise<GelatoProduct[]> {
    const catalogsResponse = await this.getCatalogs()
    const catalogs: any[] = Array.isArray(catalogsResponse)
      ? catalogsResponse
      : catalogsResponse.data || catalogsResponse.catalogs
    const targetCatalogUids = ['canvas']
    const targetCatalogs = catalogs.filter((c: any) =>
      targetCatalogUids.includes(c.catalogUid)
    )
    let combinedProducts: GelatoProduct[] = []
    for (const targetCatalog of targetCatalogs) {
      const catalogUid = targetCatalog.catalogUid
      const searchResponse = await this.searchProducts(catalogUid, {
        Orientation: ['hor', 'ver']
      })
      const products = searchResponse.products
      if (!products) continue
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
    const filteredProducts = combinedProducts.filter(product =>
      product.supportedCountries.includes(userCountry)
    )
    return filteredProducts
  }

  async createOrder (gelatoOrder: any) {
    const response = await fetch('https://order.gelatoapis.com/v4/orders', {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gelatoOrder)
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || 'Gelato createOrder failed')
    }
    return response.json()
  }
}

export const gelato = new GelatoClient()

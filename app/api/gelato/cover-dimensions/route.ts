// app/api/gelato/cover-dimensions/route.ts
import { NextResponse } from 'next/server'

export async function GET (req: Request) {
  const { searchParams } = new URL(req.url)
  const productUid = searchParams.get('productUid')

  if (!productUid) {
    return NextResponse.json({ error: 'Missing productUid' }, { status: 400 })
  }

  try {
    // Fetch product details to get dimensions
    const gelatoRes = await fetch(
      `https://product.gelatoapis.com/v3/products/${productUid}`,
      {
        headers: {
          'X-API-KEY': process.env.GELATO_API_KEY || ''
        }
      }
    )

    if (!gelatoRes.ok) {
      throw new Error('Gelato product fetch failed.')
    }

    const productData = await gelatoRes.json()

    // For canvas products, extract dimensions from attributes
    // and calculate print area based on product format
    const attributes = productData.attributes || {}
    const format = attributes.UnifiedCanvasFormat || ''
    const orientation = attributes.Orientation || 'hor'
    const thickness = attributes.CanvasThicknessType || 'wood-fsc-slim'

    // Parse dimensions from format string (e.g., "200x200-mm-8x8-inch")
    const dimensions = parseCanvasFormat(format, orientation, thickness)

    return NextResponse.json({
      productUid,
      ...dimensions,
      attributes
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Parse canvas format and return dimensions in mm
function parseCanvasFormat(format: string, orientation: string, thickness: string) {
  // Canvas formats mapping: format -> { widthMm, heightMm }
  const formatDimensions: Record<string, { widthMm: number; heightMm: number }> = {
    '200x200-mm-8x8-inch': { widthMm: 200, heightMm: 200 },
    '11x14-inch-270x350-mm': { widthMm: 270, heightMm: 350 },
    '12x12-inch-300x300-mm': { widthMm: 300, heightMm: 300 },
    '12x16-inch-300x400-mm': { widthMm: 300, heightMm: 400 },
    '12x18-inch-300x450-mm': { widthMm: 300, heightMm: 450 },
    '12x24-inch-300x600-mm': { widthMm: 300, heightMm: 600 },
    '12x36-inch-300x900-mm': { widthMm: 300, heightMm: 900 },
    '12x40-inch-300x1000-mm': { widthMm: 300, heightMm: 1000 },
    '16x16-inch-400x400-mm': { widthMm: 400, heightMm: 400 },
    '16x20-inch-400x500-mm': { widthMm: 400, heightMm: 500 },
    '16x24-inch-400x600-mm': { widthMm: 400, heightMm: 600 },
    '16x32-inch-400x800-mm': { widthMm: 400, heightMm: 800 },
    '18x24-inch-450x600-mm': { widthMm: 450, heightMm: 600 }
  }

  // Wrap-around (bleed) for canvas stretched on frame
  // Slim (2cm) = 20mm per side, Thick (4cm) = 40mm per side
  const wrapMm = thickness === 'wood-fsc-thick' ? 40 : 20

  const baseDimensions = formatDimensions[format] || { widthMm: 200, heightMm: 200 }

  // For horizontal orientation, width > height; for vertical, height > width
  let { widthMm, heightMm } = baseDimensions

  // Swap dimensions for horizontal if needed (formats are typically stored as portrait)
  if (orientation === 'hor' && widthMm < heightMm) {
    [widthMm, heightMm] = [heightMm, widthMm]
  } else if (orientation === 'ver' && widthMm > heightMm) {
    [widthMm, heightMm] = [heightMm, widthMm]
  }

  // Total print area including wrap-around (bleed)
  const totalWidthMm = widthMm + (wrapMm * 2)
  const totalHeightMm = heightMm + (wrapMm * 2)

  // Convert to pixels at 300 DPI for print
  // 1 inch = 25.4 mm, 300 DPI
  const mmToPixels = (mm: number) => Math.round((mm / 25.4) * 300)

  return {
    // Visible print area (what customer sees when hung)
    visibleArea: {
      widthMm,
      heightMm,
      widthPx: mmToPixels(widthMm),
      heightPx: mmToPixels(heightMm)
    },
    // Wrap-around area (wraps around the frame edges)
    wrapAround: {
      sizeMm: wrapMm,
      sizePx: mmToPixels(wrapMm)
    },
    // Total print area needed (visible + wrap on all sides)
    totalPrintArea: {
      widthMm: totalWidthMm,
      heightMm: totalHeightMm,
      widthPx: mmToPixels(totalWidthMm),
      heightPx: mmToPixels(totalHeightMm)
    },
    // Aspect ratio
    aspectRatio: widthMm / heightMm,
    orientation,
    thickness,
    format
  }
}

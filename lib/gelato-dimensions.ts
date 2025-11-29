// lib/gelato-dimensions.ts
// Gelato Canvas Dimensions and Print Area Calculator

export interface CanvasDimensions {
  // Visible print area (what customer sees when hung)
  visibleArea: {
    widthMm: number
    heightMm: number
    widthPx: number
    heightPx: number
  }
  // Wrap-around area (wraps around the frame edges)
  wrapAround: {
    sizeMm: number
    sizePx: number
  }
  // Total print area needed (visible + wrap on all sides)
  totalPrintArea: {
    widthMm: number
    heightMm: number
    widthPx: number
    heightPx: number
  }
  // Aspect ratio (width / height)
  aspectRatio: number
  orientation: 'hor' | 'ver'
  thickness: string
  format: string
}

// Canvas formats mapping: format -> { widthMm, heightMm } (base dimensions, portrait orientation)
export const CANVAS_FORMAT_DIMENSIONS: Record<string, { widthMm: number; heightMm: number }> = {
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

// Wrap-around (bleed) sizes in mm for each frame thickness
export const WRAP_SIZES: Record<string, number> = {
  'wood-fsc-slim': 20,   // 2cm frame = 20mm wrap per side
  'wood-fsc-thick': 40   // 4cm frame = 40mm wrap per side
}

// Convert mm to pixels at 300 DPI
export function mmToPixels(mm: number, dpi: number = 300): number {
  return Math.round((mm / 25.4) * dpi)
}

// Convert pixels to mm at 300 DPI
export function pixelsToMm(px: number, dpi: number = 300): number {
  return (px * 25.4) / dpi
}

// Calculate canvas dimensions from format, orientation, and thickness
export function calculateCanvasDimensions(
  format: string,
  orientation: 'hor' | 'ver' = 'hor',
  thickness: string = 'wood-fsc-slim'
): CanvasDimensions {
  const baseDimensions = CANVAS_FORMAT_DIMENSIONS[format] || { widthMm: 200, heightMm: 200 }
  const wrapMm = WRAP_SIZES[thickness] || 20

  let { widthMm, heightMm } = baseDimensions

  // Adjust dimensions based on orientation
  // For horizontal: width > height
  // For vertical: height > width
  if (orientation === 'hor' && widthMm < heightMm) {
    [widthMm, heightMm] = [heightMm, widthMm]
  } else if (orientation === 'ver' && widthMm > heightMm) {
    [widthMm, heightMm] = [heightMm, widthMm]
  }

  // Total print area including wrap-around (bleed)
  const totalWidthMm = widthMm + (wrapMm * 2)
  const totalHeightMm = heightMm + (wrapMm * 2)

  return {
    visibleArea: {
      widthMm,
      heightMm,
      widthPx: mmToPixels(widthMm),
      heightPx: mmToPixels(heightMm)
    },
    wrapAround: {
      sizeMm: wrapMm,
      sizePx: mmToPixels(wrapMm)
    },
    totalPrintArea: {
      widthMm: totalWidthMm,
      heightMm: totalHeightMm,
      widthPx: mmToPixels(totalWidthMm),
      heightPx: mmToPixels(totalHeightMm)
    },
    aspectRatio: widthMm / heightMm,
    orientation,
    thickness,
    format
  }
}

// Calculate display canvas dimensions that fit within a max container size
// while maintaining the correct aspect ratio
export function calculateDisplayDimensions(
  dimensions: CanvasDimensions,
  maxSize: number = 500
): { width: number; height: number; scale: number } {
  const { aspectRatio } = dimensions

  let width: number
  let height: number

  if (aspectRatio >= 1) {
    // Landscape or square: width is limiting factor
    width = maxSize
    height = Math.round(maxSize / aspectRatio)
  } else {
    // Portrait: height is limiting factor
    height = maxSize
    width = Math.round(maxSize * aspectRatio)
  }

  // Scale factor from display to total print area
  const scale = dimensions.totalPrintArea.widthPx / width

  return { width, height, scale }
}

// Calculate the visible print area bounds within the display canvas
// (excluding the wrap-around that will be hidden on the frame edges)
export function calculateVisibleAreaBounds(
  dimensions: CanvasDimensions,
  displayWidth: number,
  displayHeight: number
): { left: number; top: number; width: number; height: number } {
  // The wrap-around as a percentage of total dimensions
  const wrapPercentageX = dimensions.wrapAround.sizeMm / dimensions.totalPrintArea.widthMm
  const wrapPercentageY = dimensions.wrapAround.sizeMm / dimensions.totalPrintArea.heightMm

  // Convert to display pixels
  const wrapDisplayX = displayWidth * wrapPercentageX
  const wrapDisplayY = displayHeight * wrapPercentageY

  return {
    left: wrapDisplayX,
    top: wrapDisplayY,
    width: displayWidth - (wrapDisplayX * 2),
    height: displayHeight - (wrapDisplayY * 2)
  }
}

// Export canvas data for Gelato order
export interface GelatoCanvasExport {
  // Total image dimensions required by Gelato
  totalWidthPx: number
  totalHeightPx: number
  // Position and dimensions of the design within the total area
  designArea: {
    x: number
    y: number
    width: number
    height: number
    rotation: number
  }
  // DPI
  dpi: number
}

// Convert display coordinates to Gelato print coordinates
export function convertToGelatoCoordinates(
  displayX: number,
  displayY: number,
  displayWidth: number,
  displayHeight: number,
  rotation: number,
  dimensions: CanvasDimensions,
  displayCanvasWidth: number,
  displayCanvasHeight: number
): GelatoCanvasExport {
  // Scale factor from display to print
  const scaleX = dimensions.totalPrintArea.widthPx / displayCanvasWidth
  const scaleY = dimensions.totalPrintArea.heightPx / displayCanvasHeight

  return {
    totalWidthPx: dimensions.totalPrintArea.widthPx,
    totalHeightPx: dimensions.totalPrintArea.heightPx,
    designArea: {
      x: Math.round(displayX * scaleX),
      y: Math.round(displayY * scaleY),
      width: Math.round(displayWidth * scaleX),
      height: Math.round(displayHeight * scaleY),
      rotation
    },
    dpi: 300
  }
}

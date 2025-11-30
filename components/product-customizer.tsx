'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RotateCw, ZoomIn, ZoomOut, Info } from 'lucide-react'
import {
  CanvasDimensions,
  calculateDisplayDimensions,
  calculateVisibleAreaBounds,
  convertToGelatoCoordinates
} from '@/lib/gelato-dimensions'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

interface ProductCustomizerProps {
  designUrl: string
  dimensions: CanvasDimensions
  onCustomizationComplete: (data: { printArea: GelatoPrintArea }) => void
}

export interface GelatoPrintArea {
  // Total canvas dimensions in pixels (for Gelato)
  canvasWidth: number
  canvasHeight: number
  // Design position and size within the canvas
  x: number
  y: number
  width: number
  height: number
  rotation: number
  // DPI for print
  dpi: number
  // Exported image as data URL (ready for Gelato)
  exportedImageDataUrl?: string
}

declare global {
  interface Window {
    fabric: any
  }
}

// Maximum display size for the canvas editor
const MAX_DISPLAY_SIZE = 500

export function ProductCustomizer({
  designUrl,
  dimensions,
  onCustomizationComplete
}: ProductCustomizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvas, setCanvas] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [fabricLoaded, setFabricLoaded] = useState(false)
  const designImgRef = useRef<any>(null)
  const frameRectRef = useRef<any>(null)
  const wrapGuideRef = useRef<any[]>([])
  const originalSizeRef = useRef<{ width: number; height: number } | null>(null)

  // Calculate display dimensions based on the product dimensions
  const displayDimensions = calculateDisplayDimensions(dimensions, MAX_DISPLAY_SIZE)
  const { width: displayWidth, height: displayHeight, scale: printScale } = displayDimensions

  // Calculate visible area bounds (excluding wrap-around)
  const visibleBounds = calculateVisibleAreaBounds(
    dimensions,
    displayWidth,
    displayHeight
  )

  // Check if Fabric.js is loaded
  useEffect(() => {
    const checkFabric = () => {
      if (window.fabric) {
        setFabricLoaded(true)
      } else {
        setTimeout(checkFabric, 100)
      }
    }
    checkFabric()
  }, [])

  // Keep image within the total canvas bounds
  const keepInBounds = useCallback((obj: any, maxWidth: number, maxHeight: number) => {
    if (!obj) return
    obj.setCoords()

    const objBound = obj.getBoundingRect()

    // Prevent moving outside canvas bounds
    if (objBound.left < 0) {
      obj.left -= objBound.left
    }
    if (objBound.top < 0) {
      obj.top -= objBound.top
    }
    if (objBound.left + objBound.width > maxWidth) {
      obj.left -= (objBound.left + objBound.width - maxWidth)
    }
    if (objBound.top + objBound.height > maxHeight) {
      obj.top -= (objBound.top + objBound.height - maxHeight)
    }
    obj.setCoords()
  }, [])

  // Limit zoom so image doesn't get smaller than visible area
  const limitMinZoom = useCallback((obj: any, minWidth: number, minHeight: number) => {
    if (!obj) return
    obj.setCoords()

    const objBound = obj.getBoundingRect()

    // Ensure image covers at least the visible area
    if (objBound.width < minWidth || objBound.height < minHeight) {
      const ratio = Math.max(
        minWidth / objBound.width,
        minHeight / objBound.height
      )
      obj.scaleX *= ratio
      obj.scaleY *= ratio
      obj.setCoords()
    }
  }, [])

  // Create the wrap-around guide (shows what will be folded over the frame)
  const createWrapGuide = useCallback((fabricCanvas: any) => {
    // Clear existing guides
    wrapGuideRef.current.forEach(guide => fabricCanvas.remove(guide))
    wrapGuideRef.current = []

    // Create semi-transparent overlays for wrap areas
    const wrapColor = 'rgba(255, 87, 34, 0.15)'
    const strokeColor = '#FF5722'

    // Top wrap area
    const topWrap = new window.fabric.Rect({
      left: 0,
      top: 0,
      width: displayWidth,
      height: visibleBounds.top,
      fill: wrapColor,
      selectable: false,
      evented: false
    })

    // Bottom wrap area
    const bottomWrap = new window.fabric.Rect({
      left: 0,
      top: visibleBounds.top + visibleBounds.height,
      width: displayWidth,
      height: visibleBounds.top,
      fill: wrapColor,
      selectable: false,
      evented: false
    })

    // Left wrap area
    const leftWrap = new window.fabric.Rect({
      left: 0,
      top: visibleBounds.top,
      width: visibleBounds.left,
      height: visibleBounds.height,
      fill: wrapColor,
      selectable: false,
      evented: false
    })

    // Right wrap area
    const rightWrap = new window.fabric.Rect({
      left: visibleBounds.left + visibleBounds.width,
      top: visibleBounds.top,
      width: visibleBounds.left,
      height: visibleBounds.height,
      fill: wrapColor,
      selectable: false,
      evented: false
    })

    // Visible area border (dashed line)
    const visibleFrame = new window.fabric.Rect({
      left: visibleBounds.left,
      top: visibleBounds.top,
      width: visibleBounds.width,
      height: visibleBounds.height,
      fill: 'transparent',
      stroke: strokeColor,
      strokeWidth: 2,
      strokeDashArray: [8, 4],
      selectable: false,
      evented: false
    })

    // Label for visible area
    const visibleLabel = new window.fabric.Text('Zone visible', {
      left: visibleBounds.left + visibleBounds.width / 2,
      top: visibleBounds.top - 8,
      originX: 'center',
      originY: 'bottom',
      fill: strokeColor,
      fontSize: 12,
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      selectable: false,
      evented: false
    })

    // Label for wrap area
    const wrapLabel = new window.fabric.Text('Bord replié', {
      left: visibleBounds.left / 2,
      top: displayHeight / 2,
      originX: 'center',
      originY: 'center',
      fill: strokeColor,
      fontSize: 10,
      fontFamily: 'sans-serif',
      angle: -90,
      selectable: false,
      evented: false
    })

    wrapGuideRef.current = [topWrap, bottomWrap, leftWrap, rightWrap, visibleFrame, visibleLabel, wrapLabel]
    wrapGuideRef.current.forEach(guide => fabricCanvas.add(guide))
  }, [displayWidth, displayHeight, visibleBounds])

  // Initialize canvas and load image
  useEffect(() => {
    if (!fabricLoaded || !canvasRef.current) return

    // Create fabric canvas with dynamic dimensions
    const fabricCanvas = new window.fabric.Canvas(canvasRef.current, {
      width: displayWidth,
      height: displayHeight,
      backgroundColor: '#1a1a1a'
    })
    setCanvas(fabricCanvas)

    // Load the design image
    window.fabric.Image.fromURL(designUrl, (img: any) => {
      if (!img) {
        setLoading(false)
        return
      }

      originalSizeRef.current = {
        width: img.width || 100,
        height: img.height || 100
      }

      // Scale image to fit the canvas while covering the entire area
      const scaleToFit = Math.max(
        displayWidth / img.width,
        displayHeight / img.height
      )

      // Center the image
      img.set({
        originX: 'center',
        originY: 'center',
        left: displayWidth / 2,
        top: displayHeight / 2,
        scaleX: scaleToFit,
        scaleY: scaleToFit,
        cornerColor: 'white',
        cornerStrokeColor: '#FF5722',
        cornerSize: 12,
        borderColor: '#FF5722',
        transparentCorners: false,
        hasRotatingPoint: true,
        centeredRotation: true
      })

      designImgRef.current = img
      fabricCanvas.add(img)

      // Add wrap guides on top of the image
      createWrapGuide(fabricCanvas)

      fabricCanvas.setActiveObject(img)
      fabricCanvas.renderAll()
      setLoading(false)
    }, { crossOrigin: 'anonymous' })

    // Handle scaling and moving constraints
    const onObjectModified = (e: any) => {
      const obj = e.target
      if (!obj || obj !== designImgRef.current) return

      // Ensure image doesn't get too small (must cover visible area)
      limitMinZoom(obj, visibleBounds.width, visibleBounds.height)

      // Keep image within canvas bounds
      keepInBounds(obj, displayWidth, displayHeight)

      // Re-render
      fabricCanvas.renderAll()
    }

    fabricCanvas.on('object:scaling', onObjectModified)
    fabricCanvas.on('object:moving', onObjectModified)
    fabricCanvas.on('object:rotating', () => fabricCanvas.renderAll())

    return () => {
      fabricCanvas.off('object:scaling', onObjectModified)
      fabricCanvas.off('object:moving', onObjectModified)
      fabricCanvas.dispose()
    }
  }, [fabricLoaded, designUrl, displayWidth, displayHeight, visibleBounds, createWrapGuide, keepInBounds, limitMinZoom])

  // Reset design to initial position
  const handleResetDesign = useCallback(() => {
    if (!canvas || !designImgRef.current || !originalSizeRef.current) return

    const { width, height } = originalSizeRef.current

    // Scale to cover the canvas
    const scaleToFit = Math.max(
      displayWidth / width,
      displayHeight / height
    )

    const img = designImgRef.current
    img.set({
      left: displayWidth / 2,
      top: displayHeight / 2,
      angle: 0,
      scaleX: scaleToFit,
      scaleY: scaleToFit
    })

    canvas.renderAll()
  }, [canvas, displayWidth, displayHeight])

  // Zoom controls
  const handleZoom = useCallback((factor: number) => {
    if (!canvas || !designImgRef.current) return

    const img = designImgRef.current
    const newScaleX = img.scaleX * factor
    const newScaleY = img.scaleY * factor

    // Check minimum zoom (must cover visible area)
    const newWidth = img.width * newScaleX
    const newHeight = img.height * newScaleY

    if (newWidth >= visibleBounds.width && newHeight >= visibleBounds.height) {
      img.set({
        scaleX: newScaleX,
        scaleY: newScaleY
      })

      // Keep in bounds after zoom
      keepInBounds(img, displayWidth, displayHeight)
      canvas.renderAll()
    }
  }, [canvas, displayWidth, displayHeight, visibleBounds, keepInBounds])

  // Export canvas to high-resolution image for Gelato print
  const exportCanvasForPrint = useCallback((): string | null => {
    if (!canvas) return null

    // Calculate the scale multiplier to get to print resolution
    const targetWidth = dimensions.totalPrintArea.widthPx
    const targetHeight = dimensions.totalPrintArea.heightPx
    const scaleMultiplier = targetWidth / displayWidth

    // Temporarily hide the wrap guides for export
    wrapGuideRef.current.forEach(guide => {
      guide.set('visible', false)
    })

    // Export the canvas at high resolution
    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: scaleMultiplier,
      enableRetinaScaling: false
    })

    // Restore wrap guides visibility
    wrapGuideRef.current.forEach(guide => {
      guide.set('visible', true)
    })
    canvas.renderAll()

    return dataUrl
  }, [canvas, dimensions, displayWidth])

  // Create order with print data
  const handleCreateOrder = useCallback(() => {
    if (!canvas || !designImgRef.current) return

    const img = designImgRef.current

    // Get the bounding rect of the image in display coordinates
    const imgBounds = img.getBoundingRect()

    // Convert to Gelato coordinates
    const gelatoExport = convertToGelatoCoordinates(
      imgBounds.left,
      imgBounds.top,
      imgBounds.width,
      imgBounds.height,
      img.angle || 0,
      dimensions,
      displayWidth,
      displayHeight
    )

    // Export the canvas image at print resolution
    const exportedImageDataUrl = exportCanvasForPrint()

    const printArea: GelatoPrintArea = {
      canvasWidth: gelatoExport.totalWidthPx,
      canvasHeight: gelatoExport.totalHeightPx,
      x: gelatoExport.designArea.x,
      y: gelatoExport.designArea.y,
      width: gelatoExport.designArea.width,
      height: gelatoExport.designArea.height,
      rotation: gelatoExport.designArea.rotation,
      dpi: gelatoExport.dpi,
      exportedImageDataUrl: exportedImageDataUrl || undefined
    }

    onCustomizationComplete({ printArea })
  }, [canvas, dimensions, displayWidth, displayHeight, onCustomizationComplete, exportCanvasForPrint])

  // Format info display
  const formatInfo = `${dimensions.visibleArea.widthMm}x${dimensions.visibleArea.heightMm}mm`
  const wrapInfo = `Bord: ${dimensions.wrapAround.sizeMm}mm`

  return (
    <div className='space-y-4'>
      {/* Canvas container */}
      <div
        ref={containerRef}
        className='relative bg-secondary rounded-lg overflow-hidden mx-auto'
        style={{
          width: displayWidth,
          height: displayHeight,
          maxWidth: '100%'
        }}
      >
        <canvas ref={canvasRef} className='w-full h-full' />

        {loading && (
          <div className='absolute inset-0 flex items-center justify-center bg-background/50'>
            <Loader2 className='h-8 w-8 animate-spin' />
          </div>
        )}
      </div>

      {/* Dimensions info */}
      <div className='flex items-center justify-center gap-4 text-sm text-muted-foreground'>
        <span className='font-medium'>{formatInfo}</span>
        <span>|</span>
        <span>{wrapInfo}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className='h-4 w-4' />
            </TooltipTrigger>
            <TooltipContent className='max-w-xs'>
              <p>
                <strong>Zone visible:</strong> La partie de l'image visible une fois le tableau accroché.
              </p>
              <p className='mt-1'>
                <strong>Bord replié:</strong> La partie de l'image qui sera repliée sur les bords du châssis (zone semi-transparente orange).
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Controls */}
      <div className='flex gap-2 flex-wrap justify-center'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => handleZoom(0.9)}
          disabled={loading}
          title='Zoom arrière'
        >
          <ZoomOut className='w-4 h-4' />
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={() => handleZoom(1.1)}
          disabled={loading}
          title='Zoom avant'
        >
          <ZoomIn className='w-4 h-4' />
        </Button>
        <Button
          variant='outline'
          onClick={handleResetDesign}
          disabled={loading}
        >
          <RotateCw className='w-4 h-4 mr-2' />
          Réinitialiser
        </Button>
        <Button
          onClick={handleCreateOrder}
          disabled={loading}
        >
          Valider
        </Button>
      </div>

      {/* Instructions */}
      <p className='text-xs text-center text-muted-foreground'>
        Déplacez et redimensionnez l'image. La zone visible correspond à ce qui sera affiché sur le tableau.
        Les bords seront repliés sur le châssis.
      </p>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RotateCw } from 'lucide-react'

interface ProductCustomizerProps {
  designUrl: string
  products: any[]
  onCustomizationComplete: (data: { variant: any; printArea: any }) => void
}

declare global {
  interface Window {
    fabric: any
  }
}

export function ProductCustomizer ({
  designUrl,
  products,
  onCustomizationComplete
}: ProductCustomizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvas, setCanvas] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [fabricLoaded, setFabricLoaded] = useState(false)
  const designImgRef = useRef<any>(null)
  const originalSizeRef = useRef<{ width: number; height: number } | null>(null)

  // Load Fabric.js
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

  // Initialize canvas when product is available
  useEffect(() => {
    if (!fabricLoaded || !canvasRef.current || !products[0]) return

    const product = products[0]
    const coverDimensions = {
      width: 500,
      height: 500,
      printArea: {
        width: 400,
        height: 400,
        left: 50,
        top: 50
      }
    }

    const fabricCanvas = new window.fabric.Canvas(canvasRef.current, {
      width: coverDimensions.width,
      height: coverDimensions.height,
      backgroundColor: '#000000'
    })
    setCanvas(fabricCanvas)

    // Create print area guide
    const printArea = new window.fabric.Rect({
      left: coverDimensions.printArea.left,
      top: coverDimensions.printArea.top,
      width: coverDimensions.printArea.width,
      height: coverDimensions.printArea.height,
      fill: 'transparent',
      stroke: '#FF5722',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false
    })
    fabricCanvas.add(printArea)

    // Load design image
    window.fabric.Image.fromURL(designUrl, (img: any) => {
      if (!img) {
        setLoading(false)
        return
      }

      originalSizeRef.current = {
        width: img.width || 100,
        height: img.height || 100
      }

      // Calculate scale to fit print area while maintaining aspect ratio
      const scale = Math.min(
        (coverDimensions.printArea.width * 0.9) / img.width,
        (coverDimensions.printArea.height * 0.9) / img.height
      )

      img.set({
        left:
          coverDimensions.printArea.left + coverDimensions.printArea.width / 2,
        top:
          coverDimensions.printArea.top + coverDimensions.printArea.height / 2,
        originX: 'center',
        originY: 'center',
        cornerColor: 'white',
        cornerStrokeColor: '#FF5722',
        cornerSize: 12,
        transparentCorners: false,
        borderColor: '#FF5722',
        borderScaleFactor: 2
      })

      img.scale(scale)
      designImgRef.current = img
      fabricCanvas.add(img)
      fabricCanvas.setActiveObject(img)
      setLoading(false)
    })

    return () => {
      fabricCanvas.dispose()
    }
  }, [fabricLoaded, designUrl, products])

  const handleResetDesign = () => {
    if (!canvas || !designImgRef.current || !originalSizeRef.current) return

    const printArea = canvas
      .getObjects()
      .find((obj: any) => obj.type === 'rect')
    if (!printArea) return

    const img = designImgRef.current
    const scale = Math.min(
      (printArea.width * 0.9) / originalSizeRef.current.width,
      (printArea.height * 0.9) / originalSizeRef.current.height
    )

    img.set({
      left: printArea.left + printArea.width / 2,
      top: printArea.top + printArea.height / 2,
      angle: 0,
      scaleX: scale,
      scaleY: scale
    })

    canvas.renderAll()
  }

  const handleCreateOrder = () => {
    if (!canvas || !designImgRef.current || products.length === 0) return

    const img = designImgRef.current
    const printArea = {
      width: img.getScaledWidth(),
      height: img.getScaledHeight(),
      x: img.left,
      y: img.top,
      rotation: img.angle
    }

    onCustomizationComplete({
      variant: products[0].variants[0],
      printArea
    })
  }

  return (
    <div className='space-y-4'>
      <div className='relative aspect-square w-full bg-secondary rounded-lg overflow-hidden'>
        <canvas ref={canvasRef} className='w-full h-full' />
        {loading && (
          <div className='absolute inset-0 flex items-center justify-center bg-background/50'>
            <Loader2 className='h-8 w-8 animate-spin' />
          </div>
        )}
      </div>
      <div className='flex gap-2'>
        <Button
          variant='outline'
          onClick={handleResetDesign}
          disabled={loading}
          className='flex-1'
        >
          <RotateCw className='w-4 h-4 mr-2' />
          Reset
        </Button>
        <Button
          onClick={handleCreateOrder}
          disabled={loading}
          className='flex-1'
        >
          Create Order
        </Button>
      </div>
    </div>
  )
}

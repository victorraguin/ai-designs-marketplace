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

  // Taille d'affichage pour le canvas (500x500 px)
  const DISPLAY_SIZE = 500
  // Échelle pour l'export (image finale de 1024x1024 px par ex.)
  const PRINT_SCALE = 1024 / DISPLAY_SIZE

  // Propriétés de la zone d'impression (le cadre)
  // 80% du canvas sera la zone "active"
  const printArea = {
    left: DISPLAY_SIZE * 0.1,
    top: DISPLAY_SIZE * 0.1,
    width: DISPLAY_SIZE * 0.8,
    height: DISPLAY_SIZE * 0.8
  }

  // Chargement de Fabric.js
  useEffect(() => {
    const checkFabric = () => {
      if (window.fabric) setFabricLoaded(true)
      else setTimeout(checkFabric, 100)
    }
    checkFabric()
  }, [])

  // Fonction utilitaire : empêcher l'image de sortir du cadre
  const keepInFrame = (obj: any, frameRect: any) => {
    if (!obj || !frameRect) return
    obj.setCoords()

    // Coordonnées du cadre
    const frameBound = frameRect.getBoundingRect()
    // Coordonnées de l'objet (avec le scale actuel)
    const objBound = obj.getBoundingRect()

    // Corrige la position si l'objet dépasse
    if (objBound.left < frameBound.left) {
      obj.left += frameBound.left - objBound.left
    }
    if (objBound.top < frameBound.top) {
      obj.top += frameBound.top - objBound.top
    }
    if (objBound.left + objBound.width > frameBound.left + frameBound.width) {
      obj.left -=
        objBound.left + objBound.width - (frameBound.left + frameBound.width)
    }
    if (objBound.top + objBound.height > frameBound.top + frameBound.height) {
      obj.top -=
        objBound.top + objBound.height - (frameBound.top + frameBound.height)
    }
    obj.setCoords()
  }

  // Fonction utilitaire : limiter le zoom pour ne pas dépasser le cadre
  const limitZoomToFrame = (obj: any, frameRect: any) => {
    if (!obj || !frameRect) return
    obj.setCoords()

    const frameBound = frameRect.getBoundingRect()
    const objBound = obj.getBoundingRect()

    // Si l'objet est plus large ou plus haut que le cadre, on réduit l'échelle
    if (
      objBound.width > frameBound.width ||
      objBound.height > frameBound.height
    ) {
      const ratio = Math.min(
        frameBound.width / objBound.width,
        frameBound.height / objBound.height
      )
      // Ajuste l'échelle
      obj.scaleX *= ratio
      obj.scaleY *= ratio
      obj.setCoords()
    }
  }

  // Crée la zone d'impression (cadre orange) et le texte "Frame limit"
  const createPrintAreaGuide = (fabricCanvas: any) => {
    // Rectangle simple (non arrondi) => rx: 0, ry: 0
    const frameRect = new window.fabric.Rect({
      ...printArea,
      fill: 'transparent',
      stroke: '#FF5722',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false
    })
    fabricCanvas.add(frameRect)

    // Le texte "Frame limit" au-dessus
    const label = new window.fabric.Text('Frame limit', {
      left: printArea.left + printArea.width / 2,
      top: printArea.top - 20,
      originX: 'center',
      originY: 'bottom',
      fill: '#FF5722',
      fontSize: 16,
      selectable: false,
      evented: false
    })
    fabricCanvas.add(label)
  }

  // Initialise le canvas Fabric + l'image
  useEffect(() => {
    if (!fabricLoaded || !canvasRef.current || products.length === 0) return

    // Canvas 500×500, fond noir
    const fabricCanvas = new window.fabric.Canvas(canvasRef.current, {
      width: DISPLAY_SIZE,
      height: DISPLAY_SIZE,
      backgroundColor: '#000000'
    })
    setCanvas(fabricCanvas)

    // Ajoute le cadre "Frame limit"
    createPrintAreaGuide(fabricCanvas)

    // Charge l'image
    window.fabric.Image.fromURL(designUrl, (img: any) => {
      if (!img) {
        setLoading(false)
        return
      }
      originalSizeRef.current = {
        width: img.width || 100,
        height: img.height || 100
      }

      // On calcule le scale initial pour tenir dans la zone (80% du canvas)
      const scaleX = (printArea.width * 1) / img.width
      const scaleY = (printArea.height * 1) / img.height
      const initScale = Math.min(scaleX, scaleY)

      // Centre l'image dans le cadre
      img.set({
        originX: 'center',
        originY: 'center',
        left: printArea.left + printArea.width / 2,
        top: printArea.top + printArea.height / 2,
        scaleX: initScale,
        scaleY: initScale,
        cornerColor: 'white',
        cornerStrokeColor: '#FF5722',
        cornerSize: 10,
        borderColor: '#FF5722',
        transparentCorners: false,
        hasRotatingPoint: true
      })

      designImgRef.current = img
      fabricCanvas.add(img)
      fabricCanvas.setActiveObject(img)
      fabricCanvas.renderAll()
      setLoading(false)
    })

    // Empêcher l'image de sortir + limiter le zoom
    const onObjectScalingOrMoving = (e: any) => {
      const obj = e.target
      if (!obj) return
      // Cherche le cadre orange (rectangle avec dashArray)
      const frameObj = fabricCanvas
        .getObjects('rect')
        .find((o: any) => o.strokeDashArray)

      // D'abord on limite le zoom max
      limitZoomToFrame(obj, frameObj)
      // Ensuite on garde l'image dans le cadre
      keepInFrame(obj, frameObj)
      fabricCanvas.renderAll()
    }

    fabricCanvas.on('object:scaling', onObjectScalingOrMoving)
    fabricCanvas.on('object:moving', onObjectScalingOrMoving)

    // Nettoyage
    return () => {
      fabricCanvas.off('object:scaling', onObjectScalingOrMoving)
      fabricCanvas.off('object:moving', onObjectScalingOrMoving)
      fabricCanvas.dispose()
    }
  }, [fabricLoaded, designUrl, products])

  // Remet l'image centrée, avec le scale initial
  const handleResetDesign = () => {
    if (!canvas || !designImgRef.current || !originalSizeRef.current) return

    const frameObj = canvas
      .getObjects('rect')
      .find((o: any) => o.strokeDashArray)
    if (!frameObj) return

    const { width, height } = originalSizeRef.current
    const frameBound = frameObj.getBoundingRect()
    // On recalcule un scale
    const scaleX = (frameBound.width * 0.9) / width
    const scaleY = (frameBound.height * 0.9) / height
    const initScale = Math.min(scaleX, scaleY)

    const img = designImgRef.current
    img.set({
      left: frameBound.left + frameBound.width / 2,
      top: frameBound.top + frameBound.height / 2,
      angle: 0,
      scaleX: initScale,
      scaleY: initScale
    })
    canvas.renderAll()
  }

  // Crée l'ordre (export)
  const handleCreateOrder = () => {
    if (!canvas || !designImgRef.current || products.length === 0) return

    const img = designImgRef.current
    // Pour l'export, on multiplie par PRINT_SCALE
    const printAreaData = {
      x: img.left * PRINT_SCALE,
      y: img.top * PRINT_SCALE,
      width: img.getScaledWidth() * PRINT_SCALE,
      height: img.getScaledHeight() * PRINT_SCALE,
      rotation: img.angle || 0
    }

    onCustomizationComplete({
      variant: products[0].variants[0],
      printArea: printAreaData
    })
  }

  return (
    <div className='space-y-4'>
      <div className='relative aspect-square w-full max-w-[500px] bg-secondary rounded-lg overflow-hidden'>
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

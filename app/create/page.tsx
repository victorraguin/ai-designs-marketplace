'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList
} from '@/components/ui/breadcrumb'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AlertCircle, ArrowLeft, RefreshCcw, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth-provider'
import { Step, DesignOptions, stepLabels, ArtStyle } from '@/types/design'
import { ArtStyleStep } from '@/components/design/art-style-step'
import { LoadingPlaceholder } from '@/components/design/loading-placeholder'

interface GeneratedDesign {
  designId: string
  url: string
}

const STEPS: Step[] = ['style', 'text', 'description', 'validation', 'result']

const getSystemPrompt = (description: string, designOptions: DesignOptions) => {
  if (designOptions.artStyle === 'free') {
    return `${description}${
      designOptions.designText
        ? `. With the text "${designOptions.designText}" integrated harmoniously`
        : ''
    }`
  }

  const stylePrompts: Record<string, string> = {
    flat: `A geometric and minimalist ${description} illustration. The composition features a stylized view ramed by abstract layers. The color palette is bold and primary, with red, yellow, blue, black, and white dominating the scene. The illustration is reduced to sharp, clean lines and geometric shapes, resembling a Bauhaus and De Stijl-inspired aesthetic. The illustration has a structured, graphic design feel with a sense of depth leading to a central vanishing point.`,
    symbols: `A illustration, possibly a painting. The artwork is filled with various symbols, and doodles. There are also scribbles scattered throughout. The illustration represent : ${description}`,
    mystic: `A ${description} covered in intricate white mystical symbols and graffiti-style designs. The central motif is an all-seeing eye, surrounded by crosses, lightning bolts, and esoteric markings. The artwork has a raw, hand-drawn quality, resembling chalk or street art.`,
    default: `A minimalist and abstract illustration in a flat design style. The illustration contains ${description}`
  }

  const basePrompt =
    stylePrompts[designOptions.artStyle || 'default'] || stylePrompts.default
  return designOptions.designText
    ? `${basePrompt}. Avec le texte "${designOptions.designText}".`
    : basePrompt
}

export default function CreatePage () {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState<Step>('style')
  const [isUploaded, setIsUploaded] = useState(false)
  const [designOptions, setDesignOptions] = useState<DesignOptions>({
    tshirtColor: '#000000',
    designText: null,
    side: 'front',
    artStyle: undefined,
    clothingType: null
  })
  const [loading, setLoading] = useState(false)
  const [lastDescription, setLastDescription] = useState<string>('')
  const [generatedImages, setGeneratedImages] = useState<GeneratedDesign[]>([])
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/auth/register?redirectTo=/create')
    }
  }, [user, router])

  const uploadImageToStorage = async (imageUrl: string, path: string) => {
    try {
      const response = await fetch(
        `https://weavly-server.onrender.com/proxy?url=${encodeURIComponent(
          imageUrl
        )}`
      )
      const blob = await response.blob()

      const { data, error } = await supabase.storage
        .from('designs')
        .upload(path, blob)

      if (error) throw error

      const { data: publicUrl } = supabase.storage
        .from('designs')
        .getPublicUrl(data.path)

      return publicUrl.publicUrl
    } catch (error) {
      console.error('Image upload failed:', error)
      throw error
    }
  }

  const handleStyleSelect = (style: ArtStyle) => {
    setDesignOptions(prev => ({ ...prev, artStyle: style }))
    setCurrentStep('text')
  }

  const handleTextSubmit = (text: string) => {
    setDesignOptions(prev => ({ ...prev, designText: text }))
    setCurrentStep('description')
  }

  const handleDescriptionSubmit = async (description: string) => {
    setLastDescription(description)
    setLoading(true)

    try {
      const response = await fetch(
        'https://weavly-server.onrender.com/api/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_request: {
              prompt: getSystemPrompt(description, designOptions),
              model: 'V_2_TURBO',
              style_type: 'AUTO',
              magic_prompt_option: 'ON',
              num_images: 2,
              size: '1024x1024'
            }
          })
        }
      )

      if (!response.ok) throw new Error('Generation failed')
      const { data } = await response.json()

      const ephemeralUrls = data.map((item: any) => item.url)
      const ephemeralImages = ephemeralUrls.map((url: string) => ({
        url,
        designId: null
      }))

      setGeneratedImages(ephemeralImages)
      setCurrentStep('validation')
      setLoading(false)

      if (!user?.id) throw new Error('User not authenticated')

      await Promise.all(
        ephemeralUrls.map(async (imageUrl: string) => {
          const storagePath = `app/${user.id}/generated/${Date.now()}.png`
          const uploadedUrl = await uploadImageToStorage(imageUrl, storagePath)

          const { data, error } = await supabase
            .from('designs')
            .insert([
              {
                image_url: uploadedUrl,
                prompt: description,
                status: 'created',
                creator_id: user.id
              }
            ])
            .select('id')

          if (error) {
            console.error('DB insertion error:', error)
          } else {
            setGeneratedImages(prev =>
              prev.map(img =>
                img.url === imageUrl ? { ...img, designId: data[0].id } : img
              )
            )
            setIsUploaded(true)
          }
        })
      )
    } catch (error) {
      console.error('Error in handleDescriptionSubmit:', error)
      toast.error('Error generating images')
      setLoading(false)
    }
  }

  const handleImageValidation = async (selectedImageUrl: string) => {
    try {
      const chosen = generatedImages.find(img => img.url === selectedImageUrl)
      if (!chosen?.designId) {
        toast.error('Design not found in database')
        return
      }

      const { error } = await supabase
        .from('designs')
        .update({ status: 'validated' })
        .eq('id', chosen.designId)

      if (error) throw error

      router.push(`/customize-product/${chosen.designId}`)
    } catch (error) {
      console.error('Error in handleImageValidation:', error)
      toast.error('Error validating design')
    }
  }

  const renderCurrentStep = () => {
    if (loading) return <LoadingPlaceholder />

    const steps: Partial<Record<Step, JSX.Element>> = {
      style: (
        <ArtStyleStep
          onSelect={handleStyleSelect}
          selectedStyle={designOptions.artStyle}
        />
      ),

      text: (
        <div className='space-y-6 animate-in fade-in-50 duration-500'>
          <h2 className='text-2xl font-bold'>Add text to your design</h2>
          <Card>
            <CardContent className='p-6 space-y-4'>
              <Input
                placeholder='Enter text for your design (optional)'
                value={designOptions.designText || ''}
                onChange={e =>
                  setDesignOptions(prev => ({
                    ...prev,
                    designText: e.target.value
                  }))
                }
              />
              <Alert>
                <AlertCircle className='h-4 w-4' />
                <AlertDescription>
                  Keep text short and concise for better results
                </AlertDescription>
              </Alert>
              <div className='flex justify-between gap-4'>
                <Button
                  variant='outline'
                  onClick={() => setCurrentStep('style')}
                >
                  Back
                </Button>
                <Button
                  onClick={() =>
                    handleTextSubmit(designOptions.designText || '')
                  }
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ),

      description: (
        <div className='space-y-6 animate-in fade-in-50 duration-500'>
          <h2 className='text-2xl font-bold'>Describe your design</h2>
          <Card>
            <CardContent className='p-6 space-y-4'>
              <Textarea
                placeholder={
                  designOptions.artStyle === 'free'
                    ? 'Describe anything you want to create...'
                    : 'Describe the elements of your design...'
                }
                value={lastDescription}
                onChange={e => setLastDescription(e.target.value)}
                className='min-h-[100px]'
              />
              <div className='flex justify-between gap-4'>
                <Button
                  variant='outline'
                  onClick={() => setCurrentStep('text')}
                >
                  Back
                </Button>
                <Button
                  onClick={() => handleDescriptionSubmit(lastDescription)}
                  disabled={uploaded}
                >
                  Generate Design
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ),

      validation: (
        <div className='space-y-6 animate-in fade-in-50 duration-500'>
          <h2 className='text-2xl font-bold'>Choose your design</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {generatedImages.map((image, index) => (
              <Card key={index} className='overflow-hidden'>
                <CardContent className='p-0'>
                  <div className='relative aspect-square'>
                    <img
                      src={image.url}
                      alt={`Generated design ${index + 1}`}
                      className='w-full h-full object-cover'
                    />
                    <div className='absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2'>
                      <Button
                        variant='secondary'
                        onClick={() => setZoomedImage(image.url)}
                      >
                        <ZoomIn className='h-4 w-4 mr-2' />
                        Zoom
                      </Button>
                      <Button
                        onClick={() => handleImageValidation(image.url)}
                        disabled={!isUploaded}
                      >
                        Select Design
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className='flex justify-between'>
            <Button
              variant='outline'
              onClick={() => setCurrentStep('description')}
            >
              <ArrowLeft className='mr-2 h-4 w-4' />
              Edit Description
            </Button>
            <Button
              variant='outline'
              onClick={() => handleDescriptionSubmit(lastDescription)}
            >
              <RefreshCcw className='mr-2 h-4 w-4' />
              Regenerate
            </Button>
          </div>
        </div>
      )
    }

    return steps[currentStep] || null
  }

  if (!user) return null

  const currentStepIndex = STEPS.indexOf(currentStep)

  return (
    <div className='min-h-[calc(100vh-3.5rem)] py-8'>
      <div className='container mx-auto max-w-4xl px-4'>
        <div className='space-y-8'>
          <div className='text-center'>
            <h1 className='text-3xl font-bold'>Create Your Design</h1>
            <p className='text-muted-foreground mt-2'>
              Follow the steps to generate your custom design
            </p>
          </div>

          <Breadcrumb>
            <BreadcrumbList>
              {STEPS.map((step, index) => (
                <BreadcrumbItem key={step}>
                  <BreadcrumbLink
                    onClick={() =>
                      index <= currentStepIndex && setCurrentStep(step)
                    }
                    className={`${
                      index <= currentStepIndex
                        ? 'cursor-pointer hover:text-primary'
                        : 'text-muted-foreground'
                    } ${
                      step === currentStep ? 'text-primary font-medium' : ''
                    }`}
                  >
                    {stepLabels[step]}
                  </BreadcrumbLink>
                  {index < STEPS.length - 1 && (
                    <span className='mx-2 text-muted-foreground'>/</span>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          {renderCurrentStep()}
        </div>

        <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
          <DialogContent className='max-w-[95vw] w-auto h-auto max-h-[95vh]'>
            {zoomedImage && (
              <div className='relative w-full h-full flex items-center justify-center'>
                <img
                  src={zoomedImage}
                  alt='Design preview'
                  className='w-auto h-auto max-w-full max-h-[85vh] object-contain'
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

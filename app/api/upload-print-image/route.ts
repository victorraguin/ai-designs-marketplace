// app/api/upload-print-image/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role for storage operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
  try {
    const { imageDataUrl, designId, format, orientation } = await request.json()

    if (!imageDataUrl) {
      return NextResponse.json(
        { error: 'Missing image data' },
        { status: 400 }
      )
    }

    // Extract base64 data from data URL
    const matches = imageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      return NextResponse.json(
        { error: 'Invalid image data URL format' },
        { status: 400 }
      )
    }

    const imageFormat = matches[1] // e.g., 'png'
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, 'base64')

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `print-${designId || 'unknown'}-${format || 'default'}-${orientation || 'default'}-${timestamp}.${imageFormat}`
    const filePath = `print-ready/${filename}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('designs')
      .upload(filePath, buffer, {
        contentType: `image/${imageFormat}`,
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json(
        { error: 'Failed to upload image: ' + error.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('designs')
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath
    })
  } catch (error: any) {
    console.error('Upload print image error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

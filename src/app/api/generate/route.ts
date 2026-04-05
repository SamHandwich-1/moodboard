import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
    }

    // Nano Banana 2: 'gemini-3.1-flash-image-preview' (latest, may need waitlist)
    // Fallback: 'gemini-2.0-flash-exp' (widely available)
    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-exp'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        }
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json({
        error: `Gemini API error: ${response.status}`,
        details: errText,
        model,
      }, { status: response.status })
    }

    const data = await response.json()

    // Extract image and text from response
    const parts = data.candidates?.[0]?.content?.parts || []
    let imageBase64: string | null = null
    let imageMimeType: string | null = null
    let responseText: string | null = null

    for (const part of parts) {
      if (part.text) {
        responseText = part.text
      }
      if (part.inlineData) {
        imageBase64 = part.inlineData.data
        imageMimeType = part.inlineData.mimeType || 'image/png'
      }
    }

    return NextResponse.json({
      success: true,
      image: imageBase64 ? { base64: imageBase64, mimeType: imageMimeType } : null,
      text: responseText,
      model,
      debug: {
        candidateCount: data.candidates?.length || 0,
        partCount: parts.length,
        partTypes: parts.map((p: any) => p.text ? 'text' : p.inlineData ? 'image' : 'unknown'),
        finishReason: data.candidates?.[0]?.finishReason,
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

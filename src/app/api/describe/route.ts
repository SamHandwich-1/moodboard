import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, imageMimeType } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageMimeType || 'image/png',
                data: imageBase64,
              }
            },
            {
              type: 'text',
              text: `You are a creative director harvesting vocabulary from a mood image for a brand naming project.

Describe EVERYTHING you see in rich, specific, evocative detail. Cover:

1. MATERIALS & TEXTURES — name every surface, finish, material. Not "metal" but "brushed aluminium" or "oxidised copper". Not "smooth" but "polished to a mercury sheen".

2. LIGHT & ATMOSPHERE — the quality of light, time of day, weather, temperature you feel. Name the specific light: tungsten, overcast, golden hour, fluorescent.

3. OBJECTS & ELEMENTS — every distinct thing in frame, named precisely. Not "plant" but "monstera" or "dried eucalyptus".

4. COLOUR VOCABULARY — not "blue" but "cerulean" or "slate" or "petrol". Name every colour with its most evocative specific term.

5. MOOD & SENSATION — what does this image feel like on your skin? What does it sound like? What temperature is it?

6. WHAT'S JUST OUT OF FRAME — what does this image imply exists beyond its edges?

Be SPECIFIC and SENSORY. Every word should be something a brand could be named after.

After your full description, on a new line write exactly:
---HARVEST---
Then list your 40 most evocative SINGLE words from the description, one per line. Concrete nouns, specific adjectives, sensory verbs only. No abstract concepts. No multi-word phrases. One word per line.`
            }
          ]
        }]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json({
        error: `Claude API error: ${response.status}`,
        details: errText,
      }, { status: response.status })
    }

    const data = await response.json()
    const text = data.content
      ?.filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n') || ''

    // Parse harvest
    let harvest: string[] = []
    const parts = text.split(/---HARVEST---/i)
    if (parts.length > 1) {
      harvest = parts[1]
        .split('\n')
        .map((w: string) => w.replace(/^[\d.\-*\s•]+/, '').trim().toLowerCase())
        .filter((w: string) => w.length > 1 && w.length < 20 && !/\s/.test(w))
        .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
    }

    return NextResponse.json({
      success: true,
      description: parts[0]?.trim() || text,
      fullResponse: text,
      harvest,
      debug: {
        model: data.model,
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
        stopReason: data.stop_reason,
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

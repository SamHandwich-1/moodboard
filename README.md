# Visual Moodboard Engine

Generate mood images via **Nano Banana 2** (Gemini 3.1 Flash Image), then harvest naming vocabulary by having **Claude** describe every texture, material, colour, and sensation in the image.

Part of the **Nomenator v3** naming pipeline — this tool uses AI image generation as a lateral association engine. The "hallucinations" in generated images surface visual vocabulary that no text-based tool would ever produce.

## How It Works

1. **Enter a prompt** describing a scene, mood, product, or occasion
2. **Gemini generates an image** via Nano Banana 2
3. **Claude describes the image** in exhaustive sensory detail
4. **Words are harvested** — 40 evocative single words extracted as naming seeds

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** (dark theme, sharp edges, editorial aesthetic)
- **Gemini API** for image generation (Nano Banana 2 / `gemini-2.0-flash-exp`)
- **Anthropic API** for image description (Claude Sonnet)

## Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/moodboard-engine.git
cd moodboard-engine

# Install
npm install

# Configure API keys
cp .env.local.example .env.local
# Edit .env.local with your keys:
#   GEMINI_API_KEY=  (get from https://aistudio.google.com/apikey)
#   ANTHROPIC_API_KEY=  (get from https://console.anthropic.com)

# Run
npm run dev
```

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variables: `GEMINI_API_KEY` and `ANTHROPIC_API_KEY`
4. Deploy

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  Visual Moodboard Engine                                │
├──────────┬──────────────────────────┬───────────────────┤
│ PROMPT   │  GENERATED IMAGE         │ DEBUG — Generation│
│          │                          │                   │
│ [text]   │  [image display]         │ [log entries]     │
│          │                          │                   │
│ UPLOAD   │  DESCRIBE & HARVEST →    │                   │
│ PASTE    ├──────────────────────────┤───────────────────┤
│          │  CLAUDE DESCRIPTION      │ DEBUG — Describe  │
│ HISTORY  │                          │                   │
│          │  [rich sensory text]     │ [log entries]     │
│ [prev    │                          │                   │
│  prompts]│  WORD HARVEST            │                   │
│          │  [tag cloud of words]    │                   │
└──────────┴──────────────────────────┴───────────────────┘
```

## Image Input Methods

- **Generate** — type a prompt, hit generate (uses Gemini Nano Banana 2)
- **Upload** — click Choose File
- **Paste** — Cmd+V / Ctrl+V any image from clipboard

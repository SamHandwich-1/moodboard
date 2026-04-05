import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        surface: '#141413',
        border: '#2A2926',
        fg: '#E8E4DE',
        muted: '#8A8580',
        accent: '#D4A853',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        body: ['Manrope', 'sans-serif'],
        mono: ['Courier New', 'monospace'],
      },
      borderRadius: {
        none: '0',
      },
    },
  },
  plugins: [],
}
export default config

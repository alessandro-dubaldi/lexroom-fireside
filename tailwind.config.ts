import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        lx: {
          blue: '#0F4C9D',
          dark: '#1C1F27',
          gray: '#E4E4E4',
          red: '#C03930',
          'blue-dim': 'rgba(15,76,157,0.15)',
          'blue-border': 'rgba(15,76,157,0.35)',
          'red-dim': 'rgba(192,57,48,0.15)',
          'red-border': 'rgba(192,57,48,0.35)',
          surface: '#242831',
          border: '#2E3340',
        },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'pda': {'max': '640px'},
        'desktop': '641px',
      },
      colors: {
        starken: {
          primary: '#303030',
          primaryHover: '#1F1F1F',
          red: '#E30613',
          darkRed: '#B8000B',
          gray: '#2B2B2B',
          lightGray: '#F4F5F7',
        },
        industrial: {
          success: '#10B981',
          successBg: '#D1FAE5',
          error: '#EF4444',
          errorBg: '#FEE2E2',
          warning: '#F59E0B',
          warningBg: '#FEF3C7',
          pdaBg: '#121824',
          pdaCard: '#1E293B',
          pdaBorder: '#334155',
        },
        /* ── Warm Industrial Dark tokens (Hex directos sin variables CSS) ── */
        hub: {
          base:     '#191919',     /* Fondo raíz charcoal puro */
          surface:  '#232323',     /* Cards, modales, drawers */
          elevated: '#2D2D2D',     /* Inputs, botones sec., dropdowns */
          border:   '#3D3D3D',     /* Bordes y separadores */
          text1:    '#F2F2F0',     /* Texto primario — 14.5:1 contraste */
          text2:    '#B0B0AC',     /* Texto secundario — 7.1:1 contraste */
          text3:    '#707070',     /* Texto tenue — 4.5:1 contraste */
          accent:   '#00C45A',     /* Verde acción brillante */
        },
      },
      fontSize: {
        'pda-val': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700' }],
        'pda-hero': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '800' }],
      },
      spacing: {
        'touch': '3.5rem', // 56px touch target minimum for PDA
        'touch-lg': '4.5rem', // 72px touch target for key actions
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}

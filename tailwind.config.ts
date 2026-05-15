import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Pretendard"', '"Noto Sans KR"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // 회사 제출용 톤: 절제된 다크 차콜 + 청록 액센트
        ink: {
          900: '#F7F9FB',
          800: '#EEF1F4',
          700: '#DDE2E7',
          600: '#B8BEC4',
          500: '#8A9199',
          400: '#5A6470',
          300: '#3A4250',
          200: '#252B33',
          100: '#1A1F26',
          50:  '#0F1419',
        },
        accent: {
          // 차분한 청록 (의료/규제 분위기)
          DEFAULT: '#0F766E',
          50:  '#F0FDFA',
          100: '#CCFBF1',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          900: '#134E4A',
        },
        signal: {
          ok:    '#15803D',
          warn:  '#B45309',
          alert: '#B91C1C',
          info:  '#1D4ED8',
        },
      },
      borderRadius: { 'xs': '2px' },
    },
  },
  plugins: [],
};
export default config;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Culori personalizate pentru EventPro
      colors: {
        'eventpro': {
          50: '#eff6ff',
          100: '#dbeafe', 
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        }
      },
      // Spacing personalizat
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      // Font families
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
}

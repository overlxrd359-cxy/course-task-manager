/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./templates/**/*.html', './src/**/*.ts'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#5B9BD5', hover: '#4A8AC4' },
        bg: '#F0F6FB',
        card: '#FFFFFF',
        'text-primary': '#2C3E50',
        'text-secondary': '#7F8C8D',
        border: '#DCDFE6',
        high: '#E74C3C',
        medium: '#F39C12',
        low: '#27AE60',
        danger: { DEFAULT: '#E74C3C', hover: '#C0392B' },
      },
      opacity: {
        '55': '0.55',
      },
    },
  },
  plugins: [],
};

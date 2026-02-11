module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { navy: { 950: '#071527', 900: '#0B1F3B', 800: '#0F2B52' } },
      boxShadow: { card: '0 10px 30px rgba(0,0,0,0.35)' }
    }
  },
  plugins: []
}

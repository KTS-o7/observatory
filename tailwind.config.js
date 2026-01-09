/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base backgrounds - deep green-blue near-black tones
        base: {
          900: '#0a0d0f',
          850: '#0c1014',
          800: '#0e1318',
          750: '#10161c',
          700: '#121a20',
          600: '#1a242c',
          500: '#222e38',
        },
        // Semantic: Green - active, live, normal states
        status: {
          active: '#22c55e',
          'active-dim': '#166534',
          'active-glow': 'rgba(34, 197, 94, 0.15)',
        },
        // Semantic: Blue - neutral, informational
        info: {
          DEFAULT: '#3b82f6',
          dim: '#1e40af',
          glow: 'rgba(59, 130, 246, 0.15)',
        },
        // Semantic: Amber - attention, developing situations
        alert: {
          DEFAULT: '#f59e0b',
          dim: '#92400e',
          glow: 'rgba(245, 158, 11, 0.15)',
        },
        // Semantic: Red - conflict, critical, alerts
        critical: {
          DEFAULT: '#ef4444',
          dim: '#991b1b',
          glow: 'rgba(239, 68, 68, 0.15)',
        },
        // Semantic: Cyan/Purple - technology, cyber
        cyber: {
          cyan: '#06b6d4',
          'cyan-dim': '#0e7490',
          'cyan-glow': 'rgba(6, 182, 212, 0.15)',
          purple: '#a855f7',
          'purple-dim': '#6b21a8',
          'purple-glow': 'rgba(168, 85, 247, 0.15)',
        },
        // Semantic: Grey - inactive, archived
        inactive: {
          DEFAULT: '#6b7280',
          dim: '#374151',
          muted: '#4b5563',
        },
        // Text colors
        text: {
          primary: '#e5e7eb',
          secondary: '#9ca3af',
          muted: '#6b7280',
        },
        // Divider color
        divider: 'rgba(255, 255, 255, 0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'monospace'],
      },
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.875rem' }],
        'xs': ['0.6875rem', { lineHeight: '1rem' }],
        'sm': ['0.75rem', { lineHeight: '1.125rem' }],
        'base': ['0.8125rem', { lineHeight: '1.25rem' }],
        'lg': ['0.875rem', { lineHeight: '1.375rem' }],
        'xl': ['1rem', { lineHeight: '1.5rem' }],
        '2xl': ['1.125rem', { lineHeight: '1.625rem' }],
      },
      letterSpacing: {
        'tight': '-0.01em',
        'normal': '0',
        'wide': '0.025em',
        'wider': '0.05em',
        'widest': '0.1em',
        'ultra': '0.15em',
      },
      spacing: {
        'px': '1px',
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.15), 0 0 40px rgba(34, 197, 94, 0.05)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.15), 0 0 40px rgba(59, 130, 246, 0.05)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.15), 0 0 40px rgba(245, 158, 11, 0.05)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.15), 0 0 40px rgba(239, 68, 68, 0.05)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.15), 0 0 40px rgba(6, 182, 212, 0.05)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.15), 0 0 40px rgba(168, 85, 247, 0.05)',
        'glow-subtle': '0 0 10px rgba(255, 255, 255, 0.03)',
      },
      animation: {
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        'breathe': 'breathe 4s ease-in-out infinite',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.15)' },
          '50%': { boxShadow: '0 0 30px rgba(34, 197, 94, 0.25)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'breathe': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
      borderWidth: {
        'DEFAULT': '1px',
        '0': '0',
        '0.5': '0.5px',
      },
      opacity: {
        '3': '0.03',
        '6': '0.06',
        '8': '0.08',
        '12': '0.12',
        '15': '0.15',
      },
    },
  },
  plugins: [],
}

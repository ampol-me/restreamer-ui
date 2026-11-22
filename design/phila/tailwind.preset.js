// Tailwind CSS v3 preset for Phila. Load tokens.css first, then:
//   module.exports = { presets: [require('./phila-design-system/tailwind.preset.js')] }
// Colours point at the CSS variables, so light/dark follow tokens.css automatically.
module.exports = {
  theme: {
    extend: {
      colors: {
        'phila-gold': 'var(--phila-gold)',
        'phila-navy': 'var(--phila-navy)',
        'gold-soft': 'var(--gold-soft)',
        'gold-text': 'var(--gold-text)',
        'navy-text': 'var(--navy-text)',
        'on-gold': 'var(--on-gold)',
        'on-navy': 'var(--on-navy)',
        'surface': 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        'line': 'var(--line)',
        'line-strong': 'var(--line-strong)',
        'ink': 'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        'tally-live': 'var(--tally-live)',
        'tally-ready': 'var(--tally-ready)',
        'focus-ring': 'var(--focus-ring)',
        'link': 'var(--link)',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: { sm: '6px', md: '12px', full: '9999px' },
      spacing: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px' },
      fontSize: {
        display: ['56px', { lineHeight: '60px', fontWeight: '700', letterSpacing: '-0.02em' }],
        title: ['32px', { lineHeight: '40px', fontWeight: '600' }],
        heading: ['20px', { lineHeight: '30px', fontWeight: '600' }],
        body: ['16px', { lineHeight: '28px', fontWeight: '400' }],
        small: ['14px', { lineHeight: '22px', fontWeight: '400' }],
        label: ['12px', { lineHeight: '16px', fontWeight: '600', letterSpacing: '0.06em' }],
        timecode: ['14px', { lineHeight: '20px', fontWeight: '500' }],
      },
    },
  },
};

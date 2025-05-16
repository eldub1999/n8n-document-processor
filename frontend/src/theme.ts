import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        blue: {
          50: { value: '#e6f1ff' },
          100: { value: '#b8d4fe' },
          200: { value: '#8ab7fd' },
          300: { value: '#5c9afc' },
          400: { value: '#2e7dfb' },
          500: { value: '#1463e2' },
          600: { value: '#0c4db0' },
          700: { value: '#06377f' },
          800: { value: '#02214e' },
          900: { value: '#000c1f' },
        },
      },
    },
    semanticTokens: {
      colors: {
        // Define semantic tokens for consistent UX
        bg: {
          DEFAULT: { value: { _light: '{colors.white}', _dark: '#141414' } },
          subtle: { value: { _light: '{colors.gray.50}', _dark: '#1a1a1a' } },
          muted: { value: { _light: '{colors.gray.100}', _dark: '#262626' } },
        },
        fg: {
          DEFAULT: { value: { _light: '{colors.gray.800}', _dark: '#e5e5e5' } },
        },
        accent: {
          DEFAULT: { value: '{colors.blue.500}' },
          emphasis: { value: '{colors.blue.600}' },
        },
      },
    },
  },
});

// Create the system with default config extended by our custom config
export const system = createSystem(defaultConfig, config);

export default system; 
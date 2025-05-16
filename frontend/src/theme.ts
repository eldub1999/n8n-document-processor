import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'medium',
      }
    },
    Heading: {
      baseStyle: {
        fontWeight: 'bold',
      }
    },
  },
  colors: {
    blue: {
      50: '#e6f1ff',
      100: '#b8d4fe',
      200: '#8ab7fd',
      300: '#5c9afc',
      400: '#2e7dfb',
      500: '#1463e2',
      600: '#0c4db0',
      700: '#06377f',
      800: '#02214e',
      900: '#000c1f',
    },
  },
});

export default theme; 
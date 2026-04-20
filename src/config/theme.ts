import { MD3LightTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  web: {
    regular: { fontFamily: 'Roboto, sans-serif', fontWeight: 'normal' },
    medium: { fontFamily: 'Roboto-Medium, sans-serif', fontWeight: 'normal' },
    light: { fontFamily: 'Roboto-Light, sans-serif', fontWeight: 'normal' },
    thin: { fontFamily: 'Roboto-Thin, sans-serif', fontWeight: 'normal' },
  },
  ios: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    light: { fontFamily: 'System', fontWeight: '300' },
    thin: { fontFamily: 'System', fontWeight: '100' },
  },
  default: {
    regular: { fontFamily: 'sans-serif', fontWeight: 'normal' },
    medium: { fontFamily: 'sans-serif-medium', fontWeight: 'normal' },
    light: { fontFamily: 'sans-serif-light', fontWeight: 'normal' },
    thin: { fontFamily: 'sans-serif-thin', fontWeight: 'normal' },
  },
};

export const theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1A73E8',
    secondary: '#34A853',
    tertiary: '#FBBC04',
    error: '#EA4335',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    surfaceVariant: '#E8EAED',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#202124',
    onSurface: '#202124',
    outline: '#DADCE0',
  },
  roundness: 12,
};

export default theme;

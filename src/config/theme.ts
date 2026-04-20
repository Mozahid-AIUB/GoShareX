import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
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

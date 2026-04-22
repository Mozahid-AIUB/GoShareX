import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0F6BFF',
    secondary: '#59A8FF',
    tertiary: '#7DE2D1',
    error: '#E05353',
    background: '#EEF4FF',
    surface: '#FFFFFF',
    surfaceVariant: '#DDE9FF',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#14213D',
    onSurface: '#14213D',
    outline: '#C8D7F2',
  },
  roundness: 20,
};

export default theme;

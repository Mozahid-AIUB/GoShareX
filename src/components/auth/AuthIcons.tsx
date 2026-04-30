import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

export const LogoMark = ({ size = 48 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Defs>
      <LinearGradient id="lmg" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#6366F1" />
        <Stop offset="1" stopColor="#14B8A6" />
      </LinearGradient>
    </Defs>
    <Rect width="48" height="48" rx="16" fill="url(#lmg)" />
    <Rect x="6" y="22" width="16" height="10" rx="3" fill="rgba(255,255,255,0.9)" />
    <Path d="M9 22 Q10 17 14 16 H18 Q22 17 22 22 Z" fill="rgba(255,255,255,0.7)" />
    <Circle cx="10" cy="32" r="2.5" fill="#4F46E5" />
    <Circle cx="19" cy="32" r="2.5" fill="#4F46E5" />
    <Rect x="26" y="22" width="16" height="10" rx="3" fill="rgba(255,255,255,0.9)" />
    <Path d="M29 22 Q30 17 34 16 H38 Q42 17 42 22 Z" fill="rgba(255,255,255,0.7)" />
    <Circle cx="30" cy="32" r="2.5" fill="#0F766E" />
    <Circle cx="39" cy="32" r="2.5" fill="#0F766E" />
    <Rect x="6" y="33" width="36" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
    <Rect x="20" y="35" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.4)" />
  </Svg>
);

export const IconEmail = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#6E7E99" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 6l-10 7L2 6" stroke="#6E7E99" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const IconLock = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke="#6E7E99" strokeWidth="1.8" />
    <Path d="M7 11V7a5 5 0 0110 0v4" stroke="#6E7E99" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

export const IconEye = ({ off }: { off?: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    {off ? (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke="#6E7E99" strokeWidth="1.8" strokeLinecap="round" />
        <Path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke="#6E7E99" strokeWidth="1.8" strokeLinecap="round" />
        <Path d="M1 1l22 22" stroke="#6E7E99" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ) : (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#6E7E99" strokeWidth="1.8" />
        <Circle cx="12" cy="12" r="3" stroke="#6E7E99" strokeWidth="1.8" />
      </>
    )}
  </Svg>
);

export const IconArrow = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const IconUser = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke="#6E7E99" strokeWidth="1.8" />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#6E7E99" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

export const IconBack = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#A5B4FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const IconPhone = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.1 2.18 2 2 0 012.08 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" stroke="#6E7E99" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

export const IconGoogle = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </Svg>
);

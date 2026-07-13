# Tab Bar Floating Pill Indicator

**Date:** 2026-07-13
**Scope:** `src/navigation/BottomTabNavigator.tsx` only. Screen-content transitions (`sceneStyleInterpolator`, `tabTransitionSpec`) are unchanged.

## Goal

Make tab-to-tab navigation feel more premium/advanced by adding an animated pill indicator that slides behind the active tab icon, instead of the current static flat bar (icon-only spring pop, no indicator).

## Current state

- `Tab.Navigator` uses library-default tab bar rendering via `screenOptions` (`tabBarStyle`, `tabBarIcon`, `tabBarLabelStyle`, etc.) — no custom `tabBar` component.
- Active tab is only distinguished by icon color (`C.active` vs `C.inactive`) and a scale-pop animation (`AnimatedTabIcon`: 0.82 → 1 spring, `speed: 22, bounciness: 9`).
- No visual indicator (pill/underline/highlight) exists behind the active tab.
- 5 tabs: Home, Map, Board (label "RidePool"), Chats, Profile.
- Screen transition on tab change: custom fade + 8px rise + scale (0.98→1), 340ms, `Easing.inOut(Easing.cubic)` — deliberately built on the `fade` base animation to avoid an Android black-flash bug in `animation: 'shift'`. **Not modified by this change.**

## Design

### New component: custom `tabBar`

Replace the library-default tab bar rendering with a custom `tabBar` render prop passed to `Tab.Navigator`, so a single shared pill layer can slide across all icon positions (a per-`tabBarIcon` pill can't animate positions relative to its siblings).

The custom tab bar must reimplement, using existing `C` tokens and current values (no visual change apart from the new pill):
- Bar container: height, safe-area bottom inset padding, background, top border, shadow/elevation — same values currently in `screenOptions.tabBarStyle`.
- Per-tab pressable item: icon + label, same spacing/paddingVertical as current `tabBarItemStyle`.
- Label style/colors: same `tabBarLabelStyle`, `tabBarActiveTintColor`/`tabBarInactiveTintColor` values.
- Haptic feedback on tab press: keep existing `Haptics.selectionAsync()` (currently in `screenListeners.tabPress`, must still fire from the custom bar's press handler).
- `tabBarHideOnKeyboard` behavior: preserve current keyboard-hide behavior for the bar.

### Pill indicator

- Rounded-square shape, sized to sit behind the icon only (not the label) — approx `40x32`, `borderRadius: 12`.
- Background: brand-tinted low-opacity fill, e.g. `rgba(99,102,241,0.12)` (derived from `C.active`).
- Rendered as one `Animated.View`, absolutely positioned, layered behind the row of tab icons (not duplicated per tab).
- Horizontal position: bar width is divided into N equal slots (N = tab count); pill's target `translateX` centers it in the active tab's slot. Slot width computed from the bar's measured width via `onLayout` — no hardcoded per-tab coordinates.
- On tab change: animate `translateX` via `Animated.spring`, matching the icon-pop's feel (`speed: 22, bounciness: 9`) for a consistent signature motion across the bar.
- Pill only renders behind the currently active tab; inactive tabs are unaffected.
- No layout shift: pill is `position: absolute` inside the existing item padding; label position doesn't move.

### Interplay with existing icon pop

`AnimatedTabIcon`'s scale-pop (0.82→1 spring) is unchanged and layers on top of the pill sliding in — the two motions land together as one "lock-in" moment.

### Out of scope

- Stack-screen (push/pop) transition styling — untouched.
- Full-pill-with-label (Material You style) — rejected in favor of icon-only pill to avoid reflowing label/item widths.
- Floating/dock-style bar redesign — rejected; bar stays docked flush with the bottom as today.

## Risk / edge case

Switching from `screenOptions`-driven tab bar to a custom `tabBar` component means safe-area insets, label rendering, and active/inactive tint are no longer handled automatically by react-navigation — they must be reimplemented manually in the custom bar, reusing current values so nothing else visually shifts besides the new pill.

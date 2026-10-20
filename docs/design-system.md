# Awarely — Visual Design System

**Brand:** Awarely  
**Tagline:** *“Safety, When It Matters.”*  
**Version:** 1.0.0  
**Status:** Implemented & Verified  

---

## 1. Brand Direction & Philosophy

The Awarely design system embodies a **professional, modern, authentic, and trustworthy** character:
- **Clean & Technology-Oriented**: High legibility, structural clarity, and uncluttered interfaces.
- **Subdued & Grounded**: Avoids overly futuristic neon or gamified childish tropes.
- **Safety with Integrity**: Safety conditions are communicated objectively to inform and empower travelers without fearmongering or overpromising.

---

## 2. Official Brand Asset & Logo Rules

The supplied official Awarely logo asset (`/public/logo.png`) depicts the iconic dark navy shield with a warm orange location pin inside, accompanied by the official wordmark and tagline.

| Rule | Requirement |
|---|---|
| **Exact Reproduction** | Use the supplied official logo asset (`logo.png`) exactly without redesign, replacement, or modification. |
| **Proportions** | Maintain aspect ratio across all size tiers: `xs` (24px), `sm` (32px), `md` (40px), `lg` (56px), and `xl` (80px). |
| **Component** | Always invoke the standardized `<BrandLogo />` component. |

---

## 3. Core Color Tokens

### Primary Brand Palette
- **Deep Navy Base (`#050B14`)**: Root canvas and high-depth backing.
- **Brand Dark Navy (`#0B192C`)**: Primary application canvas and header background.
- **Navy Surface (`#122338`)**: Dark container cards, modals, and input backings.
- **Navy Border (`#1E3550`)**: Subtle contrast dividers and structural borders.

### Restrained Accent
- **Restrained Orange (`#EB5E28`)**: Extracted directly from the logo's inner pin. Used strategically for primary actions, active indicators, and focus rings. Never overused.

### Clean Light Surfaces
- **Crisp White (`#FFFFFF`)**: Light card variant for high-contrast day-mode modules.
- **Light Slate (`#F8FAFC`)**: Soft background for secondary light containers.
- **Light Border (`#E2E8F0`)**: Crisp light structural delineation.

---

## 4. Multi-Factor Safety Semantics

> [!IMPORTANT]
> **Safety Colors Must Never Stand Alone.**  
> In accordance with product principles and accessibility guidelines, color is **never** the sole indicator of safety state. Every status is strictly accompanied by:
> 1. **Text Title & Explanation**
> 2. **Standardized Semantic Icon**
> 3. **Descriptive Category Label**

| Semantic Tier | Color & Token | Semantic Icon | Textual Description |
|---|---|---|---|
| **Positive Community Feedback** | Emerald (`#10B981`) | `CheckCircle2` | "Active Foot Traffic & Illumination" |
| **Caution Advisory** | Warm Amber (`#F59E0B`) | `AlertTriangle` | "Caution Advised (Night/Peripheral)" |
| **Higher Concern** | Soft Coral (`#EF4444`) | `AlertOctagon` | "Higher Concern Reported" |
| **Preliminary Data** | Neutral Slate (`#64748B`) | `HelpCircle` | "Preliminary Observations (< 5 reports)" |

---

## 5. Reusable Component Suite

All components are located in `src/components/design-system/` and are fully typed with TypeScript:

1. **`BrandLogo.tsx`**: Renders the supplied official logo asset with size controls and tagline options.
2. **`Button.tsx`**: Accessible button with variants (`primary`, `navy`, `secondary`, `light`, `ghost`, `danger`), sizes (`sm`, `md`, `lg`), loading spinner, and keyboard focus states.
3. **`Card.tsx`**: Modular container supporting both Dark Navy (`#122338`) and Crisp White (`#FFFFFF`) surfaces.
4. **`Badge.tsx`**: Compact indicator with variant tokens, optional pulsing dot, and icon slot.
5. **`StatusIndicator.tsx`**: Tri-factor safety indicator pairing state, icon, and explanatory label.
6. **`ConfidenceBadge.tsx`**: Empirical reliability indicator displaying sample report volume.
7. **`Input.tsx` / `Textarea.tsx` / `Select.tsx`**: Form inputs with label binding, error states, and ARIA attributes (`aria-invalid`, `aria-describedby`).
8. **`Alert.tsx`**: Accessible callout banner with semantic icons, titles, and dismiss actions.
9. **`EmptyState.tsx`**: Trustworthy zero-result state with call-to-action button.
10. **`Skeleton.tsx`**: Accessible shimmer loading placeholders for text, cards, and avatars.
11. **`AppNavbar.tsx` & `AppLayout.tsx`**: Responsive layout shell supporting Desktop, Tablet, and Mobile with mobile drawer and emergency siren quick toggle.

---

## 6. Accessibility & Inclusivity

- **Visible Keyboard Focus**: All interactive controls feature high-contrast focus rings (`outline: 2px solid #EB5E28`).
- **Screen Reader Support**: ARIA attributes (`aria-busy`, `aria-invalid`, `aria-expanded`, `role="alert"`, `role="dialog"`) and `.sr-only` skip links.
- **Reduced Motion**: Respects `@media (prefers-reduced-motion: reduce)` by disabling non-essential keyframes and ambient animations.
- **WCAG Contrast**: High contrast text ratios on both dark navy and crisp white card surfaces.

---

## 7. Interactive Living Showcase

The complete design system can be viewed and tested interactively in the running application at:
👉 **`/design-system`** (or `http://localhost:5173/design-system`)

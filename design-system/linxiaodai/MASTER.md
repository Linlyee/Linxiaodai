# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Linxiaodai
**Updated:** 2026-08-19
**Category:** Consumer Food Discovery / AI Ordering
**Design Dials:** Variance 6/10 (Editorial / Modern) | Motion 4/10 (Purposeful) | Density 5/10 (Comfortable)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#173F36` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#E7EFEA` | `--color-secondary` |
| Accent/CTA | `#BF4B36` | `--color-accent` |
| Background | `#F7F8F4` | `--color-background` |
| Foreground | `#17352F` | `--color-foreground` |
| Muted | `#F0F3EF` | `--color-muted` |
| Border | `#DFE5DF` | `--color-border` |
| Destructive | `#B42318` | `--color-destructive` |
| Ring | `#BF4B36` | `--color-ring` |

**Color Notes:** Deep forest communicates trust and calm; restrained coral is reserved for appetite and primary actions. Warm paper surfaces create an editorial food-magazine feel without sacrificing contrast.

### Typography

- **Heading Font:** Georgia / Songti SC (local-first editorial serif)
- **Body Font:** Inter / PingFang SC (system-first product UI)
- **Data Font:** JetBrains Mono / ui-monospace for prices and status labels
- **Mood:** warm, trustworthy, editorial, calm, consumer-first

**CSS Import:**
```css
/* Local-first stack avoids render blocking and preserves Chinese legibility. */
```

### Spacing Variables

*Density: 6/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #BF4B36;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #173F36;
  border: 1px solid #DFE5DF;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #BF4B36;
  outline: none;
  box-shadow: 0 0 0 3px #BF4B3624;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Warm Editorial Flat Design

**Keywords:** editorial serif, warm paper, forest green, coral CTA, restrained depth, product-first, calm confidence

**Best For:** Consumer food search, AI-assisted decisions, mobile ordering and delivery tracking

**Key Effects:** One subtle shadow scale, tonal surfaces, 160–240ms state transitions, Lucide outline icons, no decorative blur

### Page Pattern

**Pattern Name:** Search-First Consumer Marketplace

- **Conversion Strategy:** Natural-language search is the hero CTA. Recommendations expose product, payable price, sales, ETA and source freshness before any merchant detail.
- **CTA Placement:** One clear primary action per recommendation: add the product. Channel redirect is secondary.
- **Core Flow:** 1. State intent, 2. Compare product-first results, 3. Add to cart, 4. Confirm address/payment, 5. Track fulfillment.

---

## Motion

**Scroll Reveal** (Subtle) — Trigger: scroll (viewport enter) | Duration: 300-400ms | Easing: `power1.out`

```js
gsap.from(el, { opacity: 0, y: 12, duration: 0.35, ease: 'power1.out', scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' } });
```

**Framework notes:** Requires the ScrollTrigger plugin registered once via gsap.registerPlugin(ScrollTrigger)

- ✅ Keep the y offset small (8-16px) so it reads as a fade, not a slide
- ❌ Don't reveal below-the-fold content needed for SEO/crawlers as invisible-by-default without a no-JS fallback
- ⚡ toggleActions 'play none none reverse' avoids re-triggering on every scroll direction change

---

## Anti-Patterns (Do NOT Use)

- ❌ Low-quality imagery
- ❌ Outdated hours

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile

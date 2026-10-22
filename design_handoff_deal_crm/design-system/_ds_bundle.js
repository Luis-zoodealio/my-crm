/* @ds-bundle: {"format":4,"namespace":"ZoodealioWebpageDesignSystem_c11f2e","components":[{"name":"Badge","sourcePath":"components/Badge/Badge.jsx"},{"name":"Button","sourcePath":"components/Button/Button.jsx"},{"name":"Card","sourcePath":"components/Card/Card.jsx"},{"name":"Icon","sourcePath":"components/Icon/Icon.jsx"},{"name":"IconNames","sourcePath":"components/Icon/Icon.jsx"}],"sourceHashes":{"components/Badge/Badge.jsx":"07b45ef1ecae","components/Button/Button.jsx":"d42122b78887","components/Card/Card.jsx":"ce606e0e027e","components/Icon/Icon.jsx":"ee09cbe705d1"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ZoodealioWebpageDesignSystem_c11f2e = window.ZoodealioWebpageDesignSystem_c11f2e || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/Badge/Badge.jsx
try { (() => {
const React = window.React;

/**
 * Small status pill / tag. Optional leading dot for status use.
 */
function Badge({
  variant = "neutral",
  dot = false,
  children,
  style,
  ...rest
}) {
  const variants = {
    solid: {
      background: "var(--magenta, #ac0a55)",
      color: "var(--white, #fdfdfd)"
    },
    soft: {
      background: "#fbe6f0",
      color: "var(--magenta, #ac0a55)"
    },
    success: {
      background: "#e8f8f1",
      color: "var(--green-deep, #059669)"
    },
    warning: {
      background: "#fff4e5",
      color: "#b45309"
    },
    neutral: {
      background: "var(--bg-warm, #f3f2f0)",
      color: "var(--gray-700, #3f3f46)"
    }
  };
  return React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontFamily: 'var(--inter, "Inter", sans-serif)',
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.01em",
      lineHeight: 1,
      padding: "5px 10px",
      borderRadius: "999px",
      ...variants[variant],
      ...style
    },
    ...rest
  }, dot && React.createElement("span", {
    style: {
      width: "6px",
      height: "6px",
      borderRadius: "999px",
      background: "currentColor",
      flex: "none"
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Badge/Badge.jsx", error: String((e && e.message) || e) }); }

// components/Button/Button.jsx
try { (() => {
const React = window.React;

/**
 * Zoodealio button. Variants mirror the marketing site's CTAs.
 */
function Button({
  variant = "primary",
  size = "md",
  href,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const sizes = {
    xs: {
      padding: "7px 14px",
      fontSize: "13px",
      borderRadius: "9px",
      minHeight: "auto"
    },
    sm: {
      padding: "9px 16px",
      fontSize: "14px",
      borderRadius: "10px",
      minHeight: "auto"
    },
    md: {
      padding: "13px 22px",
      fontSize: "15px",
      borderRadius: "12px",
      minHeight: "auto"
    },
    lg: {
      padding: "16px 24px",
      fontSize: "16px",
      borderRadius: "12px",
      minHeight: "auto"
    },
    xl: {
      padding: "18px 30px",
      fontSize: "17px",
      borderRadius: "14px",
      minHeight: "56px"
    }
  };
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontFamily: 'var(--jakarta, "Plus Jakarta Sans", sans-serif)',
    fontWeight: 700,
    letterSpacing: "-0.01em",
    lineHeight: 1,
    borderRadius: "12px",
    border: "1px solid transparent",
    cursor: "pointer",
    whiteSpace: "nowrap",
    textDecoration: "none",
    transition: "background .15s, border-color .15s, color .15s",
    ...sizes[size]
  };
  const variants = {
    primary: {
      background: hover ? "var(--magenta-dark, #8e0746)" : "var(--magenta, #ac0a55)",
      color: "var(--white, #fdfdfd)"
    },
    outline: {
      background: "var(--white, #fdfdfd)",
      color: hover ? "var(--magenta, #ac0a55)" : "var(--ink, #09090b)",
      borderColor: hover ? "var(--magenta, #ac0a55)" : "var(--border, #e4e4e7)"
    },
    ghost: {
      background: "transparent",
      color: hover ? "var(--magenta, #ac0a55)" : "var(--ink, #09090b)",
      borderColor: hover ? "var(--magenta, #ac0a55)" : "var(--border, #e4e4e7)"
    },
    dark: {
      background: hover ? "#e9e8e6" : "transparent",
      color: hover ? "var(--charcoal, #1c1b1f)" : "var(--white, #fdfdfd)",
      borderColor: hover ? "#fdfdfd" : "rgba(255,255,255,.3)"
    }
  };
  const Tag = href ? "a" : "button";
  return React.createElement(Tag, {
    href,
    style: {
      ...base,
      ...variants[variant],
      ...style
    },
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    ...rest
  }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Button/Button.jsx", error: String((e && e.message) || e) }); }

// components/Card/Card.jsx
try { (() => {
const React = window.React;

/**
 * Surface card matching the site's offer / review cards.
 * `featured` adds the magenta border + brand shadow.
 */
function Card({
  featured = false,
  interactive = true,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return React.createElement("div", {
    style: {
      background: "var(--white, #fdfdfd)",
      border: featured ? "1px solid var(--magenta, #ac0a55)" : "1px solid var(--border, #e4e4e7)",
      borderRadius: "18px",
      padding: "30px 28px",
      boxShadow: featured ? "0 18px 44px rgba(172,10,85,.1)" : hover && interactive ? "0 18px 44px rgba(0,0,0,.08)" : "none",
      transform: hover && interactive ? "translateY(-3px)" : "none",
      transition: "box-shadow .2s, transform .2s",
      ...style
    },
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    ...rest
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Card/Card.jsx", error: String((e && e.message) || e) }); }

// components/Icon/Icon.jsx
try { (() => {
const React = window.React;

/**
 * Zoodealio line icon. Single-stroke, 24px grid, inherits `currentColor`
 * so it composes inside Buttons, Badges and text. Curated for the
 * marketing site (real-estate deals, trust, contact, commerce).
 *
 * Sizes: use the `size` prop (number = px, or any CSS length). The site
 * uses a consistent step scale — 14 / 16 / 18 / 22 / 24 / 36 — exposed as
 * `Icon.sizes` for pickers. Color is inherited from `currentColor`, so set
 * `color` on the icon or any ancestor (brand token `var(--magenta)`, etc.).
 */

// Inner SVG markup per icon, drawn on a 24x24 grid, stroke-based.
// Curated to the glyphs actually used on the Zoodealio marketing site
// (nav, seller flow, auth, contact widget) — see about.html + its modules.
const PATHS = {
  // navigation
  "arrow-right": '<line x1="4" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>',
  "chevron-down": '<polyline points="6 9 12 15 18 9"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  // actions
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
  // visibility (password fields)
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  "eye-off": '<path d="M3 3l18 18M10.6 10.7a3 3 0 0 0 4.2 4.2M9.4 5.2A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.1 6.2C3.4 7.9 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.3-1"/>',
  // contact / property
  "map-pin": '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  "message-square": '<path d="M20 4H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3v4l5-4h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>'
};
function Icon({
  name = "check",
  size = 24,
  strokeWidth = 2,
  title,
  style,
  ...rest
}) {
  const inner = PATHS[name];
  const px = typeof size === "number" ? size + "px" : size;
  return React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    width: px,
    height: px,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    role: title ? "img" : "presentation",
    "aria-label": title || undefined,
    "aria-hidden": title ? undefined : "true",
    style: {
      display: "inline-block",
      flex: "none",
      verticalAlign: "middle",
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: (title ? "<title>" + title + "</title>" : "") + (inner || "")
    },
    ...rest
  });
}

// Capitalized top-level export so the name list lands on the DS namespace
// (function statics and lowercase exports are stripped by the bundle).
const IconNames = Object.keys(PATHS);

// Recommended step scale used across the marketing site.
Icon.sizes = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 22,
  xl: 24,
  "2xl": 36
};
Object.assign(__ds_scope, { Icon, IconNames });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/Icon/Icon.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconNames = __ds_scope.IconNames;

})();

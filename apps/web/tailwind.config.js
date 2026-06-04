import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      "colors": {
              "tertiary-container": "#1b293c",
              "secondary": "#c8c6c5",
              "primary-fixed-dim": "#b3c5ff",
              "on-secondary-fixed": "#1c1b1b",
              "on-primary-fixed": "#00174a",
              "outline": "#8e909c",
              "on-secondary": "#313030",
              "background": "#0b1326",
              "error": "#ffb4ab",
              "inverse-on-surface": "#283044",
              "on-tertiary-container": "#8290a7",
              "on-tertiary-fixed": "#0d1c2f",
              "inverse-surface": "#dae2fd",
              "primary": "#b3c5ff",
              "on-primary-container": "#758dd5",
              "surface": "#0b1326",
              "tertiary-fixed": "#d5e3fd",
              "surface-dim": "#0b1326",
              "error-container": "#93000a",
              "tertiary": "#b9c7e0",
              "outline-variant": "#444650",
              "on-surface": "#dae2fd",
              "surface-container-highest": "#2d3449",
              "secondary-container": "#474746",
              "on-surface-variant": "#c5c6d2",
              "on-background": "#dae2fd",
              "surface-container-low": "#131b2e",
              "surface-bright": "#31394d",
              "surface-container": "#171f33",
              "on-primary": "#0d2c6e",
              "surface-variant": "#2d3449",
              "secondary-fixed": "#e5e2e1",
              "inverse-primary": "#435b9f",
              "primary-container": "#002366",
              "on-error": "#690005",
              "secondary-fixed-dim": "#c8c6c5",
              "on-primary-fixed-variant": "#2a4386",
              "on-secondary-fixed-variant": "#474746",
              "surface-container-lowest": "#060e20",
              "on-tertiary": "#233144",
              "on-secondary-container": "#b7b5b4",
              "surface-tint": "#b3c5ff",
              "surface-container-high": "#222a3d",
              "on-tertiary-fixed-variant": "#3a485c",
              "primary-fixed": "#dbe1ff",
              "tertiary-fixed-dim": "#b9c7e0",
              "on-error-container": "#ffdad6",
              "success": "#a8d5ba",
              "success-container": "#0f5132"
      },
      "borderRadius": {
              "DEFAULT": "0.25rem",
              "lg": "0.5rem",
              "xl": "0.75rem",
              "full": "9999px"
      },
      "spacing": {
              "gutter": "24px",
              "xs": "4px",
              "sm": "12px",
              "margin-desktop": "48px",
              "xl": "64px",
              "margin-mobile": "16px",
              "md": "24px",
              "lg": "40px",
              "base": "8px"
      },
      "fontFamily": {
              "label-sm": ["Inter"],
              "label-md": ["Inter"],
              "headline-lg": ["Inter"],
              "display-lg": ["Inter"],
              "body-lg": ["Inter"],
              "headline-md": ["Inter"],
              "headline-lg-mobile": ["Inter"],
              "body-md": ["Inter"]
      },
      "fontSize": {
              "label-sm": ["12px", {"lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600"}],
              "label-md": ["14px", {"lineHeight": "20px", "letterSpacing": "0.01em", "fontWeight": "500"}],
              "headline-lg": ["32px", {"lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "600"}],
              "display-lg": ["48px", {"lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
              "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}],
              "headline-md": ["24px", {"lineHeight": "32px", "fontWeight": "600"}],
              "headline-lg-mobile": ["28px", {"lineHeight": "36px", "fontWeight": "600"}],
              "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}]
      }
    }
  },
  plugins: [
    forms,
    containerQueries
  ],
}

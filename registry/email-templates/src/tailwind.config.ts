import { pixelBasedPreset, type TailwindConfig } from "react-email";

// Central brand configuration. Update colors here — templates pick them up automatically.
const tailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: {
          // Primary CTA color (buttons, key accents)
          primary: "#18181b",
          // Foreground on primary (button text)
          primaryFg: "#ffffff",
          // Muted links, secondary labels
          muted: "#71717a",
          // Body text
          body: "#3f3f46",
          // Heading text
          heading: "#09090b",
          // Dividers and borders
          border: "#e4e4e7",
          // Email body background
          bg: "#f4f4f5",
          // Card / container background
          surface: "#ffffff",
          // Warning box background (security notices, expiry)
          warnBg: "#fffbeb",
          // Warning box text
          warnText: "#92400e",
          // Info box background (login details, metadata)
          infoBg: "#eff6ff",
          // Info box text
          infoText: "#1e40af",
        },
      },
    },
  },
} satisfies TailwindConfig;

export default tailwindConfig;

// Brand assets — update src to your production CDN URL.
export const brand = {
  name: "Your Company",
  // Logo: 160×40px PNG hosted on a CDN. Leave empty to show text name instead.
  logoSrc: "",
  logoAlt: "Your Company",
  logoWidth: 120,
  logoHeight: 32,
  // CAN-SPAM / KVKK required: physical mailing address.
  address: "Your Company · 123 Main Street · City, Country",
  // Base URL for generating links in PreviewProps
  baseUrl: "https://yourcompany.com",
};

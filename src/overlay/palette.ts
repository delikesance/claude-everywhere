type Palette = Record<string, string>;

export const LIGHT_PALETTE: Palette = {
  raised: "#FFFDF8",
  surface: "#FBF8F1",
  sunken: "#EEE7D9",
  border: "#D9D0BF",
  "border-strong": "#877C69",
  text: "#1F1B16",
  muted: "#5E564A",
  accent: "#A33A1E",
  "accent-hover": "#7E2A14",
  primary: "#1F1B16",
  "primary-hover": "#3A342B",
  "on-primary": "#F6F1E7",
  "disabled-bg": "#D9D0BF",
  success: "#2C6A3E",
  warning: "#855600",
  danger: "#8A1B52",
  "danger-tint": "#F6E0EA",
  focus: "#1D4E8F",
  "sent-bg": "#F2E3A6",
  "sent-edge": "#7A6A1F",
  "shadow-2": "0 0 0 1px rgba(31, 27, 22, 0.14), 0 8px 24px rgba(31, 27, 22, 0.18), 0 2px 4px rgba(31, 27, 22, 0.08)",
};

export const DARK_PALETTE: Palette = {
  raised: "#27231E",
  surface: "#1E1B17",
  sunken: "#100E0C",
  border: "#3A352D",
  "border-strong": "#857B6B",
  text: "#ECE5D8",
  muted: "#A89F90",
  accent: "#EC8163",
  "accent-hover": "#F4A088",
  primary: "#ECE5D8",
  "primary-hover": "#F7F2E8",
  "on-primary": "#171512",
  "disabled-bg": "#3A352D",
  success: "#7FBF8E",
  warning: "#E0B255",
  danger: "#F28DB5",
  "danger-tint": "#301B26",
  focus: "#9CC3F5",
  "sent-bg": "#3A300E",
  "sent-edge": "#C2A53C",
  "shadow-2": "0 0 0 1px #857B6B, 0 12px 32px rgba(0, 0, 0, 0.6)",
};

export const declarations = (palette: Palette): string =>
  Object.entries(palette)
    .map(([name, value]) => `--${name}: ${value};`)
    .join(" ");

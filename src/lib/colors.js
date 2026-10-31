// The palette. Neutral and tint colours are CSS variables so the whole app
// themes from index.css (html[data-dark="true"] swaps them for a real dark
// palette — this replaced a brightness filter that just greyed everything).
// The literal value after the comma is the light-theme fallback.
//
// surface = card/panel backgrounds (dark in dark mode).
// white   = always white — text and icons on coloured buttons/banners.
const v = (name, light) => `var(--c-${name}, ${light})`;

const C = {
  cream: v("cream", "#FAF7F0"), surface: v("surface", "#FFFFFF"),
  sage: "#6B9E72", sageDark: v("sageDark", "#3D6B44"), sageLight: v("sageLight", "#EAF3EB"),
  gold: "#C9963A", goldLight: v("goldLight", "#FDF3DC"),
  terracotta: "#C4614A", terracottaLight: v("terracottaLight", "#FAEAE6"),
  plum: v("plum", "#7B4F78"), plumLight: v("plumLight", "#F4EDF3"), leaf: "#3A7A47",
  charcoal: v("charcoal", "#1E2A1E"), mid: v("mid", "#5A6B5A"), muted: v("muted", "#9BA89B"),
  border: v("border", "#E0DDD5"), white: "#FFFFFF", mist: v("mist", "#F0EDE6"),
};

// A colour at partial opacity — works with the CSS variables above, which
// the old `${C.sage}50` hex-suffix trick could not. `hex2` is the old
// two-digit hex alpha ("50" ≈ 31%).
export const alpha = (color, hex2) =>
  `color-mix(in srgb, ${color} ${Math.round((parseInt(hex2, 16) / 255) * 100)}%, transparent)`;

export default C;

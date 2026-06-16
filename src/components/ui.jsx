import C from "../lib/colors.js";

export const Tag = ({ children, color = C.sage }) => (
  <span
    style={{
      background: color + "18",
      color,
      border: `1px solid ${color}40`,
      borderRadius: 20,
      padding: "2px 10px",
      fontSize: 11,
      fontWeight: 700,
    }}
  >
    {children}
  </span>
);

export const Card = ({ children, style = {}, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: C.white,
      borderRadius: 18,
      boxShadow: "0 2px 16px #1e2a1e0a",
      border: `1px solid ${C.border}`,
      padding: 18,
      ...style,
      cursor: onClick ? "pointer" : "default",
    }}
  >
    {children}
  </div>
);

export const Btn = ({
  children,
  onClick,
  color = C.sage,
  full = false,
  small = false,
  disabled = false,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: disabled ? C.muted : color,
      color: C.white,
      border: "none",
      borderRadius: 40,
      padding: small ? "7px 14px" : "11px 22px",
      fontFamily: "Georgia,serif",
      fontWeight: 700,
      fontSize: small ? 12 : 15,
      cursor: disabled ? "not-allowed" : "pointer",
      width: full ? "100%" : "auto",
      opacity: disabled ? 0.5 : 1,
    }}
  >
    {children}
  </button>
);

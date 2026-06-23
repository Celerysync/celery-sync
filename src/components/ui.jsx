import C from "../lib/colors.js";

const vibrate = (ms = 7) => { try { navigator.vibrate?.(ms); } catch {} };

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
    className={onClick ? "cs-card-click" : undefined}
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
}) => {
  const handleClick = (e) => {
    if (!disabled) { vibrate(7); onClick?.(e); }
  };
  return (
    <button
      className="cs-btn"
      onClick={handleClick}
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
        touchAction: "manipulation",
        letterSpacing: 0.2,
      }}
    >
      {children}
    </button>
  );
};

export const Skeleton = ({ width = "100%", height = 16, radius = 10, style = {} }) => (
  <div className="cs-skeleton" style={{ width, height, borderRadius: radius, ...style }} />
);

export const SkeletonCard = ({ lines = 3 }) => (
  <div style={{
    background: "white",
    borderRadius: 18,
    border: "1px solid #e8ede8",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  }}>
    <Skeleton height={14} width="60%" />
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} height={12} width={i === lines - 1 ? "75%" : "100%"} />
    ))}
  </div>
);

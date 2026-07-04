import { Component } from "react";

// Top-level safety net — without this, any uncaught render error anywhere
// in the app unmounts the whole tree and leaves a blank page with no way
// to recover short of knowing to manually reload. Error boundaries must be
// class components; there's no hook equivalent.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Uncaught render error:", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100dvh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: 24,
          background: "#F7F5EF", textAlign: "center", fontFamily: "Georgia,serif",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1E2A1E", marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 14, color: "#6B7C6B", marginBottom: 20, maxWidth: 320, lineHeight: 1.6 }}>
            Sorry about that — a reload should fix it. Your data is safe.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 28px", borderRadius: 30, border: "none",
              background: "#3D6B44", color: "#fff", fontFamily: "Georgia,serif",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

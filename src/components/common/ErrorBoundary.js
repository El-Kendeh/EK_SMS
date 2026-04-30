import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (typeof this.props.onError === 'function') this.props.onError(error, info);
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary]', error, info);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({ error: this.state.error, reset: this.reset });
      }
      return (
        <div
          role="alert"
          style={{
            padding: 24,
            margin: 16,
            borderRadius: 14,
            background: 'rgba(255, 80, 80, 0.08)',
            border: '1px solid rgba(255, 80, 80, 0.3)',
            color: 'var(--student-text, #fff)',
            fontFamily: 'inherit',
          }}
        >
          <h3 style={{ margin: '0 0 8px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: '#ff7a7a' }}>error</span>
            Something went wrong here
          </h3>
          <p style={{ margin: '0 0 12px', opacity: 0.8, fontSize: 14 }}>
            {this.state.error?.message || 'Unexpected error.'} The rest of your dashboard is fine.
          </p>
          <button
            onClick={this.reset}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              color: 'inherit',
              border: '1px solid rgba(255,255,255,0.12)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

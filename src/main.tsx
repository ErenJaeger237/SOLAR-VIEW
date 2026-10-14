import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Apollo Astrodynamics App Caught Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#040806',
          color: '#86efac',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'JetBrains Mono', monospace"
        }}>
          <div style={{
            maxWidth: '520px',
            background: '#07150d',
            border: '1px solid #22c55e',
            borderRadius: '0px',
            padding: '24px',
            textAlign: 'left',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)'
          }}>
            <div style={{
              fontSize: '11px',
              color: '#16a34a',
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              marginBottom: '6px'
            }}>
              NASA-JSC // APOLLO SYSTEM ALERT
            </div>
            <h1 style={{
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '12px',
              color: '#4ade80',
              textTransform: 'uppercase'
            }}>
              Astrodynamics Console Recalibration
            </h1>
            <p style={{
              fontSize: '12px',
              color: '#86efac',
              marginBottom: '20px',
              lineHeight: '1.6',
              opacity: 0.85
            }}>
              {this.state.error?.message || 'Re-establishing 3D WebGL context and celestial ephemeris buffers...'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                backgroundColor: '#122e1e',
                color: '#4ade80',
                border: '1px solid #22c55e',
                padding: '8px 16px',
                borderRadius: '0px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '11px',
                textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.05em'
              }}
            >
              [REINITIALIZE CONSOLE]
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);

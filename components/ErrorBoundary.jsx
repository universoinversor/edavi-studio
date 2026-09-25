'use client';
import { Component } from 'react';
import { COPY } from '@/lib/copy';
import Avatar from './Avatar';
import Icon from './Icon';

// Aísla los fallos de una sección: el resto de la app (navegación, historial) sigue viva.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prev) {
    // Al cambiar de sección se vuelve a intentar.
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  componentDidCatch(error, info) {
    console.error('[EDAVI] Error en la sección:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const t = COPY.states;
    return (
      <div className="state-screen" role="alert">
        <Avatar size="lg" mood="error" />
        <h2>{t.errorTitle}</h2>
        <p className="dim">{t.errorText}</p>
        <button type="button" className="cta" onClick={() => this.setState({ error: null })}><Icon name="refresh" /> {t.retry}</button>
      </div>
    );
  }
}

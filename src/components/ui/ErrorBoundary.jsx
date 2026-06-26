import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary capturó un error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center pt-24 px-6 text-center gap-4">
          <p className="text-4xl">⚠️</p>
          <p className="text-white font-bold text-lg">Algo salió mal</p>
          <p className="text-muted text-sm">Intenta recargar la página. Si el problema persiste, contacta al administrador.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-6 py-2.5 bg-gold text-bg font-bold rounded-xl text-sm active:scale-95 transition-all"
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

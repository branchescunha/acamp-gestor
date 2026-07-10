import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfirmProvider } from './components/ConfirmProvider'
import { ToastProvider } from './components/ToastProvider'
import { AuthProvider } from './hooks/useAuth'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  </StrictMode>
)

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ModoCriancaGuard from './components/ModoCriancaGuard';
import { AuthProvider } from './context/AuthContext';
import { SenhaProvider } from './context/SenhaContext';
import { ToastProvider } from './context/ToastContext';
import { TutorialProvider } from './context/TutorialContext';
import './styles/style.css';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Elemento #root não encontrado.');

createRoot(raiz).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <SenhaProvider>
            <ModoCriancaGuard>
              <TutorialProvider>
                <App />
              </TutorialProvider>
            </ModoCriancaGuard>
          </SenhaProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);

// Service worker (só no app publicado): deixa o app abrir mesmo sem internet
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

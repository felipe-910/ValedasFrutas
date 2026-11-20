import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import AceitarTermos from './pages/AceitarTermos';
import AdicionarMeta from './pages/AdicionarMeta';
import Cadastro from './pages/Cadastro';
import Configuracoes from './pages/Configuracoes';
import Crianca from './pages/Crianca';
import Desempenho from './pages/Desempenho';
import EscolhaPersonagem from './pages/EscolhaPersonagem';
import Historias from './pages/Historias';
import Home from './pages/Home';
import Index from './pages/Index';
import ListaRefeicoes from './pages/ListaRefeicoes';
import Login from './pages/Login';
import Metas from './pages/Metas';
import NovoPequeno from './pages/NovoPequeno';
import Painel from './pages/Painel';
import Notificacoes from './pages/Notificacoes';
import Perfil from './pages/Perfil';
import RecuperarSenha from './pages/RecuperarSenha';
import RedefinirSenha from './pages/RedefinirSenha';
import Refeicoes from './pages/Refeicoes';
import Termos from './pages/Termos';

// Telas que só quem está logado vê
function AreaLogada() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}

export default function App() {
  return (
    <Routes>
      {/* públicas */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      {/* o e-mail de redefinição do Firebase pode ainda apontar para o endereço antigo (.html) */}
      <Route path="/redefinir-senha.html" element={<RedefinirSenha />} />
      <Route path="/termos" element={<Termos />} />

      {/* logadas */}
      <Route element={<AreaLogada />}>
        <Route path="/aceitar-termos" element={<AceitarTermos />} />
        <Route path="/novo-pequeno" element={<NovoPequeno />} />
        <Route path="/escolha-personagem" element={<EscolhaPersonagem />} />
        <Route path="/home" element={<Home />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/notificacoes" element={<Notificacoes />} />
        <Route path="/historias" element={<Historias />} />
        <Route path="/crianca" element={<Crianca />} />
        <Route path="/painel" element={<Painel />} />
        <Route path="/desempenho" element={<Desempenho />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/lista-refeicoes" element={<ListaRefeicoes />} />
        <Route path="/refeicoes" element={<Refeicoes />} />
        <Route path="/metas" element={<Metas />} />
        <Route path="/adicionar-meta" element={<AdicionarMeta />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

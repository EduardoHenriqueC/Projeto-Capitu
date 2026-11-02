'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Telas do sistema
import HomeView from '../components/HomeView';
import ColinhasBoard from '@/components/ColinhasBoard';
import RegulamentosView from '@/components/RegulamentosView';
import LinksView from '@/components/LinksView';

const LIMITE_INATIVIDADE_MS = 30 * 60 * 1000;
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 30 * 1000;
const MIN_SENHA = 8;

const estiloLabel = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: '700',
  marginBottom: '6px',
  color: 'var(--texto-secundario, #334155)'
};

const estiloInput = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '10px',
  border: '1.5px solid var(--border-search, #CBD5E1)',
  fontSize: '0.92rem',
  outline: 'none',
  backgroundColor: 'var(--bg-input, #F8FAFC)',
  color: 'var(--texto-primario, #1E293B)'
};

const obterEstiloPapel = (papel) => {
  const p = (papel || '').toLowerCase();

  if (p.includes('admin')) {
    return {
      rotulo: '👑 Administrador',
      corTexto: '#A78BFA',
      corAvatar: '#7C3AED',
      fundoTag: 'rgba(124, 58, 237, 0.18)',
      bordaTag: 'rgba(124, 58, 237, 0.4)',
      sombra: '0 0 12px rgba(124, 58, 237, 0.35)'
    };
  }

  if (p.includes('supervis') || p.includes('lider') || p.includes('líder')) {
    return {
      rotulo: '⭐ Supervisão EV',
      corTexto: '#FBBF24',
      corAvatar: '#D97706',
      fundoTag: 'rgba(217, 119, 6, 0.18)',
      bordaTag: 'rgba(217, 119, 6, 0.4)',
      sombra: 'none'
    };
  }

  return {
    rotulo: 'Operação EV',
    corTexto: '#2DD4BF',
    corAvatar: '#006968',
    fundoTag: 'rgba(45, 212, 191, 0.15)',
    bordaTag: 'rgba(45, 212, 191, 0.35)',
    sombra: 'none'
  };
};

export default function Page() {
  const [view, setView] = useState('inicio');
  const [usuario, setUsuario] = useState(null);
  const [carregandoAuth, setCarregandoAuth] = useState(true);

  // Tema Escuro / Claro
  const [tema, setTema] = useState('light');

  // Menu Dropdown do Perfil
  const [menuPerfilAberto, setMenuPerfilAberto] = useState(false);
  const menuPerfilRef = useRef(null);

  // Modal de Alteração de Nome
  const [modalNomeAberto, setModalNomeAberto] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);

  // Primeiro acesso
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [sucessoTroca, setSucessoTroca] = useState(false);
  const senhaJaAlterada = useRef(false);

  // Login
  const [emailInput, setEmailInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [msgErro, setMsgErro] = useState('');
  const falhas = useRef({ qtd: 0, ate: 0 });

  const role = usuario?.role || 'operador';
  const isSupervisor = role === 'supervisor' || role === 'admin';
  const mostrarModalPrimeiroAcesso = Boolean(usuario?.precisaTrocarSenha) || sucessoTroca;

  // 1. CARREGAMENTO DO TEMA SALVO
  useEffect(() => {
    const temaSalvo = localStorage.getItem('capitu_tema') || 'light';
    setTema(temaSalvo);
    document.documentElement.setAttribute('data-theme', temaSalvo);
  }, []);

  const alternarTema = () => {
    const proximoTema = tema === 'light' ? 'dark' : 'light';
    setTema(proximoTema);
    localStorage.setItem('capitu_tema', proximoTema);
    document.documentElement.setAttribute('data-theme', proximoTema);
  };

  // 2. FECHAR DROPDOWN AO CLICAR FORA
  useEffect(() => {
    const handleClickFora = (e) => {
      if (menuPerfilRef.current && !menuPerfilRef.current.contains(e.target)) {
        setMenuPerfilAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  // 3. CARREGAMENTO DO PERFIL
  const carregarPerfil = useCallback(async (user) => {
    if (!user) {
      setUsuario(null);
      return;
    }

    const { data, error } = await supabase
      .from('perfis')
      .select('id, email, nome, role, precisa_trocar_senha, ativo')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data || !data.ativo) {
      await supabase.auth.signOut();
      setUsuario(null);
      setMsgErro(
        data && !data.ativo
          ? 'Seu acesso está desativado. Procure a equipe de TI.'
          : 'Não foi possível validar seu acesso. Procure a equipe de TI.'
      );
      return;
    }

    setUsuario({
      id: data.id,
      email: data.email,
      nome: data.nome,
      role: data.role,
      precisaTrocarSenha: Boolean(data.precisa_trocar_senha)
    });
  }, []);

  // 4. MONITORAMENTO DE SESSÃO
  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      await carregarPerfil(data.session?.user ?? null);
      if (ativo) setCarregandoAuth(false);
    });

    const { data: assinatura } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') {
        setUsuario(null);
        setView('inicio');
      }
    });

    return () => {
      ativo = false;
      assinatura.subscription.unsubscribe();
    };
  }, [carregarPerfil]);

  // 5. TIMEOUT POR INATIVIDADE (30 MIN)
  useEffect(() => {
    if (!usuario?.id) return;

    let timer;
    const reiniciar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setMsgErro('Sessão encerrada por inatividade. Entre novamente.');
        supabase.auth.signOut();
      }, LIMITE_INATIVIDADE_MS);
    };

    const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    eventos.forEach((ev) => window.addEventListener(ev, reiniciar, { passive: true }));
    reiniciar();

    return () => {
      clearTimeout(timer);
      eventos.forEach((ev) => window.removeEventListener(ev, reiniciar));
    };
  }, [usuario?.id]);

  // 6. ALTERAR NOME VIA RPC SEGURA
  const handleSalvarNome = async (e) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    setSalvandoNome(true);
    try {
      const nomeFormatado = novoNome.trim();
      const { error } = await supabase.rpc('alterar_meu_nome', {
        novo_nome: nomeFormatado
      });

      if (error) throw error;

      setUsuario((prev) => ({ ...prev, nome: nomeFormatado }));
      setModalNomeAberto(false);
    } catch (err) {
      alert('Erro ao atualizar nome: ' + (err.message || 'Falha na comunicação'));
    } finally {
      setSalvandoNome(false);
    }
  };

  // 7. AUTENTICAÇÃO
  const handleLogin = async (e) => {
    e.preventDefault();
    setMsgErro('');

    if (Date.now() < falhas.current.ate) {
      setMsgErro('Muitas tentativas. Aguarde alguns segundos e tente novamente.');
      return;
    }

    setEnviando(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput.trim().toLowerCase(),
        password: senhaInput
      });

      if (error || !data?.user) {
        if (error?.status === 429) {
          throw new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        }
        falhas.current.qtd += 1;
        if (falhas.current.qtd >= MAX_TENTATIVAS) {
          falhas.current = { qtd: 0, ate: Date.now() + BLOQUEIO_MS };
        }
        throw new Error('E-mail institucional ou senha incorretos.');
      }

      falhas.current = { qtd: 0, ate: 0 };
      await carregarPerfil(data.user);
      setEmailInput('');
      setSenhaInput('');
    } catch (err) {
      setSenhaInput('');
      setMsgErro(err.message || 'Falha ao autenticar.');
    } finally {
      setEnviando(false);
    }
  };

  // 8. TROCA DE SENHA NO PRIMEIRO ACESSO
  const handleTrocarSenhaPrimeiroAcesso = async (e) => {
    e.preventDefault();
    setMsgErro('');

    if (!senhaJaAlterada.current) {
      if (novaSenha.length < MIN_SENHA) {
        setMsgErro(`A nova senha deve ter no mínimo ${MIN_SENHA} caracteres.`);
        return;
      }
      if (!/[A-Za-z]/.test(novaSenha) || !/\d/.test(novaSenha)) {
        setMsgErro('A nova senha deve conter letras e números.');
        return;
      }
      if (novaSenha !== confirmaSenha) {
        setMsgErro('As senhas digitadas não coincidem.');
        return;
      }
    }

    setEnviando(true);

    try {
      if (!senhaJaAlterada.current) {
        const { error } = await supabase.auth.updateUser({ password: novaSenha });

        if (error) {
          if (error.code === 'same_password') {
            throw new Error('A nova senha deve ser diferente da senha temporária.');
          }
          if (error.code === 'weak_password') {
            throw new Error('Senha fraca. Use letras, números e pelo menos 8 caracteres.');
          }
          throw new Error('Não foi possível atualizar a senha. Tente novamente.');
        }
        senhaJaAlterada.current = true;
      }

      const { error: erroFlag } = await supabase.rpc('concluir_primeiro_acesso');
      if (erroFlag) {
        throw new Error('Sua senha já foi alterada, falta só concluir o acesso. Clique em salvar novamente.');
      }

      senhaJaAlterada.current = false;
      setNovaSenha('');
      setConfirmaSenha('');

      setSucessoTroca(true);
      setUsuario((u) => (u ? { ...u, precisaTrocarSenha: false } : u));
      setTimeout(() => setSucessoTroca(false), 1800);
    } catch (err) {
      setMsgErro(err.message || 'Erro ao atualizar a senha.');
    } finally {
      setEnviando(false);
    }
  };

  // 9. LOGOUT
  const handleLogout = async () => {
    setMsgErro('');
    setMenuPerfilAberto(false);
    await supabase.auth.signOut();
    setUsuario(null);
    setView('inicio');
  };

  if (carregandoAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-pagina, #F8FAFC)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#2DD4BF',
        fontSize: '1.15rem',
        fontWeight: '800'
      }}>
        📖 Carregando Portal Capitu...
      </div>
    );
  }

  // TELA DE LOGIN
  if (!usuario) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-pagina, #F8FAFC)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          borderRadius: '24px',
          border: '1px solid var(--border-card, #E2E8F0)',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.12)',
          width: '100%',
          maxWidth: '440px',
          padding: '44px 38px',
          textAlign: 'center'
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              backgroundColor: '#004D4C',
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem',
              flexShrink: 0
            }}>
              📚
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '0.64rem', fontWeight: '800', color: 'var(--texto-titulo-verde)', letterSpacing: '0.8px', display: 'block' }}>
                ESTANTE VIRTUAL
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', lineHeight: 1.1 }}>
                <span style={{ color: 'var(--texto-primario)' }}>Portal </span>
                <span style={{ color: '#2DD4BF' }}>Capitu</span>
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: '900', color: 'var(--texto-primario)', margin: '14px 0 6px 0' }}>
            Acesso Operacional
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--texto-secundario)', margin: '0 0 26px 0', lineHeight: '1.45' }}>
            Entre com suas credenciais corporativas para consultar colinhas, regras e links.
          </p>

          {msgErro && (
            <div
              role="alert"
              style={{
                backgroundColor: '#FEE2E2',
                color: '#991B1B',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: '600',
                marginBottom: '16px',
                textAlign: 'left'
              }}
            >
              ⚠️ {msgErro}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
            <div>
              <label htmlFor="login-email" style={estiloLabel}>E-mail institucional:</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="username"
                maxLength={254}
                placeholder="seu_nome@estantevirtual.com.br"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={estiloInput}
              />
            </div>

            <div>
              <label htmlFor="login-senha" style={estiloLabel}>Senha de acesso:</label>
              <input
                id="login-senha"
                type="password"
                required
                autoComplete="current-password"
                maxLength={128}
                placeholder="••••••••"
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
                style={estiloInput}
              />
            </div>

            <button
              type="submit"
              disabled={enviando}
              style={{
                backgroundColor: '#006968',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px',
                borderRadius: '10px',
                fontSize: '0.94rem',
                fontWeight: '800',
                cursor: enviando ? 'not-allowed' : 'pointer',
                marginTop: '6px',
                boxShadow: '0 4px 14px rgba(0, 105, 104, 0.25)',
                opacity: enviando ? 0.7 : 1
              }}
            >
              {enviando ? 'Validando acesso...' : 'Entrar no Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-pagina, #F8FAFC)' }}>

      {/* SISTEMA DE VARIÁVEIS DE TEMA GLOBAL */}
      <style>{`
        :root {
          --bg-pagina: #F8FAFC;
          --bg-header: #FFFFFF;
          --border-cabecalho: #E2E8F0;
          --texto-primario: #0F172A;
          --texto-secundario: #475569;
          --texto-titulo-verde: #004D4C;
          --texto-destaque-turquesa: #006968;
          --bg-card: #FFFFFF;
          --border-card: #E2E8F0;
          --bg-search: #FFFFFF;
          --border-search: #CBD5E1;
          --text-search: #1E293B;
          --placeholder-search: #94A3B8;
          --bg-dropdown: #FFFFFF;
          --bg-dropdown-hover: #F1F5F9;
          --borda-dropdown: #E2E8F0;
          --bg-mural-page: #F5F3EC;
          --bg-item-aberto: #F8FAFC;
          --bg-subconteudo: #FFFFFF;
          --bg-input: #F8FAFC;
        }

        [data-theme="dark"] {
          --bg-pagina: #0A141A;
          --bg-header: #0F1E27;
          --border-cabecalho: #1E3442;
          --texto-primario: #F8FAFC;
          --texto-secundario: #CBD5E1;
          --texto-titulo-verde: #2DD4BF;
          --texto-destaque-turquesa: #5EEAD4;
          --bg-card: #13222D;
          --border-card: #1E3545;
          --bg-search: #13222D;
          --border-search: #1E3545;
          --text-search: #F8FAFC;
          --placeholder-search: #64748B;
          --bg-dropdown: #0F1E27;
          --bg-dropdown-hover: #1A2F3D;
          --borda-dropdown: #1E3442;
          --bg-mural-page: #0A141A;
          --bg-item-aberto: #162836;
          --bg-subconteudo: #0F1A22;
          --bg-input: #0F1A24;
        }

        .perfil-gatilho-btn:hover {
          background-color: var(--bg-dropdown-hover);
        }

        .dropdown-opcao-btn {
          width: 100%;
          text-align: left;
          background: none;
          border: none;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--texto-primario);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: background-color 0.15s ease;
        }
        .dropdown-opcao-btn:hover {
          background-color: var(--bg-dropdown-hover);
        }
      `}</style>

      {/* NAVBAR SUPERIOR */}
      <header style={{
        backgroundColor: 'var(--bg-header)',
        borderBottom: '1px solid var(--border-cabecalho)',
        padding: '14px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* LOGO */}
        <div
          onClick={() => setView('inicio')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{
            backgroundColor: '#004D4C',
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.3rem',
            flexShrink: 0
          }}>
            📚
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: '0.64rem',
              fontWeight: '800',
              color: 'var(--texto-titulo-verde)',
              letterSpacing: '0.8px',
              textTransform: 'uppercase'
            }}>
              ESTANTE VIRTUAL
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', lineHeight: 1.1 }}>
              <span style={{ color: 'var(--texto-primario)' }}>Portal </span>
              <span style={{ color: '#2DD4BF' }}>Capitu</span>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE TELAS */}
        <nav style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'inicio', label: 'Início', icone: '🏠' },
            { id: 'colinhas', label: 'Colinhas', icone: '📝' },
            { id: 'regulamentos', label: 'Regulamentos', icone: '📜' },
            { id: 'links', label: 'Links Úteis', icone: '🔗' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              style={{
                backgroundColor: view === item.id ? '#006968' : 'transparent',
                color: view === item.id ? '#FFFFFF' : 'var(--texto-secundario)',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '9999px',
                fontWeight: '700',
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease, color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{item.icone}</span> {item.label}
            </button>
          ))}
        </nav>

        {/* PERFIL ALINHADO À DIREITA COM DROPDOWN */}
        <div style={{ position: 'relative' }} ref={menuPerfilRef}>
          {(() => {
            const estilo = obterEstiloPapel(role);
            return (
              <>
                <div
                  className="perfil-gatilho-btn"
                  onClick={() => setMenuPerfilAberto(!menuPerfilAberto)}
                  title="Clique para ver opções do perfil"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    padding: '6px 10px',
                    borderRadius: '12px',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: estilo.corAvatar,
                    color: '#FFFFFF',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    boxShadow: estilo.sombra
                  }}>
                    {usuario.nome ? usuario.nome.slice(0, 2).toUpperCase() : 'EV'}
                  </div>

                  <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--texto-primario)' }}>
                      {usuario.nome}
                    </div>

                    <span style={{
                      display: 'inline-block',
                      marginTop: '3px',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      color: estilo.corTexto,
                      backgroundColor: estilo.fundoTag,
                      border: `1px solid ${estilo.bordaTag}`,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      letterSpacing: '0.3px'
                    }}>
                      {estilo.rotulo}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--texto-secundario)',
                    marginLeft: '4px',
                    transform: menuPerfilAberto ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.18s ease'
                  }}>
                    ▼
                  </span>
                </div>

                {/* MENU SUSPENSO */}
                {menuPerfilAberto && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '220px',
                    backgroundColor: 'var(--bg-dropdown)',
                    borderRadius: '14px',
                    border: '1px solid var(--borda-dropdown)',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
                    padding: '6px',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px'
                  }}>
                    <button
                      className="dropdown-opcao-btn"
                      onClick={() => {
                        setNovoNome(usuario.nome || '');
                        setModalNomeAberto(true);
                        setMenuPerfilAberto(false);
                      }}
                    >
                      <span>✏️</span> Alterar nome
                    </button>

                    <button
                      className="dropdown-opcao-btn"
                      onClick={() => {
                        alternarTema();
                        setMenuPerfilAberto(false);
                      }}
                    >
                      <span>{tema === 'light' ? '🌙' : '☀️'}</span>
                      {tema === 'light' ? 'Modo Escuro' : 'Modo Claro'}
                    </button>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--borda-dropdown)', margin: '4px 0' }} />

                    <button
                      className="dropdown-opcao-btn"
                      onClick={handleLogout}
                      style={{ color: '#EF4444' }}
                    >
                      <span>🚪</span> Sair da conta
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </header>

      {/* TELAS PERSISTENTES EM MEMÓRIA (0 MS DE LATÊNCIA) */}
      {!usuario.precisaTrocarSenha && (
        <main style={{ minHeight: 'calc(100vh - 72px)' }}>
          <div style={{ display: view === 'inicio' ? 'block' : 'none' }}>
            <HomeView
              setView={setView}
              isSupervisor={isSupervisor}
              usuarioLogado={usuario}
            />
          </div>

          <div style={{ display: view === 'colinhas' ? 'block' : 'none' }}>
            <ColinhasBoard
              setView={setView}
              isSupervisor={isSupervisor}
              usuarioLogado={usuario}
            />
          </div>

          <div style={{ display: view === 'regulamentos' ? 'block' : 'none' }}>
            <RegulamentosView
              isSupervisor={isSupervisor}
              usuarioLogado={usuario}
            />
          </div>

          <div style={{ display: view === 'links' ? 'block' : 'none' }}>
            <LinksView />
          </div>
        </main>
      )}

      {/* MODAL: ALTERAR NOME (DISPONÍVEL PARA QUALQUER PERFIL) */}
      {modalNomeAberto && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 20, 20, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3500,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '440px',
            padding: '30px',
            border: '1px solid var(--border-card, #E2E8F0)',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', fontWeight: '900', color: 'var(--texto-titulo-verde)' }}>
              ✏️ Alterar Nome de Exibição
            </h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '0.86rem', color: 'var(--texto-secundario)' }}>
              Esse nome será atualizado no seu perfil e refletido nos seus registros.
            </p>

            <form onSubmit={handleSalvarNome} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={estiloLabel}>Seu nome completo:</label>
                <input
                  type="text"
                  required
                  maxLength={70}
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  style={estiloInput}
                  placeholder="Ex: Eduardo Henrique"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setModalNomeAberto(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-card, #CBD5E1)',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    color: 'var(--texto-secundario, #64748B)',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoNome}
                  style={{
                    backgroundColor: '#006968',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '9px 20px',
                    borderRadius: '8px',
                    fontWeight: '800',
                    cursor: salvandoNome ? 'not-allowed' : 'pointer',
                    opacity: salvandoNome ? 0.7 : 1
                  }}
                >
                  {salvandoNome ? 'Salvando...' : 'Salvar Alteração'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PRIMEIRO ACESSO */}
      {mostrarModalPrimeiroAcesso && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 20, 20, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              borderRadius: '20px',
              padding: '36px 40px',
              width: '100%',
              maxWidth: '460px',
              border: '1px solid var(--border-card, #E2E8F0)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
              position: 'relative'
            }}
          >
            {sucessoTroca ? (
              <div style={{ textAlign: 'center', padding: '24px 10px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#DCFCE7',
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 16px auto'
                }}>
                  ✓
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.35rem', fontWeight: '900', color: 'var(--texto-titulo-verde)' }}>
                  Senha cadastrada com sucesso!
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--texto-secundario)' }}>
                  Bem-vindo(a) ao Portal Capitu. Acessando o painel...
                </p>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '2.6rem', marginBottom: '8px' }}>🛡️</div>
                  <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '800', color: 'var(--texto-titulo-verde)' }}>
                    Primeiro Acesso: Nova Senha
                  </h3>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.86rem', color: 'var(--texto-secundario)', lineHeight: '1.5' }}>
                    Você está utilizando uma senha temporária. Defina sua nova senha de acesso para prosseguir.
                  </p>
                </div>

                {msgErro && (
                  <div
                    role="alert"
                    style={{
                      backgroundColor: '#FEE2E2',
                      color: '#991B1B',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      marginBottom: '16px',
                      textAlign: 'center'
                    }}
                  >
                    {msgErro}
                  </div>
                )}

                <form onSubmit={handleTrocarSenhaPrimeiroAcesso} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label htmlFor="nova-senha" style={estiloLabel}>
                      Nova senha (mínimo {MIN_SENHA} caracteres, com letras e números):
                    </label>
                    <input
                      id="nova-senha"
                      type="password"
                      required
                      autoComplete="new-password"
                      maxLength={128}
                      placeholder="Digite sua nova senha"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      disabled={senhaJaAlterada.current}
                      style={estiloInput}
                    />
                  </div>

                  <div>
                    <label htmlFor="confirma-senha" style={estiloLabel}>Confirme a nova senha:</label>
                    <input
                      id="confirma-senha"
                      type="password"
                      required
                      autoComplete="new-password"
                      maxLength={128}
                      placeholder="Repita a nova senha"
                      value={confirmaSenha}
                      onChange={(e) => setConfirmaSenha(e.target.value)}
                      disabled={senhaJaAlterada.current}
                      style={estiloInput}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={enviando}
                    style={{
                      backgroundColor: '#006968',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '13px',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      fontWeight: '800',
                      cursor: enviando ? 'not-allowed' : 'pointer',
                      marginTop: '10px',
                      boxShadow: '0 4px 12px rgba(0, 105, 104, 0.25)',
                      opacity: enviando ? 0.7 : 1
                    }}
                  >
                    {enviando ? 'Salvando credencial...' : 'Salvar Senha e Entrar'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Telas do sistema com caminhos oficiais
import HomeView from '../components/HomeView';
import ColinhasBoard from '@/components/ColinhasBoard';
import RegulamentosView from '@/components/RegulamentosView';
import LinksView from '@/components/LinksView';

const LIMITE_INATIVIDADE_MS = 30 * 60 * 1000; // 30 min sem atividade => logout
const MAX_TENTATIVAS = 5;                     // Falhas seguidas antes do bloqueio local
const BLOQUEIO_MS = 30 * 1000;                // 30 s de espera após estourar tentativas
const MIN_SENHA = 8;                          // Senha mínima redefinida para 8 caracteres

const estiloLabel = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: '700',
  marginBottom: '6px',
  color: '#334155'
};

const estiloInput = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '10px',
  border: '1.5px solid #CBD5E1',
  fontSize: '0.92rem',
  outline: 'none',
  backgroundColor: '#F8FAFC'
};

const obterEstiloPapel = (papel) => {
  const p = (papel || '').toLowerCase();

  if (p.includes('admin')) {
    return {
      rotulo: '👑 Administrador',
      corTexto: '#6D28D9',
      corAvatar: '#7C3AED',
      fundoTag: '#F5F3FF',
      bordaTag: '#DDD6FE',
      sombra: '0 0 12px rgba(124, 58, 237, 0.35)'
    };
  }

  if (p.includes('supervis') || p.includes('lider') || p.includes('líder')) {
    return {
      rotulo: '⭐ Supervisão EV',
      corTexto: '#B45309',
      corAvatar: '#D97706',
      fundoTag: '#FFFBEB',
      bordaTag: '#FDE68A',
      sombra: 'none'
    };
  }

  return {
    rotulo: 'Operação EV',
    corTexto: '#0F766E',
    corAvatar: '#006968',
    fundoTag: '#F0FDFA',
    bordaTag: '#CCFBF1',
    sombra: 'none'
  };
};

export default function Page() {
  const [view, setView] = useState('inicio');
  const [usuario, setUsuario] = useState(null);
  const [carregandoAuth, setCarregandoAuth] = useState(true);

  // Primeiro acesso
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [sucessoTroca, setSucessoTroca] = useState(false);
  const senhaJaAlterada = useRef(false);

  // Formulário de Login
  const [emailInput, setEmailInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [msgErro, setMsgErro] = useState('');
  const falhas = useRef({ qtd: 0, ate: 0 });

  const role = usuario?.role || 'operador';
  const isSupervisor = role === 'supervisor' || role === 'admin';
  const mostrarModalPrimeiroAcesso = Boolean(usuario?.precisaTrocarSenha) || sucessoTroca;

  // 1. CARREGAMENTO DO PERFIL
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

  // 2. MONITORAMENTO DE SESSÃO E LIMPEZA DE STORAGE ANTIGO
  useEffect(() => {
    try {
      localStorage.removeItem('capitu_session');
      sessionStorage.removeItem('capitu_secure_session');
    } catch {}

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

  // 3. LOGOUT AUTOMÁTICO POR INATIVIDADE
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

  // 4. AUTENTICAÇÃO
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

  // 5. TROCA DE SENHA NO PRIMEIRO ACESSO (MÍNIMO 8 CARACTERES)
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

  // 6. ENCERRAMENTO DE SESSÃO
  const handleLogout = async () => {
    setMsgErro('');
    setNovaSenha('');
    setConfirmaSenha('');
    senhaJaAlterada.current = false;
    await supabase.auth.signOut();
    setUsuario(null);
    setView('inicio');
  };

  if (carregandoAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F5F3EC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#004D4C',
        fontSize: '1.15rem',
        fontWeight: '800'
      }}>
        📖 Carregando Portal Capitu...
      </div>
    );
  }

  // TELA DE LOGIN OBRIGATÓRIA
  if (!usuario) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F5F3EC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 20px 45px rgba(0, 77, 76, 0.08)',
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
              <span style={{ fontSize: '0.64rem', fontWeight: '800', color: '#004D4C', letterSpacing: '0.8px', display: 'block' }}>
                ESTANTE VIRTUAL
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', lineHeight: 1.1 }}>
                <span style={{ color: '#004D4C' }}>Portal </span>
                <span style={{ color: '#2DD4BF' }}>Capitu</span>
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: '900', color: '#004D4C', margin: '14px 0 6px 0' }}>
            Acesso Operacional
          </h2>
          <p style={{ fontSize: '0.86rem', color: '#64748B', margin: '0 0 26px 0', lineHeight: '1.45' }}>
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
                backgroundColor: '#004D4C',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px',
                borderRadius: '10px',
                fontSize: '0.94rem',
                fontWeight: '800',
                cursor: enviando ? 'not-allowed' : 'pointer',
                marginTop: '6px',
                boxShadow: '0 4px 14px rgba(0, 77, 76, 0.25)',
                opacity: enviando ? 0.7 : 1
              }}
            >
              {enviando ? 'Validando acesso...' : 'Entrar no Portal'}
            </button>
          </form>

          <div style={{ marginTop: '28px', paddingTop: '18px', borderTop: '1px solid #F1F5F9' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: '1.5' }}>
              Novo operador ou esqueceu a senha? Solicite o cadastro ou reset de acesso junto à <strong>equipe de TI</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>

      {/* NAVBAR SUPERIOR */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '14px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
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
              color: '#004D4C',
              letterSpacing: '0.8px',
              textTransform: 'uppercase'
            }}>
              ESTANTE VIRTUAL
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', lineHeight: 1.1 }}>
              <span style={{ color: '#004D4C' }}>Portal </span>
              <span style={{ color: '#2DD4BF' }}>Capitu</span>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE AS PÁGINAS */}
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
                color: view === item.id ? '#FFFFFF' : '#475569',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '9999px',
                fontWeight: '700',
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{item.icone}</span> {item.label}
            </button>
          ))}
        </nav>

        {/* ÁREA DE PERFIL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {(() => {
            const estilo = obterEstiloPapel(role);
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                  <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1E293B' }}>
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

                <button
                  onClick={handleLogout}
                  title="Sair do portal"
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: '#64748B',
                    fontWeight: '700',
                    marginLeft: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FEE2E2';
                    e.currentTarget.style.color = '#DC2626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F1F5F9';
                    e.currentTarget.style.color = '#64748B';
                  }}
                >
                  Sair
                </button>
              </div>
            );
          })()}
        </div>
      </header>

      {/* TELAS: Carregadas apenas com o primeiro acesso concluído */}
      {!usuario.precisaTrocarSenha && (
        <main key={view} style={{ minHeight: 'calc(100vh - 72px)' }}>
          {view === 'inicio' && (
            <HomeView
              setView={setView}
              isSupervisor={isSupervisor}
              usuarioLogado={usuario}
            />
          )}

          {view === 'colinhas' && (
            <ColinhasBoard
              setView={setView}
              isSupervisor={isSupervisor}
              usuarioLogado={usuario}
            />
          )}

          {view === 'regulamentos' && (
            <RegulamentosView
              setView={setView}
              isSupervisor={isSupervisor}
              usuarioLogado={usuario}
            />
          )}

          {view === 'links' && (
            <LinksView
              setView={setView}
              isSupervisor={isSupervisor}
              usuarioLogado={usuario}
            />
          )}
        </main>
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
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '36px 40px',
              width: '100%',
              maxWidth: '460px',
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
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.35rem', fontWeight: '900', color: '#004D4C' }}>
                  Senha cadastrada com sucesso!
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748B' }}>
                  Bem-vindo(a) ao Portal Capitu. Acessando o painel...
                </p>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '2.6rem', marginBottom: '8px' }}>🛡️</div>
                  <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '800', color: '#004D4C' }}>
                    Primeiro Acesso: Nova Senha
                  </h3>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.86rem', color: '#64748B', lineHeight: '1.5' }}>
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

                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#64748B',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: '6px'
                    }}
                  >
                    Sair
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
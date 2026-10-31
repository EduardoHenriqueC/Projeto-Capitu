'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Telas do sistema com os caminhos atualizados
import HomeView from '../components/HomeView';
import ColinhasBoard from '@/components/ColinhasBoard';
import RegulamentosView from '@/components/RegulamentosView';
import LinksView from '@/components/LinksView';

// Estilização dedicada para cada papel (Admin, Supervisor e Operador)
const obterEstiloPapel = (papel) => {
  switch (papel) {
    case 'admin':
      return {
        rotulo: '👑 Administrador',
        corTexto: '#6D28D9',      // Roxo escuro
        corAvatar: '#7C3AED',     // Roxo vibrante
        fundoTag: '#F5F3FF',      // Fundo lilás suave
        bordaTag: '#DDD6FE',      // Borda lilás
        sombra: '0 0 12px rgba(124, 58, 237, 0.35)'
      };
    case 'supervisor':
      return {
        rotulo: '⭐ Supervisão EV',
        corTexto: '#B45309',      // Âmbar escuro
        corAvatar: '#D97706',     // Âmbar
        fundoTag: '#FFFBEB',      // Fundo amarelo suave
        bordaTag: '#FDE68A',      // Borda âmbar
        sombra: 'none'
      };
    default: // operador
      return {
        rotulo: 'Operação EV',
        corTexto: '#0F766E',      // Teal escuro
        corAvatar: '#006968',     // Teal oficial EV
        fundoTag: '#F0FDFA',      // Fundo verde água suave
        bordaTag: '#CCFBF1',      // Borda verde água
        sombra: 'none'
      };
  }
};

export default function Page() {
  const [view, setView] = useState('inicio');
  const [usuario, setUsuario] = useState(null);
  const [role, setRole] = useState('operador');
  const [carregandoAuth, setCarregandoAuth] = useState(true);

  // Estados dos Modais
  const [modalLoginAberto, setModalLoginAberto] = useState(false);
  const [modalPrimeiroAcesso, setModalPrimeiroAcesso] = useState(false);

  // Formulário de Login
  const [emailInput, setEmailInput] = useState('');
  const [senhaInput, setSenhaInput] = useState('');

  // Formulário de Nova Senha (Primeiro Acesso)
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [msgErro, setMsgErro] = useState('');

  // 1. CARREGA O PERFIL E CHECA SE PRECISA TROCAR A SENHA
  const carregarPerfilUsuario = async (userAuth) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('nome, email, avatar_url, role, precisa_trocar_senha')
        .eq('email', userAuth.email)
        .single();

      if (data) {
        setRole(data.role);
        setUsuario({
          email: data.email,
          nome: data.nome,
          avatar: data.avatar_url
        });

        if (data.precisa_trocar_senha) {
          setModalPrimeiroAcesso(true);
        } else {
          setModalPrimeiroAcesso(false);
        }
      } else {
        const nomePadrao = userAuth.email.split('@')[0].replace('.', ' ');
        const nomeFormatado = nomePadrao.charAt(0).toUpperCase() + nomePadrao.slice(1);

        setRole('operador');
        setUsuario({
          email: userAuth.email,
          nome: nomeFormatado,
          avatar: null
        });
      }
    } catch (err) {
      console.error('Erro ao ler perfil do usuário:', err);
    } finally {
      setCarregandoAuth(false);
    }
  };

  // 2. MONITORAMENTO DE SESSÃO
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        carregarPerfilUsuario(session.user);
      } else {
        setUsuario(null);
        setCarregandoAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        carregarPerfilUsuario(session.user);
      } else {
        setUsuario(null);
        setRole('operador');
        setModalPrimeiroAcesso(false);
        setCarregandoAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 3. LOGIN POR EMAIL E SENHA
  const handleLogin = async (e) => {
    e.preventDefault();
    setMsgErro('');
    setEnviando(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput.trim().toLowerCase(),
        password: senhaInput
      });

      if (error) throw error;

      if (data?.user) {
        await carregarPerfilUsuario(data.user);
        setModalLoginAberto(false);
        setEmailInput('');
        setSenhaInput('');
      }
    } catch (err) {
      setMsgErro(
        err.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : err.message
      );
    } finally {
      setEnviando(false);
    }
  };

  // 4. PRIMEIRO ACESSO: ATUALIZAR SENHA CRIPTOGRAFADA
  const handleTrocarSenhaPrimeiroAcesso = async (e) => {
    e.preventDefault();
    setMsgErro('');

    if (novaSenha.length < 6) {
      setMsgErro('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmaSenha) {
      setMsgErro('As senhas digitadas não coincidem.');
      return;
    }

    setEnviando(true);

    try {
      // Atualiza a senha no motor de autenticação (hash bcrypt)
      const { error: erroAuth } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (erroAuth) throw erroAuth;

      // Desativa a flag de troca obrigatória
      const { error: erroTabela } = await supabase
        .from('usuarios')
        .update({ precisa_trocar_senha: false })
        .eq('email', usuario.email);

      if (erroTabela) throw erroTabela;

      alert('Senha cadastrada com sucesso! Bem-vindo(a) ao Portal Capitu.');
      setModalPrimeiroAcesso(false);
      setNovaSenha('');
      setConfirmaSenha('');
    } catch (err) {
      setMsgErro('Erro ao atualizar senha: ' + err.message);
    } finally {
      setEnviando(false);
    }
  };

  // 5. LOGOUT
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Admin possui todas as permissões concedidas à Supervisão
  const isSupervisor = role === 'supervisor' || role === 'admin';

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
 {/* LOGO COM EMBLEMA E IDENTIDADE ESTANTE VIRTUAL */}
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
                backgroundColor: view === item.id ? 'var(--ev-teal-primary)' : 'transparent',
                color: view === item.id ? '#FFFFFF' : '#475569',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '9999px',
                fontWeight: '700',
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {item.icone} {item.label}
            </button>
          ))}
        </nav>

        {/* ÁREA DE PERFIL / LOGIN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {carregandoAuth ? (
            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Validando sessão...</span>
          ) : usuario ? (
            (() => {
              const estilo = obterEstiloPapel(role);
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  
                  {/* AVATAR COM A COR E SOMBRA DO CARGO */}
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

                  {/* NOME E TAG DO CARGO */}
                  <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-dark)' }}>
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

                  {/* BOTÃO SAIR */}
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
                      marginLeft: '6px'
                    }}
                  >
                    Sair
                  </button>
                </div>
              );
            })()
          ) : (
            <button
              onClick={() => {
                setModalLoginAberto(true);
                setMsgErro('');
              }}
              style={{
                backgroundColor: 'var(--ev-teal-primary)',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '9999px',
                fontSize: '0.86rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(0, 105, 104, 0.25)'
              }}
            >
              <span>👤</span> Entrar no Portal
            </button>
          )}
        </div>
      </header>

      {/* RENDERIZAÇÃO DAS TELAS DO SISTEMA */}
{/* CSS DA TRANSIÇÃO SUAVE (FADE IN + SLIDE UP) */}
<style jsx global>{`
        @keyframes surgirTela {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animacao-troca-tela {
          animation: surgirTela 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* RENDERIZAÇÃO DAS TELAS COM TRANSIÇÃO SUAVE */}
      <main key={view} className="animacao-troca-tela">
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

      {/* MODAL DE LOGIN (USUÁRIO E SENHA) */}
      {modalLoginAberto && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 30, 30, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => setModalLoginAberto(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '32px 36px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 25px 50px rgba(0, 30, 30, 0.25)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalLoginAberto(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#F1F5F9',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                color: '#64748B',
                fontWeight: '800'
              }}
            >
              ✕
            </button>

            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{ fontSize: '2.4rem', marginBottom: '6px' }}>🔑</div>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: 'var(--ev-teal-dark)' }}>
                Acesso Operacional
              </h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#64748B' }}>
                Entre com seu e-mail e senha corporativos.
              </p>
            </div>

            {msgErro && (
              <div style={{
                backgroundColor: '#FEE2E2',
                color: '#991B1B',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '600',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {msgErro}
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                  E-mail institucional:
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu_nome@magazineluiza.com.br"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.92rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                  Senha:
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={senhaInput}
                  onChange={(e) => setSenhaInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.92rem',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={enviando}
                style={{
                  backgroundColor: 'var(--ev-teal-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: '800',
                  cursor: enviando ? 'not-allowed' : 'pointer',
                  marginTop: '8px',
                  opacity: enviando ? 0.7 : 1
                }}
              >
                {enviando ? 'Entrando...' : 'Entrar no Portal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PRIMEIRO ACESSO (TROCA OBRIGATÓRIA DE SENHA) */}
      {modalPrimeiroAcesso && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '2.6rem', marginBottom: '8px' }}>🛡️</div>
              <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '800', color: 'var(--ev-teal-dark)' }}>
                Primeiro Acesso: Nova Senha
              </h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.86rem', color: '#64748B', lineHeight: '1.5' }}>
                Você está utilizando uma senha temporária. Por segurança, defina sua senha definitiva para continuar.
              </p>
            </div>

            {msgErro && (
              <div style={{
                backgroundColor: '#FEE2E2',
                color: '#991B1B',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '600',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {msgErro}
              </div>
            )}

            <form onSubmit={handleTrocarSenhaPrimeiroAcesso} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                  Nova senha (mínimo 6 caracteres):
                </label>
                <input
                  type="password"
                  required
                  placeholder="Digite sua nova senha"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.92rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                  Confirme a nova senha:
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repita a nova senha"
                  value={confirmaSenha}
                  onChange={(e) => setConfirmaSenha(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.92rem',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={enviando}
                style={{
                  backgroundColor: 'var(--ev-teal-primary)',
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
                {enviando ? 'Criptografando e salvando...' : 'Salvar Nova Senha e Acessar'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Importação de todas as telas do portal
import HomeView from '../components/HomeView';
import ColinhasBoard from '@/components/ColinhasBoard';
import RegulamentosView from '@/components/RegulamentosView';
import LinksView from '@/components/LinksView';

export default function Page() {
  // 1. ESTADO DE NAVEGAÇÃO ENTRE AS PÁGINAS
  const [view, setView] = useState('inicio');

  // 2. ESTADOS DE AUTENTICAÇÃO E PERFIL (RBAC)
  const [usuario, setUsuario] = useState(null);
  const [role, setRole] = useState('operador');
  const [carregandoAuth, setCarregandoAuth] = useState(true);

  // Estados do Modal de Login por Código (OTP)
  const [modalLoginAberto, setModalLoginAberto] = useState(false);
  const [etapaLogin, setEtapaLogin] = useState('email'); // 'email' ou 'codigo'
  const [emailInput, setEmailInput] = useState('');
  const [codigoInput, setCodigoInput] = useState('');
  const [enviandoAuth, setEnviandoAuth] = useState(false);
  const [msgErroAuth, setMsgErroAuth] = useState('');

  // 3. CONSULTA O CARGO NA TABELA 'public.usuarios'
  const carregarPerfilUsuario = async (userAuth) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('nome, email, avatar_url, role')
        .eq('email', userAuth.email)
        .single();

      if (data) {
        setRole(data.role); // 'operador', 'supervisor' ou 'admin'
        setUsuario({
          email: data.email,
          nome: data.nome,
          avatar: data.avatar_url
        });
      } else {
        // Se for o primeiro acesso e ainda não estiver na tabela, cadastra como operador
        const nomePadrao = userAuth.email.split('@')[0].replace('.', ' ');
        const nomeFormatado = nomePadrao.charAt(0).toUpperCase() + nomePadrao.slice(1);

        await supabase.from('usuarios').insert([
          {
            email: userAuth.email,
            nome: nomeFormatado,
            role: 'operador'
          }
        ]);

        setRole('operador');
        setUsuario({
          email: userAuth.email,
          nome: nomeFormatado,
          avatar: null
        });
      }
    } catch (err) {
      console.error('Erro ao buscar perfil do usuário:', err);
    } finally {
      setCarregandoAuth(false);
    }
  };

  // 4. MONITORAMENTO DA SESSÃO SUPABASE
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
        setCarregandoAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 5. ENVIO DO CÓDIGO TEMPORÁRIO PARA O E-MAIL
  const handleEnviarCodigo = async (e) => {
    e.preventDefault();
    setMsgErroAuth('');
    setEnviandoAuth(true);

    try {
      const emailLimpo = emailInput.trim().toLowerCase();

      const { error } = await supabase.auth.signInWithOtp({
        email: emailLimpo,
        options: {
          shouldCreateUser: true
        }
      });

      if (error) throw error;

      setEtapaLogin('codigo');
    } catch (err) {
      setMsgErroAuth(err.message || 'Falha ao enviar o código. Verifique o e-mail digitado.');
    } finally {
      setEnviandoAuth(false);
    }
  };

  // 6. VALIDAÇÃO DO CÓDIGO (COMPATÍVEL COM ATÉ 8 DÍGITOS)
  const handleVerificarCodigo = async (e) => {
    e.preventDefault();
    setMsgErroAuth('');
    setEnviandoAuth(true);

    try {
      const emailLimpo = emailInput.trim().toLowerCase();
      const tokenLimpo = codigoInput.trim();

      const { data, error } = await supabase.auth.verifyOtp({
        email: emailLimpo,
        token: tokenLimpo,
        type: 'email'
      });

      if (error) throw error;

      if (data?.user) {
        await carregarPerfilUsuario(data.user);
        setModalLoginAberto(false);
        setEtapaLogin('email');
        setEmailInput('');
        setCodigoInput('');
      }
    } catch (err) {
      setMsgErroAuth('Código inválido ou expirado. Tente novamente.');
    } finally {
      setEnviandoAuth(false);
    }
  };

  // 7. LOGOUT
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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
        {/* LOGO */}
        <div 
          onClick={() => setView('inicio')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{ fontWeight: '900', fontSize: '1.28rem', color: 'var(--ev-teal-dark)' }}>
            📚 Portal Capitu
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

        {/* ÁREA DE PERFIL OU BOTÃO DE LOGIN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {carregandoAuth ? (
            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Validando acesso...</span>
          ) : usuario ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: isSupervisor ? '#D97706' : 'var(--ev-teal-primary)',
                color: '#FFFFFF',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.88rem'
              }}>
                {usuario.nome ? usuario.nome.slice(0, 2).toUpperCase() : 'EV'}
              </div>

              <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-dark)' }}>
                  {usuario.nome}
                </div>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  color: isSupervisor ? '#B45309' : '#0F766E'
                }}>
                  {isSupervisor ? '⭐ Supervisão EV' : 'Operação EV'}
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Desconectar do portal"
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
          ) : (
            <button
              onClick={() => {
                setModalLoginAberto(true);
                setEtapaLogin('email');
                setMsgErroAuth('');
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

      {/* RENDERIZAÇÃO CONDICIONAL DE TODAS AS TELAS */}
      <main>
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

      {/* MODAL DE LOGIN VIA CÓDIGO (OTP) */}
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
              maxWidth: '440px',
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

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>🔐</div>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: 'var(--ev-teal-dark)' }}>
                {etapaLogin === 'email' ? 'Acesso ao Portal Capitu' : 'Confirme seu Código'}
              </h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#64748B' }}>
                {etapaLogin === 'email'
                  ? 'Informe seu e-mail institucional para receber o código temporário.'
                  : `Digite o código enviado para ${emailInput}.`}
              </p>
            </div>

            {msgErroAuth && (
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
                {msgErroAuth}
              </div>
            )}

            {/* ETAPA 1: INFORMAR E-MAIL */}
            {etapaLogin === 'email' && (
              <form onSubmit={handleEnviarCodigo} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.92rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={enviandoAuth}
                  style={{
                    backgroundColor: 'var(--ev-teal-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '800',
                    cursor: enviandoAuth ? 'not-allowed' : 'pointer',
                    marginTop: '8px',
                    opacity: enviandoAuth ? 0.7 : 1
                  }}
                >
                  {enviandoAuth ? 'Enviando código...' : 'Receber Código de Acesso →'}
                </button>
              </form>
            )}

            {/* ETAPA 2: DIGITAR CÓDIGO (ATÉ 8 DÍGITOS) */}
            {etapaLogin === 'codigo' && (
              <form onSubmit={handleVerificarCodigo} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                    Código de acesso:
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="12345678"
                    value={codigoInput}
                    onChange={(e) => setCodigoInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '1.3rem',
                      textAlign: 'center',
                      letterSpacing: '5px',
                      fontWeight: '800',
                      outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={enviandoAuth}
                  style={{
                    backgroundColor: 'var(--ev-teal-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '800',
                    cursor: enviandoAuth ? 'not-allowed' : 'pointer',
                    marginTop: '8px',
                    opacity: enviandoAuth ? 0.7 : 1
                  }}
                >
                  {enviandoAuth ? 'Validando...' : 'Confirmar e Entrar'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEtapaLogin('email');
                    setMsgErroAuth('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    marginTop: '4px'
                  }}
                >
                  Voltar e alterar e-mail
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
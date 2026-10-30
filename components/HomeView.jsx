'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function HomeView({ setView, isSupervisor, usuarioLogado }) {
  const [comunicados, setComunicados] = useState([]);
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');
  const [buscaHero, setBuscaHero] = useState('');
  
  // Modais
  const [modalPublicar, setModalPublicar] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(null);

  // Formulário de publicação (Supervisão)
  const [formAviso, setFormAviso] = useState({
    titulo: '',
    tipo: 'INFORMATIVO',
    status: 'EM ANDAMENTO',
    departamento: 'TI/FINANCEIRO',
    fixado: true,
    conteudo: ''
  });

  // 1. CARREGAR AVISOS DO MURAL
  const buscarComunicados = async () => {
    try {
      const { data, error } = await supabase
        .from('comunicados_mural')
        .select('*')
        .order('id', { ascending: false });

      if (!error && data && data.length > 0) {
        setComunicados(data);
      } else {
        setComunicados([
          {
            id: 1,
            titulo: 'Teste de integração com o banco de dados',
            tipo: 'INFORMATIVO',
            status: 'EM ANDAMENTO',
            departamento: 'TI/FINANCEIRO',
            fixado: true,
            horario: '08:17',
            autor: 'Supervisão EV',
            conteudo: 'Testando integração com o banco.'
          },
          {
            id: 2,
            titulo: 'Comunicado Urgente para Mariana!',
            tipo: 'URGENTE',
            status: 'SOLUCIONADO',
            departamento: 'TI/FINANCEIRO',
            fixado: true,
            horario: '23:17',
            autor: 'Supervisão EV',
            conteudo: 'Só queria dizer que te amo muito 💖💖💖💖💖'
          }
        ]);
      }
    } catch (err) {
      console.error('Erro ao ler avisos do mural:', err);
    }
  };

  useEffect(() => {
    buscarComunicados();

    const canal = supabase
      .channel('comunicados_mural_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comunicados_mural' }, () => {
        buscarComunicados();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const handleBuscaHero = (e) => {
    e.preventDefault();
    setView('colinhas');
  };

  const handleSalvarComunicado = async (e) => {
    e.preventDefault();
    if (!formAviso.titulo.trim() || !formAviso.conteudo.trim()) return;

    const agora = new Date();
    const horario = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const novoAviso = {
      titulo: formAviso.titulo,
      tipo: formAviso.tipo,
      status: formAviso.status,
      departamento: formAviso.departamento,
      fixado: formAviso.fixado,
      horario,
      autor: usuarioLogado?.nome ? `Supervisão EV (${usuarioLogado.nome})` : 'Supervisão EV',
      conteudo: formAviso.conteudo
    };

    try {
      const { error } = await supabase.from('comunicados_mural').insert([novoAviso]);
      if (error) {
        setComunicados([{ ...novoAviso, id: Date.now() }, ...comunicados]);
      } else {
        await buscarComunicados();
      }
      setModalPublicar(false);
      setFormAviso({
        titulo: '',
        tipo: 'INFORMATIVO',
        status: 'EM ANDAMENTO',
        departamento: 'TI/FINANCEIRO',
        fixado: true,
        conteudo: ''
      });
    } catch (err) {
      alert('Erro ao salvar comunicado: ' + err.message);
    }
  };

  const handleExcluirComunicado = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Deseja remover este comunicado do mural?')) return;

    try {
      await supabase.from('comunicados_mural').delete().eq('id', id);
      setComunicados(comunicados.filter((c) => c.id !== id));
      if (modalDetalhes?.id === id) setModalDetalhes(null);
    } catch (err) {
      console.error(err);
    }
  };

  const comunicadosFiltrados = comunicados.filter((c) => {
    if (filtroAtivo === 'Urgentes') return c.tipo === 'URGENTE';
    if (filtroAtivo === 'Fixados') return c.fixado;
    return true;
  });

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#F8F5EC' }}>
      
      {/* TRANSIÇÃO SUAVE */}
      <style jsx>{`
        @keyframes fadeMural {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animar-mural {
          animation: fadeMural 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* ========================================================
          1. HERO HEADER VERDE COMPLETO
      ======================================================== */}
      <section style={{
        backgroundColor: '#005452',
        padding: '64px 32px 70px 32px',
        textAlign: 'center',
        color: '#FFFFFF'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          
          <h1 style={{
            fontSize: '2.7rem',
            fontWeight: '900',
            margin: '0 0 12px 0',
            letterSpacing: '-0.6px'
          }}>
            Qual a leitura <span style={{ color: '#5EEAD4' }}>de hoje?</span>
          </h1>

          <p style={{
            fontSize: '1.05rem',
            color: '#CCFBF1',
            margin: '0 0 34px 0',
            fontWeight: '400'
          }}>
            Encontre rapidamente regras operacionais, colinhas e regulamentos oficiais da Estante Virtual.
          </p>

          {/* BARRA DE PESQUISA */}
          <form
            onSubmit={handleBuscaHero}
            style={{
              maxWidth: '720px',
              margin: '0 auto 40px auto',
              backgroundColor: '#FFFFFF',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              padding: '7px 8px 7px 24px',
              boxShadow: '0 8px 26px rgba(0, 35, 35, 0.22)'
            }}
          >
            <span style={{ fontSize: '1.25rem', color: '#005452', marginRight: '12px' }}>🔍</span>
            <input
              type="text"
              placeholder="Digite uma dúvida, erro, regra de frete, devolução ou PIX..."
              value={buscaHero}
              onChange={(e) => setBuscaHero(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '0.96rem',
                color: '#1E293B'
              }}
            />
            <button
              type="submit"
              style={{
                backgroundColor: '#005452',
                color: '#FFFFFF',
                border: 'none',
                padding: '11px 28px',
                borderRadius: '9999px',
                fontSize: '0.92rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#003E3C')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#005452')}
            >
              Buscar
            </button>
          </form>

          {/* CARDS DE ATALHO COM ALTURA LEVEMENTE REDUZIDA */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            textAlign: 'left'
          }}>
            
            {/* CARD COLINHAS */}
            <div
              onClick={() => setView('colinhas')}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '18px',
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                minHeight: '102px',
                boxShadow: '0 5px 16px rgba(0, 0, 0, 0.08)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.14)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 5px 16px rgba(0, 0, 0, 0.08)';
              }}
            >
              <div style={{
                backgroundColor: '#E0F2FE',
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                flexShrink: 0
              }}>
                📝
              </div>
              <div>
                <h3 style={{ margin: '0 0 3px 0', fontSize: '1.14rem', fontWeight: '800', color: '#004D4C' }}>
                  Colinhas
                </h3>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748B', lineHeight: '1.4' }}>
                  Textos prontos e máscaras para copiar e responder rápido no ticket.
                </p>
              </div>
            </div>

            {/* CARD REGULAMENTOS */}
            <div
              onClick={() => setView('regulamentos')}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '18px',
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                minHeight: '102px',
                boxShadow: '0 5px 16px rgba(0, 0, 0, 0.08)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.14)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 5px 16px rgba(0, 0, 0, 0.08)';
              }}
            >
              <div style={{
                backgroundColor: '#FEF3C7',
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                flexShrink: 0
              }}>
                📜
              </div>
              <div>
                <h3 style={{ margin: '0 0 3px 0', fontSize: '1.14rem', fontWeight: '800', color: '#004D4C' }}>
                  Regulamentos
                </h3>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748B', lineHeight: '1.4' }}>
                  Regras de negócio, prazos do CDC e políticas de plataforma.
                </p>
              </div>
            </div>

            {/* CARD LINKS ÚTEIS */}
            <div
              onClick={() => setView('links')}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '18px',
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                minHeight: '102px',
                boxShadow: '0 5px 16px rgba(0, 0, 0, 0.08)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.14)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 5px 16px rgba(0, 0, 0, 0.08)';
              }}
            >
              <div style={{
                backgroundColor: '#F1F5F9',
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                flexShrink: 0
              }}>
                🔗
              </div>
              <div>
                <h3 style={{ margin: '0 0 3px 0', fontSize: '1.14rem', fontWeight: '800', color: '#004D4C' }}>
                  Links Úteis
                </h3>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748B', lineHeight: '1.4' }}>
                  Planilhas operacionais, sistemas (NCA/Zendesk) e formulários do time.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================
          2. MURAL DE AVISOS COM FUNDO WARM PAPER (#F8F5EC)
      ======================================================== */}
      <section style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '36px 32px 80px 32px',
        backgroundColor: '#F8F5EC'
      }}>
        
        {/* CABEÇALHO DO MURAL (MARGEM INFERIOR ENCURTADA PARA SUBIR OS CARDS) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.85rem' }}>📢</span>
            <h2 style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: '900',
              color: '#005452',
              letterSpacing: '-0.3px'
            }}>
              Mural de Avisos Operacionais
            </h2>
            <span style={{
              backgroundColor: '#DCFCE7',
              color: '#166534',
              fontSize: '0.74rem',
              fontWeight: '800',
              padding: '4px 12px',
              borderRadius: '9999px',
              letterSpacing: '0.4px'
            }}>
              TEMPO REAL
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {isSupervisor && (
                <button
                  onClick={() => setModalPublicar(true)}
                  style={{
                    backgroundColor: '#004D4C',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '9999px',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(0, 77, 76, 0.2)'
                  }}
                >
                  <span>🔒</span> Publicar Comunicado (Acesso Líder)
                </button>
              )}

              <button
                onClick={() => setFiltroAtivo('Todos')}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#006968',
                  border: '1.5px solid #006968',
                  padding: '7px 18px',
                  borderRadius: '9999px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Ver todos os avisos
              </button>
            </div>

            {/* FILTROS */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {['Todos', 'Urgentes', 'Fixados'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroAtivo(f)}
                  style={{
                    padding: '4px 16px',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: filtroAtivo === f ? '#006968' : '#CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: filtroAtivo === f ? '#006968' : '#64748B',
                    fontWeight: filtroAtivo === f ? '800' : '600',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: filtroAtivo === f ? '0 1px 4px rgba(0, 105, 104, 0.15)' : 'none'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CONTAINER DO MURAL (SUBIDO MAIS PERTO DOS FILTROS) */}
        <div style={{
          position: 'relative',
          minHeight: '440px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px 0 10px 0'
        }}>

          {/* LIVROS DE FUNDO À ESQUERDA (P&B) */}
          <div style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0
          }}>
            <img
              src="/book.png"
              alt="Livro Aberto"
              style={{
                width: '135px',
                opacity: 0.35,
                filter: 'grayscale(100%) contrast(180%)'
              }}
            />
            <img
              src="/book-1.png"
              onError={(e) => { e.currentTarget.src = '/book-1.png'; }}
              alt="Livro Fechado"
              style={{
                width: '95px',
                opacity: 0.35,
                filter: 'grayscale(100%) contrast(180%)'
              }}
            />
          </div>

          {/* CARDS COM AS 4 LINHAS DE PÁGINAS ESCALONADAS */}
          <div
            key={filtroAtivo}
            className="animar-mural"
            style={{
              display: 'flex',
              gap: '36px',
              justifyContent: 'center',
              alignItems: 'stretch',
              flexWrap: 'wrap',
              zIndex: 2,
              width: '100%',
              maxWidth: '1100px'
            }}
          >
            {comunicadosFiltrados.length === 0 ? (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                padding: '50px 30px',
                textAlign: 'center',
                border: '2px dashed #CBD5E1',
                color: '#64748B',
                width: '100%',
                maxWidth: '520px'
              }}>
                Nenhum comunicado encontrado para o filtro selecionado.
              </div>
            ) : (
              comunicadosFiltrados.map((item) => {
                const isUrgente = item.tipo === 'URGENTE';
                const corCapa = isUrgente ? '#D97706' : '#00A896';
                const corFita = isUrgente ? '#C0392B' : '#005856';

                return (
                  <div
                    key={item.id}
                    onClick={() => setModalDetalhes(item)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '24px',
                      border: `3px solid ${corCapa}`,
                      borderLeft: `13px solid ${corCapa}`,
                      width: '100%',
                      maxWidth: '510px',
                      minHeight: '350px',
                      padding: '28px 30px 24px 44px',
                      position: 'relative',
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.22s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 14px 32px rgba(0, 0, 0, 0.09)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.05)';
                    }}
                  >
                    {/* FITA MARCADORA */}
                    <div style={{
                      position: 'absolute',
                      top: '-14px',
                      right: '34px',
                      width: '32px',
                      height: '52px',
                      backgroundColor: corFita,
                      borderRadius: '3px 3px 0 0',
                      boxShadow: '0 3px 6px rgba(0,0,0,0.18)',
                      clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)',
                      zIndex: 10
                    }} />

                    {/* 4 LINHAS DE PÁGINAS ESCALONADAS */}
                    <div style={{
                      position: 'absolute',
                      left: '16px',
                      top: '20px',
                      bottom: '20px',
                      display: 'flex',
                      gap: '5px',
                      pointerEvents: 'none'
                    }}>
                      <div style={{ width: '2px', backgroundColor: '#B8A89A', marginTop: '0px', borderRadius: '1px' }} />
                      <div style={{ width: '2px', backgroundColor: '#B8A89A', marginTop: '5px', borderRadius: '1px' }} />
                      <div style={{ width: '2px', backgroundColor: '#B8A89A', marginTop: '10px', borderRadius: '1px' }} />
                      <div style={{ width: '2px', backgroundColor: '#B8A89A', marginTop: '16px', borderRadius: '1px' }} />
                    </div>

                    {/* CONTEÚDO */}
                    <div>
                      {/* LINHA DE TAGS */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{
                            backgroundColor: isUrgente ? '#FEE2E2' : '#E0F2FE',
                            color: isUrgente ? '#991B1B' : '#0284C7',
                            fontSize: '0.68rem',
                            fontWeight: '800',
                            padding: '3px 9px',
                            borderRadius: '6px'
                          }}>
                            {item.tipo}
                          </span>

                          <span style={{
                            backgroundColor: item.status === 'SOLUCIONADO' ? '#DCFCE7' : '#FEF3C7',
                            color: item.status === 'SOLUCIONADO' ? '#166534' : '#92400E',
                            fontSize: '0.68rem',
                            fontWeight: '800',
                            padding: '3px 9px',
                            borderRadius: '6px'
                          }}>
                            {item.status === 'SOLUCIONADO' ? '✓ SOLUCIONADO' : '⏳ EM ANDAMENTO'}
                          </span>

                          <span style={{
                            backgroundColor: isUrgente ? '#FEF9C3' : '#CCFBF1',
                            color: isUrgente ? '#854D0E' : '#0F766E',
                            fontSize: '0.68rem',
                            fontWeight: '800',
                            padding: '3px 9px',
                            borderRadius: '6px'
                          }}>
                            {item.departamento}
                          </span>
                        </div>

                        {/* EXCLUIR */}
                        {isSupervisor && (
                          <button
                            onClick={(e) => handleExcluirComunicado(e, item.id)}
                            title="Remover aviso"
                            style={{
                              backgroundColor: '#FEE2E2',
                              color: '#DC2626',
                              border: 'none',
                              width: '22px',
                              height: '22px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '800',
                              fontSize: '0.72rem'
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* TAG FIXADO */}
                      {item.fixado && (
                        <div style={{ marginBottom: '12px' }}>
                          <span style={{
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                            fontSize: '0.68rem',
                            fontWeight: '800',
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            📌 FIXADO
                          </span>
                        </div>
                      )}

                      {/* TÍTULO */}
                      <h3 style={{
                        margin: '0 0 8px 0',
                        fontSize: '1.25rem',
                        fontWeight: '900',
                        color: '#004D4C',
                        lineHeight: '1.3'
                      }}>
                        {item.titulo}
                      </h3>

                      {/* SUBTÍTULO */}
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#64748B',
                        marginBottom: '16px',
                        fontWeight: '600'
                      }}>
                        Publicado às {item.horario} • {item.autor} • {item.departamento}
                      </div>

                      {/* TEXTO */}
                      <p style={{
                        margin: 0,
                        fontSize: '0.94rem',
                        color: '#334155',
                        lineHeight: '1.6'
                      }}>
                        {item.conteudo}
                      </p>
                    </div>

                    {/* RODAPÉ DO CARD */}
                    <div style={{
                      marginTop: '22px',
                      paddingTop: '14px',
                      borderTop: '1px dotted #CBD5E1',
                      textAlign: 'center'
                    }}>
                      <span style={{
                        color: '#006968',
                        fontSize: '0.86rem',
                        fontWeight: '800',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        Clique para ver comunicado completo 🔍
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* PILHA DE LIVROS DE FUNDO À DIREITA (P&B) */}
          <div style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0
          }}>
            <img
              src="/stack-of-books.png"
              alt="Pilha de Livros"
              style={{
                width: '160px',
                opacity: 0.35,
                filter: 'grayscale(100%) contrast(180%)'
              }}
            />
          </div>

        </div>
      </section>

      {/* MODAL DETALHES DO COMUNICADO */}
      {modalDetalhes && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 30, 30, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => setModalDetalhes(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '580px',
              padding: '36px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ backgroundColor: modalDetalhes.tipo === 'URGENTE' ? '#FEE2E2' : '#E0F2FE', color: modalDetalhes.tipo === 'URGENTE' ? '#991B1B' : '#0284C7', fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '6px' }}>
                  {modalDetalhes.tipo}
                </span>
                <span style={{ backgroundColor: '#CCFBF1', color: '#0F766E', fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '6px' }}>
                  {modalDetalhes.departamento}
                </span>
              </div>
              <button
                onClick={() => setModalDetalhes(null)}
                style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            <h2 style={{ margin: '0 0 10px 0', fontSize: '1.45rem', fontWeight: '900', color: '#004D4C' }}>
              {modalDetalhes.titulo}
            </h2>

            <div style={{ fontSize: '0.84rem', color: '#64748B', fontWeight: '600', marginBottom: '20px' }}>
              Publicado às {modalDetalhes.horario} • {modalDetalhes.autor}
            </div>

            <div style={{
              backgroundColor: '#F8FAFC',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              fontSize: '0.96rem',
              color: '#334155',
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap'
            }}>
              {modalDetalhes.conteudo}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PUBLICAR NOVO COMUNICADO */}
      {modalPublicar && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 30, 30, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => setModalPublicar(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '560px',
              padding: '32px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: '#004D4C' }}>
                📢 Publicar no Mural Operacional
              </h3>
              <button
                onClick={() => setModalPublicar(false)}
                style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarComunicado} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Título do Aviso:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Instabilidade no painel dos Correios"
                  value={formAviso.titulo}
                  onChange={(e) => setFormAviso({ ...formAviso, titulo: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.92rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Tipo de Alerta:</label>
                  <select
                    value={formAviso.tipo}
                    onChange={(e) => setFormAviso({ ...formAviso, tipo: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem', background: '#FFF' }}
                  >
                    <option value="INFORMATIVO">INFORMATIVO</option>
                    <option value="URGENTE">URGENTE</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Status Inicial:</label>
                  <select
                    value={formAviso.status}
                    onChange={(e) => setFormAviso({ ...formAviso, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem', background: '#FFF' }}
                  >
                    <option value="EM ANDAMENTO">⏳ EM ANDAMENTO</option>
                    <option value="SOLUCIONADO">✓ SOLUCIONADO</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Departamento:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TI/FINANCEIRO, LOGÍSTICA, RELACIONAMENTO"
                  value={formAviso.departamento}
                  onChange={(e) => setFormAviso({ ...formAviso, departamento: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.92rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Texto da Orientação:</label>
                <textarea
                  required
                  rows="5"
                  placeholder="Descreva a orientação operacional para o time..."
                  value={formAviso.conteudo}
                  onChange={(e) => setFormAviso({ ...formAviso, conteudo: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.9rem', outline: 'none', lineHeight: '1.5' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModalPublicar(false)}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#006968', color: '#FFFFFF', fontWeight: '800', cursor: 'pointer' }}
                >
                  Publicar Aviso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
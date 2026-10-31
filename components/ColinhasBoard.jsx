'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';

export default function ColinhasBoard({ isSupervisor, usuarioLogado }) {
  const [agente, setAgente] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas as Colinhas');
  const [termoBusca, setTermoBusca] = useState('');
  
  // Toast elegante (sucesso / erro)
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });
  
  // Modais
  const [modalAberto, setModalAberto] = useState(false);
  const [modalNota, setModalNota] = useState(null); 
  const [colinhaParaExcluir, setColinhaParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  // Referências para o Ctrl+A inteligente
  const modalContainerRef = useRef(null);
  const modalTextRef = useRef(null);

  const [formData, setFormData] = useState({
    id: null,
    t: '',
    c: '🚫 Cancelamento',
    atalho: '',
    txt: ''
  });

  const categoriasBase = [
    { id: 'Todas as Colinhas', nome: 'Todas as Colinhas', icone: '📑' },
    { id: '🗣️ Relacionamento', nome: 'Relacionamento & Finalização', icone: '🗣️' },
    { id: '📦 Rastreio', nome: 'Entrega & Rastreamento', icone: '📦' },
    { id: '⏳ Atrasos', nome: 'Atrasos & Extravios', icone: '⏳' },
    { id: '🏪 Vendedor', nome: 'Acionamento Vendedor & Standby', icone: '🏪' },
    { id: '🔄 Trocas', nome: 'Trocas, Devoluções & Avarias', icone: '🔄' },
    { id: '🚫 Cancelamento', nome: 'Cancelamento & Reembolso', icone: '🚫' },
    { id: '💳 Financeiro', nome: 'Financeiro, Pagamentos & NF', icone: '💳' },
    { id: '🔐 Cadastro', nome: 'Cadastro, Login & Segurança', icone: '🔐' },
    { id: '🛒 Plataforma', nome: 'Plataforma, Carrinho & Dúvidas', icone: '🛒' },
    { id: '📋 Máscaras Internas', nome: 'Máscaras & Registros', icone: '📋' }
  ];

  const getCor = (cat) => {
    switch (cat) {
      case '🗣️ Relacionamento': return { bg: '#F5EEF8', border: '#D7BDE2' };
      case '📋 Máscaras Internas': return { bg: '#F2F4F4', border: '#D5D8DC' };
      case '📦 Rastreio': return { bg: '#E8F8F5', border: '#A3E4D7' };
      case '⏳ Atrasos': return { bg: '#FEF9E7', border: '#F9E79F' };
      case '🏪 Vendedor': return { bg: '#FDF2E9', border: '#F5CBA7' };
      case '🔄 Trocas': return { bg: '#F9EBEA', border: '#F2D7D5' };
      case '🚫 Cancelamento': return { bg: '#FDEDEC', border: '#F5B7B1' };
      case '💳 Financeiro': return { bg: '#EAF2F8', border: '#A9CCE3' };
      case '🔐 Cadastro': return { bg: '#EAFAF1', border: '#A9DFBF' };
      case '🛒 Plataforma': return { bg: '#F4ECF7', border: '#D2B4DE' };
      default: return { bg: '#FFFFFF', border: '#CBD5E1' };
    }
  };

  const [colinhas, setColinhas] = useState([]);

  const dispararToast = (mensagem, tipo = 'sucesso') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => {
      setToast({ visivel: false, mensagem: '', tipo: 'sucesso' });
    }, 2800);
  };

  // 1. BUSCA AS COLINHAS NO BANCO DO SUPABASE
  const buscarColinhas = async () => {
    try {
      const { data, error } = await supabase
        .from('colinhas')
        .select('*')
        .order('categoria', { ascending: true })
        .order('titulo', { ascending: true });

      if (error) throw error;

      if (data) {
        setColinhas(
          data.map((item) => ({
            id: item.id,
            t: item.titulo,
            c: item.categoria,
            txt: item.conteudo,
            atalho: item.atalho || ''
          }))
        );
      }
    } catch (err) {
      console.error('Erro ao buscar colinhas no Supabase:', err);
    }
  };

  // 2. DISPARA BUSCA AO INICIAR E ATIVA REALTIME
  useEffect(() => {
    buscarColinhas();

    const canal = supabase
      .channel('colinhas_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colinhas' }, () => {
        buscarColinhas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // FOCO COM PREVENTSCROLL PARA NÃO DESLOCAR A POSIÇÃO DA PÁGINA
  useEffect(() => {
    if (modalNota && modalContainerRef.current) {
      modalContainerRef.current.focus({ preventScroll: true });
    }
  }, [modalNota]);

  useEffect(() => {
    const salvo = localStorage.getItem('capitu_agente_nome');
    if (salvo) setAgente(salvo);
    setIsMounted(true);
  }, []);

  const handleAgenteChange = (e) => {
    const valor = e.target.value;
    setAgente(valor);
    localStorage.setItem('capitu_agente_nome', valor);
  };

  const compilarTexto = (template, categoria) => {
    const nome = agente.trim();
    let final = template || '';

    if (nome) {
      final = final.replace(/{agente}/gi, nome);
      if (categoria !== '📋 Máscaras Internas' && !final.includes('Atenciosamente') && !final.includes('Liderança:')) {
        final += `\n\nAtenciosamente,\n${nome}\nEquipe Estante Virtual 💚`;
      }
    } else {
      final = final.replace(/Me chamo {agente} e /gi, '');
      final = final.replace(/Me chamo {agente}/gi, 'Aqui é da Equipe Estante Virtual');
      final = final.replace(/\n{agente}\nEquipe Estante Virtual/gi, '\nEquipe Estante Virtual');
      final = final.replace(/{agente}/gi, 'Equipe Estante Virtual');

      if (categoria !== '📋 Máscaras Internas' && !final.includes('Atenciosamente') && !final.includes('Liderança:')) {
        final += `\n\nAtenciosamente,\nEquipe Estante Virtual 💚`;
      }
    }

    return final;
  };

  const abrirModalCriar = () => {
    setFormData({ id: null, t: '', c: '🗣️ Relacionamento', atalho: '', txt: '' });
    setModalAberto(true);
  };

  const abrirModalEditar = (e, item) => {
    if (e) e.stopPropagation();
    setFormData({
      id: item.id,
      t: item.t,
      c: item.c,
      atalho: item.atalho || '',
      txt: item.txt
    });
    setModalAberto(true);
  };

  // 3. SALVAR (CRIAÇÃO OU ATUALIZAÇÃO)
  const salvarColinha = async (e) => {
    e.preventDefault();

    if (!formData.t.trim() || !formData.txt.trim()) {
      dispararToast('Por favor, preencha o título e o texto da colinha.', 'erro');
      return;
    }

    try {
      if (formData.id) {
        const { error } = await supabase
          .from('colinhas')
          .update({
            titulo: formData.t,
            categoria: formData.c,
            conteudo: formData.txt,
            atalho: formData.atalho || '',
            atualizado_em: new Date().toISOString()
          })
          .eq('id', formData.id);

        if (error) throw error;
        dispararToast('✅ Colinha atualizada com sucesso no banco!', 'sucesso');
      } else {
        const autor = (typeof usuarioLogado !== 'undefined' && usuarioLogado?.nome)
          ? usuarioLogado.nome
          : 'Supervisão EV';

        const { error } = await supabase
          .from('colinhas')
          .insert([
            {
              titulo: formData.t,
              categoria: formData.c,
              conteudo: formData.txt,
              atalho: formData.atalho || '',
              autor_nome: autor
            }
          ]);

        if (error) throw error;
        dispararToast('✨ Nova colinha cadastrada com sucesso!', 'sucesso');
      }

      setModalAberto(false);
      setFormData({ id: null, t: '', c: '🗣️ Relacionamento', atalho: '', txt: '' });
      await buscarColinhas();
    } catch (err) {
      console.error('Erro ao salvar no Supabase:', err);
      dispararToast('Falha ao salvar no banco: ' + err.message, 'erro');
    }
  };

  // 4. EXCLUIR DEFINITIVAMENTE DO SUPABASE
  const confirmarExclusao = async () => {
    if (!colinhaParaExcluir) return;

    setExcluindo(true);
    try {
      const { error } = await supabase
        .from('colinhas')
        .delete()
        .eq('id', colinhaParaExcluir.id);

      if (error) throw error;

      dispararToast(`Colinha "${colinhaParaExcluir.t}" removida!`, 'sucesso');
      setColinhaParaExcluir(null);
      await buscarColinhas();
    } catch (err) {
      console.error('Erro ao excluir no Supabase:', err);
      dispararToast('Erro ao excluir colinha: ' + err.message, 'erro');
    } finally {
      setExcluindo(false);
    }
  };

  const colinhasFiltradas = colinhas.filter((c) => {
    const bateCategoria = categoriaAtiva === 'Todas as Colinhas' || c.c === categoriaAtiva;
    const termo = termoBusca.toLowerCase().trim();
    const bateBusca =
      termo === '' ||
      c.t.toLowerCase().includes(termo) ||
      c.txt.toLowerCase().includes(termo) ||
      (c.atalho && c.atalho.toLowerCase().includes(termo));
    return bateCategoria && bateBusca;
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '36px 20px 80px 20px' }}>
      
      {/* BARRA SUPERIOR DE PESQUISA E ASSINATURA */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '16px 24px',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 2px 8px rgba(0, 77, 76, 0.05)',
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '300px' }}>
          <span style={{ fontSize: '1.25rem', color: 'var(--ev-teal-primary)' }}>🔍</span>
          <input
            type="text"
            placeholder="Pesquise por qualquer termo, atalho (/pix), regra de frete, cancelamento..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '0.98rem',
              width: '100%',
              fontWeight: '500',
              color: 'var(--text-dark)'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}>
          <label style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--ev-teal-dark)' }}>✍️ Assinatura:</label>
          <input
            type="text"
            placeholder="Ex: Mariana"
            value={agente}
            onChange={handleAgenteChange}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', width: '160px' }}
          />  

          {isSupervisor && (
            <button
              onClick={abrirModalCriar}
              style={{
                background: 'var(--ev-teal-primary)',
                color: '#FFF',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(0, 105, 104, 0.25)'
              }}
            >
              ➕ Nova
            </button>
          )}
        </div>
      </div>

      {/* LAYOUT: MENU LATERAL + CONTEÚDO */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '28px', alignItems: 'start' }}>
        
        {/* MENU LATERAL */}
        <aside style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          position: 'sticky', 
          top: '100px',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          paddingRight: '6px'
        }}>
          {categoriasBase.map((cat) => {
            const isAtiva = categoriaAtiva === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaAtiva(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: isAtiva ? '2px solid var(--ev-teal-primary)' : '1px solid transparent',
                  background: isAtiva ? 'rgba(0, 105, 104, 0.05)' : 'transparent',
                  color: isAtiva ? 'var(--ev-teal-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  fontWeight: isAtiva ? '800' : '600',
                  fontSize: '0.9rem'
                }}
              >
                <div style={{ fontSize: '1.2rem', width: '28px', textAlign: 'center' }}>{cat.icone}</div>
                <div>{cat.nome}</div>
              </button>
            );
          })}
        </aside>

        {/* ÁREA DOS CARDS */}
        <main style={{ minHeight: '600px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--ev-teal-dark)', margin: '0 0 6px 0' }}>
              {categoriaAtiva}
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {colinhasFiltradas.length} {colinhasFiltradas.length === 1 ? 'colinha disponível' : 'colinhas disponíveis'}. Clique no card para expandir ou copiar o texto.
            </p>
          </div>

          <div style={{ opacity: isMounted ? 1 : 0, transition: 'opacity 0.2s ease-in' }}>
            {isMounted && colinhasFiltradas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', background: '#FFF', borderRadius: '16px', border: '1px dashed var(--border-subtle)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📑</div>
                <p>Nenhuma colinha encontrada com o termo pesquisado.</p>
              </div>
            ) : isMounted ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
                {colinhasFiltradas.map((c) => {
                  const cores = getCor(c.c);
                  return (
                    <div
                      key={c.id}
                      onClick={() => setModalNota(c)}
                      style={{
                        backgroundColor: cores.bg,
                        border: `1px solid ${cores.border}`,
                        borderRadius: '16px',
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                        position: 'relative',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: 'rgba(0, 0, 0, 0.5)', letterSpacing: '0.5px' }}>
                          {c.c}
                        </span>

                        {isSupervisor && (
                          <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => abrirModalEditar(e, c)}
                              title="Editar Colinha"
                              style={{
                                background: '#FFFFFF',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                padding: '3px 8px',
                                fontSize: '0.74rem',
                                fontWeight: '700',
                                color: '#334155',
                                transition: 'all 0.15s'
                              }}
                            >
                              ✏️
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setColinhaParaExcluir(c);
                              }}
                              title="Excluir Colinha"
                              style={{
                                background: '#FFFFFF',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                padding: '3px 8px',
                                fontSize: '0.76rem',
                                fontWeight: '800',
                                color: '#64748B',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#FEE2E2';
                                e.currentTarget.style.color = '#DC2626';
                                e.currentTarget.style.borderColor = '#FCA5A5';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#FFFFFF';
                                e.currentTarget.style.color = '#64748B';
                                e.currentTarget.style.borderColor = '#CBD5E1';
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-dark)', fontWeight: '800' }}>{c.t}</h4>
                      
                      <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'hidden', position: 'relative' }}>
                        {compilarTexto(c.txt, c.c)}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '36px', background: `linear-gradient(transparent, ${cores.bg})` }}></div>
                      </div>

                      <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed rgba(0, 0, 0, 0.1)', textAlign: 'right', fontSize: '0.76rem', fontWeight: '700', color: 'var(--ev-teal-primary)' }}>
                        Clique para expandir nota 🔍
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </main>
      </div>

      {/* ========================================================
          MODAIS RENDERIZADOS VIA PORTAL DIRETAMENTE NO BODY
      ======================================================== */}

      {/* 1. MODAL EXPANDIDO DE LEITURA (CTRL+A INTELIGENTE) */}
      {isMounted && modalNota && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 30, 30, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setModalNota(null)}
        >
          <div
            ref={modalContainerRef}
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(modalTextRef.current);
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }}
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '720px',
              padding: '28px',
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              border: `2px solid ${getCor(modalNota.c).border}`,
              outline: 'none'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--ev-teal-primary)', letterSpacing: '0.5px' }}>
                  {modalNota.c}
                </span>
                <h3 style={{ margin: '4px 0 0 0', color: 'var(--ev-teal-dark)', fontSize: '1.35rem', fontWeight: '800' }}>
                  {modalNota.t}
                </h3>
              </div>
              <button
                onClick={() => setModalNota(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B'
                }}
              >
                ✕
              </button>
            </div>

            <div
              ref={modalTextRef}
              style={{
                background: getCor(modalNota.c).bg,
                padding: '22px',
                borderRadius: '12px',
                border: `1px solid ${getCor(modalNota.c).border}`,
                whiteSpace: 'pre-wrap',
                color: '#1E293B',
                fontSize: '0.94rem',
                lineHeight: '1.7',
                userSelect: 'text',
                overflowY: 'auto',
                flex: 1
              }}
            >
              {compilarTexto(modalNota.txt, modalNota.c)}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              <div>
                {isSupervisor && (
                  <button
                    onClick={() => {
                      const item = modalNota;
                      setModalNota(null);
                      setColinhaParaExcluir(item);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#64748B',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FEE2E2';
                      e.currentTarget.style.color = '#DC2626';
                      e.currentTarget.style.borderColor = '#FCA5A5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.color = '#64748B';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }}
                  >
                    ✕ Excluir
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {isSupervisor && (
                  <button
                    onClick={() => {
                      const item = modalNota;
                      setModalNota(null);
                      abrirModalEditar(null, item);
                    }}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#334155',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '0.86rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    ✏️ Editar Colinha
                  </button>
                )}

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(compilarTexto(modalNota.txt, modalNota.c));
                    dispararToast(`📋 Texto de "${modalNota.t}" copiado com sucesso!`, 'sucesso');
                  }}
                  style={{
                    padding: '8px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--ev-teal-primary)',
                    color: '#FFF',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '0.86rem'
                  }}
                >
                  Copiar Tudo
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. MODAL CRIAR / EDITAR */}
      {isMounted && modalAberto && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 30, 30, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '560px', padding: '28px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--ev-teal-dark)' }}>{formData.id ? '✏️ Editar Colinha' : '➕ Nova Colinha Operacional'}</h3>
            <form onSubmit={salvarColinha}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Título</label>
                <input type="text" required value={formData.t} onChange={(e) => setFormData({ ...formData, t: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Categoria</label>
                  <select value={formData.c} onChange={(e) => setFormData({ ...formData, c: e.target.value })} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF' }}>
                    {categoriasBase.filter(cat => cat.id !== 'Todas as Colinhas').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Atalho (opcional)</label>
                  <input type="text" placeholder="/exemplo" value={formData.atalho} onChange={(e) => setFormData({ ...formData, atalho: e.target.value })} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }} />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Texto da Colinha</label>
                <textarea rows="7" required value={formData.txt} onChange={(e) => setFormData({ ...formData, txt: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem', lineHeight: '1.5', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#F1F5F9', cursor: 'pointer', fontWeight: '600' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: 'var(--ev-teal-primary)', color: '#FFF', fontWeight: '700', cursor: 'pointer' }}>Salvar no Banco</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 3. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (CENTRALIZADO PERFEITAMENTE NA TELA) */}
      {isMounted && colinhaParaExcluir && createPortal(
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 20, 20, 0.7)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '420px',
            padding: '26px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#F1F5F9',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: '800',
              margin: '0 auto 12px auto'
            }}>
              ✕
            </div>
            
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-dark)', fontSize: '1.2rem', fontWeight: '800' }}>
              Remover Colinha?
            </h3>
            
            <p style={{ margin: '0 0 20px 0', color: '#64748B', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Deseja remover <strong>"{colinhaParaExcluir.t}"</strong>? Ela será excluída permanentemente do banco de dados.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                disabled={excluindo}
                onClick={() => setColinhaParaExcluir(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluindo}
                onClick={confirmarExclusao}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  cursor: excluindo ? 'not-allowed' : 'pointer',
                  opacity: excluindo ? 0.7 : 1
                }}
              >
                {excluindo ? 'Removendo...' : 'Confirmar remoção'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 4. FEEDBACK TOAST VIA PORTAL */}
      {isMounted && toast.visivel && createPortal(
        <div style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          background: toast.tipo === 'erro' ? '#991B1B' : 'var(--ev-teal-dark)',
          color: '#FFFFFF',
          padding: '13px 24px',
          borderRadius: '9999px',
          border: `1.5px solid ${toast.tipo === 'erro' ? '#FCA5A5' : 'var(--ev-turquoise)'}`,
          zIndex: 9999,
          fontWeight: '700',
          fontSize: '0.92rem',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.mensagem}
        </div>,
        document.body
      )}

    </div>
  );
}
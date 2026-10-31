'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';

export default function HomeView({ setView, isSupervisor, usuarioLogado }) {
  // 1. ESTADOS DO COMPONENTE
  const [filtroAvisos, setFiltroAvisos] = useState('todos');
  const [modalAviso, setModalAviso] = useState(null);
  const [modalPublicar, setModalPublicar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [avisos, setAvisos] = useState([]);
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });
  const [isMounted, setIsMounted] = useState(false);

  // Formulário de publicação
  const [formNovo, setFormNovo] = useState({
    titulo: '',
    tagSetor: 'TI/Financeiro',
    tipo: 'urgente',
    statusExtra: '✓ SOLUCIONADO',
    fixado: false,
    descricao: ''
  });

  const dispararToast = (mensagem, tipo = 'sucesso') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => setToast({ visivel: false, mensagem: '', tipo: 'sucesso' }), 2800);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 2. BUSCA DE AVISOS NO SUPABASE
  const buscarAvisos = async () => {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('avisos_mural')
        .select('*')
        .order('fixado', { ascending: false })
        .order('id', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatados = data.map((item) => {
          const dataCriacao = item.criado_em || item.created_at || new Date().toISOString();
          const hora = new Date(dataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          const badges = [
            {
              rotulo: item.tipo === 'urgente' ? 'URGENTE' : 'INFORMATIVO',
              bg: item.tipo === 'urgente' ? '#FEE2E2' : '#E0F2FE',
              cor: item.tipo === 'urgente' ? '#991B1B' : '#0369A1'
            }
          ];

          if (item.status_extra && item.status_extra !== 'Nenhum') {
            badges.push({
              rotulo: item.status_extra,
              bg: item.status_extra === '✓ SOLUCIONADO' ? '#DCFCE7' : item.status_extra === '⏳ EM ANDAMENTO' ? '#FEF3C7' : '#F1F5F9',
              cor: item.status_extra === '✓ SOLUCIONADO' ? '#166534' : item.status_extra === '⏳ EM ANDAMENTO' ? '#92400E' : '#334155'
            });
          }

          if (item.fixado) {
            badges.push({ rotulo: '📌 FIXADO', bg: '#E2E8F0', cor: '#334155' });
          }

          return {
            id: item.id,
            tipo: item.tipo,
            fixado: item.fixado,
            tagSetor: item.tag_setor,
            corRibbon: item.tipo === 'urgente' ? '#E05A36' : '#02807E',
            corRibbonSombra: item.tipo === 'urgente' ? '#B23A1A' : '#004D4C',
            tagBg: item.tipo === 'urgente' ? '#FEF3C7' : '#CCFBF1',
            tagColor: item.tipo === 'urgente' ? '#92400E' : '#0F766E',
            badgeStatus: badges,
            titulo: item.titulo,
            meta: `Publicado às ${hora} • ${item.autor_nome || 'Supervisão EV'} • ${item.tag_setor}`,
            descricao: item.descricao,
            borda: item.tipo === 'urgente' ? '#F59E0B' : '#14B8A6',
            fundo: item.tipo === 'urgente' ? '#FFFDF9' : '#F8FCFB'
          };
        });
        setAvisos(formatados);
      }
    } catch (err) {
      console.error('Erro ao buscar comunicados:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarAvisos();

    const canal = supabase
      .channel('avisos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'avisos_mural' }, () => {
        buscarAvisos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // 3. AÇÕES DO SUPERVISOR
  const handleSalvarAviso = async (e) => {
    e.preventDefault();
    if (!formNovo.titulo.trim() || !formNovo.descricao.trim()) {
      dispararToast('Preencha o título e a descrição.', 'erro');
      return;
    }

    try {
      const { error } = await supabase.from('avisos_mural').insert([
        {
          titulo: formNovo.titulo,
          descricao: formNovo.descricao,
          tag_setor: formNovo.tagSetor,
          tipo: formNovo.tipo,
          status_extra: formNovo.statusExtra,
          fixado: formNovo.fixado,
          autor_nome: usuarioLogado?.nome || 'Supervisão EV'
        }
      ]);

      if (error) throw error;

      await buscarAvisos();
      setModalPublicar(false);
      setFormNovo({
        titulo: '',
        tagSetor: 'TI/Financeiro',
        tipo: 'urgente',
        statusExtra: '✓ SOLUCIONADO',
        fixado: false,
        descricao: ''
      });

      dispararToast('📢 Comunicado publicado no mural!', 'sucesso');
    } catch (err) {
      console.error('Erro ao salvar no banco:', err);
      dispararToast('Erro ao salvar no banco: ' + err.message, 'erro');
    }
  };

  const handleExcluirAviso = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza de que deseja remover este comunicado do mural?')) return;

    try {
      const { error } = await supabase.from('avisos_mural').delete().eq('id', id);
      if (error) throw error;

      await buscarAvisos();
      if (modalAviso?.id === id) setModalAviso(null);
      dispararToast('🗑️ Comunicado removido com sucesso!', 'sucesso');
    } catch (err) {
      console.error('Erro ao excluir:', err);
      dispararToast('Erro ao excluir: ' + err.message, 'erro');
    }
  };

  // 4. FILTRAGEM
  const avisosFiltrados = avisos.filter((aviso) => {
    if (filtroAvisos === 'urgentes') return aviso.tipo === 'urgente';
    if (filtroAvisos === 'fixados') return aviso.fixado;
    return true;
  });

  return (
    <div style={{ backgroundColor: '#F5F3EC', minHeight: '100vh', paddingBottom: '90px', position: 'relative', overflowX: 'hidden' }}>
      
      <style>{`
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mural-cards-wrapper {
          animation: cardFadeIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .mural-btn-all {
          background-color: #FFFFFF;
          border: 1px solid #CBD5E1;
          padding: 6px 16px;
          border-radius: 9999px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
          transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .mural-btn-all:hover { transform: translateY(-1px); }
        .mural-btn-all:active { transform: scale(0.95); }

        .mural-btn-publish {
          background-color: var(--ev-teal-dark, #004D4C);
          color: #FFFFFF;
          border: 1px solid var(--ev-turquoise, #5EEAD4);
          padding: 7px 18px;
          border-radius: 9999px;
          font-size: 0.82rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 3px 8px rgba(0, 50, 50, 0.15);
          transition: all 0.2s ease;
        }
        .mural-btn-publish:hover {
          background-color: var(--ev-teal-primary, #006968);
          transform: translateY(-1px);
          box-shadow: 0 5px 14px rgba(0, 50, 50, 0.22);
        }

        .mural-filter-pill {
          padding: 5px 16px;
          border-radius: 9999px;
          border: 1.5px solid #CBD5E1;
          background-color: rgba(255, 255, 255, 0.6);
          color: #475569;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .mural-filter-pill:hover { transform: translateY(-1px); }
        .mural-filter-pill:active { transform: scale(0.95); }
        .mural-filter-pill.active {
          border-color: var(--ev-teal-primary, #006968);
          background-color: #FFFFFF;
          color: var(--ev-teal-primary, #006968);
          box-shadow: 0 3px 8px rgba(0, 105, 104, 0.12);
        }

        .mural-card-item {
          border-style: solid;
          border-top-width: 3px;
          border-right-width: 3px;
          border-bottom-width: 3px;
          border-left-width: 12px;
          border-radius: 20px;
          padding: 28px 32px 24px 32px;
          position: relative;
          box-shadow: 0 10px 26px rgba(0, 50, 50, 0.07);
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
          cursor: pointer;
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .mural-card-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 32px rgba(0, 50, 50, 0.11);
        }

        @media (max-width: 1240px) {
          .mural-book-decor { display: none !important; }
          .mural-cards-wrapper { margin: 0 auto !important; max-width: 100% !important; }
        }
      `}</style>

      {/* BANNER PRINCIPAL */}
      <div style={{
        background: 'linear-gradient(135deg, var(--ev-teal-dark, #004D4C) 0%, var(--ev-teal-primary, #006968) 70%, #017B79 100%)',
        color: '#FFFFFF',
        padding: '50px 24px 76px 24px',
        textAlign: 'center',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0, 40, 40, 0.15)'
      }}>
        <div style={{ maxWidth: '1260px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '800', letterSpacing: '-0.8px', marginBottom: '12px', color: '#FFFFFF' }}>
            Qual a leitura <span style={{ color: 'var(--ev-turquoise, #5EEAD4)' }}>de hoje?</span>
          </h1>
          <p style={{ fontSize: '1.08rem', color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.6', marginBottom: '32px' }}>
            Encontre rapidamente regras operacionais, colinhas e regulamentos oficiais da Estante Virtual.
          </p>

          <div style={{ maxWidth: '680px', margin: '0 auto 46px auto', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '20px', color: 'var(--ev-teal-primary, #006968)', fontSize: '1.25rem', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              placeholder="Digite uma dúvida, erro, regra de frete, devolução ou PIX..."
              onKeyDown={(e) => { if (e.key === 'Enter') setView('regulamentos'); }}
              style={{ width: '100%', padding: '16px 120px 16px 56px', borderRadius: '9999px', border: 'none', fontSize: '1rem', fontWeight: '500', outline: 'none', backgroundColor: '#FFFFFF', color: '#1E293B', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.16)' }}
            />
            <button
              onClick={() => setView('regulamentos')}
              style={{ position: 'absolute', right: '8px', background: 'var(--ev-teal-primary, #006968)', color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '9999px', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s ease' }}
            >
              Buscar
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', textAlign: 'left' }}>
            <div onClick={() => setView('colinhas')} style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 8px 24px rgba(0, 35, 35, 0.12)', cursor: 'pointer', transition: 'transform 0.22s ease, box-shadow 0.22s ease' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(50, 188, 163, 0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>📝</div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 3px 0', color: 'var(--ev-teal-dark, #004D4C)', fontSize: '1.05rem', fontWeight: '800' }}>Colinhas</h4>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.84rem', lineHeight: '1.45' }}>Textos prontos e máscaras para copiar e responder rápido no ticket.</p>
              </div>
            </div>

            <div onClick={() => setView('regulamentos')} style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 8px 24px rgba(0, 35, 35, 0.12)', cursor: 'pointer', transition: 'transform 0.22s ease, box-shadow 0.22s ease' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(255, 152, 0, 0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>📜</div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 3px 0', color: 'var(--ev-teal-dark, #004D4C)', fontSize: '1.05rem', fontWeight: '800' }}>Regulamentos</h4>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.84rem', lineHeight: '1.45' }}>Regras de negócio, prazos do CDC e políticas de plataforma.</p>
              </div>
            </div>

            <div onClick={() => setView('links')} style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 8px 24px rgba(0, 35, 35, 0.12)', cursor: 'pointer', transition: 'transform 0.22s ease, box-shadow 0.22s ease' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(0, 105, 104, 0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🔗</div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 3px 0', color: 'var(--ev-teal-dark, #004D4C)', fontSize: '1.05rem', fontWeight: '800' }}>Links Úteis</h4>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.84rem', lineHeight: '1.45' }}>Planilhas operacionais, sistemas (NCA/Zendesk) e formulários do time.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA DO MURAL */}
      <div style={{ maxWidth: '1420px', margin: '42px auto 0 auto', padding: '0 24px', position: 'relative' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '22px', padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.7rem' }}>📢</span>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: 'var(--ev-teal-dark, #004D4C)', letterSpacing: '-0.3px' }}>
              Mural de Avisos Operacionais
            </h2>
            <span style={{ backgroundColor: '#DCFCE7', color: '#166534', fontSize: '0.72rem', fontWeight: '800', padding: '4px 12px', borderRadius: '9999px', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              TEMPO REAL
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {isSupervisor && (
                <button onClick={() => setModalPublicar(true)} className="mural-btn-publish">
                  <span>🔐</span> Publicar Comunicado (Acesso Líder)
                </button>
              )}
              <button onClick={() => setFiltroAvisos('todos')} className="mural-btn-all" style={{ color: filtroAvisos === 'todos' ? 'var(--ev-teal-primary, #006968)' : '#64748B' }}>
                Ver todos os avisos
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'urgentes', label: 'Urgentes' },
                { id: 'fixados', label: 'Fixados' }
              ].map((f) => (
                <button key={f.id} onClick={() => setFiltroAvisos(f.id)} className={`mural-filter-pill ${filtroAvisos === f.id ? 'active' : ''}`}>{f.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* CONTAINER DO MURAL COM OS SVGS LATERAIS */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* ILUSTRAÇÃO LATERAL ESQUERDA (SVG) */}
          <div className="mural-book-decor" style={{ position: 'absolute', left: '0px', top: '50%', transform: 'translateY(-50%)', width: '135px', pointerEvents: 'none', zIndex: 1 }}>
            <svg width="135" height="260" viewBox="0 0 135 260" fill="none" stroke="#8A7B68" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="20" x2="12" y2="250" strokeWidth="2.2" />
              <line x1="12" y1="108" x2="135" y2="108" strokeWidth="2.5" />
              <rect x="24" y="24" width="22" height="84" rx="2" fill="#F8F6F0" />
              <line x1="24" y1="36" x2="46" y2="36" stroke="#8A7B68" strokeWidth="1.4" />
              <rect x="46" y="20" width="18" height="88" rx="2" fill="#F4EFE6" />
              <g transform="translate(64, 108) rotate(22) translate(0, -90)">
                <rect x="0" y="0" width="18" height="90" rx="2" fill="#F8F6F0" />
                <line x1="0" y1="18" x2="18" y2="18" stroke="#8A7B68" strokeWidth="1.4" />
                <line x1="0" y1="24" x2="18" y2="24" stroke="#8A7B68" strokeWidth="1.4" />
                <line x1="0" y1="72" x2="18" y2="72" stroke="#8A7B68" strokeWidth="1.4" />
              </g>
              <line x1="12" y1="225" x2="135" y2="225" strokeWidth="2.5" />
              <g transform="translate(18, 192)">
                <path d="M 12 0 C 4 0, 4 28, 12 28 L 98 28 C 96 20, 96 8, 98 0 Z" fill="#F8F6F0" stroke="#8A7B68" strokeWidth="2.2" />
                <path d="M 12 5 C 6 5, 6 23, 12 23" stroke="#8A7B68" strokeWidth="1.4" />
                <path d="M 20 6 L 90 6 C 88 12, 88 16, 90 22 L 20 22" fill="#F4EFE6" stroke="#8A7B68" strokeWidth="1.3" />
                <line x1="24" y1="11" x2="84" y2="11" stroke="#8A7B68" strokeWidth="1" strokeDasharray="3 2" />
                <line x1="24" y1="17" x2="84" y2="17" stroke="#8A7B68" strokeWidth="1" strokeDasharray="3 2" />
              </g>
            </svg>
          </div>

          {/* GRID DOS CARDS DO MURAL (SEM LINHAS LATERAIS E COM TEXTO CENTRALIZADO) */}
          <div key={filtroAvisos} className="mural-cards-wrapper" style={{ width: '100%', maxWidth: '1060px', margin: '0 150px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '28px', position: 'relative', zIndex: 2 }}>
            {carregando ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748B', fontWeight: '600' }}>
                📖 Carregando os comunicados do mural...
              </div>
            ) : avisosFiltrados.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748B', fontWeight: '600', background: '#FFFFFF', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
                Nenhum comunicado operacional nesta categoria.
              </div>
            ) : (
              avisosFiltrados.map((aviso) => (
                <div key={aviso.id} onClick={() => setModalAviso(aviso)} className="mural-card-item" style={{ backgroundColor: aviso.fundo, borderColor: aviso.borda }}>
                  
                  {/* FITA MARCADORA (RIBBON) */}
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '32px',
                    width: '30px',
                    height: '48px',
                    backgroundColor: aviso.corRibbon,
                    borderRadius: '3px 3px 0 0',
                    boxShadow: `0 3px 6px ${aviso.corRibbonSombra}`,
                    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)',
                    zIndex: 10
                  }} />

                  {/* TOPO COM AS BADGES E BOTÃO EXCLUIR */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '14px', paddingRight: '36px' }}>
                      {aviso.badgeStatus.map((b, idx) => (
                        <span key={idx} style={{ backgroundColor: b.bg, color: b.cor, fontSize: '0.7rem', fontWeight: '800', padding: '3px 8px', borderRadius: '6px' }}>
                          {b.rotulo}
                        </span>
                      ))}

                      <span style={{ backgroundColor: aviso.tagBg, color: aviso.tagColor, fontSize: '0.7rem', fontWeight: '800', padding: '3px 8px', borderRadius: '6px' }}>
                        {aviso.tagSetor}
                      </span>

                      {isSupervisor && (
                        <button
                          onClick={(e) => handleExcluirAviso(e, aviso.id)}
                          title="Remover comunicado"
                          style={{
                            background: '#FEE2E2',
                            color: '#DC2626',
                            border: 'none',
                            width: '22px',
                            height: '22px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '800',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: '4px'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* TÍTULO AMPLIADO E CENTRALIZADO */}
                    <h3 style={{
                      margin: '0 auto 12px auto',
                      fontSize: '1.38rem',
                      fontWeight: '900',
                      color: 'var(--ev-teal-dark, #004D4C)',
                      lineHeight: '1.35',
                      textAlign: 'center',
                      maxWidth: '94%'
                    }}>
                      {aviso.titulo}
                    </h3>

                    {/* CORPO DO TEXTO AMPLIADO E CENTRALIZADO */}
                    <p style={{
                      margin: '0 auto',
                      fontSize: '1.02rem',
                      color: '#334155',
                      lineHeight: '1.65',
                      textAlign: 'center',
                      maxWidth: '92%'
                    }}>
                      {aviso.descricao}
                    </p>
                  </div>

                  {/* RODAPÉ DO CARD */}
                  <div style={{ marginTop: '22px', paddingTop: '12px', borderTop: '1px dotted rgba(0, 0, 0, 0.15)', textAlign: 'center' }}>
                    <span style={{ color: 'var(--ev-teal-primary, #006968)', fontSize: '0.86rem', fontWeight: '800' }}>
                      Clique para ver comunicado completo 🔍
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ILUSTRAÇÃO LATERAL DIREITA (SVG) */}
          <div className="mural-book-decor" style={{ position: 'absolute', right: '0px', top: '50%', transform: 'translateY(-50%)', width: '135px', pointerEvents: 'none', zIndex: 1 }}>
            <svg width="135" height="260" viewBox="0 0 135 260" fill="none" stroke="#8A7B68" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <g transform="translate(15, 40)">
                <path d="M 10 30 L 95 10 L 105 20 L 20 40 Z" fill="#F8F6F0" />
                <path d="M 10 30 L 20 40 L 20 54 L 10 44 Z" fill="#F4EFE6" />
                <path d="M 20 40 L 105 20 L 105 34 L 20 54 Z" fill="#FFFFFF" />

                <g transform="translate(4, 28) rotate(-4)">
                  <path d="M 10 30 L 95 10 L 105 20 L 20 40 Z" fill="#F8F6F0" />
                  <path d="M 10 30 L 20 40 L 20 56 L 10 46 Z" fill="#F4EFE6" />
                  <path d="M 20 40 L 105 20 L 105 36 L 20 56 Z" fill="#FFFFFF" />
                </g>

                <g transform="translate(-2, 58) rotate(5)">
                  <path d="M 10 30 L 95 10 L 105 20 L 20 40 Z" fill="#F8F6F0" />
                  <path d="M 10 30 L 20 40 L 20 56 L 10 46 Z" fill="#F4EFE6" />
                  <path d="M 20 40 L 105 20 L 105 36 L 20 56 Z" fill="#FFFFFF" />
                </g>

                <g transform="translate(2, 90)">
                  <path d="M 10 30 L 95 10 L 105 20 L 20 40 Z" fill="#F8F6F0" />
                  <path d="M 10 30 L 20 40 L 20 60 L 10 50 Z" fill="#F4EFE6" />
                  <path d="M 20 40 L 105 20 L 105 40 L 20 60 Z" fill="#FFFFFF" />
                </g>
              </g>
            </svg>
          </div>

        </div>
      </div>

      {/* MODAL DETALHES COMPLETO (DATA NO RODAPÉ DO MODAL) */}
      {isMounted && modalAviso && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 30, 30, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setModalAviso(null)}
        >
          <div
            className="mural-modal-box"
            style={{
              backgroundColor: modalAviso.fundo,
              borderColor: modalAviso.borda,
              borderRadius: '24px',
              padding: '36px',
              width: '100%',
              maxWidth: '620px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* TOPO DO MODAL */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {modalAviso.badgeStatus.map((b, idx) => (
                  <span key={idx} style={{ backgroundColor: b.bg, color: b.cor, fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '6px' }}>
                    {b.rotulo}
                  </span>
                ))}
                <span style={{ backgroundColor: modalAviso.tagBg, color: modalAviso.tagColor, fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '6px' }}>
                  {modalAviso.tagSetor}
                </span>
              </div>
              <button onClick={() => setModalAviso(null)} style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: '800' }}>
                ✕
              </button>
            </div>

            {/* TÍTULO DO COMUNICADO */}
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.5rem', fontWeight: '900', color: 'var(--ev-teal-dark, #004D4C)' }}>
              {modalAviso.titulo}
            </h2>

            {/* CONTEÚDO DO TEXTO */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '22px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '1rem', color: '#334155', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {modalAviso.descricao}
            </div>

            {/* RODAPÉ DO MODAL COM A DATA DE PUBLICAÇÃO */}
            <div style={{
              marginTop: '18px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.84rem',
              color: '#64748B',
              fontWeight: '600'
            }}>
              <span>🕒 {modalAviso.meta}</span>
              <button
                onClick={() => setModalAviso(null)}
                style={{
                  background: 'var(--ev-teal-primary, #006968)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '7px 18px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL PUBLICAR AVISO */}
      {isMounted && modalPublicar && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 30, 30, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
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
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: 'var(--ev-teal-dark, #004D4C)' }}>
                📢 Publicar no Mural Operacional
              </h3>
              <button onClick={() => setModalPublicar(false)} style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: '800' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarAviso} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Título do Aviso:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Instabilidade no painel dos Correios"
                  value={formNovo.titulo}
                  onChange={(e) => setFormNovo({ ...formNovo, titulo: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.92rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Tipo de Alerta:</label>
                  <select
                    value={formNovo.tipo}
                    onChange={(e) => setFormNovo({ ...formNovo, tipo: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem', background: '#FFF' }}
                  >
                    <option value="urgente">URGENTE</option>
                    <option value="informativo">INFORMATIVO</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Status Inicial:</label>
                  <select
                    value={formNovo.statusExtra}
                    onChange={(e) => setFormNovo({ ...formNovo, statusExtra: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem', background: '#FFF' }}
                  >
                    <option value="⏳ EM ANDAMENTO">⏳ EM ANDAMENTO</option>
                    <option value="✓ SOLUCIONADO">✓ SOLUCIONADO</option>
                    <option value="Nenhum">Nenhum</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Setor Responsável:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: TI/Financeiro, Logística..."
                    value={formNovo.tagSetor}
                    onChange={(e) => setFormNovo({ ...formNovo, tagSetor: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.92rem', outline: 'none' }}
                  />
                </div>

                <div style={{ paddingTop: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', fontWeight: '700', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formNovo.fixado}
                      onChange={(e) => setFormNovo({ ...formNovo, fixado: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    Fixar no topo
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Texto da Orientação:</label>
                <textarea
                  required
                  rows="5"
                  placeholder="Descreva a orientação operacional para o time..."
                  value={formNovo.descricao}
                  onChange={(e) => setFormNovo({ ...formNovo, descricao: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.9rem', outline: 'none', lineHeight: '1.5' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setModalPublicar(false)} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: '700', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--ev-teal-primary, #006968)', color: '#FFFFFF', fontWeight: '800', cursor: 'pointer' }}>
                  Publicar Aviso
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* FEEDBACK TOAST */}
      {isMounted && toast.visivel && createPortal(
        <div style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          background: toast.tipo === 'erro' ? '#991B1B' : 'var(--ev-teal-dark, #004D4C)',
          color: '#FFFFFF',
          padding: '13px 24px',
          borderRadius: '9999px',
          border: `1.5px solid ${toast.tipo === 'erro' ? '#FCA5A5' : 'var(--ev-turquoise, #5EEAD4)'}`,
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
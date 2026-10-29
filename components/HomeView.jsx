'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function HomeView({ setView, isSupervisor }) {
  // 1. ESTADOS DO COMPONENTE (TODOS NO TOPO)
  const [filtroAvisos, setFiltroAvisos] = useState('todos');
  const [modalAviso, setModalAviso] = useState(null);
  const [modalPublicar, setModalPublicar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [avisos, setAvisos] = useState([]);
  const [toast, setToast] = useState({ visivel: false, mensagem: '' });

  // Estado do formulário de publicação
  const [formNovo, setFormNovo] = useState({
    titulo: '',
    tagSetor: 'TI/Financeiro',
    tipo: 'urgente',
    statusExtra: '✓ SOLUCIONADO',
    fixado: false,
    descricao: ''
  });

  // 2. FUNÇÃO PARA CARREGAR OS AVISOS DO SUPABASE
  const buscarAvisos = async () => {
    try {
      setCarregando(true);
      const { data, error } = await supabase
        .from('avisos_mural')
        .select('*')
        .order('fixado', { ascending: false })
        .order('criado_em', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatados = data.map((item) => {
          const hora = new Date(item.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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

    // Sincronização em tempo real (Realtime)
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

  // 3. AÇÕES DO SUPERVISOR (PUBLICAR E EXCLUIR)
  const handleSalvarAviso = async (e) => {
    e.preventDefault();
    if (!formNovo.titulo.trim() || !formNovo.descricao.trim()) return;

    try {
      const { error } = await supabase.from('avisos_mural').insert([
        {
          titulo: formNovo.titulo,
          descricao: formNovo.descricao,
          tag_setor: formNovo.tagSetor,
          tipo: formNovo.tipo,
          status_extra: formNovo.statusExtra,
          fixado: formNovo.fixado,
          autor_nome: 'Supervisão EV'
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

      setToast({ visivel: true, mensagem: '📢 Comunicado publicado no mural!' });
      setTimeout(() => setToast({ visivel: false, mensagem: '' }), 2600);
    } catch (err) {
      alert('Erro ao publicar: ' + err.message);
    }
  };

  const handleExcluirAviso = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza de que deseja remover este comunicado?')) return;

    try {
      const { error } = await supabase.from('avisos_mural').delete().eq('id', id);
      if (error) throw error;

      await buscarAvisos();

      if (modalAviso?.id === id) setModalAviso(null);
      setToast({ visivel: true, mensagem: '🗑️ Comunicado removido com sucesso!' });
      setTimeout(() => setToast({ visivel: false, mensagem: '' }), 2400);
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
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
          from { opacity: 0; transform: translateY(10px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
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
          background-color: var(--ev-teal-dark);
          color: #FFFFFF;
          border: 1px solid var(--ev-turquoise);
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
          background-color: var(--ev-teal-primary);
          transform: translateY(-1px);
          box-shadow: 0 5px 14px rgba(0, 50, 50, 0.22);
        }

        .mural-filter-pill {
          padding: 5px 16px;
          border-radius: 9999px;
          border: 1.5px solid #CBD5E1;
          background-color: rgba(255, 255, 255, 0.4);
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .mural-filter-pill:hover { transform: translateY(-1px); }
        .mural-filter-pill:active { transform: scale(0.95); }
        .mural-filter-pill.active {
          border-color: var(--ev-teal-primary);
          background-color: #FFFFFF;
          color: var(--ev-teal-primary);
          box-shadow: 0 3px 8px rgba(0, 105, 104, 0.12);
        }

        .mural-card-item {
          border-style: solid;
          border-top-width: 3px;
          border-right-width: 3px;
          border-bottom-width: 3px;
          border-left-width: 14px;
          border-radius: 20px;
          padding: 30px 34px 30px 58px;
          position: relative;
          box-shadow: 0 10px 26px rgba(0, 50, 50, 0.08);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .mural-card-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 32px rgba(0, 50, 50, 0.12);
        }

        .mural-modal-box {
          border-style: solid;
          border-top-width: 3px;
          border-right-width: 3px;
          border-bottom-width: 3px;
          border-left-width: 16px;
          border-radius: 24px;
          padding: 38px 44px 38px 58px;
          width: 100%;
          max-width: 820px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 25px 60px rgba(0, 30, 30, 0.35);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        @media (max-width: 1240px) {
          .mural-book-decor { display: none !important; }
          .mural-cards-wrapper { margin: 0 auto !important; max-width: 100% !important; }
        }
      `}</style>

      {/* BANNER PRINCIPAL */}
      <div style={{
        background: 'linear-gradient(135deg, var(--ev-teal-dark) 0%, var(--ev-teal-primary) 70%, #017B79 100%)',
        color: '#FFFFFF',
        padding: '50px 24px 76px 24px',
        textAlign: 'center',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0, 40, 40, 0.15)'
      }}>
        <div style={{ maxWidth: '1260px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '800', letterSpacing: '-0.8px', marginBottom: '12px', color: '#FFFFFF' }}>
            Qual a leitura <span style={{ color: 'var(--ev-turquoise)' }}>de hoje?</span>
          </h1>
          <p style={{ fontSize: '1.08rem', color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.6', marginBottom: '32px' }}>
            Encontre rapidamente regras operacionais, colinhas e regulamentos oficiais da Estante Virtual.
          </p>

          <div style={{ maxWidth: '680px', margin: '0 auto 46px auto', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '20px', color: 'var(--ev-teal-primary)', fontSize: '1.25rem', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              placeholder="Digite uma dúvida, erro, regra de frete, devolução ou PIX..."
              onKeyDown={(e) => { if (e.key === 'Enter') setView('regulamentos'); }}
              style={{ width: '100%', padding: '16px 120px 16px 56px', borderRadius: '9999px', border: 'none', fontSize: '1rem', fontWeight: '500', outline: 'none', backgroundColor: '#FFFFFF', color: 'var(--text-dark)', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.16)' }}
            />
            <button
              onClick={() => setView('regulamentos')}
              style={{ position: 'absolute', right: '8px', background: 'var(--ev-teal-primary)', color: '#FFFFFF', border: 'none', padding: '10px 24px', borderRadius: '9999px', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s ease' }}
            >
              Buscar
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', textAlign: 'left' }}>
            <div onClick={() => setView('colinhas')} style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '22px 26px', display: 'flex', alignItems: 'center', gap: '18px', boxShadow: '0 10px 28px rgba(0, 35, 35, 0.14)', cursor: 'pointer', transition: 'transform 0.22s ease, box-shadow 0.22s ease' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '14px', backgroundColor: 'rgba(50, 188, 163, 0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>📝</div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--ev-teal-dark)', fontSize: '1.05rem', fontWeight: '800' }}>Colinhas</h4>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.84rem', lineHeight: '1.45' }}>Textos prontos e máscaras para copiar e responder rápido no ticket.</p>
              </div>
            </div>

            <div onClick={() => setView('regulamentos')} style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '22px 26px', display: 'flex', alignItems: 'center', gap: '18px', boxShadow: '0 10px 28px rgba(0, 35, 35, 0.14)', cursor: 'pointer', transition: 'transform 0.22s ease, box-shadow 0.22s ease' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '14px', backgroundColor: 'rgba(255, 152, 0, 0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>📜</div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--ev-teal-dark)', fontSize: '1.05rem', fontWeight: '800' }}>Regulamentos</h4>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.84rem', lineHeight: '1.45' }}>Regras de negócio, prazos do CDC e políticas de plataforma.</p>
              </div>
            </div>

            <div onClick={() => setView('links')} style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '22px 26px', display: 'flex', alignItems: 'center', gap: '18px', boxShadow: '0 10px 28px rgba(0, 35, 35, 0.14)', cursor: 'pointer', transition: 'transform 0.22s ease, box-shadow 0.22s ease' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '14px', backgroundColor: 'rgba(0, 105, 104, 0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🔗</div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--ev-teal-dark)', fontSize: '1.05rem', fontWeight: '800' }}>Links Úteis</h4>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.84rem', lineHeight: '1.45' }}>Planilhas operacionais, sistemas (NCA/Zendesk) e formulários do time.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA DO MURAL */}
      <div style={{ maxWidth: '1420px', margin: '48px auto 0 auto', padding: '0 24px', position: 'relative' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '26px', padding: '0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.7rem' }}>📢</span>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: 'var(--ev-teal-dark)', letterSpacing: '-0.3px' }}>
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
              <button onClick={() => setFiltroAvisos('todos')} className="mural-btn-all" style={{ color: filtroAvisos === 'todos' ? 'var(--ev-teal-primary)' : 'var(--text-muted)' }}>
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

        {/* CONTAINER DO MURAL COM ILUSTRAÇÕES DECORATIVAS NAS LATERAIS */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* ILUSTRAÇÃO LATERAL ESQUERDA */}
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

          {/* GRID DOS CARDS CENTRALIZADOS */}
          <div key={filtroAvisos} className="mural-cards-wrapper" style={{ width: '100%', maxWidth: '1060px', margin: '0 150px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '28px', position: 'relative', zIndex: 2 }}>
            {carregando ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontWeight: '600' }}>
                📖 Folheando as páginas do mural...
              </div>
            ) : avisosFiltrados.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontWeight: '600' }}>
                Nenhum comunicado operacional nesta categoria.
              </div>
            ) : (
              avisosFiltrados.map((aviso) => (
                <div key={aviso.id} onClick={() => setModalAviso(aviso)} className="mural-card-item" style={{ backgroundColor: aviso.fundo, borderColor: aviso.borda }}>
                  
                  <div style={{ position: 'absolute', left: '12px', top: '16px', bottom: '16px', width: '26px', display: 'flex', gap: '4px', pointerEvents: 'none' }}>
                    <div style={{ width: '2px', height: '100%', backgroundColor: '#9E8D79', borderRadius: '1px' }} />
                    <div style={{ width: '2px', height: '98%', margin: 'auto 0', backgroundColor: '#B8A894', borderRadius: '1px' }} />
                    <div style={{ width: '2px', height: '95%', margin: 'auto 0', backgroundColor: '#C7B7A3', borderRadius: '1px' }} />
                    <div style={{ width: '2px', height: '92%', margin: 'auto 0', backgroundColor: '#D7C9B8', borderRadius: '1px' }} />
                  </div>

                  <div title={aviso.tagSetor} style={{ position: 'absolute', top: '-14px', right: '54px', width: '32px', height: '52px', backgroundColor: aviso.corRibbon, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.22))', zIndex: 5 }}>
                    <div style={{ width: '100%', height: '7px', backgroundColor: aviso.corRibbonSombra }} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingRight: '56px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {aviso.badgeStatus.map((b, idx) => (
                          <span key={idx} style={{ backgroundColor: b.bg, color: b.cor, fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '9999px', letterSpacing: '0.4px' }}>{b.rotulo}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ backgroundColor: aviso.tagBg, color: aviso.tagColor, fontSize: '0.74rem', fontWeight: '800', padding: '3px 10px', borderRadius: '8px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                          {aviso.tagSetor}
                        </span>
                        {isSupervisor && (
                          <button
                            onClick={(e) => handleExcluirAviso(e, aviso.id)}
                            title="Remover aviso do mural"
                            style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '2px 6px', fontSize: '0.75rem', fontWeight: '700' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: '800', color: 'var(--ev-teal-dark)', lineHeight: '1.35' }}>{aviso.titulo}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '16px' }}>{aviso.meta}</div>
                    <p style={{ margin: 0, fontSize: '0.94rem', color: '#334155', lineHeight: '1.65' }}>{aviso.descricao}</p>
                  </div>

                  <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px dashed rgba(0, 0, 0, 0.12)', textAlign: 'right', fontSize: '0.78rem', fontWeight: '700', color: 'var(--ev-teal-primary)' }}>
                    Clique para ver comunicado completo 🔍
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ILUSTRAÇÃO LATERAL DIREITA: TORRE DE LIVROS */}
          <div className="mural-book-decor" style={{ position: 'absolute', right: '-15px', top: '50%', transform: 'translateY(-50%)', width: '150px', pointerEvents: 'none', zIndex: 1 }}>
            <svg width="150" height="260" viewBox="0 0 150 260" fill="none" stroke="#8A7B68" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
              <g transform="translate(10, 30)">
                <g transform="translate(0, 170)">
                  <path d="M 60 40 L 125 24 L 125 4 L 60 20 Z" fill="#F4EFE6" />
                  <line x1="60" y1="25" x2="125" y2="9" strokeWidth="1.2" />
                  <line x1="60" y1="30" x2="125" y2="14" strokeWidth="1.2" />
                  <line x1="60" y1="35" x2="125" y2="19" strokeWidth="1.2" />
                  <path d="M 0 22 L 60 40 L 60 20 L 0 2 Z" fill="#E2DAC9" />
                  <path d="M 0 2 L 60 20 L 125 4 L 65 -14 Z" fill="#EAE4D5" />
                </g>
                <g transform="translate(15, 140)">
                  <path d="M 50 38 L -5 22 L -5 6 L 50 22 Z" fill="#F4EFE6" /> 
                  <line x1="50" y1="26" x2="-5" y2="10" strokeWidth="1.2" />
                  <line x1="50" y1="30" x2="-5" y2="14" strokeWidth="1.2" />
                  <line x1="50" y1="34" x2="-5" y2="18" strokeWidth="1.2" />
                  <path d="M 120 18 L 50 38 L 50 22 L 120 2 Z" fill="#EAE4D5" />
                  <path d="M 120 2 L 50 22 L -5 6 L 65 -14 Z" fill="#FAF7F0" />
                </g>
                <g transform="translate(5, 110)">
                  <path d="M 65 38 L 125 22 L 125 6 L 65 22 Z" fill="#F4EFE6" />
                  <line x1="65" y1="26" x2="125" y2="10" strokeWidth="1.2" />
                  <line x1="65" y1="30" x2="125" y2="14" strokeWidth="1.2" />
                  <line x1="65" y1="34" x2="125" y2="18" strokeWidth="1.2" />
                  <path d="M 5 22 L 65 38 L 65 22 L 5 6 Z" fill="#E2DAC9" />
                  <path d="M 5 6 L 65 22 L 125 6 L 65 -10 Z" fill="#EAE4D5" />
                </g>
                <g transform="translate(25, 80)">
                  <path d="M 50 35 L -10 20 L -10 4 L 50 19 Z" fill="#F4EFE6" />
                  <line x1="50" y1="23" x2="-10" y2="8" strokeWidth="1.2" />
                  <line x1="50" y1="27" x2="-10" y2="12" strokeWidth="1.2" />
                  <line x1="50" y1="31" x2="-10" y2="16" strokeWidth="1.2" />
                  <path d="M 110 15 L 50 35 L 50 19 L 110 -1 Z" fill="#EAE4D5" />
                  <path d="M 110 -1 L 50 19 L -10 4 L 50 -16 Z" fill="#FAF7F0" />
                </g>
                <g transform="translate(10, 50)">
                  <path d="M 70 38 L 125 22 L 125 6 L 70 22 Z" fill="#F4EFE6" />
                  <line x1="70" y1="26" x2="125" y2="10" strokeWidth="1.2" />
                  <line x1="70" y1="30" x2="125" y2="14" strokeWidth="1.2" />
                  <line x1="70" y1="34" x2="125" y2="18" strokeWidth="1.2" />
                  <path d="M 5 20 L 70 38 L 70 22 L 5 4 Z" fill="#E2DAC9" />
                  <line x1="18" y1="24" x2="18" y2="8" strokeWidth="2" />
                  <line x1="28" y1="27" x2="28" y2="11" strokeWidth="2" />
                  <line x1="38" y1="30" x2="38" y2="14" strokeWidth="2" />
                  <line x1="48" y1="33" x2="48" y2="16" strokeWidth="2" />
                  <path d="M 5 4 L 70 22 L 125 6 L 60 -12 Z" fill="#EAE4D5" />
                </g>
                <g transform="translate(35, 20)">
                  <path d="M 45 35 L -10 20 L -10 6 L 45 21 Z" fill="#F4EFE6" />
                  <line x1="45" y1="25" x2="-10" y2="10" strokeWidth="1.2" />
                  <line x1="45" y1="30" x2="-10" y2="15" strokeWidth="1.2" />
                  <path d="M 95 20 L 45 35 L 45 21 L 95 6 Z" fill="#EAE4D5" />
                  <path d="M 95 6 L 45 21 L -10 6 L 40 -9 Z" fill="#FAF7F0" />
                </g>
              </g>
            </svg>
          </div>

        </div>
      </div>

      {/* MODAL DE LEITURA COMPLETA */}
      {modalAviso && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 30, 30, 0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '24px' }} onClick={() => setModalAviso(null)}>
          <div className="mural-modal-box" style={{ backgroundColor: modalAviso.fundo, borderColor: modalAviso.borda }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ position: 'absolute', right: '15px', bottom: '15px', width: '90px', height: '150px', opacity: 0.12, pointerEvents: 'none' }}>
              <svg width="90" height="150" viewBox="0 0 150 260" fill="none" stroke="#8A7B68" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
                <g transform="translate(10, 30)">
                  <g transform="translate(0, 170)">
                    <path d="M 60 40 L 125 24 L 125 4 L 60 20 Z" fill="#F4EFE6" />
                    <path d="M 0 22 L 60 40 L 60 20 L 0 2 Z" fill="#E2DAC9" />
                    <path d="M 0 2 L 60 20 L 125 4 L 65 -14 Z" fill="#EAE4D5" />
                  </g>
                  <g transform="translate(15, 140)">
                    <path d="M 50 38 L -5 22 L -5 6 L 50 22 Z" fill="#F4EFE6" /> 
                    <path d="M 120 18 L 50 38 L 50 22 L 120 2 Z" fill="#EAE4D5" />
                    <path d="M 120 2 L 50 22 L -5 6 L 65 -14 Z" fill="#FAF7F0" />
                  </g>
                  <g transform="translate(5, 110)">
                    <path d="M 65 38 L 125 22 L 125 6 L 65 22 Z" fill="#F4EFE6" />
                    <path d="M 5 22 L 65 38 L 65 22 L 5 6 Z" fill="#E2DAC9" />
                    <path d="M 5 6 L 65 22 L 125 6 L 65 -10 Z" fill="#EAE4D5" />
                  </g>
                  <g transform="translate(25, 80)">
                    <path d="M 50 35 L -10 20 L -10 4 L 50 19 Z" fill="#F4EFE6" />
                    <path d="M 110 15 L 50 35 L 50 19 L 110 -1 Z" fill="#EAE4D5" />
                    <path d="M 110 -1 L 50 19 L -10 4 L 50 -16 Z" fill="#FAF7F0" />
                  </g>
                  <g transform="translate(10, 50)">
                    <path d="M 70 38 L 125 22 L 125 6 L 70 22 Z" fill="#F4EFE6" />
                    <path d="M 5 20 L 70 38 L 70 22 L 5 4 Z" fill="#E2DAC9" />
                    <path d="M 5 4 L 70 22 L 125 6 L 60 -12 Z" fill="#EAE4D5" />
                  </g>
                  <g transform="translate(35, 20)">
                    <path d="M 45 35 L -10 20 L -10 6 L 45 21 Z" fill="#F4EFE6" />
                    <path d="M 95 20 L 45 35 L 45 21 L 95 6 Z" fill="#EAE4D5" />
                    <path d="M 95 6 L 45 21 L -10 6 L 40 -9 Z" fill="#FAF7F0" />
                  </g>
                </g>
              </svg>
            </div>

            <div style={{ position: 'absolute', left: '14px', top: '24px', bottom: '24px', width: '24px', display: 'flex', gap: '4px', pointerEvents: 'none' }}>
              <div style={{ width: '2px', height: '100%', backgroundColor: '#9E8D79', borderRadius: '1px' }} />
              <div style={{ width: '2px', height: '98%', margin: 'auto 0', backgroundColor: '#B8A894', borderRadius: '1px' }} />
              <div style={{ width: '2px', height: '95%', margin: 'auto 0', backgroundColor: '#C7B7A3', borderRadius: '1px' }} />
              <div style={{ width: '2px', height: '92%', margin: 'auto 0', backgroundColor: '#D7C9B8', borderRadius: '1px' }} />
            </div>

            <div style={{ position: 'absolute', top: '-14px', right: '72px', width: '36px', height: '58px', backgroundColor: modalAviso.corRibbon, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))', zIndex: 5 }}>
              <div style={{ width: '100%', height: '8px', backgroundColor: modalAviso.corRibbonSombra }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '72px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {modalAviso.badgeStatus.map((b, idx) => (
                  <span key={idx} style={{ backgroundColor: b.bg, color: b.cor, fontSize: '0.76rem', fontWeight: '800', padding: '4px 12px', borderRadius: '9999px', letterSpacing: '0.5px' }}>{b.rotulo}</span>
                ))}
                <span style={{ backgroundColor: modalAviso.tagBg, color: modalAviso.tagColor, fontSize: '0.76rem', fontWeight: '800', padding: '4px 12px', borderRadius: '8px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>{modalAviso.tagSetor}</span>
              </div>

              <button onClick={() => setModalAviso(null)} style={{ position: 'absolute', top: '24px', right: '24px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', width: '38px', height: '38px', borderRadius: '50%', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', transition: 'background-color 0.2s ease, transform 0.15s ease' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.transform = 'scale(1.05)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; e.currentTarget.style.transform = 'scale(1)'; }}>✖</button>
            </div>

            <div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.65rem', fontWeight: '800', color: 'var(--ev-teal-dark)', lineHeight: '1.3' }}>{modalAviso.titulo}</h3>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: '600' }}>{modalAviso.meta}</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)', fontSize: '1.02rem', color: '#334155', lineHeight: '1.8', position: 'relative', zIndex: 2 }}>{modalAviso.descricao}</div>
          </div>
        </div>
      )}

      {/* MODAL DE PUBLICAR (LÍDER) */}
      {modalPublicar && isSupervisor && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 30, 30, 0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1400, padding: '20px' }} onClick={() => setModalPublicar(false)}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '32px 36px', width: '100%', maxWidth: '640px', boxShadow: '0 25px 50px rgba(0, 30, 30, 0.25)', border: '2px solid var(--border-subtle)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--ev-teal-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acesso Restrito ao Líder</span>
                <h3 style={{ margin: '2px 0 0 0', color: 'var(--ev-teal-dark)', fontSize: '1.4rem', fontWeight: '800' }}>📢 Novo Comunicado no Mural</h3>
              </div>
              <button type="button" onClick={() => setModalPublicar(false)} style={{ background: '#F1F5F9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <form onSubmit={handleSalvarAviso} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-dark)' }}>Título do Comunicado:</label>
                <input type="text" required placeholder="Ex: Instabilidade no Gateway de Pagamentos PIX" value={formNovo.titulo} onChange={(e) => setFormNovo({ ...formNovo, titulo: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.92rem', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-dark)' }}>Setor Envolvido:</label>
                  <select value={formNovo.tagSetor} onChange={(e) => setFormNovo({ ...formNovo, tagSetor: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem', background: '#FFF' }}>
                    <option value="TI/Financeiro">TI/Financeiro</option>
                    <option value="Logística">Logística / Correios</option>
                    <option value="Atendimento">Atendimento / CS</option>
                    <option value="Supervisão">Supervisão Geral</option>
                    <option value="Plataforma">Plataforma / Site</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-dark)' }}>Criticidade:</label>
                  <select value={formNovo.tipo} onChange={(e) => setFormNovo({ ...formNovo, tipo: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem', background: '#FFF' }}>
                    <option value="urgente">⚠️ Urgente (Borda Âmbar)</option>
                    <option value="informativo">ℹ️ Informativo (Borda Verde)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-dark)' }}>Status da Resolução:</label>
                  <select value={formNovo.statusExtra} onChange={(e) => setFormNovo({ ...formNovo, statusExtra: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem', background: '#FFF' }}>
                    <option value="✓ SOLUCIONADO">✓ SOLUCIONADO</option>
                    <option value="⏳ EM ANDAMENTO">⏳ EM ANDAMENTO</option>
                    <option value="Nenhum">Nenhum status extra</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-dark)' }}>
                    <input type="checkbox" checked={formNovo.fixado} onChange={(e) => setFormNovo({ ...formNovo, fixado: e.target.checked })} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    📌 Fixar comunicado no topo
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-dark)' }}>Conteúdo e Orientações Operacionais:</label>
                <textarea required rows="4" placeholder="Escreva os detalhes operacionais..." value={formNovo.descricao} onChange={(e) => setFormNovo({ ...formNovo, descricao: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.9rem', lineHeight: '1.5', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalPublicar(false)} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--ev-teal-primary)', color: '#FFFFFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 105, 104, 0.25)' }}>Publicar Comunicado</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST DE FEEDBACK FLUTUANTE */}
      {toast.visivel && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: 'var(--ev-teal-dark)', color: '#FFFFFF', padding: '12px 22px', borderRadius: '9999px', border: '1px solid var(--ev-turquoise)', zIndex: 1500, fontWeight: '700', boxShadow: '0 6px 16px rgba(0, 50, 50, 0.25)' }}>
          {toast.mensagem}
        </div>
      )}

    </div>
  );
}
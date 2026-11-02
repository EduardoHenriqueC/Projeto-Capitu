'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';

const EMOJIS_PADRAO = ['👍', '❤️', '👏', '😂', '🎉', '💡'];

export default function HomeView({ setView, isSupervisor, usuarioLogado }) {
  const [filtroAvisos, setFiltroAvisos] = useState('todos');
  const [modalAviso, setModalAviso] = useState(null);
  const [modalPublicar, setModalPublicar] = useState(false);
  const [avisoEmEdicao, setAvisoEmEdicao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [avisos, setAvisos] = useState([]);
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });
  const [isMounted, setIsMounted] = useState(false);
  const [pickerAbertoId, setPickerAbertoId] = useState(null);

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

  // FECHAMENTO INTELIGENTE: Só fecha ao clicar genuinamente fora da área de reações
  useEffect(() => {
    setIsMounted(true);

    const handleClickFora = (e) => {
      if (e.target.closest && e.target.closest('.mural-reacoes-container')) {
        return; // Não fecha se o clique foi no botão ou num emoji
      }
      setPickerAbertoId(null);
    };

    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const agruparReacoes = (reacoesLista = [], usuario = null) => {
    const mapa = {};
    reacoesLista.forEach((r) => {
      if (!mapa[r.emoji]) {
        mapa[r.emoji] = [];
      }
      if (!mapa[r.emoji].includes(r.user_nome)) {
        mapa[r.emoji].push(r.user_nome || 'Operador');
      }
    });

    return Object.entries(mapa).map(([emoji, nomes]) => {
      const jaReagiu = reacoesLista.some(
        (r) => r.emoji === emoji && (r.user_id === usuario?.id || r.user_nome === usuario?.nome)
      );
      return {
        emoji,
        total: nomes.length,
        nomes: nomes,
        jaReagiu
      };
    });
  };

  // BUSCA DE AVISOS E REAÇÕES NO BANCO
  const buscarAvisos = async () => {
    try {
      setCarregando(true);
      const { data: avisosData, error: errAvisos } = await supabase
        .from('avisos_mural')
        .select('*')
        .order('fixado', { ascending: false })
        .order('id', { ascending: false });

      if (errAvisos) throw errAvisos;

      let reacoesData = [];
      try {
        const { data: rData, error: errReacoes } = await supabase
          .from('reacoes_mural')
          .select('*');
        if (!errReacoes && rData) {
          reacoesData = rData;
        }
      } catch (errR) {
        console.warn('Tabela reacoes_mural ainda não criada:', errR);
      }

      if (avisosData) {
        const formatados = avisosData.map((item) => {
          const dataCriacao = item.criado_em || item.created_at || new Date().toISOString();
          const hora = new Date(dataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          const badges = [
            {
              rotulo: item.tipo === 'urgente' ? 'URGENTE' : 'INFORMATIVO',
              bg: item.tipo === 'urgente' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(56, 189, 248, 0.18)',
              cor: item.tipo === 'urgente' ? '#F87171' : '#38BDF8'
            }
          ];

          if (item.status_extra && item.status_extra !== 'Nenhum') {
            badges.push({
              rotulo: item.status_extra,
              bg: item.status_extra === '✓ SOLUCIONADO' ? 'rgba(34, 197, 94, 0.18)' : 'rgba(234, 179, 8, 0.18)',
              cor: item.status_extra === '✓ SOLUCIONADO' ? '#4ADE80' : '#FDE047'
            });
          }

          if (item.fixado) {
            badges.push({ rotulo: '📌 FIXADO', bg: 'rgba(148, 163, 184, 0.2)', cor: '#CBD5E1' });
          }

          const reacoesDoAviso = reacoesData.filter((r) => String(r.aviso_id) === String(item.id));

          return {
            id: item.id,
            tipo: item.tipo,
            fixado: item.fixado,
            tagSetor: item.tag_setor,
            statusExtra: item.status_extra || 'Nenhum',
            corRibbon: item.tipo === 'urgente' ? '#EF4444' : '#0D9488',
            corRibbonSombra: 'rgba(0, 0, 0, 0.4)',
            tagBg: 'rgba(45, 212, 191, 0.15)',
            tagColor: '#2DD4BF',
            badgeStatus: badges,
            titulo: item.titulo,
            meta: `Publicado às ${hora} • ${item.autor_nome || 'Supervisão EV'} • ${item.tag_setor}`,
            descricao: item.descricao,
            borda: item.tipo === 'urgente' ? '#DC2626' : '#0D9488',
            reacoesBrutas: reacoesDoAviso,
            reacoesAgrupadas: agruparReacoes(reacoesDoAviso, usuarioLogado)
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
      .channel('avisos_e_reacoes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'avisos_mural' }, () => {
        buscarAvisos();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reacoes_mural' }, () => {
        buscarAvisos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // REAÇÃO / DES-REAÇÃO INSTANTÂNEA
  const handleToggleReacao = async (avisoId, emoji) => {
    if (!usuarioLogado?.id) {
      dispararToast('Você precisa estar autenticado para reagir.', 'erro');
      return;
    }

    const aviso = avisos.find((a) => a.id === avisoId);
    const reacaoExistente = aviso?.reacoesBrutas?.find(
      (r) =>
        String(r.aviso_id) === String(avisoId) &&
        (r.user_id === usuarioLogado.id || r.user_nome === usuarioLogado.nome) &&
        r.emoji === emoji
    );

    // Atualização otimista na tela (0 ms)
    setAvisos((prevAvisos) =>
      prevAvisos.map((a) => {
        if (a.id !== avisoId) return a;
        let novasReacoesBrutas;
        if (reacaoExistente) {
          novasReacoesBrutas = a.reacoesBrutas.filter((r) => r.id !== reacaoExistente.id);
        } else {
          novasReacoesBrutas = [
            ...a.reacoesBrutas,
            {
              id: 'temp-' + Date.now(),
              aviso_id: avisoId,
              user_id: usuarioLogado.id,
              user_nome: usuarioLogado.nome || 'Operador',
              emoji: emoji
            }
          ];
        }
        return {
          ...a,
          reacoesBrutas: novasReacoesBrutas,
          reacoesAgrupadas: agruparReacoes(novasReacoesBrutas, usuarioLogado)
        };
      })
    );

    try {
      if (reacaoExistente) {
        const { error } = await supabase
          .from('reacoes_mural')
          .delete()
          .eq('aviso_id', avisoId)
          .eq('emoji', emoji)
          .eq('user_id', usuarioLogado.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reacoes_mural')
          .insert([
            {
              aviso_id: avisoId,
              user_id: usuarioLogado.id,
              user_nome: usuarioLogado.nome || 'Operador',
              emoji: emoji
            }
          ]);

        if (error) throw error;
      }
    } catch (err) {
      console.error('Erro ao atualizar reação:', err);
      dispararToast('Erro ao registrar reação: ' + err.message, 'erro');
      await buscarAvisos();
    }
  };

  // ABERTURA DE MODAL (CRIAR E EDITAR)
  const handleAbrirCriar = () => {
    setAvisoEmEdicao(null);
    setFormNovo({
      titulo: '',
      tagSetor: 'TI/Financeiro',
      tipo: 'urgente',
      statusExtra: '✓ SOLUCIONADO',
      fixado: false,
      descricao: ''
    });
    setModalPublicar(true);
  };

  const handleAbrirEditarAviso = (e, aviso) => {
    if (e) e.stopPropagation();
    setAvisoEmEdicao(aviso.id);
    setFormNovo({
      titulo: aviso.titulo,
      tagSetor: aviso.tagSetor,
      tipo: aviso.tipo,
      statusExtra: aviso.statusExtra || 'Nenhum',
      fixado: Boolean(aviso.fixado),
      descricao: aviso.descricao
    });
    setModalPublicar(true);
  };

  const handleSalvarAviso = async (e) => {
    e.preventDefault();
    if (!formNovo.titulo.trim() || !formNovo.descricao.trim()) {
      dispararToast('Preencha o título e a descrição.', 'erro');
      return;
    }

    try {
      if (avisoEmEdicao) {
        const { error } = await supabase
          .from('avisos_mural')
          .update({
            titulo: formNovo.titulo.trim(),
            descricao: formNovo.descricao.trim(),
            tag_setor: formNovo.tagSetor.trim(),
            tipo: formNovo.tipo,
            status_extra: formNovo.statusExtra,
            fixado: formNovo.fixado
          })
          .eq('id', avisoEmEdicao);

        if (error) throw error;
        dispararToast('✅ Comunicado atualizado com sucesso!', 'sucesso');
      } else {
        const autor = usuarioLogado?.nome ? `Supervisão EV (${usuarioLogado.nome})` : 'Supervisão EV';
        const { error } = await supabase.from('avisos_mural').insert([
          {
            titulo: formNovo.titulo.trim(),
            descricao: formNovo.descricao.trim(),
            tag_setor: formNovo.tagSetor.trim(),
            tipo: formNovo.tipo,
            status_extra: formNovo.statusExtra,
            fixado: formNovo.fixado,
            autor_nome: autor
          }
        ]);

        if (error) throw error;
        dispararToast('📢 Comunicado publicado no mural!', 'sucesso');
      }

      await buscarAvisos();
      setModalPublicar(false);
      setAvisoEmEdicao(null);
      setFormNovo({
        titulo: '',
        tagSetor: 'TI/Financeiro',
        tipo: 'urgente',
        statusExtra: '✓ SOLUCIONADO',
        fixado: false,
        descricao: ''
      });
    } catch (err) {
      console.error('Erro ao salvar no banco:', err);
      dispararToast('Erro ao salvar no banco: ' + err.message, 'erro');
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
      dispararToast('🗑️ Comunicado removido com sucesso!', 'sucesso');
    } catch (err) {
      console.error('Erro ao excluir:', err);
      dispararToast('Erro ao excluir: ' + err.message, 'erro');
    }
  };

  const avisosFiltrados = avisos.filter((aviso) => {
    if (filtroAvisos === 'urgentes') return aviso.tipo === 'urgente';
    if (filtroAvisos === 'fixados') return aviso.fixado;
    return true;
  });

  return (
    <div style={{ backgroundColor: 'var(--bg-mural-page, #F5F3EC)', minHeight: '100vh', paddingBottom: '90px', position: 'relative', overflowX: 'hidden' }}>
      
      <style>{`
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mural-cards-wrapper {
          animation: cardFadeIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .mural-btn-all {
          background-color: var(--bg-card, #FFFFFF);
          border: 1px solid var(--border-card, #CBD5E1);
          color: var(--texto-secundario, #475569);
          padding: 6px 16px;
          border-radius: 9999px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .mural-btn-all:hover { transform: translateY(-1px); }

        .mural-filter-pill {
          padding: 5px 16px;
          border-radius: 9999px;
          border: 1.5px solid var(--border-card, #CBD5E1);
          background-color: var(--bg-card, rgba(255, 255, 255, 0.6));
          color: var(--texto-secundario, #475569);
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .mural-filter-pill.active {
          border-color: #2DD4BF;
          background-color: var(--bg-card, #FFFFFF);
          color: #2DD4BF;
          box-shadow: 0 3px 8px rgba(45, 212, 191, 0.15);
        }

        .mural-card-item {
          background-color: var(--bg-card, #FFFFFF);
          border-style: solid;
          border-top-width: 1.5px;
          border-right-width: 1.5px;
          border-bottom-width: 1.5px;
          border-left-width: 10px;
          border-radius: 20px;
          padding: 28px 32px 24px 32px;
          position: relative;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
          cursor: pointer;
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .mural-card-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.14);
        }

        .btn-emoji-opcao:hover {
          transform: scale(1.25);
          background-color: var(--bg-item-aberto, #F1F5F9);
        }

        [data-theme="dark"] .mural-book-decor svg line,
        [data-theme="dark"] .mural-book-decor svg path,
        [data-theme="dark"] .mural-book-decor svg rect {
          stroke: #1E3545 !important;
          fill: #0F1E27 !important;
        }
      `}</style>

      {/* BANNER PRINCIPAL */}
      <div style={{
        background: 'linear-gradient(135deg, #004D4C 0%, #006968 70%, #017B79 100%)',
        color: '#FFFFFF',
        padding: '50px 24px 76px 24px',
        textAlign: 'center',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0, 40, 40, 0.15)'
      }}>
        <div style={{ maxWidth: '1260px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '800', letterSpacing: '-0.8px', marginBottom: '12px', color: '#FFFFFF' }}>
            Qual a leitura <span style={{ color: '#5EEAD4' }}>de hoje?</span>
          </h1>
          <p style={{ fontSize: '1.08rem', color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.6', marginBottom: '32px' }}>
            Encontre rapidamente regras operacionais, colinhas e regulamentos oficiais da Estante Virtual.
          </p>

          <div style={{ maxWidth: '680px', margin: '0 auto 46px auto', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '20px', color: '#2DD4BF', fontSize: '1.25rem', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              placeholder="Digite uma dúvida, erro, regra de frete, devolução ou PIX..."
              onKeyDown={(e) => { if (e.key === 'Enter') setView('regulamentos'); }}
              style={{
                width: '100%',
                padding: '16px 120px 16px 56px',
                borderRadius: '9999px',
                border: '1.5px solid var(--border-search, #CBD5E1)',
                fontSize: '1rem',
                fontWeight: '500',
                outline: 'none',
                backgroundColor: 'var(--bg-search, #FFFFFF)',
                color: 'var(--text-search, #1E293B)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.16)'
              }}
            />
            <button
              onClick={() => setView('regulamentos')}
              style={{
                position: 'absolute',
                right: '8px',
                background: '#006968',
                color: '#FFFFFF',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '9999px',
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Buscar
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', textAlign: 'left' }}>
            <div onClick={() => setView('colinhas')} style={{ backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-card, transparent)', borderRadius: '18px', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)', cursor: 'pointer' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(45, 212, 191, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>📝</div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 3px 0', color: 'var(--texto-titulo-verde)', fontSize: '1.05rem', fontWeight: '800' }}>Colinhas</h4>
                <p style={{ margin: 0, color: 'var(--texto-secundario)', fontSize: '0.84rem', lineHeight: '1.45' }}>Textos prontos e máscaras para copiar e responder rápido no ticket.</p>
              </div>
            </div>

            <div onClick={() => setView('regulamentos')} style={{ backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-card, transparent)', borderRadius: '18px', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)', cursor: 'pointer' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(255, 152, 0, 0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>📜</div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 3px 0', color: 'var(--texto-titulo-verde)', fontSize: '1.05rem', fontWeight: '800' }}>Regulamentos</h4>
                <p style={{ margin: 0, color: 'var(--texto-secundario)', fontSize: '0.84rem', lineHeight: '1.45' }}>Regras de negócio, prazos do CDC e políticas de plataforma.</p>
              </div>
            </div>

            <div onClick={() => setView('links')} style={{ backgroundColor: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-card, transparent)', borderRadius: '18px', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)', cursor: 'pointer' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(0, 105, 104, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🔗</div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 3px 0', color: 'var(--texto-titulo-verde)', fontSize: '1.05rem', fontWeight: '800' }}>Links Úteis</h4>
                <p style={{ margin: 0, color: 'var(--texto-secundario)', fontSize: '0.84rem', lineHeight: '1.45' }}>Planilhas operacionais, sistemas (NCA/Zendesk) e formulários do time.</p>
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
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: 'var(--texto-primario)', letterSpacing: '-0.3px' }}>
              Mural de Avisos Operacionais
            </h2>
            <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ADE80', fontSize: '0.72rem', fontWeight: '800', padding: '4px 12px', borderRadius: '9999px', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
              TEMPO REAL
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {isSupervisor && (
                <button
                  onClick={handleAbrirCriar}
                  style={{
                    backgroundColor: '#006968',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '7px 18px',
                    borderRadius: '9999px',
                    fontSize: '0.82rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>🔐</span> Publicar Comunicado
                </button>
              )}
              <button onClick={() => setFiltroAvisos('todos')} className="mural-btn-all">
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

        {/* CONTAINER DO MURAL COM ILUSTRAÇÕES DECORATIVAS E ALTURA MÍNIMA */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '320px' }}>
          
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

          <div key={filtroAvisos} className="mural-cards-wrapper" style={{ width: '100%', maxWidth: '1060px', margin: '0 150px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '28px', position: 'relative', zIndex: 2 }}>
            {carregando ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)', fontWeight: '600' }}>
                📖 Carregando os comunicados do mural...
              </div>
            ) : avisosFiltrados.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)', background: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border-card)' }}>
                Nenhum comunicado operacional nesta categoria.
              </div>
            ) : (
              avisosFiltrados.map((aviso) => (
                <div
                  key={aviso.id}
                  onClick={() => setModalAviso(aviso)}
                  className="mural-card-item"
                  style={{
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    borderLeftColor: aviso.borda,
                    borderTopColor: 'var(--border-card, #E2E8F0)',
                    borderRightColor: 'var(--border-card, #E2E8F0)',
                    borderBottomColor: 'var(--border-card, #E2E8F0)'
                  }}
                >
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

                  <div>
                    {/* CABEÇALHO DO CARD COM BADGES E AÇÕES DE SUPERVISOR */}
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
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginLeft: '4px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleAbrirEditarAviso(e, aviso)}
                            title="Editar comunicado"
                            style={{
                              background: 'rgba(45, 212, 191, 0.15)',
                              color: '#2DD4BF',
                              border: 'none',
                              width: '24px',
                              height: '24px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '800',
                              fontSize: '0.74rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => handleExcluirAviso(e, aviso.id)}
                            title="Remover comunicado"
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#F87171',
                              border: 'none',
                              width: '24px',
                              height: '24px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '800',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 style={{ margin: '0 auto 14px auto', fontSize: '1.38rem', fontWeight: '900', color: 'var(--texto-primario)', lineHeight: '1.35', textAlign: 'center', maxWidth: '94%' }}>
                      {aviso.titulo}
                    </h3>
                    <p style={{ margin: '0 auto', fontSize: '1.02rem', color: 'var(--texto-secundario)', lineHeight: '1.65', textAlign: 'center', maxWidth: '92%' }}>
                      {aviso.descricao}
                    </p>
                  </div>

                  {/* BARRA DE REAÇÕES SOCIAIS */}
                  <div
                    className="mural-reacoes-container"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                      marginTop: '18px',
                      position: 'relative'
                    }}
                  >
                    {/* Botões de reações já computadas com lista de nomes no hover */}
                    {aviso.reacoesAgrupadas.map((r) => (
                      <button
                        key={r.emoji}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleReacao(aviso.id, r.emoji);
                        }}
                        title={r.nomes.join(', ')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          border: r.jaReagiu
                            ? '1.5px solid #2DD4BF'
                            : '1px solid var(--border-card, #CBD5E1)',
                          backgroundColor: r.jaReagiu
                            ? 'rgba(45, 212, 191, 0.18)'
                            : 'var(--bg-card, #FFFFFF)',
                          color: r.jaReagiu ? '#2DD4BF' : 'var(--texto-primario, #1E293B)',
                          fontSize: '0.84rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{r.emoji}</span>
                        <span style={{ fontSize: '0.78rem' }}>{r.total}</span>
                      </button>
                    ))}

                    {/* Botão para abrir o seletor de emojis */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPickerAbertoId((prev) => (String(prev) === String(aviso.id) ? null : aviso.id));
                      }}
                      title="Adicionar reação"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        border: '1px dashed var(--border-card, #CBD5E1)',
                        backgroundColor: 'transparent',
                        color: 'var(--texto-secundario, #64748B)',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{aviso.reacoesAgrupadas.length === 0 ? '😃 Reagir' : '➕'}</span>
                    </button>

                    {/* Menu flutuante de emojis */}
                    {String(pickerAbertoId) === String(aviso.id) && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          bottom: 'calc(100% + 10px)',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'var(--bg-card, #FFFFFF)',
                          border: '1.5px solid var(--border-card, #CBD5E1)',
                          borderRadius: '9999px',
                          padding: '4px 8px',
                          boxShadow: '0 10px 28px rgba(0, 0, 0, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          zIndex: 100,
                          whiteSpace: 'nowrap',
                          animation: 'cardFadeIn 0.15s ease'
                        }}
                      >
                        {EMOJIS_PADRAO.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleReacao(aviso.id, emoji);
                              setPickerAbertoId(null);
                            }}
                            className="btn-emoji-opcao"
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: '1.3rem',
                              cursor: 'pointer',
                              padding: '4px 6px',
                              borderRadius: '50%',
                              lineHeight: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'transform 0.15s ease, background-color 0.15s ease'
                            }}
                            title={`Reagir com ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dotted var(--border-card)', textAlign: 'center' }}>
                    <span style={{ color: '#2DD4BF', fontSize: '0.86rem', fontWeight: '800' }}>Clique para ver comunicado completo 🔍</span>
                  </div>
                </div>
              ))
            )}
          </div>

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

      {/* MODAL DETALHES COMPLETO */}
      {isMounted && modalAviso && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 20, 20, 0.75)',
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
            style={{
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-card, #E2E8F0)',
              borderRadius: '24px',
              padding: '36px',
              width: '100%',
              maxWidth: '620px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.35)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
              <button
                onClick={() => setModalAviso(null)}
                style={{
                  background: 'var(--border-card)',
                  color: 'var(--texto-primario)',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontWeight: '800'
                }}
              >
                ✕
              </button>
            </div>

            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.5rem', fontWeight: '900', color: 'var(--texto-primario)' }}>
              {modalAviso.titulo}
            </h2>

            <div style={{ backgroundColor: 'var(--bg-subconteudo)', padding: '22px', borderRadius: '12px', border: '1px solid var(--border-card)', fontSize: '1rem', color: 'var(--texto-secundario)', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {modalAviso.descricao}
            </div>

            <div style={{
              marginTop: '18px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-card)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.84rem',
              color: 'var(--texto-secundario)',
              fontWeight: '600'
            }}>
              <span>🕒 {modalAviso.meta}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {isSupervisor && (
                  <button
                    onClick={() => {
                      const item = modalAviso;
                      setModalAviso(null);
                      handleAbrirEditarAviso(null, item);
                    }}
                    style={{
                      background: 'transparent',
                      color: 'var(--texto-primario)',
                      border: '1px solid var(--border-card)',
                      padding: '7px 16px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Editar
                  </button>
                )}
                <button
                  onClick={() => setModalAviso(null)}
                  style={{
                    background: '#006968',
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
          </div>
        </div>,
        document.body
      )}

      {/* MODAL PUBLICAR / EDITAR AVISO */}
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
          onClick={() => {
            setModalPublicar(false);
            setAvisoEmEdicao(null);
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-card, #E2E8F0)',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '560px',
              padding: '32px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: 'var(--texto-titulo-verde)' }}>
                {avisoEmEdicao ? '✏️ Editar Comunicado Operacional' : '📢 Publicar no Mural Operacional'}
              </h3>
              <button
                onClick={() => {
                  setModalPublicar(false);
                  setAvisoEmEdicao(null);
                }}
                style={{ background: 'var(--border-card)', color: 'var(--texto-primario)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarAviso} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: 'var(--texto-secundario)' }}>Título do Aviso:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Instabilidade no painel dos Correios"
                  value={formNovo.titulo}
                  onChange={(e) => setFormNovo({ ...formNovo, titulo: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border-search, #CBD5E1)', background: 'var(--bg-input, #F8FAFC)', color: 'var(--texto-primario)', fontSize: '0.92rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: 'var(--texto-secundario)' }}>Tipo de Alerta:</label>
                  <select
                    value={formNovo.tipo}
                    onChange={(e) => setFormNovo({ ...formNovo, tipo: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border-search, #CBD5E1)', background: 'var(--bg-input, #F8FAFC)', color: 'var(--texto-primario)', fontSize: '0.88rem' }}
                  >
                    <option value="urgente">URGENTE</option>
                    <option value="informativo">INFORMATIVO</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: 'var(--texto-secundario)' }}>Status Inicial:</label>
                  <select
                    value={formNovo.statusExtra}
                    onChange={(e) => setFormNovo({ ...formNovo, statusExtra: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border-search, #CBD5E1)', background: 'var(--bg-input, #F8FAFC)', color: 'var(--texto-primario)', fontSize: '0.88rem' }}
                  >
                    <option value="⏳ EM ANDAMENTO">⏳ EM ANDAMENTO</option>
                    <option value="✓ SOLUCIONADO">✓ SOLUCIONADO</option>
                    <option value="Nenhum">Nenhum</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: 'var(--texto-secundario)' }}>Setor Responsável:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: TI/Financeiro, Logística..."
                    value={formNovo.tagSetor}
                    onChange={(e) => setFormNovo({ ...formNovo, tagSetor: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border-search, #CBD5E1)', background: 'var(--bg-input, #F8FAFC)', color: 'var(--texto-primario)', fontSize: '0.92rem', outline: 'none' }}
                  />
                </div>

                <div style={{ paddingTop: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', fontWeight: '700', color: 'var(--texto-secundario)', cursor: 'pointer' }}>
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
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: 'var(--texto-secundario)' }}>Texto da Orientação:</label>
                <textarea
                  required
                  rows="5"
                  placeholder="Descreva a orientação operacional para o time..."
                  value={formNovo.descricao}
                  onChange={(e) => setFormNovo({ ...formNovo, descricao: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid var(--border-search, #CBD5E1)', background: 'var(--bg-input, #F8FAFC)', color: 'var(--texto-primario)', fontSize: '0.9rem', outline: 'none', lineHeight: '1.5' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setModalPublicar(false);
                    setAvisoEmEdicao(null);
                  }}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--border-card)', backgroundColor: 'transparent', color: 'var(--texto-secundario)', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#006968', color: '#FFFFFF', fontWeight: '800', cursor: 'pointer' }}
                >
                  {avisoEmEdicao ? 'Salvar Alterações' : 'Publicar Aviso'}
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
          background: toast.tipo === 'erro' ? '#991B1B' : '#004D4C',
          color: '#FFFFFF',
          padding: '13px 24px',
          borderRadius: '9999px',
          border: `1.5px solid ${toast.tipo === 'erro' ? '#FCA5A5' : '#5EEAD4'}`,
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
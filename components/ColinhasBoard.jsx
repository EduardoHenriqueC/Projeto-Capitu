'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';

// Normalizador puro para comparação de strings
const normalizar = (str) =>
  (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, '')
    .trim();

export default function ColinhasBoard({ setView, isSupervisor, usuarioLogado }) {
  const [agente, setAgente] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  
  // Categorias do banco
  const [categorias, setCategorias] = useState([]);
  const [filtroAtivo, setFiltroAtivo] = useState({ tipo: 'todas', id: 'todas', nome: 'Todas as Colinhas', parentId: null });
  const [expandidas, setExpandidas] = useState({});

  // Toast
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });
  
  // Modais
  const [modalAberto, setModalAberto] = useState(false);
  const [modalNota, setModalNota] = useState(null); 
  const [colinhaParaExcluir, setColinhaParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);

  // Formulário de Colinhas
  const [formData, setFormData] = useState({
    id: null,
    t: '',
    c: '',
    sub: '',
    atalho: '',
    txt: ''
  });

  // Formulário de Categorias
  const [formCat, setFormCat] = useState({
    tipo: 'principal',
    nome: '',
    icone: '📁',
    parentId: ''
  });

  const modalContainerRef = useRef(null);
  const modalTextRef = useRef(null);
  const [colinhas, setColinhas] = useState([]);

  const dispararToast = (mensagem, tipo = 'sucesso') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => setToast({ visivel: false, mensagem: '', tipo: 'sucesso' }), 2800);
  };

  const getCor = (catNome) => {
    const nome = normalizar(catNome);
    if (nome.includes('relacionamento')) return { bg: '#F5EEF8', border: '#D7BDE2' };
    if (nome.includes('mascara')) return { bg: '#F2F4F4', border: '#D5D8DC' };
    if (nome.includes('entrega') || nome.includes('rastreio')) return { bg: '#E8F8F5', border: '#A3E4D7' };
    if (nome.includes('atraso') || nome.includes('extravio')) return { bg: '#FEF9E7', border: '#F9E79F' };
    if (nome.includes('vendedor') || nome.includes('standby')) return { bg: '#FDF2E9', border: '#F5CBA7' };
    if (nome.includes('troca') || nome.includes('devolu')) return { bg: '#F9EBEA', border: '#F2D7D5' };
    if (nome.includes('cancelamento') || nome.includes('reembolso')) return { bg: '#FDEDEC', border: '#F5B7B1' };
    if (nome.includes('financeiro') || nome.includes('pagamento')) return { bg: '#EAF2F8', border: '#A9CCE3' };
    if (nome.includes('cadastro') || nome.includes('login')) return { bg: '#EAFAF1', border: '#A9DFBF' };
    if (nome.includes('plataforma') || nome.includes('carrinho')) return { bg: '#F4ECF7', border: '#D2B4DE' };
    return { bg: '#FFFFFF', border: '#CBD5E1' };
  };

  // 1. CARREGAR CATEGORIAS
  const buscarCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_colinhas')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      if (data) setCategorias(data);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    }
  };

  // 2. CARREGAR COLINHAS
  const buscarColinhas = async () => {
    try {
      const { data, error } = await supabase
        .from('colinhas')
        .select('*')
        .order('titulo', { ascending: true });

      if (error) throw error;
      if (data) {
        const processadas = data.map((item) => ({
          id: item.id,
          t: item.titulo,
          c: item.categoria,
          sub: item.subcategoria || '',
          txt: item.conteudo,
          atalho: item.atalho || '',
          fixado: Boolean(item.fixado),
          cNorm: normalizar(item.categoria),
          subNorm: normalizar(item.subcategoria || ''),
          buscaIndex: normalizar(`${item.titulo} ${item.conteudo} ${item.atalho || ''}`)
        }));
        setColinhas(processadas);
      }
    } catch (err) {
      console.error('Erro ao buscar colinhas:', err);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    const salvo = localStorage.getItem('capitu_agente_nome');
    if (salvo) setAgente(salvo);

    buscarCategorias();
    buscarColinhas();

    const canal = supabase
      .channel('colinhas_realtime_board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colinhas' }, () => buscarColinhas())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias_colinhas' }, () => buscarCategorias())
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  useEffect(() => {
    if (modalNota && modalContainerRef.current) {
      modalContainerRef.current.focus({ preventScroll: true });
    }
  }, [modalNota]);

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
      if (categoria !== 'Máscaras & Registros' && !final.includes('Atenciosamente') && !final.includes('Liderança:')) {
        final += `\n\nAtenciosamente,\n${nome}\nEquipe Estante Virtual 💚`;
      }
    } else {
      final = final.replace(/Me chamo {agente} e /gi, '');
      final = final.replace(/Me chamo {agente}/gi, 'Aqui é da Equipe Estante Virtual');
      final = final.replace(/\n{agente}\nEquipe Estante Virtual/gi, '\nEquipe Estante Virtual');
      final = final.replace(/{agente}/gi, 'Equipe Estante Virtual');

      if (categoria !== 'Máscaras & Registros' && !final.includes('Atenciosamente') && !final.includes('Liderança:')) {
        final += `\n\nAtenciosamente,\nEquipe Estante Virtual 💚`;
      }
    }
    return final;
  };

  const { categoriasPrincipais, subcategoriasPorPai } = useMemo(() => {
    const principais = [];
    const subsMap = {};

    categorias.forEach((cat) => {
      if (!cat.parent_id) {
        principais.push(cat);
      } else {
        if (!subsMap[cat.parent_id]) subsMap[cat.parent_id] = [];
        subsMap[cat.parent_id].push(cat);
      }
    });

    return { categoriasPrincipais: principais, subcategoriasPorPai: subsMap };
  }, [categorias]);

  const alternarFixarColinha = async (e, colinha) => {
    e.stopPropagation();
    const novoStatus = !colinha.fixado;

    setColinhas((prev) =>
      prev.map((c) => (c.id === colinha.id ? { ...c, fixado: novoStatus } : c))
    );

    try {
      const { error } = await supabase
        .from('colinhas')
        .update({ fixado: novoStatus })
        .eq('id', colinha.id);

      if (error) throw error;
      dispararToast(novoStatus ? '📌 Colinha fixada no topo!' : 'Colinha desafixada!', 'sucesso');
    } catch (err) {
      console.error('Erro ao fixar colinha:', err);
      dispararToast('Erro ao atualizar status: ' + err.message, 'erro');
      await buscarColinhas();
    }
  };

  const abrirModalCriar = () => {
    const catPadrao = categoriasPrincipais[0]?.nome || 'Relacionamento & Finalização';
    const subPadrao = filtroAtivo.tipo === 'subcategoria' ? filtroAtivo.nome : '';
    setFormData({ id: null, t: '', c: catPadrao, sub: subPadrao, atalho: '', txt: '' });
    setModalAberto(true);
  };

  const abrirModalEditar = (e, item) => {
    if (e) e.stopPropagation();

    const catEncontrada = categoriasPrincipais.find(
      (cp) =>
        normalizar(cp.nome) === item.cNorm ||
        normalizar(cp.nome).includes(item.cNorm) ||
        item.cNorm.includes(normalizar(cp.nome))
    );

    setFormData({
      id: item.id,
      t: item.t,
      c: catEncontrada ? catEncontrada.nome : item.c,
      sub: item.sub || '',
      atalho: item.atalho || '',
      txt: item.txt
    });
    setModalAberto(true);
  };

  const salvarColinha = async (e) => {
    e.preventDefault();
    if (!formData.t.trim() || !formData.txt.trim() || !formData.c) {
      dispararToast('Preencha título, categoria e conteúdo.', 'erro');
      return;
    }

    try {
      if (formData.id) {
        const { error } = await supabase
          .from('colinhas')
          .update({
            titulo: formData.t,
            categoria: formData.c,
            subcategoria: formData.sub ? formData.sub.trim() : null,
            conteudo: formData.txt,
            atalho: formData.atalho || '',
            atualizado_em: new Date().toISOString()
          })
          .eq('id', formData.id);

        if (error) throw error;
        dispararToast('✅ Colinha atualizada com sucesso!', 'sucesso');
      } else {
        const autor = usuarioLogado?.nome || 'Supervisão EV';
        const { error } = await supabase
          .from('colinhas')
          .insert([
            {
              titulo: formData.t,
              categoria: formData.c,
              subcategoria: formData.sub ? formData.sub.trim() : null,
              conteudo: formData.txt,
              atalho: formData.atalho || '',
              autor_nome: autor,
              fixado: false
            }
          ]);

        if (error) throw error;
        dispararToast('✨ Nova colinha cadastrada!', 'sucesso');
      }

      setModalAberto(false);
      await buscarColinhas();
    } catch (err) {
      console.error('Erro ao salvar colinha:', err);
      dispararToast('Erro ao salvar: ' + err.message, 'erro');
    }
  };

  const confirmarExclusao = async () => {
    if (!colinhaParaExcluir) return;
    setExcluindo(true);
    try {
      const { error } = await supabase.from('colinhas').delete().eq('id', colinhaParaExcluir.id);
      if (error) throw error;

      dispararToast(`Colinha "${colinhaParaExcluir.t}" removida!`, 'sucesso');
      setColinhaParaExcluir(null);
      await buscarColinhas();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      dispararToast('Erro ao excluir colinha: ' + err.message, 'erro');
    } finally {
      setExcluindo(false);
    }
  };

  const salvarCategoria = async (e) => {
    e.preventDefault();
    if (!formCat.nome.trim()) {
      dispararToast('Informe o nome da categoria.', 'erro');
      return;
    }

    if (formCat.tipo === 'subcategoria' && !formCat.parentId) {
      dispararToast('Selecione uma categoria principal.', 'erro');
      return;
    }

    try {
      const nova = {
        nome: formCat.nome.trim(),
        icone: formCat.icone.trim() || '📁',
        parent_id: formCat.tipo === 'subcategoria' ? Number(formCat.parentId) : null
      };

      const { error } = await supabase.from('categorias_colinhas').insert([nova]);
      if (error) throw error;

      dispararToast(
        formCat.tipo === 'subcategoria'
          ? '📂 Subcategoria criada com sucesso!'
          : '📁 Categoria criada com sucesso!',
        'sucesso'
      );
      setModalCategoria(false);
      setFormCat({ tipo: 'principal', nome: '', icone: '📁', parentId: '' });
      await buscarCategorias();
    } catch (err) {
      console.error('Erro ao salvar categoria:', err);
      dispararToast('Erro ao salvar categoria: ' + err.message, 'erro');
    }
  };

  const excluirCategoria = async (e, id, nome) => {
    e.stopPropagation();
    if (!window.confirm(`Tem certeza de que deseja excluir "${nome}"? Subcategorias e vínculos serão afetados.`)) return;

    try {
      const { error } = await supabase.from('categorias_colinhas').delete().eq('id', id);
      if (error) throw error;

      dispararToast(`Categoria "${nome}" removida!`, 'sucesso');
      if (filtroAtivo.id === id) {
        setFiltroAtivo({ tipo: 'todas', id: 'todas', nome: 'Todas as Colinhas', parentId: null });
      }
      await buscarCategorias();
    } catch (err) {
      console.error('Erro ao excluir categoria:', err);
      dispararToast('Erro ao excluir: ' + err.message, 'erro');
    }
  };

  // FILTRAGEM CORRIGIDA: SUBCATEGORIAS NOVAS NÃO PUXAM MAIS COLINHAS VAZIAS
  const colinhasFiltradas = useMemo(() => {
    const termo = normalizar(termoBusca);
    const filtroNomeNorm = normalizar(filtroAtivo.nome);

    return colinhas
      .filter((c) => {
        let bateCategoria = true;

        if (filtroAtivo.tipo === 'principal') {
          if (!c.c || !c.cNorm) {
            bateCategoria = false;
          } else {
            bateCategoria =
              c.c === filtroAtivo.nome ||
              c.cNorm === filtroNomeNorm ||
              (c.cNorm.length > 2 && filtroNomeNorm.includes(c.cNorm)) ||
              (filtroNomeNorm.length > 2 && c.cNorm.includes(filtroNomeNorm));
          }
        } else if (filtroAtivo.tipo === 'subcategoria') {
          // Se a colinha não tem subcategoria definida, NUNCA corresponde à subcategoria ativa
          if (!c.sub || !c.subNorm) {
            bateCategoria = false;
          } else {
            // Comparação estrita para garantir que subcategorias recém-criadas comecem zeradas
            bateCategoria =
              c.sub === filtroAtivo.nome ||
              c.subNorm === filtroNomeNorm;
          }
        }

        const bateBusca = termo === '' || c.buscaIndex.includes(termo);
        return bateCategoria && bateBusca;
      })
      .sort((a, b) => {
        if (a.fixado !== b.fixado) return b.fixado ? 1 : -1;
        return a.t.localeCompare(b.t);
      });
  }, [colinhas, filtroAtivo, termoBusca]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '36px 20px 80px 20px' }}>
      
      {/* BARRA SUPERIOR DE PESQUISA E ASSINATURA */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '16px 24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0, 77, 76, 0.05)',
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '300px' }}>
          <span style={{ fontSize: '1.25rem', color: '#006968' }}>🔍</span>
          <input
            type="text"
            placeholder="Pesquise por qualquer termo, atalho (/pix), regra de frete..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '0.98rem',
              width: '100%',
              fontWeight: '500',
              color: '#1E293B'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid #E2E8F0', paddingLeft: '16px' }}>
          <label style={{ fontSize: '0.88rem', fontWeight: '700', color: '#004D4C' }}>✍️ Assinatura:</label>
          <input
            type="text"
            placeholder="Ex: Mariana"
            value={agente}
            onChange={handleAgenteChange}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', width: '150px' }}
          />  

          {isSupervisor && (
            <button
              onClick={abrirModalCriar}
              style={{
                background: '#006968',
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
              ➕ Nova Colinha
            </button>
          )}
        </div>
      </div>

      {/* LAYOUT: MENU LATERAL + LISTAGEM */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '28px', alignItems: 'start' }}>
        
        {/* MENU LATERAL */}
        <aside style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '6px', 
          position: 'sticky', 
          top: '90px',
          maxHeight: 'calc(100vh - 110px)',
          overflowY: 'auto',
          paddingRight: '6px'
        }}>
          
          <button
            onClick={() => setFiltroAtivo({ tipo: 'todas', id: 'todas', nome: 'Todas as Colinhas', parentId: null })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '12px',
              border: filtroAtivo.id === 'todas' ? '2px solid #006968' : '1px solid transparent',
              background: filtroAtivo.id === 'todas' ? 'rgba(0, 105, 104, 0.08)' : 'transparent',
              color: filtroAtivo.id === 'todas' ? '#006968' : '#64748B',
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: filtroAtivo.id === 'todas' ? '800' : '600',
              fontSize: '0.92rem'
            }}
          >
            <div style={{ fontSize: '1.2rem', width: '26px', textAlign: 'center' }}>📑</div>
            <div>Todas as Colinhas</div>
          </button>

          {categoriasPrincipais.map((cat) => {
            const isAtiva = filtroAtivo.tipo === 'principal' && filtroAtivo.id === cat.id;
            const subs = subcategoriasPorPai[cat.id] || [];
            
            const isSubAtivaDestePai = filtroAtivo.tipo === 'subcategoria' && filtroAtivo.parentId === cat.id;
            const isOpen = Boolean(expandidas[cat.id] || isSubAtivaDestePai || isAtiva);

            return (
              <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div
                  onClick={() => {
                    setExpandidas((prev) => ({ ...prev, [cat.id]: true }));
                    setFiltroAtivo({ tipo: 'principal', id: cat.id, nome: cat.nome, parentId: null });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: isAtiva ? '2px solid #006968' : '1px solid transparent',
                    background: isAtiva ? 'rgba(0, 105, 104, 0.08)' : 'transparent',
                    color: isAtiva ? '#006968' : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '1.15rem' }}>{cat.icone || '📁'}</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: isAtiva ? '800' : '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {cat.nome}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {subs.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandidas((prev) => ({ ...prev, [cat.id]: !isOpen }));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748B',
                          fontSize: '0.72rem',
                          padding: '2px 4px'
                        }}
                        title={isOpen ? 'Recolher' : 'Expandir subcategorias'}
                      >
                        {isOpen ? '▼' : '▶'}
                      </button>
                    )}

                    {isSupervisor && (
                      <button
                        onClick={(e) => excluirCategoria(e, cat.id, cat.nome)}
                        title="Excluir categoria"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94A3B8',
                          fontSize: '0.76rem',
                          padding: '2px 4px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {subs.length > 0 && isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '32px', borderLeft: '2px solid #E2E8F0', marginLeft: '16px' }}>
                    {subs.map((sub) => {
                      const isSubAtiva = filtroAtivo.tipo === 'subcategoria' && filtroAtivo.id === sub.id;
                      return (
                        <div
                          key={sub.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandidas((prev) => ({ ...prev, [cat.id]: true }));
                            setFiltroAtivo({ tipo: 'subcategoria', id: sub.id, nome: sub.nome, parentId: cat.id });
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: isSubAtiva ? '#F0FDFA' : 'transparent',
                            color: isSubAtiva ? '#0F766E' : '#64748B',
                            fontWeight: isSubAtiva ? '800' : '600',
                            fontSize: '0.82rem',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{sub.icone || '↳'}</span>
                            <span>{sub.nome}</span>
                          </div>

                          {isSupervisor && (
                            <button
                              onClick={(e) => excluirCategoria(e, sub.id, sub.nome)}
                              title="Excluir subcategoria"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#94A3B8',
                                fontSize: '0.72rem'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {isSupervisor && (
            <button
              onClick={() => {
                setFormCat({ tipo: 'principal', nome: '', icone: '📁', parentId: String(categoriasPrincipais[0]?.id || '') });
                setModalCategoria(true);
              }}
              style={{
                marginTop: '12px',
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1.5px dashed #006968',
                background: '#F0FDFA',
                color: '#006968',
                fontWeight: '700',
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              ➕ Nova Categoria / Sub
            </button>
          )}
        </aside>

        {/* ÁREA DOS CARDS */}
        <main style={{ minHeight: '600px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#004D4C', margin: '0 0 6px 0' }}>
              {filtroAtivo.nome}
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748B' }}>
              {colinhasFiltradas.length} {colinhasFiltradas.length === 1 ? 'colinha disponível' : 'colinhas disponíveis'}.
            </p>
          </div>

          <div style={{ opacity: isMounted ? 1 : 0, transition: 'opacity 0.2s ease-in' }}>
            {isMounted && colinhasFiltradas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B', background: '#FFF', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📑</div>
                <p>Nenhuma colinha encontrada para esta seleção.</p>
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
                        border: c.fixado ? '2px solid #006968' : `1px solid ${cores.border}`,
                        borderRadius: '16px',
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                        position: 'relative',
                        boxShadow: c.fixado ? '0 6px 16px rgba(0, 105, 104, 0.12)' : '0 2px 8px rgba(0, 0, 0, 0.04)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = c.fixado ? '0 6px 16px rgba(0, 105, 104, 0.12)' : '0 2px 8px rgba(0, 0, 0, 0.04)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {c.fixado && (
                            <span style={{ fontSize: '0.68rem', fontWeight: '800', background: '#004D4C', color: '#FFF', padding: '2px 8px', borderRadius: '4px' }}>
                              📌 FIXADA
                            </span>
                          )}
                          <span style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: 'rgba(0, 0, 0, 0.55)', letterSpacing: '0.4px' }}>
                            {c.c}
                          </span>
                          {c.sub && (
                            <span style={{ fontSize: '0.68rem', fontWeight: '800', background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px', color: '#334155' }}>
                              ↳ {c.sub}
                            </span>
                          )}
                        </div>

                        {isSupervisor && (
                          <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => alternarFixarColinha(e, c)}
                              title={c.fixado ? 'Desafixar colinha' : 'Fixar colinha no topo'}
                              style={{
                                background: c.fixado ? '#006968' : '#FFFFFF',
                                color: c.fixado ? '#FFFFFF' : '#475569',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                padding: '3px 8px',
                                fontSize: '0.76rem',
                                fontWeight: '700'
                              }}
                            >
                              📌
                            </button>

                            <button
                              onClick={(e) => abrirModalEditar(e, c)}
                              title="Editar e Mover Colinha"
                              style={{
                                background: '#FFFFFF',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                padding: '3px 8px',
                                fontSize: '0.74rem',
                                fontWeight: '700',
                                color: '#334155'
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
                                color: '#64748B'
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
                      
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#0F172A', fontWeight: '800' }}>{c.t}</h4>
                      
                      <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'hidden', position: 'relative' }}>
                        {compilarTexto(c.txt, c.c)}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '36px', background: `linear-gradient(transparent, ${cores.bg})` }}></div>
                      </div>

                      <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed rgba(0, 0, 0, 0.1)', textAlign: 'right', fontSize: '0.76rem', fontWeight: '700', color: '#006968' }}>
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

      {/* MODAL 1: VISUALIZAR TEXTO COMPLETO */}
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
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#006968' }}>
                    {modalNota.c}
                  </span>
                  {modalNota.sub && (
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px', color: '#475569' }}>
                      ↳ {modalNota.sub}
                    </span>
                  )}
                </div>
                <h3 style={{ margin: '4px 0 0 0', color: '#004D4C', fontSize: '1.35rem', fontWeight: '800' }}>
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
                      fontSize: '0.85rem'
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
                      fontSize: '0.86rem'
                    }}
                  >
                    ✏️ Editar / Mover
                  </button>
                )}

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(compilarTexto(modalNota.txt, modalNota.c));
                    dispararToast(`📋 Texto de "${modalNota.t}" copiado!`, 'sucesso');
                  }}
                  style={{
                    padding: '8px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#006968',
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

      {/* MODAL 2: CRIAR / EDITAR / MOVER */}
      {isMounted && modalAberto && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 30, 30, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '600px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#004D4C' }}>
              {formData.id ? '✏️ Editar / Mover Colinha' : '➕ Nova Colinha Operacional'}
            </h3>
            
            <form onSubmit={salvarColinha}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Título</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Confirmação de Entrega"
                  value={formData.t}
                  onChange={(e) => setFormData({ ...formData, t: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Categoria Principal</label>
                  <select
                    required
                    value={formData.c}
                    onChange={(e) => setFormData({ ...formData, c: e.target.value, sub: '' })}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="" disabled>Selecione uma categoria...</option>
                    {categoriasPrincipais.map((cat) => (
                      <option key={cat.id} value={cat.nome}>
                        {cat.icone} {cat.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Subcategoria (Opcional)</label>
                  <select
                    value={formData.sub}
                    onChange={(e) => setFormData({ ...formData, sub: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="">Nenhuma (Fica na raiz)</option>
                    {(() => {
                      const catPai = categoriasPrincipais.find(
                        (cp) =>
                          normalizar(cp.nome) === normalizar(formData.c) ||
                          normalizar(cp.nome).includes(normalizar(formData.c)) ||
                          normalizar(formData.c).includes(normalizar(cp.nome))
                      );
                      if (!catPai) return null;
                      const subs = subcategoriasPorPai[catPai.id] || [];
                      return subs.map((sub) => (
                        <option key={sub.id} value={sub.nome}>
                          {sub.icone} {sub.nome}
                        </option>
                      ));
                    })()}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Atalho Rápido (opcional)</label>
                <input
                  type="text"
                  placeholder="/pix, /extravio"
                  value={formData.atalho}
                  onChange={(e) => setFormData({ ...formData, atalho: e.target.value })}
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Texto da Colinha</label>
                <textarea
                  rows="7"
                  required
                  placeholder="Olá! Sou {agente} da Estante Virtual..."
                  value={formData.txt}
                  onChange={(e) => setFormData({ ...formData, txt: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem', lineHeight: '1.5', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#F1F5F9', cursor: 'pointer', fontWeight: '600' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#006968', color: '#FFF', fontWeight: '700', cursor: 'pointer' }}>
                  {formData.id ? 'Atualizar no Banco' : 'Salvar no Banco'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: CRIAR CATEGORIA / SUBCATEGORIA */}
      {isMounted && modalCategoria && createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 30, 30, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#004D4C' }}>
              📁 Criar Nova Categoria no Banco
            </h3>

            <form onSubmit={salvarCategoria} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px' }}>Tipo de Categoria:</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: '600', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="tipoCat"
                      checked={formCat.tipo === 'principal'}
                      onChange={() => setFormCat({ ...formCat, tipo: 'principal' })}
                    />
                    Categoria Principal
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: '600', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="tipoCat"
                      checked={formCat.tipo === 'subcategoria'}
                      onChange={() => setFormCat({ ...formCat, tipo: 'subcategoria', parentId: String(categoriasPrincipais[0]?.id || '') })}
                    />
                    Subcategoria
                  </label>
                </div>
              </div>

              {formCat.tipo === 'subcategoria' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Vincular à Categoria Pai:</label>
                  <select
                    value={formCat.parentId}
                    onChange={(e) => setFormCat({ ...formCat, parentId: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    {categoriasPrincipais.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icone} {cat.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Ícone</label>
                  <input
                    type="text"
                    required
                    value={formCat.icone}
                    onChange={(e) => setFormCat({ ...formCat, icone: e.target.value })}
                    style={{ width: '100%', padding: '9px', textAlign: 'center', fontSize: '1.1rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Nome da Categoria</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: PIX & Estornos"
                    value={formCat.nome}
                    onChange={(e) => setFormCat({ ...formCat, nome: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalCategoria(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#F1F5F9', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#006968', color: '#FFF', fontWeight: '700', cursor: 'pointer' }}
                >
                  Criar no Banco
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 4: CONFIRMAÇÃO DE EXCLUSÃO */}
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
            
            <h3 style={{ margin: '0 0 8px 0', color: '#0F172A', fontSize: '1.2rem', fontWeight: '800' }}>
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
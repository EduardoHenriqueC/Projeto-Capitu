'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// Categorias padrão da operação
const CATEGORIAS_BASE = [
  { nome: 'Acompanhamento e Status', icone: '📦' },
  { nome: 'Prazos e Envio pelo Vendedor', icone: '⏱️' },
  { nome: 'Nota Fiscal ou Recibo', icone: '📜' },
  { nome: 'Trocas, Devoluções e Cancelamento', icone: '🔄' },
  { nome: 'Financeiro e Reembolsos', icone: '💳' },
  { nome: 'Carrinho, Busca e Cadastro', icone: '🛒' },
  { nome: 'Suporte Técnico e Acesso', icone: '🛠️' },
];

const normalizar = (str) =>
  (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export default function RegulamentosView({ isSupervisor }) {
  const [regulamentos, setRegulamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Acompanhamento e Status');
  const [termoBusca, setTermoBusca] = useState('');
  const [topicoAbertoId, setTopicoAbertoId] = useState(null);

  // Modais de Gestão (Supervisão / Admin)
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoItem, setEditandoItem] = useState(null);
  const [itemParaExcluir, setItemParaExcluir] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // Formulário
  const [formTitulo, setFormTitulo] = useState('');
  const [formCategoria, setFormCategoria] = useState('');
  const [formTextoCompleto, setFormTextoCompleto] = useState('');

  // Toast
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });
  const dispararToast = (mensagem, tipo = 'sucesso') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => setToast({ visivel: false, mensagem: '', tipo: 'sucesso' }), 2600);
  };

  // 1. CARREGAMENTO DO BANCO DE DADOS
  const buscarRegulamentos = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('regulamentos')
        .select('id, titulo, categoria, texto_completo')
        .order('id', { ascending: true });

      if (error) throw error;
      setRegulamentos(data || []);
    } catch (err) {
      console.error('Erro ao buscar regulamentos:', err);
      dispararToast('Erro ao carregar dados do banco', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarRegulamentos();

    const canal = supabase
      .channel('regulamentos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regulamentos' }, () => {
        buscarRegulamentos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // 2. MONTAGEM DAS CATEGORIAS
  const listaCategorias = useMemo(() => {
    const nomesExistentes = new Set(CATEGORIAS_BASE.map((c) => c.nome));
    const extras = [];

    regulamentos.forEach((r) => {
      if (r.categoria && !nomesExistentes.has(r.categoria)) {
        nomesExistentes.add(r.categoria);
        extras.push({ nome: r.categoria, icone: '📁' });
      }
    });

    return [...CATEGORIAS_BASE, ...extras];
  }, [regulamentos]);

  // 3. FILTRAGEM DOS TÓPICOS
  const topicosFiltrados = useMemo(() => {
    const termo = normalizar(termoBusca);

    return regulamentos.filter((item) => {
      const bateCat = normalizar(item.categoria) === normalizar(categoriaAtiva);
      const bateBusca =
        !termo ||
        normalizar(item.titulo).includes(termo) ||
        normalizar(item.texto_completo).includes(termo) ||
        normalizar(item.categoria).includes(termo);

      return termo ? bateBusca : bateCat;
    });
  }, [regulamentos, categoriaAtiva, termoBusca]);

  // 4. AÇÕES ADMINISTRATIVAS
  const abrirNovo = () => {
    setEditandoItem(null);
    setFormTitulo('');
    setFormCategoria(categoriaAtiva);
    setFormTextoCompleto('');
    setModalAberto(true);
  };

  const abrirEdicao = (e, item) => {
    e.stopPropagation();
    setEditandoItem(item);
    setFormTitulo(item.titulo);
    setFormCategoria(item.categoria);
    setFormTextoCompleto(item.texto_completo || '');
    setModalAberto(true);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!formTitulo.trim() || !formTextoCompleto.trim()) return;

    setSalvando(true);
    try {
      const payload = {
        titulo: formTitulo.trim(),
        categoria: formCategoria.trim() || 'Geral',
        texto_completo: formTextoCompleto.trim()
      };

      if (editandoItem) {
        const { error } = await supabase
          .from('regulamentos')
          .update(payload)
          .eq('id', editandoItem.id);

        if (error) throw error;
        dispararToast('Regulamento atualizado!');
      } else {
        const { error } = await supabase
          .from('regulamentos')
          .insert([payload]);

        if (error) throw error;
        dispararToast('Novo regulamento cadastrado!');
        setCategoriaAtiva(payload.categoria);
      }

      setModalAberto(false);
      await buscarRegulamentos();
    } catch (err) {
      alert('Erro ao salvar no banco: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!itemParaExcluir) return;
    try {
      const { error } = await supabase
        .from('regulamentos')
        .delete()
        .eq('id', itemParaExcluir.id);

      if (error) throw error;
      dispararToast('Regulamento excluído com sucesso!');
      setItemParaExcluir(null);
      await buscarRegulamentos();
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 20px 80px 20px' }}>
      
      {/* ESTILOS DE TRANSIÇÃO E ADAPTAÇÃO AO MODO ESCURO */}
      <style>{`
        :root {
          --reg-cat-ativa-bg: #E6F4F1;
          --reg-cat-ativa-border: #004D4C;
          --reg-cat-ativa-color: #004D4C;
          --reg-cat-icon-active-bg: #D1EBE7;
          --reg-topic-hover-bg: #F8FAFC;
        }

        [data-theme="dark"] {
          --reg-cat-ativa-bg: rgba(45, 212, 191, 0.12);
          --reg-cat-ativa-border: #2DD4BF;
          --reg-cat-ativa-color: #2DD4BF;
          --reg-cat-icon-active-bg: rgba(45, 212, 191, 0.2);
          --reg-topic-hover-bg: #162836;
        }

        @keyframes fadeTransicaoSuave {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animar-transicao-categoria {
          animation: fadeTransicaoSuave 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* BARRA DE PESQUISA SUPERIOR */}
      <div style={{
        background: 'var(--bg-search, #FFFFFF)',
        borderRadius: '16px',
        padding: '16px 24px',
        border: '1.5px solid var(--border-search, #E2E8F0)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }}>
        <span style={{ fontSize: '1.2rem', color: 'var(--texto-titulo-verde, #006968)' }}>🔍</span>
        <input
          type="text"
          placeholder="Pesquisar regra, SLA, estorno, MLE, extravio ou procedimento..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: '0.98rem',
            width: '100%',
            fontWeight: '500',
            backgroundColor: 'transparent',
            color: 'var(--text-search, #1E293B)'
          }}
        />
        {termoBusca && (
          <button
            onClick={() => setTermoBusca('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto-secundario, #94A3B8)', fontSize: '1rem' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* LAYOUT DUAS COLUNAS */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '28px', alignItems: 'start' }}>
        
        {/* COLUNA ESQUERDA: LISTA DE CATEGORIAS */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {listaCategorias.map((cat) => {
            const isAtiva = normalizar(categoriaAtiva) === normalizar(cat.nome);

            return (
              <div
                key={cat.nome}
                onClick={() => {
                  setCategoriaAtiva(cat.nome);
                  setTermoBusca('');
                  setTopicoAbertoId(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  backgroundColor: isAtiva ? 'var(--reg-cat-ativa-bg)' : 'var(--bg-card, #FFFFFF)',
                  border: isAtiva ? '2px solid var(--reg-cat-ativa-border)' : '1.5px solid var(--border-card, #E2E8F0)',
                  boxShadow: isAtiva ? '0 4px 14px rgba(45, 212, 191, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                  transform: isAtiva ? 'scale(1.01)' : 'scale(1)'
                }}
                onMouseEnter={(e) => {
                  if (!isAtiva) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-item-aberto, #F8FAFC)';
                    e.currentTarget.style.borderColor = 'var(--border-search, #CBD5E1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isAtiva) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-card, #FFFFFF)';
                    e.currentTarget.style.borderColor = 'var(--border-card, #E2E8F0)';
                  }
                }}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: isAtiva ? 'var(--reg-cat-icon-active-bg)' : 'var(--bg-item-aberto, #F8FAFC)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0,
                  transition: 'background-color 0.2s ease'
                }}>
                  {cat.icone}
                </div>

                <span style={{
                  fontSize: '0.92rem',
                  fontWeight: isAtiva ? '800' : '600',
                  color: isAtiva ? 'var(--reg-cat-ativa-color)' : 'var(--texto-primario, #334155)',
                  lineHeight: '1.3'
                }}>
                  {cat.nome}
                </span>
              </div>
            );
          })}
        </aside>

        {/* COLUNA DIREITA: PAINEL DE LEITURA COM TRANSIÇÃO */}
        <main style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          borderRadius: '20px',
          border: '1.5px solid var(--border-card, #E2E8F0)',
          padding: '36px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
          minHeight: '520px'
        }}>
          {/* Cabeçalho do Painel */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '900', color: 'var(--texto-titulo-verde, #004D4C)' }}>
                {termoBusca ? 'Resultados da Pesquisa' : categoriaAtiva}
              </h2>
              <p style={{ margin: '6px 0 0 0', color: 'var(--texto-secundario, #64748B)', fontSize: '0.92rem' }}>
                {termoBusca
                  ? `Mostrando resultados para "${termoBusca}"`
                  : 'Selecione um tópico abaixo para consultar os critérios e instruções oficiais.'}
              </p>
            </div>

            {isSupervisor && (
              <button
                onClick={abrirNovo}
                style={{
                  backgroundColor: '#006968',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(0, 105, 104, 0.2)',
                  transition: 'background-color 0.15s ease'
                }}
              >
                + Novo Tópico
              </button>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-card, #E2E8F0)', margin: '20px 0 24px 0' }} />

          {/* Listagem de Tópicos */}
          {carregando ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario, #64748B)', fontWeight: '600' }}>
              Carregando regulamentos...
            </div>
          ) : topicosFiltrados.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 20px',
              color: 'var(--texto-secundario, #64748B)',
              border: '1.5px dashed var(--border-card, #E2E8F0)',
              borderRadius: '12px'
            }}>
              Nenhum tópico cadastrado para esta categoria ainda.
            </div>
          ) : (
            <div
              key={`${categoriaAtiva}-${termoBusca}`}
              className="animar-transicao-categoria"
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              {topicosFiltrados.map((item) => {
                const aberto = topicoAbertoId === item.id;

                return (
                  <div
                    key={item.id}
                    style={{
                      border: aberto ? '1.5px solid var(--texto-destaque-turquesa, #006968)' : '1.5px solid var(--border-card, #E2E8F0)',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                      boxShadow: aberto ? '0 4px 12px rgba(45, 212, 191, 0.08)' : 'none'
                    }}
                  >
                    {/* Linha do Cabeçalho do Tópico */}
                    <div
                      onClick={() => setTopicoAbertoId(aberto ? null : item.id)}
                      style={{
                        padding: '16px 22px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        backgroundColor: aberto ? 'var(--bg-item-aberto, #F8FAFC)' : 'var(--bg-card, #FFFFFF)',
                        userSelect: 'none',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!aberto) e.currentTarget.style.backgroundColor = 'var(--reg-topic-hover-bg)';
                      }}
                      onMouseLeave={(e) => {
                        if (!aberto) e.currentTarget.style.backgroundColor = 'var(--bg-card, #FFFFFF)';
                      }}
                    >
                      <span style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--texto-primario, #1E293B)', wordBreak: 'break-word' }}>
                        {item.titulo}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {isSupervisor && (
                          <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => abrirEdicao(e, item)}
                              title="Editar Tópico"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                color: 'var(--texto-secundario, #64748B)'
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemParaExcluir(item);
                              }}
                              title="Excluir Tópico"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                color: '#EF4444'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        {/* Chevron com rotação animada */}
                        <span style={{
                          color: 'var(--texto-secundario, #64748B)',
                          fontSize: '1.15rem',
                          fontWeight: '800',
                          display: 'inline-block',
                          transform: aberto ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}>
                          ›
                        </span>
                      </div>
                    </div>

                    {/* Bloco Accordion Suave */}
                    <div style={{
                      display: 'grid',
                      gridTemplateRows: aberto ? '1fr' : '0fr',
                      transition: 'grid-template-rows 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                      borderTop: aberto ? '1px solid var(--border-card, #E2E8F0)' : '1px solid transparent',
                    }}>
                      <div style={{ minHeight: 0, overflow: 'hidden' }}>
                        <div style={{
                          padding: '20px 24px',
                          backgroundColor: 'var(--bg-subconteudo, #FFFFFF)',
                          lineHeight: '1.7',
                          color: 'var(--texto-secundario, #334155)',
                          fontSize: '0.94rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere'
                        }}>
                          {item.texto_completo?.replace(/\\n/g, '\n')}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {modalAberto && (
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
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '620px',
            padding: '30px',
            border: '1px solid var(--border-card, transparent)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--texto-titulo-verde, #004D4C)', fontSize: '1.25rem', fontWeight: '800' }}>
              {editandoItem ? '✏️ Editar Regulamento' : '➕ Novo Tópico de Regulamento'}
            </h3>

            <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '4px', color: 'var(--texto-secundario, #334155)' }}>
                  Categoria:
                </label>
                <input
                  type="text"
                  required
                  value={formCategoria}
                  onChange={(e) => setFormCategoria(e.target.value)}
                  placeholder="Ex: Acompanhamento e Status"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-search, #CBD5E1)',
                    background: 'var(--bg-input, #FFF)',
                    color: 'var(--texto-primario, #1E293B)',
                    fontSize: '0.92rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '4px', color: 'var(--texto-secundario, #334155)' }}>
                  Título do Tópico:
                </label>
                <input
                  type="text"
                  required
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ex: Pedido Postado (Dentro do prazo)"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-search, #CBD5E1)',
                    background: 'var(--bg-input, #FFF)',
                    color: 'var(--texto-primario, #1E293B)',
                    fontSize: '0.92rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '4px', color: 'var(--texto-secundario, #334155)' }}>
                  Texto Completo da Instrução:
                </label>
                <textarea
                  rows="8"
                  required
                  value={formTextoCompleto}
                  onChange={(e) => setFormTextoCompleto(e.target.value)}
                  placeholder="Descreva as instruções operacionais deste tópico..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-search, #CBD5E1)',
                    background: 'var(--bg-input, #FFF)',
                    color: 'var(--texto-primario, #1E293B)',
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-card, #CBD5E1)',
                    background: 'transparent',
                    color: 'var(--texto-secundario, #64748B)',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#006968',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    cursor: salvando ? 'not-allowed' : 'pointer',
                    opacity: salvando ? 0.7 : 1
                  }}
                >
                  {salvando ? 'Salvando...' : 'Salvar no Banco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {itemParaExcluir && (
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
            background: 'var(--bg-card, #FFFFFF)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '420px',
            padding: '26px',
            border: '1px solid var(--border-card, transparent)',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--texto-primario, #0F172A)', fontSize: '1.15rem', fontWeight: '800' }}>
              Remover Tópico?
            </h3>
            <p style={{ margin: '0 0 20px 0', color: 'var(--texto-secundario, #64748B)', fontSize: '0.88rem', lineHeight: '1.5' }}>
              Deseja remover <strong>"{itemParaExcluir.titulo}"</strong>? Esta instrução será apagada definitivamente do banco.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-card, #CBD5E1)',
                  background: 'transparent',
                  color: 'var(--texto-secundario, #475569)',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusao}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK TOAST */}
      {toast.visivel && (
        <div style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          background: toast.tipo === 'erro' ? '#991B1B' : '#004D4C',
          color: '#FFFFFF',
          padding: '12px 22px',
          borderRadius: '9999px',
          border: `1.5px solid ${toast.tipo === 'erro' ? '#FCA5A5' : '#5EEAD4'}`,
          zIndex: 9999,
          fontWeight: '700',
          fontSize: '0.9rem',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
        }}>
          ✓ {toast.mensagem}
        </div>
      )}

    </div>
  );
}
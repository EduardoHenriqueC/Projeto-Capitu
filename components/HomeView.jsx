'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function HomeView({ setView, isSupervisor, usuarioLogado }) {
  const [comunicados, setComunicados] = useState([]);
  const [filtroAtivo, setFiltroAtivo] = useState('Todos'); // 'Todos' | 'Urgentes' | 'Fixados'
  const [modalPublicar, setModalPublicar] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Formulário de publicação
  const [formAviso, setFormAviso] = useState({
    titulo: '',
    tipo: 'INFORMATIVO', // 'INFORMATIVO' | 'URGENTE'
    status: 'EM ANDAMENTO', // 'EM ANDAMENTO' | 'SOLUCIONADO'
    departamento: 'TI/FINANCEIRO',
    fixado: true,
    conteudo: ''
  });

  // 1. CARREGAR AVISOS DO SUPABASE
  const buscarComunicados = async () => {
    try {
      const { data, error } = await supabase
        .from('comunicados_mural')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        // Se a tabela ainda não existir no banco, mantém os comunicados de exemplo da tela
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
      } else if (data && data.length > 0) {
        setComunicados(data);
      }
    } catch (err) {
      console.error('Erro ao buscar avisos do mural:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarComunicados();

    // Sincronização em tempo real do mural
    const canal = supabase
      .channel('comunicados_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comunicados_mural' }, () => {
        buscarComunicados();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // 2. SALVAR NOVO COMUNICADO
  const handleSalvarComunicado = async (e) => {
    e.preventDefault();
    if (!formAviso.titulo.trim() || !formAviso.conteudo.trim()) return;

    const agora = new Date();
    const horarioFormatado = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const novoItem = {
      titulo: formAviso.titulo,
      tipo: formAviso.tipo,
      status: formAviso.status,
      departamento: formAviso.departamento,
      fixado: formAviso.fixado,
      horario: horarioFormatado,
      autor: usuarioLogado?.nome ? `Supervisão EV (${usuarioLogado.nome})` : 'Supervisão EV',
      conteudo: formAviso.conteudo
    };

    try {
      const { error } = await supabase.from('comunicados_mural').insert([novoItem]);
      if (error) {
        // Fallback caso a tabela ainda não exista no banco
        setComunicados([ { ...novoItem, id: Date.now() }, ...comunicados ]);
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
      alert('Erro ao publicar: ' + err.message);
    }
  };

  // 3. EXCLUIR COMUNICADO DO MURAL
  const handleExcluirComunicado = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Deseja excluir este aviso do mural?')) return;

    try {
      await supabase.from('comunicados_mural').delete().eq('id', id);
      setComunicados(comunicados.filter((c) => c.id !== id));
      if (modalDetalhes?.id === id) setModalDetalhes(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Filtragem
  const comunicadosFiltrados = comunicados.filter((c) => {
    if (filtroAtivo === 'Urgentes') return c.tipo === 'URGENTE';
    if (filtroAtivo === 'Fixados') return c.fixado;
    return true;
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '36px 32px 80px 32px', position: 'relative' }}>
      
      {/* KEYFRAMES DA TRANSIÇÃO SUAVE */}
      <style jsx>{`
        @keyframes fadeSlideCard {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animar-card-mural {
          animation: fadeSlideCard 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* CABEÇALHO DO MURAL */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '36px'
      }}>
        {/* TÍTULO E BADGE TEMPO REAL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '1.9rem' }}>📢</span>
          <h1 style={{
            margin: 0,
            fontSize: '1.75rem',
            fontWeight: '900',
            color: '#005856',
            letterSpacing: '-0.4px'
          }}>
            Mural de Avisos Operacionais
          </h1>
          <span style={{
            backgroundColor: '#DCFCE7',
            color: '#166534',
            fontSize: '0.74rem',
            fontWeight: '800',
            padding: '4px 12px',
            borderRadius: '9999px',
            letterSpacing: '0.5px'
          }}>
            TEMPO REAL
          </span>
        </div>

        {/* BOTÕES DE AÇÃO E FILTROS */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isSupervisor && (
              <button
                onClick={() => setModalPublicar(true)}
                style={{
                  backgroundColor: '#004D4C',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '9999px',
                  fontSize: '0.86rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(0, 77, 76, 0.2)'
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
                padding: '8px 18px',
                borderRadius: '9999px',
                fontSize: '0.84rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Ver todos os avisos
            </button>
          </div>

          {/* ABAS / FILTROS (TODOS, URGENTES, FIXADOS) */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'Todos', label: 'Todos' },
              { id: 'Urgentes', label: 'Urgentes' },
              { id: 'Fixados', label: 'Fixados' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltroAtivo(f.id)}
                style={{
                  padding: '5px 16px',
                  borderRadius: '9999px',
                  border: '1px solid',
                  borderColor: filtroAtivo === f.id ? '#006968' : '#CBD5E1',
                  backgroundColor: filtroAtivo === f.id ? '#FFFFFF' : '#FFFFFF',
                  color: filtroAtivo === f.id ? '#006968' : '#64748B',
                  fontWeight: filtroAtivo === f.id ? '800' : '600',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: filtroAtivo === f.id ? '0 1px 4px rgba(0, 105, 104, 0.15)' : 'none'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ÁREA CENTRAL DO MURAL COM ILUSTRAÇÕES DE FUNDO E OS CARDS EM FORMA DE LIVRO */}
      <div style={{
        position: 'relative',
        minHeight: '440px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 0'
      }}>

        {/* --- FUNDO ESQUERDO: LIVROS EM TRAÇO PRETO E BRANCO PADRONIZADOS --- */}
        <div style={{
          position: 'absolute',
          left: '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0
        }}>
          {/* Livro aberto em traços preto e branco */}
          <img
            src="/book.png"
            alt="Livro Aberto Ilustração"
            style={{
              width: '135px',
              opacity: 0.35,
              filter: 'grayscale(100%) contrast(180%)'
            }}
          />
          {/* Livro com marcador de página padronizado em traço P&B */}
          <img
            src="/book-1.png"
            alt="Livro Ilustração"
            style={{
              width: '95px',
              opacity: 0.35,
              filter: 'grayscale(100%) contrast(180%)'
            }}
          />
        </div>

        {/* --- CARDS DOS LIVROS (COM TRANSIÇÃO SUAVE E ESTILOS ORIGINAIS) --- */}
        <div
          key={filtroAtivo}
          className="animar-card-mural"
          style={{
            display: 'flex',
            gap: '36px',
            justifyContent: 'center',
            alignItems: 'stretch',
            flexWrap: 'wrap',
            zIndex: 2,
            width: '100%',
            maxWidth: '1080px'
          }}
        >
          {comunicadosFiltrados.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '60px 40px',
              textAlign: 'center',
              border: '2px dashed #CBD5E1',
              color: '#64748B',
              width: '100%',
              maxWidth: '560px'
            }}>
              Nenhum aviso encontrado para o filtro "{filtroAtivo}".
            </div>
          ) : (
            comunicadosFiltrados.map((item, index) => {
              const isUrgente = item.tipo === 'URGENTE';
              
              // Cores originais dos livros: Verde Petróleo (Informativo) e Laranja/Terracota (Urgente)
              const corCapa = isUrgente ? '#D97706' : '#00A896';
              const corFita = isUrgente ? '#C0392B' : '#006968';

              return (
                <div
                  key={item.id}
                  onClick={() => setModalDetalhes(item)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '24px',
                    border: `3px solid ${corCapa}`,
                    width: '100%',
                    maxWidth: '490px',
                    minHeight: '340px',
                    padding: '28px 32px',
                    position: 'relative',
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    animationDelay: `${index * 0.06}s`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.boxShadow = '0 16px 36px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  {/* FITA MARCADORA DE PÁGINA (RIBBON NO TOPO DO LIVRO) */}
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

                  {/* LINHAS DE FOLHAS NA LATERAL ESQUERDA (EFEITO LIVRO ABERTO) */}
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '20px',
                    bottom: '20px',
                    width: '6px',
                    borderLeft: '1.5px solid #CBD5E1',
                    borderRight: '1.5px solid #E2E8F0',
                    pointerEvents: 'none'
                  }} />

                  {/* CONTEÚDO DO CARD */}
                  <div style={{ paddingLeft: '8px' }}>
                    
                    {/* LINHA DE TAGS (TIPO, STATUS, DEPARTAMENTO E FECHAR) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* TAG TIPO */}
                        <span style={{
                          backgroundColor: isUrgente ? '#FEE2E2' : '#E0F2FE',
                          color: isUrgente ? '#991B1B' : '#0284C7',
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          letterSpacing: '0.5px'
                        }}>
                          {item.tipo}
                        </span>

                        {/* TAG STATUS */}
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

                        {/* TAG DEPARTAMENTO */}
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

                      {/* BOTÃO EXCLUIR (SUPERVISOR) */}
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
                      <div style={{ marginBottom: '14px' }}>
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

                    {/* TÍTULO DO AVISO */}
                    <h3 style={{
                      margin: '0 0 8px 0',
                      fontSize: '1.25rem',
                      fontWeight: '900',
                      color: '#004D4C',
                      lineHeight: '1.3'
                    }}>
                      {item.titulo}
                    </h3>

                    {/* METADADOS */}
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#64748B',
                      marginBottom: '16px',
                      fontWeight: '600'
                    }}>
                      Publicado às {item.horario} • {item.autor} • {item.departamento}
                    </div>

                    {/* TEXTO DO COMUNICADO */}
                    <p style={{
                      margin: 0,
                      fontSize: '0.94rem',
                      color: '#334155',
                      lineHeight: '1.6'
                    }}>
                      {item.conteudo}
                    </p>
                  </div>

                  {/* RODAPÉ DO CARD COM DIVISÓRIA PONTILHADA */}
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

        {/* --- FUNDO DIREITO: PILHA DE LIVROS EM TRAÇOS PRETO E BRANCO PADRONIZADOS --- */}
        <div style={{
          position: 'absolute',
          right: '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0
        }}>
          {/* Pilha de livros padronizada em traço P&B */}
          <img
            src="/stack-of-books.png"
            alt="Pilha de Livros Ilustração"
            style={{
              width: '160px',
              opacity: 0.35,
              filter: 'grayscale(100%) contrast(180%)'
            }}
          />
        </div>

      </div>

      {/* MODAL DETALHES DO COMUNICADO COMPLETO */}
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

      {/* MODAL PUBLICAR NOVO COMUNICADO (ACESSO LÍDER) */}
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
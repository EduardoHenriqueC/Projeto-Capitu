'use client';

import React, { useState, useEffect } from 'react';

export default function ColinhasBoard({ isSupervisor }) {
  const [agente, setAgente] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');
  const [toast, setToast] = useState({ visivel: false, mensagem: '' });
  const [modalAberto, setModalAberto] = useState(false);

  const [formData, setFormData] = useState({
    id: null,
    titulo: '',
    categoria: 'Cancelamento',
    cor: '#FEF9E7',
    borda: '#F9E79F',
    conteudo: ''
  });

  const [colinhas, setColinhas] = useState([
    {
      id: 1,
      categoria: 'Cancelamento',
      titulo: 'Confirmação de Cancelamento',
      cor: '#FEF9E7',
      borda: '#F9E79F',
      conteudo: `Olá, xx. Tudo bem? Me chamo {agente} e estou aqui para te ajudar!\n\nVimos que você solicitou o cancelamento do pedido xxx.\nGostaria de te notificar que o processo já foi finalizado!\n\nA devolução do valor ocorrerá em até x dias úteis.\n\nQualquer dúvida estamos aqui à disposição\n\nAtenciosamente,\n{agente}\nEquipe Estante Virtual 💚`
    },
    {
      id: 2,
      categoria: 'Prazos de Envio',
      titulo: 'Cobrança de Postagem ao Livreiro',
      cor: '#E8F8F5',
      borda: '#A3E4D7',
      conteudo: `Olá, xx. Tudo bem? Me chamo {agente} e estou acompanhando seu chamado.\n\nNotificamos o livreiro parceiro para que realize a postagem do pedido xxx. Ele possui o prazo regulamentar para disponibilizar o rastreio atualizado ou justificar a remessa.\n\nSeguiremos monitorando seu pedido!\n\nAtenciosamente,\n{agente}\nEquipe Estante Virtual 📚`
    },
    {
      id: 3,
      categoria: 'Logística & Correios',
      titulo: 'Atraso na Rota / Acareação',
      cor: '#EBF5FB',
      borda: '#AED6F1',
      conteudo: `Olá, xx. Tudo bem? Me chamo {agente} da Estante Virtual.\n\nIdentificamos que a entrega do pedido xxx está com lentidão na rota e abrimos uma solicitação prioritária de acareação junto à transportadora.\n\nCaso o pedido não seja entregue no prazo estipulado, acionaremos a Compra Garantida para seu estorno integral.\n\nAtenciosamente,\n{agente}\nEquipe Estante Virtual 💚`
    }
  ]);

  useEffect(() => {
    const salvo = localStorage.getItem('capitu_agente_nome');
    if (salvo) setAgente(salvo);
  }, []);

  const handleAgenteChange = (e) => {
    setAgente(e.target.value);
    localStorage.setItem('capitu_agente_nome', e.target.value);
  };

  const compilarTexto = (template) => {
    const nome = agente.trim() || 'xxxxxx';
    return template.replace(/{agente}/g, nome);
  };

  const copiarColinha = (template, titulo) => {
    const textoPronto = compilarTexto(template);
    navigator.clipboard.writeText(textoPronto).then(() => {
      setToast({ visivel: true, mensagem: `📋 Colinha "${titulo}" copiada!` });
      setTimeout(() => setToast({ visivel: false, mensagem: '' }), 2500);
    });
  };

  const abrirModalCriar = () => {
    setFormData({
      id: null,
      titulo: '',
      categoria: 'Cancelamento',
      cor: '#FEF9E7',
      borda: '#F9E79F',
      conteudo: "Olá, xx. Tudo bem? Me chamo {agente}...\n\nAtenciosamente,\n{agente}\nEquipe Estante Virtual 💚"
    });
    setModalAberto(true);
  };

  const abrirModalEditar = (e, item) => {
    e.stopPropagation();
    setFormData({ ...item });
    setModalAberto(true);
  };

  const salvarColinha = (e) => {
    e.preventDefault();
    if (formData.id) {
      setColinhas(colinhas.map(c => c.id === formData.id ? formData : c));
      setToast({ visivel: true, mensagem: '✏️ Colinha atualizada!' });
    } else {
      setColinhas([{ ...formData, id: Date.now() }, ...colinhas]);
      setToast({ visivel: true, mensagem: '✨ Nova colinha publicada!' });
    }
    setModalAberto(false);
    setTimeout(() => setToast({ visivel: false, mensagem: '' }), 2500);
  };

  const categorias = ['Todas', ...new Set(colinhas.map(c => c.categoria))];
  const filtradas = categoriaAtiva === 'Todas' ? colinhas : colinhas.filter(c => c.categoria === categoriaAtiva);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 24px 60px 24px' }}>
      
      {/* BARRA DE CONFIGURAÇÃO */}
      <div style={{ background: '#FFF', borderRadius: '14px', padding: '18px 24px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--ev-teal-dark)' }}>✍️ Seu Nome (Assinatura):</label>
          <input
            type="text"
            placeholder="Ex: Mariana Silva"
            value={agente}
            onChange={handleAgenteChange}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', width: '220px' }}
          />
        </div>

        {isSupervisor && (
          <button onClick={abrirModalCriar} style={{ background: 'var(--ev-teal-primary)', color: '#FFF', border: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
            ➕ Adicionar Colinha
          </button>
        )}
      </div>

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        {categorias.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoriaAtiva(cat)}
            style={{
              padding: '6px 16px', borderRadius: 'var(--radius-pill)', border: '1px solid',
              borderColor: categoriaAtiva === cat ? 'var(--ev-teal-primary)' : 'var(--border-subtle)',
              background: categoriaAtiva === cat ? 'var(--ev-teal-primary)' : '#FFF',
              color: categoriaAtiva === cat ? '#FFF' : 'var(--text-muted)',
              fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* GRID KEEP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
        {filtradas.map(c => (
          <div
            key={c.id}
            onClick={() => copiarColinha(c.conteudo, c.titulo)}
            style={{
              backgroundColor: c.cor, border: `1px solid ${c.borda}`, borderRadius: '14px', padding: '20px',
              cursor: 'pointer', transition: 'transform 0.18s ease, box-shadow 0.18s ease', position: 'relative',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: 'rgba(0,0,0,0.5)' }}>{c.categoria}</span>
              {isSupervisor && (
                <button onClick={e => abrirModalEditar(e, c)} style={{ background: '#FFF', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '6px', cursor: 'pointer', padding: '2px 8px', fontSize: '0.75rem' }}>
                  ✏️ Editar
                </button>
              )}
            </div>

            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--text-dark)' }}>{c.titulo}</h4>
            <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {compilarTexto(c.conteudo)}
            </div>
            <div style={{ marginTop: '16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: '700', color: 'var(--ev-teal-primary)' }}>
              Clique no card para copiar 📋
            </div>
          </div>
        ))}
      </div>

      {/* MODAL SUPERVISOR */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,30,30,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#FFF', borderRadius: '14px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ margin: '0 0 14px 0', color: 'var(--ev-teal-dark)' }}>{formData.id ? '✏️ Editar Colinha' : '➕ Nova Colinha'}</h3>
            <form onSubmit={salvarColinha}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Título</label>
                <input type="text" required value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Categoria</label>
                <input type="text" required value={formData.categoria} onChange={e => setFormData({ ...formData, categoria: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px' }}>Conteúdo (use tag {'{agente}'})</label>
                <textarea rows="6" required value={formData.conteudo} onChange={e => setFormData({ ...formData, conteudo: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#F1F5F9', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--ev-teal-primary)', color: '#FFF', fontWeight: '700', cursor: 'pointer' }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.visivel && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: 'var(--ev-teal-dark)', color: '#FFF', padding: '12px 20px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--ev-turquoise)', zIndex: 1100, fontWeight: '700' }}>
          {toast.mensagem}
        </div>
      )}
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function HomeView({ setView, isSupervisor, usuarioLogado }) {
  const [comunicados, setComunicados] = useState([]);
  const [novoAviso, setNovoAviso] = useState('');
  const [autorAviso, setAutorAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  // 1. CARREGAR COMUNICADOS RÁPIDOS DO MURAL
  const carregarAvisos = async () => {
    try {
      const { data, error } = await supabase
        .from('regulamentos')
        .select('*')
        .order('id', { ascending: false })
        .limit(3);

      if (!error && data) {
        setComunicados(data);
      }
    } catch (err) {
      console.error('Erro ao ler avisos:', err);
    }
  };

  useEffect(() => {
    carregarAvisos();
  }, []);

  return (
    <div style={{ maxWidth: '1280px', margin: '32px auto', padding: '0 24px 64px 24px' }}>
      
      {/* BANNER DE BOAS-VINDAS */}
      <section style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1.5px solid #1E293B',
        padding: '36px 40px',
        marginBottom: '32px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '4px 4px 0px #0F172A'
      }}>
        {/* LIVRO ABERTO DE FUNDO (MARCA D'ÁGUA EM LINHAS PRETO E BRANCO) */}
        <img
          src="/livro-aberto.png"
          alt="Livro Aberto"
          style={{
            position: 'absolute',
            right: '-20px',
            bottom: '-25px',
            width: '260px',
            opacity: 0.12,
            filter: 'grayscale(100%) contrast(150%)',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '780px' }}>
          <div style={{
            display: 'inline-block',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            fontSize: '0.74rem',
            fontWeight: '800',
            padding: '4px 12px',
            borderRadius: '9999px',
            marginBottom: '12px',
            letterSpacing: '0.5px'
          }}>
            PAINEL OPERACIONAL EV 📖
          </div>

          <h1 style={{
            margin: '0 0 10px 0',
            fontSize: '2.1rem',
            fontWeight: '900',
            color: '#0F172A',
            letterSpacing: '-0.5px'
          }}>
            Olá, {usuarioLogado?.nome || 'Operador(a)'}! Bem-vindo ao Capitu.
          </h1>

          <p style={{
            margin: 0,
            fontSize: '1rem',
            color: '#475569',
            lineHeight: '1.6'
          }}>
            Central de apoio do time de atendimento da <strong>Estante Virtual</strong>. Acesse respostas prontas, consulte políticas de CDC e atalhos com sincronização em tempo real.
          </p>
        </div>
      </section>

      {/* GRADE DE ACESSO RÁPIDO COM OS LIVROS PERSONALIZADOS EM P&B */}
      <section style={{ marginBottom: '36px' }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '900',
          color: '#0F172A',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>📚</span> Módulos de Atendimento
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}>

          {/* CARD 1: COLINHAS (LIVRO ABERTO) */}
          <div
            onClick={() => setView('colinhas')}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '2px solid #0F172A',
              padding: '28px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '3px 3px 0px #0F172A',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '190px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(-2px, -2px)';
              e.currentTarget.style.boxShadow = '6px 6px 0px #0F172A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0px, 0px)';
              e.currentTarget.style.boxShadow = '3px 3px 0px #0F172A';
            }}
          >
            {/* IMAGEM DO LIVRO EM MARCA D'ÁGUA P&B */}
            <img
              src="/livro-aberto.png"
              alt="Colinhas"
              style={{
                position: 'absolute',
                right: '12px',
                bottom: '12px',
                width: '120px',
                opacity: 0.18,
                filter: 'grayscale(100%) contrast(160%)',
                pointerEvents: 'none'
              }}
            />

            <div>
              <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '8px' }}>📝</span>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', fontWeight: '900', color: '#0F172A' }}>
                Colinhas & Respostas
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: '1.5', maxWidth: '80%' }}>
                Modelos de mensagens rápidas com assinatura automática para copiar e colar no ticket.
              </p>
            </div>

            <div style={{ marginTop: '16px', fontSize: '0.84rem', fontWeight: '800', color: '#006968' }}>
              Abrir mural de colinhas →
            </div>
          </div>

          {/* CARD 2: REGULAMENTOS (LIVRO COM MARCADOR) */}
          <div
            onClick={() => setView('regulamentos')}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '2px solid #0F172A',
              padding: '28px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '3px 3px 0px #0F172A',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '190px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(-2px, -2px)';
              e.currentTarget.style.boxShadow = '6px 6px 0px #0F172A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0px, 0px)';
              e.currentTarget.style.boxShadow = '3px 3px 0px #0F172A';
            }}
          >
            {/* IMAGEM DO LIVRO FECHADO EM MARCA D'ÁGUA P&B */}
            <img
              src="/livro-fechado.png"
              alt="Regulamentos"
              style={{
                position: 'absolute',
                right: '14px',
                bottom: '10px',
                width: '110px',
                opacity: 0.18,
                filter: 'grayscale(100%) contrast(160%)',
                pointerEvents: 'none'
              }}
            />

            <div>
              <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '8px' }}>📜</span>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', fontWeight: '900', color: '#0F172A' }}>
                Regulamentos & CDC
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: '1.5', maxWidth: '80%' }}>
                Prazos legais, regras de devolução, termos de arrependimento e diretrizes operacionais.
              </p>
            </div>

            <div style={{ marginTop: '16px', fontSize: '0.84rem', fontWeight: '800', color: '#006968' }}>
              Consultar diretrizes →
            </div>
          </div>

          {/* CARD 3: LINKS ÚTEIS (PILHA DE LIVROS) */}
          <div
            onClick={() => setView('links')}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '2px solid #0F172A',
              padding: '28px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '3px 3px 0px #0F172A',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '190px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(-2px, -2px)';
              e.currentTarget.style.boxShadow = '6px 6px 0px #0F172A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0px, 0px)';
              e.currentTarget.style.boxShadow = '3px 3px 0px #0F172A';
            }}
          >
            {/* IMAGEM DA PILHA DE LIVROS EM MARCA D'ÁGUA P&B */}
            <img
              src="/livro-pilha.png"
              alt="Links"
              style={{
                position: 'absolute',
                right: '12px',
                bottom: '12px',
                width: '115px',
                opacity: 0.18,
                filter: 'grayscale(100%) contrast(160%)',
                pointerEvents: 'none'
              }}
            />

            <div>
              <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '8px' }}>🔗</span>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', fontWeight: '900', color: '#0F172A' }}>
                Links & Sistemas
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: '1.5', maxWidth: '80%' }}>
                Acessos diretos para Zendesk, NCA, painéis de livreiros, formulários e planilhas mestras.
              </p>
            </div>

            <div style={{ marginTop: '16px', fontSize: '0.84rem', fontWeight: '800', color: '#006968' }}>
              Ver ferramentas da equipe →
            </div>
          </div>

        </div>
      </section>

      {/* MURAL COM TEXTURA DE LINHAS DE CADERNO / FOLHA PAUTADA P&B */}
      <section style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1.5px solid #0F172A',
        boxShadow: '4px 4px 0px #0F172A',
        padding: '32px',
        position: 'relative',
        backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #F1F5F9 28px)',
        backgroundAttachment: 'local'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', color: '#0F172A' }}>
              📌 Mural de Avisos da Supervisão
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: '#64748B' }}>
              Orientações prioritárias para o turno de atendimento.
            </p>
          </div>

          <span style={{
            fontSize: '0.78rem',
            fontWeight: '800',
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            padding: '4px 10px',
            borderRadius: '6px',
            color: '#475569'
          }}>
            Atualizado em tempo real
          </span>
        </div>

        {/* LISTAGEM DOS AVISOS DO MURAL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '12px',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px'
          }}>
            <span style={{ fontSize: '1.4rem' }}>🚨</span>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>
                Atenção ao prazo de postagem reversa dos Correios
              </div>
              <div style={{ fontSize: '0.86rem', color: '#475569', lineHeight: '1.5' }}>
                Lembrem-se de reforçar ao cliente que os códigos de postagem reversa possuem validade de até 7 dias corridos após a emissão.
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '12px',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px'
          }}>
            <span style={{ fontSize: '1.4rem' }}>💡</span>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>
                Nova colinha para atrasos de rastreio
              </div>
              <div style={{ fontSize: '0.86rem', color: '#475569', lineHeight: '1.5' }}>
                Adicionamos um modelo atualizado na categoria <strong>Logística</strong> com o atalho <code>/rastreio</code>.
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
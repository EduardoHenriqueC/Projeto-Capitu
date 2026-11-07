'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue, memo } from 'react';
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

// Remove tags HTML para gerar um índice de busca limpo
const stripHtml = (html) => (html || '').replace(/<[^>]*>?/gm, '');

// Caracteres "invisíveis" que viram um espaço/recuo ao colar no e-mail:
// espaço comum, &nbsp; ( ), espaços tipográficos, zero-width (​-‍, ⁠) e BOM (﻿)
const INVISIVEIS = '\\s\\p{Z}\\p{Cf}\\p{Cc}\\u034F\\u115F\\u1160\\u180E\\u2800\\u3164\\uFFA0';
const RE_INICIO_INVISIVEL = new RegExp(`^[${INVISIVEIS}]+`, 'u');
const RE_TAG_VAZIA_INICIAL = new RegExp(
  `^(?:<p[^>]*>[${INVISIVEIS}]*(?:<br\\s*/?>|&nbsp;)?[${INVISIVEIS}]*</p>|<div[^>]*>[${INVISIVEIS}]*(?:<br\\s*/?>|&nbsp;)?[${INVISIVEIS}]*</div>|<br\\s*/?>|&nbsp;|&#160;|&#xa0;|[${INVISIVEIS}])+`,
  'iu'
);
const RE_ESPACO_APOS_TAG = new RegExp(`^((?:<[^>]+>)+)(?:[${INVISIVEIS}]|&nbsp;|&#160;)+`, 'iu');

// Higieniza rigorosamente o início do texto removendo qualquer espaço, &nbsp;, caractere invisível ou tag vazia da primeira linha
const limparEspacosIniciais = (str) => {
  if (!str) return '';
  let res = str.trim();
  for (let i = 0; i < 4; i++) {
    const antes = res;
    res = res.replace(RE_TAG_VAZIA_INICIAL, '');
    res = res.replace(RE_ESPACO_APOS_TAG, '$1');
    res = res.replace(RE_INICIO_INVISIVEL, '');
    if (res === antes) break;
  }
  return res.trim();
};

// =====================================================================
// MOTOR DE CÁLCULO DE DIAS ÚTEIS E FERIADOS (COM CACHE DE MÓDULO)
// =====================================================================

const CACHE_FERIADOS = {};

const calcularDataPascoa = (ano) => {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
};

const formatarChaveISO = (data) => {
  const a = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
};

const obterFeriadosNacionais = (ano) => {
  if (CACHE_FERIADOS[ano]) return CACHE_FERIADOS[ano];

  const pascoa = calcularDataPascoa(ano);
  const somarDias = (base, n) => {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return d;
  };

  const feriados = new Set([
    `${ano}-01-01`,
    formatarChaveISO(somarDias(pascoa, -48)),
    formatarChaveISO(somarDias(pascoa, -47)),
    formatarChaveISO(somarDias(pascoa, -2)),
    formatarChaveISO(pascoa),
    `${ano}-04-21`,
    `${ano}-05-01`,
    formatarChaveISO(somarDias(pascoa, 60)),
    `${ano}-09-07`,
    `${ano}-10-12`,
    `${ano}-11-02`,
    `${ano}-11-15`,
    `${ano}-11-20`,
    `${ano}-12-25`,
  ]);

  CACHE_FERIADOS[ano] = feriados;
  return feriados;
};

export const calcularDataPrazo = (qtd = 2, tipoPrazo = 'uteis', dataBase = new Date()) => {
  let atual = new Date(dataBase);
  atual.setHours(0, 0, 0, 0);

  if (tipoPrazo === 'corridos') {
    atual.setDate(atual.getDate() + qtd);
    return atual;
  }

  let diasContados = 0;
  while (diasContados < qtd) {
    atual.setDate(atual.getDate() + 1);
    const ano = atual.getFullYear();
    const feriados = obterFeriadosNacionais(ano);

    const diaSemana = atual.getDay();
    const chave = formatarChaveISO(atual);

    if (diaSemana !== 0 && diaSemana !== 6 && !feriados.has(chave)) {
      diasContados++;
    }
  }
  return atual;
};

const formatarDataBR = (data) =>
  data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

let CACHE_PRAZO_HOJE = null;
let DIA_ULTIMO_CALCULO = null;

const obterPrazo2DiasUteisFormatado = () => {
  const hojeStr = new Date().toDateString();
  if (CACHE_PRAZO_HOJE && DIA_ULTIMO_CALCULO === hojeStr) {
    return CACHE_PRAZO_HOJE;
  }
  DIA_ULTIMO_CALCULO = hojeStr;
  CACHE_PRAZO_HOJE = formatarDataBR(calcularDataPrazo(2, 'uteis'));
  return CACHE_PRAZO_HOJE;
};

const RE_ME_CHAMO_E = /Me chamo {agente} e /gi;
const RE_ME_CHAMO = /Me chamo {agente}/gi;
const RE_AGENTE = /{agente}/gi;
const RE_ATENCIOSAMENTE = /\n*Atenciosamente,?\s*(\n.*)*$/i;
const RE_EQUIPE = /\n*Equipe Estante Virtual.*$/i;
const RE_PRAZO_TAG = /{prazo_retorno}/gi;
const RE_PRAZO_DATA = /(prazo\s*(?:de)?\s*retorno\s*[:\-]?\s*)\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/gi;

const compilarTextoRapido = (template, dataFormatada) => {
  if (!template) return '';
  const compilado = template
    .replace(RE_ME_CHAMO_E, '')
    .replace(RE_ME_CHAMO, 'Aqui é da Equipe Estante Virtual')
    .replace(RE_AGENTE, '')
    .replace(RE_ATENCIOSAMENTE, '')
    .replace(RE_EQUIPE, '')
    .replace(RE_PRAZO_TAG, dataFormatada)
    .replace(RE_PRAZO_DATA, `$1${dataFormatada}`);
  return limparEspacosIniciais(compilado);
};

// Cores por categoria (cache: antes era recalculado, com normalize, a cada render de cada card)
const COR_PADRAO = { bg: '#FFFFFF', border: '#CBD5E1' };
const REGRAS_COR = [
  [['relacionamento'], { bg: '#F5EEF8', border: '#D7BDE2' }],
  [['mascara'], { bg: '#F2F4F4', border: '#D5D8DC' }],
  [['entrega', 'rastreio'], { bg: '#E8F8F5', border: '#A3E4D7' }],
  [['atraso', 'extravio'], { bg: '#FEF9E7', border: '#F9E79F' }],
  [['vendedor', 'standby'], { bg: '#FDF2E9', border: '#F5CBA7' }],
  [['troca', 'devolu'], { bg: '#F9EBEA', border: '#F2D7D5' }],
  [['cancelamento', 'reembolso'], { bg: '#FDEDEC', border: '#F5B7B1' }],
  [['financeiro', 'pagamento'], { bg: '#EAF2F8', border: '#A9CCE3' }],
  [['cadastro', 'login'], { bg: '#EAFAF1', border: '#A9DFBF' }],
  [['plataforma', 'carrinho'], { bg: '#F4ECF7', border: '#D2B4DE' }]
];
const CACHE_CORES = new Map();
const getCor = (catNome) => {
  const chave = catNome || '';
  const salvo = CACHE_CORES.get(chave);
  if (salvo) return salvo;
  const nome = normalizar(chave);
  let cor = COR_PADRAO;
  for (const [termos, valor] of REGRAS_COR) {
    if (termos.some((t) => nome.includes(t))) { cor = valor; break; }
  }
  CACHE_CORES.set(chave, cor);
  return cor;
};

const colador = new Intl.Collator('pt-BR');

// Cache em memória: ao voltar para a aba Colinhas os dados aparecem na hora e
// são atualizados em segundo plano. Fica separado por usuário e vale só no dia atual.
const CACHE_DADOS = { chave: null, dia: null, colinhas: null, categorias: null };
const chaveDoUsuario = (u) => (u && (u.id || u.email || u.nome)) || null;
const lerCache = (chave, campo) =>
  chave && CACHE_DADOS.chave === chave && CACHE_DADOS.dia === new Date().toDateString()
    ? CACHE_DADOS[campo]
    : null;
const gravarCache = (chave, campo, valor) => {
  if (!chave) return;
  if (CACHE_DADOS.chave !== chave) {
    CACHE_DADOS.chave = chave;
    CACHE_DADOS.colinhas = null;
    CACHE_DADOS.categorias = null;
  }
  CACHE_DADOS.dia = new Date().toDateString();
  CACHE_DADOS[campo] = valor;
};

const LOTE_CARDS = 24;

// ---------------------------------------------------------------------
// CÓPIA PARA E-MAIL
// Gera HTML e texto limpos, SEM nada no início (espaço, &nbsp;, <br>, zero-width, bloco vazio).
// ---------------------------------------------------------------------
const BLOCOS = new Set(['DIV', 'P', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'TR']);

const textoDoNo = (raiz) => {
  // innerText não funciona em elemento fora da página (perde as quebras de linha): converte manualmente
  let out = '';
  const visitar = (no) => {
    if (no.nodeType === 3) { out += no.nodeValue; return; }
    if (no.nodeType !== 1) return;
    if (no.tagName === 'BR') { out += '\n'; return; }
    const bloco = BLOCOS.has(no.tagName);
    if (bloco && out && !out.endsWith('\n')) out += '\n';
    if (no.tagName === 'LI') out += '• ';
    no.childNodes.forEach(visitar);
    if (bloco && out && !out.endsWith('\n')) out += '\n';
  };
  visitar(raiz);
  return out.replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').replace(RE_INICIO_INVISIVEL, '').replace(/\s+$/, '');
};

const prepararParaCopia = (htmlStr) => {
  let html = limparEspacosIniciais((htmlStr || '').replace(/\r\n/g, '\n'));
  html = html.replace(/<\/div>\s*<div>/gi, '</div><div>');
  html = html.replace(/<\/p>\s*<p>/gi, '</p><p>');
  html = html.replace(/<ul[^>]*>\s*<li/gi, '<ul><li');
  html = html.replace(/<\/li>\s*<li>/gi, '</li><li>');
  html = html.replace(/<\/li>\s*<\/ul>/gi, '</li></ul>');
  html = html.replace(/\n/g, '<br>');

  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Higieniza atributos de estilo que poluem a colagem no email
  temp.querySelectorAll('*').forEach((el) => {
    el.removeAttribute('class');
    el.removeAttribute('id');
    if (el.hasAttribute('style')) {
      el.style.backgroundColor = '';
      el.style.background = '';
      el.style.fontFamily = '';
      el.style.fontSize = '';
      el.style.lineHeight = '';
      el.style.color = '';
      if (!el.getAttribute('style') || el.getAttribute('style').trim() === '') el.removeAttribute('style');
    }
  });

  // Remove tudo que gera recuo/linha em branco antes da primeira palavra
  const primeiroTexto = (no) => {
    const w = document.createTreeWalker(no, NodeFilter.SHOW_TEXT);
    let t = w.nextNode();
    while (t && !t.nodeValue.replace(RE_INICIO_INVISIVEL, '')) {
      t.parentNode.removeChild(t);
      t = w.nextNode();
    }
    return t;
  };
  while (temp.firstChild) {
    const fc = temp.firstChild;
    if (fc.nodeType === 3) {
      fc.nodeValue = fc.nodeValue.replace(RE_INICIO_INVISIVEL, '');
      if (!fc.nodeValue) { temp.removeChild(fc); continue; }
      break;
    }
    if (fc.nodeType === 1) {
      if (fc.tagName === 'BR') { temp.removeChild(fc); continue; }
      const dentro = (fc.textContent || '').replace(RE_INICIO_INVISIVEL, '');
      if (!dentro && !fc.querySelector('img')) { temp.removeChild(fc); continue; }
      // <br> ou espaços no começo DENTRO do primeiro bloco
      let f = fc;
      while (f.firstChild && f.firstChild.nodeType === 1 && f.firstChild.tagName === 'BR') f.removeChild(f.firstChild);
      const t = primeiroTexto(fc);
      if (t) t.nodeValue = t.nodeValue.replace(RE_INICIO_INVISIVEL, '');
      break;
    }
    temp.removeChild(fc);
  }

  const cleanHtml = temp.innerHTML.replace(new RegExp(`^((?:<[^>]+>)*)(?:[${INVISIVEIS}]|&nbsp;)+`, 'iu'), '$1').trim();
  return { html: cleanHtml, text: textoDoNo(temp) };
};

// =====================================================================
// CARD INDIVIDUAL MEMOIZADO
// =====================================================================

const CardColinha = memo(function CardColinha({
  colinha,
  cores,
  isSupervisor,
  onVerNota,
  onAlternarFixar,
  onEditar,
  onExcluir
}) {
  return (
    <div
      onClick={() => onVerNota(colinha)}
      className={`card-colinha-otimizado ${colinha.fixado ? 'fixado' : ''}`}
      style={{
        backgroundColor: cores.bg,
        border: colinha.fixado ? '2px solid #006968' : `1px solid ${cores.border}`,
        borderRadius: '16px',
        padding: '20px',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: colinha.fixado ? '0 6px 16px rgba(0, 105, 104, 0.12)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        minWidth: 0
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {colinha.fixado && (
            <span style={{ fontSize: '0.68rem', fontWeight: '800', background: '#004D4C', color: '#FFF', padding: '2px 8px', borderRadius: '4px' }}>
              📌 FIXADA
            </span>
          )}
          <span className="tag-categoria-badge" style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: 'rgba(0, 0, 0, 0.55)', letterSpacing: '0.4px', padding: '2px 6px', borderRadius: '4px' }}>
            {colinha.c}
          </span>
          {colinha.sub && (
            <span className="tag-sub-badge" style={{ fontSize: '0.68rem', fontWeight: '800', background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px', color: '#334155' }}>
              ↳ {colinha.sub}
            </span>
          )}
        </div>

        {isSupervisor && (
          <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => onAlternarFixar(e, colinha)}
              title={colinha.fixado ? 'Desafixar colinha' : 'Fixar colinha no topo'}
              className="btn-card-supervisor"
              style={{
                background: colinha.fixado ? '#006968' : '#FFFFFF',
                color: colinha.fixado ? '#FFFFFF' : '#475569',
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
              onClick={(e) => onEditar(e, colinha)}
              title="Editar e Mover Colinha"
              className="btn-card-supervisor"
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
              onClick={(e) => onExcluir(e, colinha)}
              title="Excluir Colinha"
              className="btn-excluir-hover btn-card-supervisor"
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
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#0F172A', fontWeight: '800', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        {colinha.t}
      </h4>

      {/* BLOCO DE TEXTO BLINDADO RICH TEXT */}
      <div
        className="card-texto-corpo"
        dangerouslySetInnerHTML={{ __html: colinha.txtCompilado }}
        style={{
          fontSize: '0.86rem',
          color: '#334155',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          maxHeight: '180px',
          overflow: 'hidden',
          position: 'relative'
        }}
      />
      <div className="card-gradiente-fade" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '36px', background: `linear-gradient(transparent, ${cores.bg})`, pointerEvents: 'none' }} />

      <div className="card-link-expandir" style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed rgba(0, 0, 0, 0.1)', textAlign: 'right', fontSize: '0.76rem', fontWeight: '700', color: '#006968' }}>
        Clique para expandir nota 🔍
      </div>
    </div>
  );
});

// =====================================================================
// COMPONENTE PRINCIPAL COLINHAS BOARD
// =====================================================================

export default function ColinhasBoard({ isSupervisor, usuarioLogado }) {
  const [isMounted, setIsMounted] = useState(false);
  const chaveCache = chaveDoUsuario(usuarioLogado);
  const [termoBusca, setTermoBusca] = useState('');
  
  // Categorias do banco
  const [categorias, setCategorias] = useState(() => lerCache(chaveCache, 'categorias') || []);
  const [filtroAtivo, setFiltroAtivo] = useState({ tipo: 'todas', id: 'todas', nome: 'Todas as Colinhas', parentId: null });
  const [expandidas, setExpandidas] = useState({});

  // Edição inline de Categorias / Subcategorias
  const [editandoCatId, setEditandoCatId] = useState(null);
  const [nomeEditando, setNomeEditando] = useState('');
  const [iconeEditando, setIconeEditando] = useState('');
  const salvandoCatRef = useRef(false);

  // Controle de Drag and Drop
  const dragItemRef = useRef(null);
  const [itemArrastandoId, setItemArrastandoId] = useState(null);

  // Toast e Modais
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' });
  const [modalAberto, setModalAberto] = useState(false);
  const [modalNota, setModalNota] = useState(null); 
  const [colinhaParaExcluir, setColinhaParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);

  // Formulário de Colinhas e Refs
  const [formData, setFormData] = useState({
    id: null,
    t: '',
    c: '',
    sub: '',
    atalho: '',
    txt: ''
  });
  const editorRichTextRef = useRef(null);
  const modalContainerRef = useRef(null);
  const modalTextRef = useRef(null);
  const [colinhas, setColinhas] = useState(() => lerCache(chaveCache, 'colinhas') || []);

  // Formulário de Categorias
  const [formCat, setFormCat] = useState({
    tipo: 'principal',
    nome: '',
    icone: '📁',
    parentId: ''
  });

  const dispararToast = (mensagem, tipo = 'sucesso') => {
    setToast({ visivel: true, mensagem, tipo });
    setTimeout(() => setToast({ visivel: false, mensagem: '', tipo: 'sucesso' }), 2800);
  };

  // Trava o scroll da página ao fundo sempre que um modal estiver ativo
  useEffect(() => {
    const algumModalAberto = Boolean(modalAberto || modalNota || modalCategoria || colinhaParaExcluir);
    if (algumModalAberto) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [modalAberto, modalNota, modalCategoria, colinhaParaExcluir]);

  // Cópia higienizada para e-mails: limpa cores, fontes forçadas e remove recuos na primeira linha
  const copiarComFormatacao = async (htmlStr) => {
    if (!htmlStr) return;
    const { html: cleanHtml, text: plainText } = prepararParaCopia(htmlStr);

    let copiou = false;
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        const blobHtml = new Blob([cleanHtml], { type: 'text/html' });
        const blobText = new Blob([plainText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText
          })
        ]);
        copiou = true;
      } catch (e) {
        console.warn('ClipboardItem não suportado neste contexto, usando fallback.', e);
      }
    }

    if (!copiou) {
      try {
        const helperDiv = document.createElement('div');
        helperDiv.innerHTML = cleanHtml;
        helperDiv.style.position = 'fixed';
        helperDiv.style.left = '-9999px';
        helperDiv.style.top = '-9999px';
        helperDiv.style.opacity = '0';
        helperDiv.style.background = 'transparent';
        helperDiv.style.color = '#000000';
        helperDiv.style.fontSize = '14px';

        document.body.appendChild(helperDiv);
        const range = document.createRange();
        range.selectNodeContents(helperDiv);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        document.execCommand('copy');
        document.body.removeChild(helperDiv);
        sel.removeAllRanges();
        copiou = true;
      } catch (err) {
        console.error('Erro no fallback de cópia: ', err);
      }
    }

    if (copiou) {
      dispararToast('📋 Colinha copiada com formatação limpa!', 'sucesso');
    } else {
      dispararToast('Erro ao copiar. Tente selecionar manualmente.', 'erro');
    }
  };

  // 1. CARREGAMENTO COM ORDENAÇÃO DINÂMICA
  const buscarCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_colinhas')
        .select('*')
        .order('ordem', { ascending: true })
        .order('id', { ascending: true });

      if (error) {
        const { data: fallbackData } = await supabase
          .from('categorias_colinhas')
          .select('*')
          .order('id', { ascending: true });
        if (fallbackData) { setCategorias(fallbackData); gravarCache(chaveCache, 'categorias', fallbackData); }
      } else if (data) {
        setCategorias(data);
        gravarCache(chaveCache, 'categorias', data);
      }
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    }
  };

  const buscarColinhas = async () => {
    try {
      const { data, error } = await supabase
        .from('colinhas')
        .select('*');

      if (error) throw error;
      if (data) {
        const prazoHoje = obterPrazo2DiasUteisFormatado();

        const processadas = data.map((item) => ({
          id: item.id,
          t: item.titulo,
          c: item.categoria,
          sub: item.subcategoria || '',
          txt: item.conteudo,
          txtCompilado: compilarTextoRapido(item.conteudo, prazoHoje),
          atalho: item.atalho || '',
          fixado: Boolean(item.fixado),
          atualizadoEm: item.atualizado_em || item.criado_em || item.created_at || item.id,
          cNorm: normalizar(item.categoria),
          subNorm: normalizar(item.subcategoria || ''),
          buscaIndex: normalizar(`${item.titulo} ${stripHtml(item.conteudo)} ${item.atalho || ''}`)
        }));
        setColinhas(processadas);
        gravarCache(chaveCache, 'colinhas', processadas);
      }
    } catch (err) {
      console.error('Erro ao buscar colinhas:', err);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    buscarCategorias();
    buscarColinhas();

    // Várias alterações seguidas (ou o nosso próprio salvar) viram UMA só recarga
    let tCol = null;
    let tCat = null;
    const agendarColinhas = () => { clearTimeout(tCol); tCol = setTimeout(buscarColinhas, 250); };
    const agendarCategorias = () => { clearTimeout(tCat); tCat = setTimeout(buscarCategorias, 250); };

    const canal = supabase
      .channel('colinhas_realtime_board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colinhas' }, agendarColinhas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias_colinhas' }, agendarCategorias)
      .subscribe();

    return () => {
      clearTimeout(tCol);
      clearTimeout(tCat);
      supabase.removeChannel(canal);
    };
  }, []);

  useEffect(() => {
    if (modalNota && modalContainerRef.current) {
      modalContainerRef.current.focus({ preventScroll: true });
    }
  }, [modalNota]);

  // Sincroniza o ref do editor quando o modal de criar/editar é aberto
  useEffect(() => {
    if (modalAberto && editorRichTextRef.current) {
      if (editorRichTextRef.current.innerHTML !== formData.txt) {
        editorRichTextRef.current.innerHTML = formData.txt || '';
      }
    }
  }, [modalAberto, formData.id]);

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

    Object.keys(subsMap).forEach((paiId) => {
      subsMap[paiId].sort((a, b) => (a.ordem ?? a.id) - (b.ordem ?? b.id));
    });

    return { categoriasPrincipais: principais, subcategoriasPorPai: subsMap };
  }, [categorias]);

  // FIXAÇÃO COM TIMESTAMP
  const alternarFixarColinha = async (e, colinha) => {
    e.stopPropagation();
    const novoStatus = !colinha.fixado;
    const agora = new Date().toISOString();

    setColinhas((prev) =>
      prev.map((c) => (c.id === colinha.id ? { ...c, fixado: novoStatus, atualizadoEm: agora } : c))
    );

    try {
      const { error } = await supabase
        .from('colinhas')
        .update({
          fixado: novoStatus,
          atualizado_em: agora
        })
        .eq('id', colinha.id);

      if (error) throw error;
      dispararToast(novoStatus ? '📌 Colinha fixada no topo!' : 'Colinha desafixada!', 'sucesso');
    } catch (err) {
      console.error('Erro ao fixar colinha:', err);
      dispararToast('Erro ao atualizar status: ' + err.message, 'erro');
      await buscarColinhas();
    }
  };

  // CONTROLE DE EDIÇÃO DE CATEGORIAS E SUBCATEGORIAS
  const iniciarEdicao = (e, cat) => {
    if (e) e.stopPropagation();
    setEditandoCatId(cat.id);
    setNomeEditando(cat.nome);
    setIconeEditando(cat.icone || (cat.parent_id ? '↳' : '📁'));
  };

  const cancelarEdicao = () => {
    setEditandoCatId(null);
    setNomeEditando('');
    setIconeEditando('');
  };

  const salvarEdicaoCategoria = async (cat, tipo) => {
    if (salvandoCatRef.current) return;
    const novoNome = nomeEditando.trim();
    const novoIcone = iconeEditando.trim() || (tipo === 'principal' ? '📁' : '↳');

    if (!novoNome) {
      cancelarEdicao();
      return;
    }

    const mudouNome = novoNome !== cat.nome;
    const mudouIcone = novoIcone !== cat.icone;

    if (!mudouNome && !mudouIcone) {
      cancelarEdicao();
      return;
    }

    salvandoCatRef.current = true;
    try {
      const { error: errCat } = await supabase
        .from('categorias_colinhas')
        .update({ nome: novoNome, icone: novoIcone })
        .eq('id', cat.id);

      if (errCat) throw errCat;

      if (mudouNome) {
        if (tipo === 'principal') {
          await supabase.from('colinhas').update({ categoria: novoNome }).eq('categoria', cat.nome);
        } else {
          await supabase.from('colinhas').update({ subcategoria: novoNome }).eq('subcategoria', cat.nome);
        }
      }

      setCategorias((prev) =>
        prev.map((item) => (item.id === cat.id ? { ...item, nome: novoNome, icone: novoIcone } : item))
      );

      if (mudouNome) {
        setColinhas((prev) =>
          prev.map((item) => {
            if (tipo === 'principal' && (item.c === cat.nome || item.cNorm === normalizar(cat.nome))) {
              return { ...item, c: novoNome, cNorm: normalizar(novoNome), buscaIndex: normalizar(`${item.t} ${stripHtml(item.txt)} ${item.atalho || ''}`) };
            }
            if (tipo === 'subcategoria' && (item.sub === cat.nome || item.subNorm === normalizar(cat.nome))) {
              return { ...item, sub: novoNome, subNorm: normalizar(novoNome) };
            }
            return item;
          })
        );

        if (filtroAtivo.id === cat.id) {
          setFiltroAtivo((prev) => ({ ...prev, nome: novoNome }));
        }
      }

      dispararToast(tipo === 'principal' ? `📁 Categoria atualizada!` : `📂 Subcategoria atualizada!`, 'sucesso');
    } catch (err) {
      console.error('Erro ao atualizar categoria:', err);
      dispararToast('Erro ao atualizar: ' + err.message, 'erro');
    } finally {
      salvandoCatRef.current = false;
      cancelarEdicao();
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
      (cp) => normalizar(cp.nome) === item.cNorm || normalizar(cp.nome).includes(item.cNorm) || item.cNorm.includes(normalizar(cp.nome))
    );
    setFormData({
      id: item.id,
      t: item.t,
      c: catEncontrada ? catEncontrada.nome : item.c,
      sub: item.sub || '',
      atalho: item.atalho || '',
      txt: limparEspacosIniciais(item.txt)
    });
    setModalAberto(true);
  };

  // Tratamento de Paste para padronização de fontes
  const handlePasteRichText = (e) => {
    e.preventDefault();

    let content = '';
    if (e.clipboardData.types.includes('text/plain') && !e.clipboardData.types.includes('text/html')) {
      content = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, content);
      return;
    }

    content = e.clipboardData.getData('text/html');
    if (!content) {
      content = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, content);
      return;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    const elements = tempDiv.querySelectorAll('*');
    elements.forEach(el => {
      el.style.fontFamily = '';
      el.style.fontSize = '';
      el.style.lineHeight = '';
      el.style.color = '';
      el.style.backgroundColor = '';
      el.removeAttribute('class');
      
      if (el.tagName === 'SPAN' && !el.getAttribute('style') && !el.className) {
        const parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
    });

    document.execCommand('insertHTML', false, tempDiv.innerHTML);
  };

  // Botões do Toolbar do Rich Text
  const handleFormatCommand = (e, cmd) => {
    e.preventDefault();
    document.execCommand(cmd, false, null);
    if (editorRichTextRef.current) {
      editorRichTextRef.current.focus();
    }
  };

  const salvarColinha = async (e) => {
    e.preventDefault();
    
    let conteudoHTML = editorRichTextRef.current ? editorRichTextRef.current.innerHTML : formData.txt;
    if (conteudoHTML) {
      conteudoHTML = limparEspacosIniciais(conteudoHTML);
    }

    if (!formData.t.trim() || !stripHtml(conteudoHTML).trim() || !formData.c) {
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
            conteudo: conteudoHTML,
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
              conteudo: conteudoHTML,
              atalho: formData.atalho || '',
              autor_nome: autor,
              fixado: false,
              atualizado_em: new Date().toISOString()
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
        parent_id: formCat.tipo === 'subcategoria' ? Number(formCat.parentId) : null,
        ordem: categorias.length + 1
      };

      const { error } = await supabase.from('categorias_colinhas').insert([nova]);
      if (error) throw error;

      dispararToast(
        formCat.tipo === 'subcategoria' ? '📂 Subcategoria criada com sucesso!' : '📁 Categoria criada com sucesso!',
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

  // ORDENAÇÃO E FILTRAGEM (Pesquisa Global Independente de Categoria)
  const buscaDiferida = useDeferredValue(termoBusca);
  const colinhasFiltradas = useMemo(() => {
    const termo = normalizar(buscaDiferida);
    const filtroNomeNorm = normalizar(filtroAtivo.nome);

    return colinhas
      .filter((c) => {
        const bateBusca = termo === '' || c.buscaIndex.includes(termo);

        if (termo !== '') {
          return bateBusca;
        }

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
          if (!c.sub || !c.subNorm) {
            bateCategoria = false;
          } else {
            bateCategoria = c.sub === filtroAtivo.nome || c.subNorm === filtroNomeNorm;
          }
        }
        return bateCategoria && bateBusca;
      })
      .sort((a, b) => {
        if (a.fixado !== b.fixado) return b.fixado ? 1 : -1;
        if (a.fixado && b.fixado) {
          const dataA = new Date(a.atualizadoEm || 0).getTime();
          const dataB = new Date(b.atualizadoEm || 0).getTime();
          if (dataB !== dataA) return dataB - dataA;
        }
        return colador.compare(a.t, b.t);
      });
  }, [colinhas, filtroAtivo, buscaDiferida]);

  // Renderização em lotes: só desenha os primeiros cards e libera mais ao rolar
  const chaveLista = `${filtroAtivo.id}|${buscaDiferida}`;
  const [lim, setLim] = useState({ chave: '', n: LOTE_CARDS });
  const limite = lim.chave === chaveLista ? lim.n : LOTE_CARDS;
  const temMais = colinhasFiltradas.length > limite;
  const visiveis = useMemo(() => colinhasFiltradas.slice(0, limite), [colinhasFiltradas, limite]);
  const sentinelaRef = useRef(null);

  useEffect(() => {
    if (!temMais || !sentinelaRef.current) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setLim({ chave: chaveLista, n: colinhasFiltradas.length });
      return undefined;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas[0].isIntersecting) setLim({ chave: chaveLista, n: limite + LOTE_CARDS });
      },
      { rootMargin: '700px 0px' }
    );
    obs.observe(sentinelaRef.current);
    return () => obs.disconnect();
  }, [temMais, limite, chaveLista, colinhasFiltradas.length]);

  // Funções estáveis para os cards (evita re-renderizar todos a cada tecla/toast)
  const acoesRef = useRef({});
  acoesRef.current = { fixar: alternarFixarColinha, editar: abrirModalEditar };
  const onFixarEstavel = useCallback((e, c) => acoesRef.current.fixar(e, c), []);
  const onEditarEstavel = useCallback((e, c) => acoesRef.current.editar(e, c), []);
  const onExcluirEstavel = useCallback((e, item) => {
    e.stopPropagation();
    setColinhaParaExcluir(item);
  }, []);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '36px 20px 80px 20px' }}>
      
      {/* ESTILOS CSS NATIVOS: Bloqueio estrito de overflow-x e quebra fluida */}
      <style>{`
        .card-colinha-otimizado {
          transition: transform 0.16s ease, box-shadow 0.16s ease;
          /* cards fora da tela não são desenhados (grande ganho em notebooks antigos) */
          content-visibility: auto;
          contain-intrinsic-size: auto 300px;
          overflow: hidden !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
        }
        .card-colinha-otimizado:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08) !important;
        }
        .card-texto-corpo {
          overflow-x: hidden !important;
          overflow-y: hidden !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
        }
        .card-texto-corpo b, .card-texto-corpo strong {
          font-weight: 800;
        }
        .card-texto-corpo ul, .modal-nota-texto ul, [contenteditable] ul {
          margin: 6px 0;
          padding-left: 20px;
          list-style-type: disc;
        }
        .card-texto-corpo li, .modal-nota-texto li, [contenteditable] li {
          margin-bottom: 4px;
        }
        .btn-excluir-hover:hover {
          background-color: #FEE2E2 !important;
          color: #DC2626 !important;
          border-color: #FCA5A5 !important;
        }
        
        .toolbar-rich-text button {
          background: #FFFFFF;
          border: 1px solid var(--border-search, #CBD5E1);
          border-radius: 4px;
          cursor: pointer;
          padding: 4px 10px;
          color: var(--texto-secundario, #334155);
          font-size: 0.88rem;
          transition: all 0.15s ease;
        }
        .toolbar-rich-text button:hover {
          background: var(--bg-item-aberto, #F1F5F9);
          color: #006968;
          border-color: #006968;
        }

        /* REGRAS EXCLUSIVAS DE MODO ESCURO */
        [data-theme="dark"] .card-colinha-otimizado {
          background-color: var(--bg-card, #13222D) !important;
          border-color: var(--border-card, #1E3545) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
        }
        [data-theme="dark"] .card-colinha-otimizado.fixado {
          border-color: #2DD4BF !important;
          box-shadow: 0 6px 18px rgba(45, 212, 191, 0.15) !important;
        }
        [data-theme="dark"] .card-colinha-otimizado h4 {
          color: var(--texto-primario, #F8FAFC) !important;
        }
        [data-theme="dark"] .card-colinha-otimizado .card-texto-corpo {
          color: var(--texto-secundario, #CBD5E1) !important;
        }
        [data-theme="dark"] .card-colinha-otimizado .card-gradiente-fade {
          background: linear-gradient(transparent, var(--bg-card, #13222D)) !important;
        }
        [data-theme="dark"] .card-colinha-otimizado .card-link-expandir {
          color: #2DD4BF !important;
          border-top-color: var(--border-card, #1E3545) !important;
        }
        [data-theme="dark"] .card-colinha-otimizado .tag-categoria-badge {
          color: #2DD4BF !important;
          background-color: rgba(45, 212, 191, 0.12) !important;
        }
        [data-theme="dark"] .card-colinha-otimizado .tag-sub-badge {
          background-color: var(--border-card, #1E3545) !important;
          color: var(--texto-secundario, #CBD5E1) !important;
        }
        [data-theme="dark"] .card-colinha-otimizado .btn-card-supervisor {
          background-color: var(--bg-card, #13222D) !important;
          border-color: var(--border-card, #1E3545) !important;
          color: var(--texto-secundario, #CBD5E1) !important;
        }
        [data-theme="dark"] .modal-nota-texto {
          background-color: var(--bg-subconteudo, #0F1A22) !important;
          border-color: var(--border-card, #1E3545) !important;
          color: var(--texto-secundario, #CBD5E1) !important;
        }
        [data-theme="dark"] .toolbar-rich-text button {
          background-color: var(--bg-input, #0F1A22);
          border-color: var(--border-card, #1E3545);
          color: var(--texto-secundario, #CBD5E1);
        }
      `}</style>

      {/* BARRA SUPERIOR DE PESQUISA */}
      <div style={{
        background: 'var(--bg-search, #FFFFFF)',
        borderRadius: '16px',
        padding: '16px 24px',
        border: '1.5px solid var(--border-search, #E2E8F0)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '300px', position: 'relative' }}>
          <span style={{ fontSize: '1.25rem', color: '#2DD4BF' }}>🔍</span>
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
              backgroundColor: 'transparent',
              color: 'var(--text-search, #1E293B)',
              paddingRight: '30px'
            }}
          />
          {termoBusca && (
            <button
              onClick={() => setTermoBusca('')}
              title="Limpar pesquisa"
              style={{
                position: 'absolute',
                right: '0',
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--texto-secundario, #64748B)',
                fontSize: '0.8rem',
                fontWeight: '800'
              }}
            >
              ✕
            </button>
          )}
        </div>

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
          overflowX: 'hidden',
          paddingRight: '6px'
        }}>
          
          <button
            onClick={() => {
              setTermoBusca('');
              setFiltroAtivo({ tipo: 'todas', id: 'todas', nome: 'Todas as Colinhas', parentId: null });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '12px',
              border: filtroAtivo.id === 'todas' ? '2px solid var(--texto-destaque-turquesa, #006968)' : '1px solid transparent',
              background: filtroAtivo.id === 'todas' ? 'rgba(45, 212, 191, 0.12)' : 'transparent',
              color: filtroAtivo.id === 'todas' ? 'var(--texto-destaque-turquesa, #006968)' : 'var(--texto-secundario, #64748B)',
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

            const isOpen = expandidas[cat.id] !== undefined
              ? expandidas[cat.id]
              : isSubAtivaDestePai;

            return (
              <div
                key={cat.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  opacity: itemArrastandoId === cat.id ? 0.4 : 1,
                  transition: 'opacity 0.15s ease'
                }}
                draggable={isSupervisor && editandoCatId !== cat.id}
                onDragStart={(e) => {
                  dragItemRef.current = { id: cat.id, tipo: 'principal' };
                  setItemArrastandoId(cat.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  if (isSupervisor && dragItemRef.current?.tipo === 'principal') {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }
                }}
                onDragEnd={() => {
                  dragItemRef.current = null;
                  setItemArrastandoId(null);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  if (!isSupervisor) return;
                  const dragData = dragItemRef.current;
                  if (!dragData || dragData.tipo !== 'principal' || dragData.id === cat.id) return;

                  const sourceIdx = categoriasPrincipais.findIndex((c) => c.id === dragData.id);
                  const targetIdx = categoriasPrincipais.findIndex((c) => c.id === cat.id);
                  if (sourceIdx === -1 || targetIdx === -1) return;

                  const novasPrincipais = [...categoriasPrincipais];
                  const [removido] = novasPrincipais.splice(sourceIdx, 1);
                  novasPrincipais.splice(targetIdx, 0, removido);

                  setCategorias((prev) => {
                    const subs = prev.filter((c) => Boolean(c.parent_id));
                    const reordenadas = novasPrincipais.map((c, idx) => ({ ...c, ordem: idx }));
                    return [...reordenadas, ...subs];
                  });

                  try {
                    const updates = novasPrincipais.map((c, idx) =>
                      supabase.from('categorias_colinhas').update({ ordem: idx }).eq('id', c.id)
                    );
                    const responses = await Promise.all(updates);
                    const erroEncontrado = responses.find((r) => r.error);
                    if (erroEncontrado) {
                      throw erroEncontrado.error;
                    }
                    dispararToast('Posição das categorias salva no banco!', 'sucesso');
                  } catch (err) {
                    console.error('Erro ao salvar nova ordem:', err);
                    dispararToast('Erro ao salvar no banco: ' + (err.message || 'Verifique as permissões'), 'erro');
                    await buscarCategorias();
                  }
                }}
              >
                <div
                  onClick={() => {
                    setTermoBusca('');
                    if (isAtiva && subs.length > 0) {
                      setExpandidas((prev) => ({ ...prev, [cat.id]: !isOpen }));
                    } else {
                      setExpandidas((prev) => ({ ...prev, [cat.id]: true }));
                      setFiltroAtivo({ tipo: 'principal', id: cat.id, nome: cat.nome, parentId: null });
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: isAtiva ? '2px solid var(--texto-destaque-turquesa, #006968)' : '1px solid transparent',
                    background: isAtiva ? 'rgba(45, 212, 191, 0.12)' : 'transparent',
                    color: isAtiva ? 'var(--texto-destaque-turquesa, #006968)' : 'var(--texto-primario, #334155)',
                    cursor: isSupervisor && editandoCatId !== cat.id ? 'grab' : 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                    {isSupervisor && editandoCatId !== cat.id && (
                      <span
                        title="Segure e arraste para reposicionar"
                        style={{ color: 'var(--texto-secundario, #94A3B8)', fontSize: '0.85rem', cursor: 'grab', userSelect: 'none', opacity: 0.6 }}
                      >
                        ⠿
                      </span>
                    )}

                    {/* EDIÇÃO INLINE */}
                    {editandoCatId === cat.id ? (
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget)) {
                            salvarEdicaoCategoria(cat, 'principal');
                          }
                        }}
                      >
                        <input
                          type="text"
                          value={iconeEditando}
                          onChange={(e) => setIconeEditando(e.target.value)}
                          maxLength={4}
                          title="Ícone / Emoji da categoria"
                          style={{
                            width: '36px',
                            textAlign: 'center',
                            background: 'var(--bg-input, #FFF)',
                            color: 'var(--texto-primario, #1E293B)',
                            border: '1.5px solid #2DD4BF',
                            borderRadius: '6px',
                            padding: '2px',
                            fontSize: '1.05rem',
                            outline: 'none',
                            flexShrink: 0
                          }}
                        />
                        <input
                          type="text"
                          value={nomeEditando}
                          onChange={(e) => setNomeEditando(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              salvarEdicaoCategoria(cat, 'principal');
                            } else if (e.key === 'Escape') {
                              cancelarEdicao();
                            }
                          }}
                          autoFocus
                          style={{
                            background: 'var(--bg-input, #FFF)',
                            color: 'var(--texto-primario, #1E293B)',
                            border: '1.5px solid #2DD4BF',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '0.88rem',
                            fontWeight: '700',
                            outline: 'none',
                            flex: 1,
                            minWidth: '60px'
                          }}
                        />
                        <button
                          onClick={() => salvarEdicaoCategoria(cat, 'principal')}
                          title="Salvar alteração"
                          style={{
                            background: '#006968',
                            color: '#FFF',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            flexShrink: 0
                          }}
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontSize: '1.15rem', flexShrink: 0 }}>{cat.icone || '📁'}</span>
                        <span
                          onDoubleClick={(e) => {
                            if (isSupervisor) iniciarEdicao(e, cat);
                          }}
                          title={isSupervisor ? 'Dê duplo clique ou clique no lápis para editar ícone e nome' : ''}
                          style={{ fontSize: '0.88rem', fontWeight: isAtiva ? '800' : '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}
                        >
                          {cat.nome}
                        </span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {subs.length > 0 && editandoCatId !== cat.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandidas((prev) => ({ ...prev, [cat.id]: !isOpen }));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--texto-secundario, #64748B)',
                          fontSize: '0.72rem',
                          padding: '2px 4px'
                        }}
                        title={isOpen ? 'Recolher' : 'Expandir subcategorias'}
                      >
                        {isOpen ? '▼' : '▶'}
                      </button>
                    )}

                    {isSupervisor && editandoCatId !== cat.id && (
                      <>
                        <button
                          onClick={(e) => iniciarEdicao(e, cat)}
                          title="Editar ícone e nome"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--texto-secundario, #94A3B8)',
                            fontSize: '0.76rem',
                            padding: '2px 4px'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#2DD4BF')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--texto-secundario, #94A3B8)')}
                        >
                          ✏️
                        </button>

                        <button
                          onClick={(e) => excluirCategoria(e, cat.id, cat.nome)}
                          title="Excluir categoria"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--texto-secundario, #94A3B8)',
                            fontSize: '0.76rem',
                            padding: '2px 4px'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--texto-secundario, #94A3B8)')}
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {subs.length > 0 && isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '32px', borderLeft: '2px solid var(--border-card, #E2E8F0)', marginLeft: '16px' }}>
                    {subs.map((sub) => {
                      const isSubAtiva = filtroAtivo.tipo === 'subcategoria' && filtroAtivo.id === sub.id;
                      return (
                        <div
                          key={sub.id}
                          style={{
                            opacity: itemArrastandoId === sub.id ? 0.4 : 1,
                            transition: 'opacity 0.15s ease'
                          }}
                          draggable={isSupervisor && editandoCatId !== sub.id}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            dragItemRef.current = { id: sub.id, tipo: 'subcategoria', parentId: cat.id };
                            setItemArrastandoId(sub.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => {
                            if (isSupervisor && dragItemRef.current?.tipo === 'subcategoria' && dragItemRef.current?.parentId === cat.id) {
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'move';
                            }
                          }}
                          onDragEnd={(e) => {
                            e.stopPropagation();
                            dragItemRef.current = null;
                            setItemArrastandoId(null);
                          }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isSupervisor) return;
                            const dragData = dragItemRef.current;
                            if (!dragData || dragData.tipo !== 'subcategoria' || dragData.parentId !== cat.id || dragData.id === sub.id) return;

                            const subsDestePai = subcategoriasPorPai[cat.id] || [];
                            const sourceIdx = subsDestePai.findIndex((s) => s.id === dragData.id);
                            const targetIdx = subsDestePai.findIndex((s) => s.id === sub.id);
                            if (sourceIdx === -1 || targetIdx === -1) return;

                            const novasSubs = [...subsDestePai];
                            const [removido] = novasSubs.splice(sourceIdx, 1);
                            novasSubs.splice(targetIdx, 0, removido);

                            setCategorias((prev) =>
                              prev.map((c) => {
                                const idx = novasSubs.findIndex((ns) => ns.id === c.id);
                                if (idx !== -1) {
                                  return { ...c, ordem: idx };
                                }
                                return c;
                              })
                            );

                            try {
                              const updates = novasSubs.map((s, idx) =>
                                supabase.from('categorias_colinhas').update({ ordem: idx }).eq('id', s.id)
                              );
                              const responses = await Promise.all(updates);
                              const erroEncontrado = responses.find((r) => r.error);
                              if (erroEncontrado) {
                                throw erroEncontrado.error;
                              }
                              dispararToast('Posição das subcategorias salva no banco!', 'sucesso');
                            } catch (err) {
                              console.error('Erro ao salvar ordem de subcategorias:', err);
                              dispararToast('Erro ao salvar no banco: ' + (err.message || 'Verifique as permissões'), 'erro');
                              await buscarCategorias();
                            }
                          }}
                        >
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setTermoBusca('');
                              setExpandidas((prev) => ({ ...prev, [cat.id]: true }));
                              setFiltroAtivo({ tipo: 'subcategoria', id: sub.id, nome: sub.nome, parentId: cat.id });
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              background: isSubAtiva ? 'rgba(45, 212, 191, 0.12)' : 'transparent',
                              color: isSubAtiva ? 'var(--texto-destaque-turquesa, #0F766E)' : 'var(--texto-secundario, #64748B)',
                              fontWeight: isSubAtiva ? '800' : '600',
                              fontSize: '0.82rem',
                              cursor: isSupervisor && editandoCatId !== sub.id ? 'grab' : 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
                              {isSupervisor && editandoCatId !== sub.id && (
                                <span
                                  title="Segure e arraste para reposicionar"
                                  style={{ color: 'var(--texto-secundario, #94A3B8)', fontSize: '0.75rem', cursor: 'grab', userSelect: 'none', opacity: 0.6 }}
                                >
                                  ⠿
                                </span>
                              )}

                              {/* EDIÇÃO INLINE DA SUBCATEGORIA */}
                              {editandoCatId === sub.id ? (
                                <div
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={(e) => {
                                    if (!e.currentTarget.contains(e.relatedTarget)) {
                                      salvarEdicaoCategoria(sub, 'subcategoria');
                                    }
                                  }}
                                >
                                  <input
                                    type="text"
                                    value={iconeEditando}
                                    onChange={(e) => setIconeEditando(e.target.value)}
                                    maxLength={4}
                                    title="Ícone / Emoji da subcategoria"
                                    style={{
                                      width: '32px',
                                      textAlign: 'center',
                                      background: 'var(--bg-input, #FFF)',
                                      color: 'var(--texto-primario, #1E293B)',
                                      border: '1.5px solid #2DD4BF',
                                      borderRadius: '6px',
                                      padding: '1px',
                                      fontSize: '0.9rem',
                                      outline: 'none',
                                      flexShrink: 0
                                    }}
                                  />
                                  <input
                                    type="text"
                                    value={nomeEditando}
                                    onChange={(e) => setNomeEditando(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        salvarEdicaoCategoria(sub, 'subcategoria');
                                      } else if (e.key === 'Escape') {
                                        cancelarEdicao();
                                      }
                                    }}
                                    autoFocus
                                    style={{
                                      background: 'var(--bg-input, #FFF)',
                                      color: 'var(--texto-primario, #1E293B)',
                                      border: '1.5px solid #2DD4BF',
                                      borderRadius: '6px',
                                      padding: '2px 6px',
                                      fontSize: '0.82rem',
                                      fontWeight: '700',
                                      outline: 'none',
                                      flex: 1,
                                      minWidth: '50px'
                                    }}
                                  />
                                  <button
                                    onClick={() => salvarEdicaoCategoria(sub, 'subcategoria')}
                                    title="Salvar alteração"
                                    style={{
                                      background: '#006968',
                                      color: '#FFF',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '2px 5px',
                                      cursor: 'pointer',
                                      fontSize: '0.72rem',
                                      flexShrink: 0
                                    }}
                                  >
                                    ✓
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span style={{ flexShrink: 0 }}>{sub.icone || '↳'}</span>
                                  <span
                                    onDoubleClick={(e) => {
                                      if (isSupervisor) iniciarEdicao(e, sub);
                                    }}
                                    title={isSupervisor ? 'Dê duplo clique ou clique no lápis para editar ícone e nome' : ''}
                                    style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}
                                  >
                                    {sub.nome}
                                  </span>
                                </>
                              )}
                            </div>

                            {isSupervisor && editandoCatId !== sub.id && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                <button
                                  onClick={(e) => iniciarEdicao(e, sub)}
                                  title="Editar ícone e nome"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--texto-secundario, #94A3B8)',
                                    fontSize: '0.72rem'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#2DD4BF')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--texto-secundario, #94A3B8)')}
                                >
                                  ✏️
                                </button>

                                <button
                                  onClick={(e) => excluirCategoria(e, sub.id, sub.nome)}
                                  title="Excluir subcategoria"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--texto-secundario, #94A3B8)',
                                    fontSize: '0.72rem'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--texto-secundario, #94A3B8)')}
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>
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
                border: '1.5px dashed var(--texto-destaque-turquesa, #006968)',
                background: 'rgba(45, 212, 191, 0.1)',
                color: 'var(--texto-destaque-turquesa, #006968)',
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
        <main style={{ minHeight: '600px', minWidth: 0 }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--texto-titulo-verde, #004D4C)', margin: '0 0 6px 0' }}>
              {termoBusca ? 'Resultados da Pesquisa' : filtroAtivo.nome}
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--texto-secundario, #64748B)' }}>
              {colinhasFiltradas.length} {colinhasFiltradas.length === 1 ? 'colinha disponível' : 'colinhas disponíveis'}.
            </p>
          </div>

          <div style={{ opacity: isMounted ? 1 : 0 }}>
            {isMounted && colinhasFiltradas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--texto-secundario, #64748B)', background: 'var(--bg-card, #FFF)', borderRadius: '16px', border: '1px dashed var(--border-card, #CBD5E1)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📑</div>
                <p>Nenhuma colinha encontrada para esta seleção.</p>
              </div>
            ) : isMounted ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px', alignItems: 'start' }}>
                  {visiveis.map((c) => (
                    <CardColinha
                      key={c.id}
                      colinha={c}
                      cores={getCor(c.c)}
                      isSupervisor={isSupervisor}
                      onVerNota={setModalNota}
                      onAlternarFixar={onFixarEstavel}
                      onEditar={onEditarEstavel}
                      onExcluir={onExcluirEstavel}
                    />
                  ))}
                </div>
                {temMais && (
                  <div ref={sentinelaRef} style={{ textAlign: 'center', padding: '28px 0 8px 0' }}>
                    <button
                      onClick={() => setLim({ chave: chaveLista, n: limite + LOTE_CARDS })}
                      style={{ padding: '8px 20px', borderRadius: '9999px', border: '1px solid var(--border-card, #CBD5E1)', background: 'var(--bg-card, #FFF)', color: 'var(--texto-destaque-turquesa, #006968)', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Mostrar mais ({colinhasFiltradas.length - limite} restantes)
                    </button>
                  </div>
                )}
              </>
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
            backgroundColor: 'rgba(0, 20, 20, 0.75)',
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
              background: 'var(--bg-card, #FFFFFF)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '720px',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              border: `2px solid ${getCor(modalNota.c).border}`,
              outline: 'none',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexShrink: 0 }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--texto-destaque-turquesa, #006968)' }}>
                    {modalNota.c}
                  </span>
                  {modalNota.sub && (
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', background: 'var(--border-card, #F1F5F9)', padding: '2px 8px', borderRadius: '4px', color: 'var(--texto-secundario, #475569)' }}>
                      ↳ {modalNota.sub}
                    </span>
                  )}
                </div>
                <h3 style={{ margin: '4px 0 0 0', color: 'var(--texto-titulo-verde, #004D4C)', fontSize: '1.35rem', fontWeight: '800', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {modalNota.t}
                </h3>
              </div>
              <button
                onClick={() => setModalNota(null)}
                style={{
                  background: 'var(--border-card, #F1F5F9)',
                  border: 'none',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--texto-secundario, #64748B)'
                }}
              >
                ✕
              </button>
            </div>

            {/* CONTEÚDO RICH TEXT DA NOTA */}
            <div
              ref={modalTextRef}
              onCopy={(e) => {
                // Seleção manual (mouse / Ctrl+A) também sai sem espaço no início
                const sel = window.getSelection();
                if (!sel || sel.isCollapsed || !e.clipboardData) return;
                const box = document.createElement('div');
                for (let i = 0; i < sel.rangeCount; i++) box.appendChild(sel.getRangeAt(i).cloneContents());
                const { html, text } = prepararParaCopia(box.innerHTML);
                if (!text) return;
                e.clipboardData.setData('text/html', html);
                e.clipboardData.setData('text/plain', text);
                e.preventDefault();
              }}
              className="modal-nota-texto"
              dangerouslySetInnerHTML={{ __html: modalNota.txtCompilado }}
              style={{
                background: getCor(modalNota.c).bg,
                padding: '22px',
                borderRadius: '12px',
                border: `1px solid ${getCor(modalNota.c).border}`,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                color: '#1E293B',
                fontSize: '0.94rem',
                lineHeight: '1.7',
                userSelect: 'text',
                overflowY: 'auto',
                overflowX: 'hidden',
                flex: 1
              }}
            />

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
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
                      border: '1px solid var(--border-card, #CBD5E1)',
                      background: 'transparent',
                      color: 'var(--texto-secundario, #64748B)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
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
                      border: '1px solid var(--border-card, #CBD5E1)',
                      background: 'transparent',
                      color: 'var(--texto-primario, #334155)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '0.86rem'
                    }}
                  >
                    ✏️ Editar / Mover
                  </button>
                )}

                <button
                  onClick={() => copiarComFormatacao(modalNota.txtCompilado)}
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

      {/* MODAL 2: CRIAR / EDITAR / MOVER (BLINDADO CONTRA OVERFLOW E CORTE DE BOTÕES) */}
      {isMounted && modalAberto && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 20, 20, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #FFFFFF)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '620px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px 28px',
              border: '1px solid var(--border-card, transparent)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
              <h3 style={{ margin: 0, color: 'var(--texto-titulo-verde, #004D4C)', fontSize: '1.25rem', fontWeight: '800' }}>
                {formData.id ? '✏️ Editar / Mover Colinha' : '➕ Nova Colinha Operacional'}
              </h3>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: 'var(--texto-secundario, #64748B)',
                  padding: '2px 6px',
                  borderRadius: '6px'
                }}
                title="Fechar"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={salvarColinha} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div
                style={{
                  overflowY: 'auto',
                  flex: 1,
                  minHeight: 0,
                  paddingRight: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px', color: 'var(--texto-secundario, #334155)' }}>Título</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Confirmação de Entrega"
                    value={formData.t}
                    onChange={(e) => setFormData({ ...formData, t: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-search, #CBD5E1)', background: 'var(--bg-input, #FFF)', color: 'var(--texto-primario, #1E293B)', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px', color: 'var(--texto-secundario, #334155)' }}>Categoria Principal</label>
                    <select
                      required
                      value={formData.c}
                      onChange={(e) => setFormData({ ...formData, c: e.target.value, sub: '' })}
                      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid var(--border-search, #CBD5E1)', background: 'var(--bg-input, #FFF)', color: 'var(--texto-primario, #1E293B)' }}
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
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px', color: 'var(--texto-secundario, #334155)' }}>Subcategoria (Opcional)</label>
                    <select
                      value={formData.sub}
                      onChange={(e) => setFormData({ ...formData, sub: e.target.value })}
                      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid var(--border-search, #CBD5E1)', background: 'var(--bg-input, #FFF)', color: 'var(--texto-primario, #1E293B)' }}
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

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px', color: 'var(--texto-secundario, #334155)' }}>Atalho Rápido (opcional)</label>
                  <input
                    type="text"
                    placeholder="/pix, /extravio"
                    value={formData.atalho}
                    onChange={(e) => setFormData({ ...formData, atalho: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid var(--border-search, #CBD5E1)', background: 'var(--bg-input, #FFF)', color: 'var(--texto-primario, #1E293B)', outline: 'none' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--texto-secundario, #334155)' }}>
                      Texto (Use <span style={{ color: 'var(--texto-destaque-turquesa, #006968)' }}>{'{prazo_retorno}'}</span>)
                    </label>
                    
                    {/* BARRA DE FERRAMENTAS DO EDITOR */}
                    <div className="toolbar-rich-text" style={{ display: 'flex', gap: '4px' }}>
                      <button type="button" onMouseDown={(e) => handleFormatCommand(e, 'bold')} title="Negrito (Ctrl+B)"><b>B</b></button>
                      <button type="button" onMouseDown={(e) => handleFormatCommand(e, 'italic')} title="Itálico (Ctrl+I)"><i>I</i></button>
                      <button type="button" onMouseDown={(e) => handleFormatCommand(e, 'underline')} title="Sublinhado (Ctrl+U)"><u>U</u></button>
                      <button type="button" onMouseDown={(e) => handleFormatCommand(e, 'insertUnorderedList')} title="Criar Lista"><b>•</b> Lista</button>
                    </div>
                  </div>

                  {/* CAIXA DE TEXTO RICH TEXT */}
                  <div
                    ref={editorRichTextRef}
                    contentEditable
                    suppressContentEditableWarning
                    onPaste={handlePasteRichText}
                    title="Dica: Cole usando Ctrl+V para manter estilos ou Ctrl+Shift+V para colar texto puro."
                    style={{
                      width: '100%',
                      minHeight: '180px',
                      maxHeight: '340px',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-search, #CBD5E1)',
                      background: 'var(--bg-input, #FFF)',
                      color: 'var(--texto-primario, #1E293B)',
                      fontSize: '0.88rem',
                      lineHeight: '1.5',
                      outline: 'none',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap'
                    }}
                  />
                </div>
              </div>

              {/* RODAPÉ FIXO COM OS BOTÕES SEMPRE ACESSÍVEIS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '14px', marginTop: '10px', borderTop: '1px solid var(--border-card, #E2E8F0)', flexShrink: 0 }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-card)', background: 'transparent', color: 'var(--texto-secundario, #64748B)', cursor: 'pointer', fontWeight: '600' }}>Cancelar</button>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 20, 20, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--bg-card, #FFFFFF)', borderRadius: '16px', width: '100%', maxWidth: '480px', maxHeight: '92vh', overflowY: 'auto', padding: '28px', border: '1px solid var(--border-card, transparent)', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--texto-titulo-verde, #004D4C)' }}>
              📁 Criar Nova Categoria no Banco
            </h3>

            <form onSubmit={salvarCategoria} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: 'var(--texto-secundario, #334155)' }}>Tipo de Categoria:</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: '600', color: 'var(--texto-primario, #334155)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="tipoCat"
                      checked={formCat.tipo === 'principal'}
                      onChange={() => setFormCat({ ...formCat, tipo: 'principal' })}
                    />
                    Categoria Principal
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: '600', color: 'var(--texto-primario, #334155)', cursor: 'pointer' }}>
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px', color: 'var(--texto-secundario, #334155)' }}>Vincular à Categoria Pai:</label>
                  <select
                    value={formCat.parentId}
                    onChange={(e) => setFormCat({ ...formCat, parentId: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid var(--border-search, #CBD5E1)', background: 'var(--bg-input, #FFF)', color: 'var(--texto-primario, #1E293B)' }}
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px', color: 'var(--texto-secundario, #334155)' }}>Ícone</label>
                  <input
                    type="text"
                    required
                    value={formCat.icone}
                    onChange={(e) => setFormCat({ ...formCat, icone: e.target.value })}
                    style={{ width: '100%', padding: '9px', textAlign: 'center', fontSize: '1.1rem', borderRadius: '6px', border: '1px solid var(--border-search, #CBD5E1)', background: 'var(--bg-input, #FFF)', color: 'var(--texto-primario, #1E293B)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '4px', color: 'var(--texto-secundario, #334155)' }}>Nome da Categoria</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: PIX & Estornos"
                    value={formCat.nome}
                    onChange={(e) => setFormCat({ ...formCat, nome: e.target.value })}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid var(--border-search, #CBD5E1)', background: 'var(--bg-input, #FFF)', color: 'var(--texto-primario, #1E293B)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalCategoria(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-card)', background: 'transparent', color: 'var(--texto-secundario, #64748B)', fontWeight: '600', cursor: 'pointer' }}
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
          backgroundColor: 'rgba(0, 20, 20, 0.75)',
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
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--border-card, #F1F5F9)',
              color: 'var(--texto-secundario, #64748B)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: '800',
              margin: '0 auto 12px auto'
            }}>
              ✕
            </div>
            
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--texto-primario, #0F172A)', fontSize: '1.2rem', fontWeight: '800' }}>
              Remover Colinha?
            </h3>
            
            <p style={{ margin: '0 0 20px 0', color: 'var(--texto-secundario, #64748B)', fontSize: '0.9rem', lineHeight: '1.5' }}>
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
                disabled={excluindo}
                onClick={confirmarExclusao}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#DC2626',
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
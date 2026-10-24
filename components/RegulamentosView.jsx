'use client';

import React, { useState } from 'react';

export default function RegulamentosView() {
  const [categoriaAtiva, setCategoriaAtiva] = useState(1);
  const [itensAbertos, setItensAbertos] = useState({});
  const [busca, setBusca] = useState('');

  // Troca de categoria e fecha todas as sanfonas abertas
  const trocarCategoria = (id) => {
    setCategoriaAtiva(id);
    setBusca('');
    setItensAbertos({});
  };

  // -------------------------------------------------------------
  // BASE DE CONHECIMENTO COMPLETA (7 CATEGORIAS E 51 PROCESSOS)
  // -------------------------------------------------------------
  const baseRegulamentos = [
    {
      id: 1,
      nome: 'Acompanhamento e Status',
      icone: '📦',
      processos: [
        {
          id: 'p1_1',
          titulo: 'Pedido Postado (Dentro do prazo)',
          conteudo: 'Quando o livreiro realiza a postagem dentro dos 2 dias úteis regulamentares. O código de rastreamento é atualizado no painel do leitor. Orientar o cliente a acompanhar a rota diretamente na aba "Meus Pedidos".'
        },
        {
          id: 'p1_2',
          titulo: 'Saiu para Entrega',
          conteudo: 'Indica que o carteiro ou motorista da transportadora iniciou a rota de entrega final para o endereço cadastrado. Orientar o cliente a manter um responsável maior de 18 anos no local com documento com foto.'
        },
        {
          id: 'p1_3',
          titulo: 'Entrega Atrasada e MLE (Magalu Entregas)',
          conteudo: 'Se a entrega ultrapassou a data limite prevista no checkout via malha MLE, acione o protocolo interno de cobrança prioritária com a transportadora parceira. Se não houver atualização em até 3 dias úteis, acionar a Compra Garantida.'
        },
        {
          id: 'p1_4',
          titulo: 'Abertura de P.I. (Pedido de Informação) nos Correios',
          conteudo: 'Procedimento aberto quando uma encomenda postada via Correios tem seu prazo limite estourado sem registro de entrega. O prazo de resposta oficial dos Correios para a P.I. é de até 5 dias úteis.'
        },
        {
          id: 'p1_5',
          titulo: 'Entrega sem Detalhe (Impresso Normal / Registro Módico - Rastreio Simplificado)',
          conteudo: 'O Registro Módico NÃO possui atualização de rastreamento ponto a ponto. O sistema dos Correios atualiza apenas duas etapas: a "Postagem" e a "Saída para Entrega". Tranquilize o comprador reforçando que essa é a característica oficial do modal econômico.'
        },
        {
          id: 'p1_6',
          titulo: 'Rastreio Dentro do Prazo',
          conteudo: 'Caso o cliente entre em contato ansioso pela entrega, verifique a data estimada no pedido. Se o prazo ainda estiver vigente, informe que a encomenda segue o fluxo postal normal dentro do SLA contratado.'
        },
        {
          id: 'p1_7',
          titulo: 'Entregue em Outro Endereço (Endereço divergente)',
          conteudo: 'Valide os dados cadastrados no pedido versus os dados registrados no comprovante de entrega do transportador. Se comprovado erro de entrega na rota, solicite acareação imediata ou estorno por Compra Garantida.'
        },
        {
          id: 'p1_8',
          titulo: 'Rastreio com Erro / Rastreio Inexistente',
          conteudo: 'Ocorre quando o livreiro digita o código com erro de digitação ou o sistema postal demora até 24h para indexar a etiqueta. Notifique o livreiro com prazo de 24h úteis para corrigir a numeração do rastreio.'
        },
        {
          id: 'p1_9',
          titulo: 'Consta Entregue mas Comprador não Recebeu (Procedimento de varredura)',
          conteudo: 'Oriente o cliente a fazer uma checagem preventiva com porteiros, vizinhos, familiares ou recepção do condomínio. Caso ninguém reconheça o recebimento, abra o protocolo de acareação e solicite a visualização do recebedor.'
        },
        {
          id: 'p1_10',
          titulo: 'Consta Entregue com Comprovante Magalu Entregas (MLE - Validação de assinatura)',
          conteudo: 'Consulte no painel MLE a imagem digitalizada do comprovante de entrega. Verifique o nome completo, documento (RG/CPF) e assinatura de quem recebeu para confrontar com as informações do cliente.'
        },
        {
          id: 'p1_11',
          titulo: 'Pedido Extraviado ou Roubado no Fluxo Postal',
          conteudo: 'Constatado sinistro (extravio, furto ou roubo de carga no rastreio oficial), o cliente tem direito ao estorno integral imediato via Compra Garantida, sem necessidade de aguardar devolução de valores pelo livreiro.'
        },
        {
          id: 'p1_12',
          titulo: 'Retirada de Encomenda na Agência dos Correios ou no Livreiro',
          conteudo: 'Correios: o cliente deve comparecer à agência informada no rastreio em até 7 dias corridos portando documento com foto e código de rastreamento. Retire no Livreiro: apresentar o número do pedido e documento de identificação.'
        },
        {
          id: 'p1_13',
          titulo: 'Insucesso de Entrega / Devolução ao Remetente',
          conteudo: 'Ocorre após 3 tentativas frustradas ou endereço com numeração incompleta. O pacote retorna ao livreiro parceiro. Assim que confirmado o retorno, processar o cancelamento e reembolso ou novo envio acordado.'
        }
      ]
    },
    {
      id: 2,
      nome: 'Prazos e Envio pelo Vendedor',
      icone: '⏱️',
      processos: [
        {
          id: 'p2_1',
          titulo: 'Standby dentro do prazo (SLA de 2 dias úteis de postagem)',
          conteudo: 'O vendedor possui até 2 dias úteis após a confirmação do pagamento para postar o exemplar nos Correios/MLE e inserir o código de rastreio no portal.'
        },
        {
          id: 'p2_2',
          titulo: 'Pedido em Standby / Vendedor não responde',
          conteudo: 'Ultrapassado o prazo regulamentar de 2 dias úteis sem postagem, a Estante Virtual emite alerta de cobrança com prazo improrrogável de 48h úteis para o livreiro despachar o livro ou justificar indisponibilidade de estoque.'
        },
        {
          id: 'p2_3',
          titulo: 'Verificar como o cliente quer seguir (Aguardar postagem x Cancelamento imediato)',
          conteudo: 'Após o estouro do SLA de envio, pergunte ativamente ao leitor se ele prefere continuar aguardando o envio do exemplar ou se deseja o cancelamento imediato com reembolso integral do valor pago.'
        }
      ]
    },
    {
      id: 3,
      nome: 'Nota Fiscal ou Recibo',
      icone: '🧾',
      processos: [
        {
          id: 'p3_1',
          titulo: 'Solicitação de Nota Fiscal / Recibo ao Vendedor',
          conteudo: 'É obrigação legal do livreiro parceiro emitir documento fiscal ou declaração/recibo de venda. O documento deve discriminar obrigatoriamente a soma do valor do livro + o frete cobrado. Caso o vendedor recuse a emissão, o caso deve ser escalado para a supervisão de compliance.'
        }
      ]
    },
    {
      id: 4,
      nome: 'Trocas, Devoluções e Cancelamento',
      icone: '🔄',
      processos: [
        {
          id: 'p4_1',
          titulo: 'Falta Item / Livro Faltante no Pedido',
          conteudo: 'Se o cliente adquiriu múltiplos livros do mesmo livreiro e um deles não veio na embalagem, contate o livreiro para envio complementar imediato ou efetue o estorno proporcional do livro faltante.'
        },
        {
          id: 'p4_2',
          titulo: 'Livro Diferente do Escolhido',
          conteudo: 'Caso receba edição, ano, capa ou exemplar divergente do anunciado, o cliente tem direito à substituição imediata ou devolução com reembolso integral sem qualquer custo de frete.'
        },
        {
          id: 'p4_3',
          titulo: 'Livro Avariado / Danificado',
          conteudo: 'Se o livro chegou com rasgos, páginas coladas, mofo ou umidade não descritos no anúncio, solicite foto comprobatória ao leitor e libere o fluxo de devolução ou estorno por Compra Garantida.'
        },
        {
          id: 'p4_4',
          titulo: 'Procedimento de Devolução via Correios (Impresso Módico com ressarcimento)',
          conteudo: 'O cliente deve postar o livro como "Impresso Normal com Registro Módico" (com seguro se o livro for acima de R$ 50,00). O comprovante com o valor pago do frete deve ser anexado ao chamado para reembolso.'
        },
        {
          id: 'p4_5',
          titulo: 'Procedimento de Devolução via Magalu Entregas (MLE - Logística Reversa)',
          conteudo: 'Gere no painel administrativo a etiqueta de logística reversa e repasse o código de postagem de 9 dígitos ao cliente. O leitor tem 7 dias corridos para levar o pacote até a agência indicada sem pagar nada na postagem.'
        },
        {
          id: 'p4_6',
          titulo: 'Procedimento de Devolução Variável',
          conteudo: 'Em casos de acordo entre as partes onde o leitor decide ficar com o livro com avaria leve mediante abatimento, pode-se conceder reembolso parcial alinhado com o vendedor parceiro.'
        },
        {
          id: 'p4_7',
          titulo: 'Recusar Entrega na Porta',
          conteudo: 'Se o cancelamento foi solicitado com o pacote já em trânsito, oriente o cliente a recusar o recebimento no ato da tentativa de entrega pelo carteiro, escrevendo "Recusado" no verso do comprovante.'
        },
        {
          id: 'p4_8',
          titulo: 'Devolução Fora do Prazo (CDC Art. 49)',
          conteudo: 'O prazo legal para arrependimento ou devolução é de até 7 dias corridos após o recebimento. Solicitações feitas após o 8º dia corrido devem ser recusadas educadamente com base nas diretrizes do CDC.'
        },
        {
          id: 'p4_9',
          titulo: 'Cancelou e Recebeu o Pedido',
          conteudo: 'Se o estorno já foi realizado e posteriormente o livro foi entregue, oriente o cliente a regularizar o pagamento via chave Pix oficial da Estante Virtual ou forneça código de logística reversa para devolução.'
        },
        {
          id: 'p4_10',
          titulo: 'Compra Garantida (Cumprimento forçado da oferta / Art. 35 CDC)',
          conteudo: 'Se o livreiro cancelou indevidamente ou não possui estoque, avalie a viabilidade de viabilizar a compra do mesmo exemplar com outro livreiro parceiro cobrindo eventual diferença de valor pela EV.'
        },
        {
          id: 'p4_11',
          titulo: 'Venda Proibida / Exemplares de Distribuição Gratuita ou de Biblioteca',
          conteudo: 'Livros carimbados com "Venda Proibida", manuais do professor ou livros patrimoniados de bibliotecas públicas sem termo oficial de descarte/baixa não podem ser comercializados. Estorno integral compulsório e notificação ao livreiro.'
        }
      ]
    },
    {
      id: 5,
      nome: 'Financeiro e Reembolsos',
      icone: '💳',
      processos: [
        {
          id: 'p5_1',
          titulo: 'Reembolso via Cartão de Crédito, Pix e Boleto (Prazos)',
          conteudo: 'PIX: estorno creditado na mesma conta bancária em até 24h úteis. CARTÃO DE CRÉDITO: estorno enviado em até 2 dias úteis, com reflexo de 1 a 2 faturas. BOLETO: reembolso via saldo Wirecard/Moip ou transferência bancária.'
        },
        {
          id: 'p5_2',
          titulo: 'Solicitação de Dados Bancários',
          conteudo: 'Para pagamentos via boleto ou exceções: solicitar Banco, Tipo de Conta (Corrente/Poupança), Agência com dígito, Número da Conta com dígito, Nome Completo e CPF idêntico ao do titular da compra.'
        },
        {
          id: 'p5_3',
          titulo: 'Reembolso em Conta de Terceiros (Carta manuscrita)',
          conteudo: 'Por segurança e compliance, só é permitido estorno para conta de terceiro mediante envio de carta de autorização manuscrita e assinada pelo titular da compra, anexando documento oficial com foto e comprovante de parentesco.'
        },
        {
          id: 'p5_4',
          titulo: 'Reembolso do Frete de Devolução (PAC vs. Registro Módico)',
          conteudo: 'A Estante Virtual e os vendedores apenas cobrem o valor correspondente ao envio via Impresso Normal com Registro Módico. Caso o cliente envie por conta própria via SEDEX ou PAC, a diferença de valor não será ressarcida.'
        },
        {
          id: 'p5_5',
          titulo: 'Reembolso por Exceção / Resgate Já (Alinhamento Liderança)',
          conteudo: 'Aplicações de estorno fora das regras contratuais convencionais para mitigação de Procon, Reclame Aqui ou litígios graves. Exige aprovação formal prévia do supervisor de atendimento no chamado.'
        },
        {
          id: 'p5_6',
          titulo: 'Reembolso Concluído mas não localizado pelo Cliente',
          conteudo: 'Envie o comprovante bancário com código de autenticação/NSU ou ID da transação Pix ao cliente. Instrua-o a apresentar o comprovante diretamente ao gerente da sua instituição financeira.'
        },
        {
          id: 'p5_7',
          titulo: 'Máscaras Financeiras para Abertura de Chamados (NCA/Zendesk)',
          conteudo: 'Utilize o modelo padrão preenchendo: ID do Pedido | Valor Original | Valor do Estorno | Modalidade (Total/Parcial) | Motivo Operacional | Chave Pix do Titular.'
        }
      ]
    },
    {
      id: 6,
      nome: 'Carrinho, Busca e Cadastro',
      icone: '🛒',
      processos: [
        {
          id: 'p6_1',
          titulo: 'Como Comprar / Dúvidas Antes da Compra',
          conteudo: 'Instrua o leitor sobre a busca por título, autor ou ISBN, conferência do estado de conservação na descrição do livreiro e visualização das fotos do exemplar.'
        },
        {
          id: 'p6_2',
          titulo: 'Compra de Vários Exemplares do Mesmo Vendedor',
          conteudo: 'Para economizar no frete, o leitor pode clicar em "Ver mais livros deste vendedor" e incluir vários exemplares no mesmo carrinho de compras, unificando a postagem.'
        },
        {
          id: 'p6_3',
          titulo: 'Regras do Carrinho (Limites de Títulos e Livros)',
          conteudo: 'Regra de sistema: o carrinho da Estante Virtual comporta no máximo até 15 títulos diferentes e um limite total de 30 livros em um único pedido. Para quantidades maiores, fechar em compras separadas.'
        },
        {
          id: 'p6_4',
          titulo: 'Como Adicionar / Excluir Itens no Carrinho',
          conteudo: 'Para retirar um exemplar, basta acessar o ícone de sacola no topo da página e clicar no botão "Excluir" ou na lixeira ao lado do livro antes de avançar para a tela de pagamento.'
        },
        {
          id: 'p6_5',
          titulo: 'Acesso e Recuperação da Lista de Desejos',
          conteudo: 'O cliente pode salvar títulos de interesse clicando no ícone de coração. Quando um vendedor cadastrar novo exemplar daquele título, o cliente recebe notificação por e-mail.'
        },
        {
          id: 'p6_6',
          titulo: 'Alteração e Atualização de Endereço de Entrega',
          conteudo: 'ATENÇÃO: Não é possível alterar o endereço de pedidos já concluídos no site. A alteração cadastral no perfil do cliente só é válida para compras futuras.'
        },
        {
          id: 'p6_7',
          titulo: 'Dúvidas sobre Precificação e Variação de Valores',
          conteudo: 'Por se tratar de um marketplace colaborativo, cada livreiro parceiro é autônomo para definir o preço do seu livro de acordo com edição, conservação, raridade ou autógrafo.'
        },
        {
          id: 'p6_8',
          titulo: 'Regras de Parcelamento (Mínimo de R$ 30,00)',
          conteudo: 'O parcelamento no cartão de crédito está disponível em até 5 vezes sem juros, desde que cada parcela atinja o valor mínimo regulamentar de R$ 30,00.'
        },
        {
          id: 'p6_9',
          titulo: 'Meios de Pagamento Indisponíveis (Boleto fora do ar / Pix expirado)',
          conteudo: 'O QR Code do Pix possui validade de 20 minutos após a geração do pedido. Expirado o tempo, o pedido é cancelado automaticamente, devendo o leitor refazer a compra na plataforma.'
        }
      ]
    },
    {
      id: 7,
      nome: 'Suporte Técnico e Acesso',
      icone: '🛠️',
      processos: [
        {
          id: 'p7_1',
          titulo: 'Erro ao Acessar / Limpeza de Cache e Navegadores',
          conteudo: 'Oriente o cliente a realizar a limpeza de cache e cookies (Ctrl + Shift + Del) ou testar o acesso por uma guia anônima. Navegadores recomendados: Google Chrome e Mozilla Firefox atualizados.'
        },
        {
          id: 'p7_2',
          titulo: 'Redefinição e Envio de Senha Temporária',
          conteudo: 'Na tela de login, clicar em "Esqueci minha senha". O sistema enviará link de redefinição para o e-mail cadastrado. Orientar checagem na pasta de Spam ou Lixo Eletrônico.'
        },
        {
          id: 'p7_3',
          titulo: 'Erro de Login em Loop / Extensões de Navegador',
          conteudo: 'Bloqueadores de anúncio (AdBlock, uBlock, Privacy Badger) frequentemente quebram a autenticação da EV. Instrua o cliente a desativar as extensões para o domínio estantevirtual.com.br.'
        },
        {
          id: 'p7_4',
          titulo: 'Bloqueio de IP por Acesso Fora do Brasil',
          conteudo: 'A plataforma da Estante Virtual restringe compras com faixas de IP originadas no exterior por diretrizes de segurança antifraude. Acessos via VPN internacional devem ser desativados.'
        },
        {
          id: 'p7_5',
          titulo: 'Confirmação de Identidade e Segurança (IDPOS / LGPD)',
          conteudo: 'Antes de passar qualquer informação cadastral de e-mail, telefone ou histórico de compras, confirme 3 dados do cliente: Nome Completo, CPF e os dois primeiros dígitos do CEP de entrega.'
        },
        {
          id: 'p7_6',
          titulo: 'Restrição de CEP para Lockers dos Correios',
          conteudo: 'Alguns livreiros não operam com modalidade de entrega em armários inteligentes (Lockers) dos Correios. Nesses casos, o checkout bloqueia a conclusão do pedido exigindo endereço físico padrão.'
        },
        {
          id: 'p7_7',
          titulo: 'Erro de Cadastro / CPF não integrado na Freedom',
          conteudo: 'Quando há conflito na integração entre o cadastro da EV e o faturamento Freedom, solicite o espelho do CPF no site da Receita Federal e acione o suporte de Engenharia via chamado interno.'
        }
      ]
    }
  ];

  const toggleItem = (id) => {
    setItensAbertos((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const categoriaSelecionada = baseRegulamentos.find((c) => c.id === categoriaAtiva) || baseRegulamentos[0];

  const processosExibidos = busca.trim() === ''
    ? categoriaSelecionada.processos
    : baseRegulamentos
        .flatMap((c) => c.processos)
        .filter(
          (p) =>
            p.titulo.toLowerCase().includes(busca.toLowerCase()) ||
            p.conteudo.toLowerCase().includes(busca.toLowerCase())
        );

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '36px 20px 80px 20px' }}>
      
      {/* ESTILOS DE ANIMAÇÃO SCOPED */}
      <style>{`
        @keyframes smoothContentEnter {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .category-content-animated {
          animation: smoothContentEnter 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .sidebar-category-btn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 18px;
          border-radius: 14px;
          cursor: pointer;
          text-align: left;
          width: 100%;
          border: 1px solid var(--border-subtle);
          background-color: #FFFFFF;
          color: var(--text-dark);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          transform: translateX(0);
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
                      background-color 0.28s ease,
                      border-color 0.28s ease,
                      box-shadow 0.28s ease,
                      color 0.28s ease;
        }

        .sidebar-category-btn:hover {
          transform: translateX(4px);
          background-color: #F8FAFC;
          border-color: #CBD5E1;
        }

        .sidebar-category-btn.active {
          transform: translateX(6px);
          background-color: rgba(0, 105, 104, 0.05);
          border-color: var(--ev-teal-primary);
          color: var(--ev-teal-primary);
          box-shadow: 0 4px 14px rgba(0, 105, 104, 0.1);
        }

        .sidebar-category-btn .icon-box {
          font-size: 1.3rem;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background-color: #F8FAFC;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
                      background-color 0.28s ease;
        }

        .sidebar-category-btn:hover .icon-box {
          transform: scale(1.08);
        }

        .sidebar-category-btn.active .icon-box {
          background-color: rgba(0, 105, 104, 0.12);
          transform: scale(1.1);
        }
      `}</style>

      {/* BARRA SUPERIOR DE PESQUISA */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '16px 24px',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 2px 8px rgba(0, 77, 76, 0.05)',
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }}>
        <span style={{ fontSize: '1.25rem', color: 'var(--ev-teal-primary)' }}>🔍</span>
        <input
          type="text"
          placeholder="Pesquisar regra, SLA, estorno, MLE, extravio ou procedimento..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: '0.98rem',
            width: '100%',
            fontWeight: '500',
            color: 'var(--text-dark)',
            backgroundColor: 'transparent'
          }}
        />
        {busca && (
          <button
            onClick={() => {
              setBusca('');
              setItensAbertos({});
            }}
            style={{
              background: '#F1F5F9',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer',
              color: 'var(--text-muted)'
            }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* LAYOUT: LATERAL + ÁREA DE CONTEÚDO */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px', alignItems: 'start' }}>
        
        {/* MENU LATERAL COM RESET DE ITENS AO TROCAR */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'sticky', top: '100px' }}>
          {baseRegulamentos.map((cat) => {
            const isAtiva = categoriaAtiva === cat.id && busca.trim() === '';

            return (
              <button
                key={cat.id}
                onClick={() => trocarCategoria(cat.id)}
                className={`sidebar-category-btn ${isAtiva ? 'active' : ''}`}
              >
                <div className="icon-box">
                  {cat.icone}
                </div>
                <div style={{ fontWeight: isAtiva ? '800' : '600', fontSize: '0.92rem', lineHeight: '1.3' }}>
                  {cat.nome}
                </div>
              </button>
            );
          })}
        </aside>

        {/* CONTAINER DO CONTEÚDO */}
        <main
          key={busca ? 'busca-ativa' : categoriaAtiva}
          className="category-content-animated"
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '36px 40px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 2px 10px rgba(0, 77, 76, 0.04)',
            minHeight: '560px'
          }}
        >
          {/* TÍTULO DA CATEGORIA */}
          <div style={{ borderBottom: '2px solid #F1F5F9', paddingBottom: '20px', marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '1.6rem',
              fontWeight: '800',
              color: 'var(--ev-teal-primary)',
              margin: '0 0 6px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>{busca ? '🔍 Resultados da Busca' : categoriaSelecionada.nome}</span>
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              {busca
                ? `Encontrados ${processosExibidos.length} processos correspondentes ao termo "${busca}".`
                : `Selecione um tópico abaixo para consultar os critérios e instruções oficiais.`}
            </p>
          </div>

          {/* LISTA DE ACCORDIONS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {processosExibidos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📑</div>
                <p>Nenhum procedimento encontrado com o termo digitado.</p>
              </div>
            ) : (
              processosExibidos.map((proc) => {
                const aberto = itensAbertos[proc.id];

                return (
                  <div
                    key={proc.id}
                    style={{
                      border: '1px solid',
                      borderColor: aberto ? 'rgba(0, 105, 104, 0.35)' : 'var(--border-subtle)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      transition: 'border-color 0.28s ease, background-color 0.28s ease',
                      backgroundColor: aberto ? '#FAFCFC' : '#FFFFFF'
                    }}
                  >
                    {/* CABEÇALHO */}
                    <div
                      onClick={() => toggleItem(proc.id)}
                      style={{
                        padding: '18px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <span style={{
                        fontSize: '0.98rem',
                        fontWeight: '700',
                        color: aberto ? 'var(--ev-teal-primary)' : 'var(--text-dark)',
                        lineHeight: '1.4',
                        transition: 'color 0.28s ease'
                      }}>
                        {proc.titulo}
                      </span>
                      
                      <span style={{
                        fontSize: '1rem',
                        fontWeight: '800',
                        color: aberto ? 'var(--ev-teal-primary)' : '#94A3B8',
                        transform: aberto ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), color 0.28s ease',
                        marginLeft: '16px',
                        display: 'inline-block'
                      }}>
                        ❯
                      </span>
                    </div>

                    {/* GAVETA DE CONTEÚDO */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateRows: aberto ? '1fr' : '0fr',
                        transition: 'grid-template-rows 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{
                          padding: '0 22px 22px 22px',
                          fontSize: '0.92rem',
                          lineHeight: '1.65',
                          color: '#334155',
                          opacity: aberto ? 1 : 0,
                          transform: aberto ? 'translateY(0)' : 'translateY(-8px)',
                          transition: 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                          transitionDelay: aberto ? '0.06s' : '0s'
                        }}>
                          <div style={{
                            background: '#FFFFFF',
                            padding: '16px',
                            borderRadius: '8px',
                            borderTop: '1px solid #F1F5F9',
                            borderLeft: '4px solid var(--ev-teal-primary)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            marginTop: '4px'
                          }}>
                            {proc.conteudo}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>

    </div>
  );
}
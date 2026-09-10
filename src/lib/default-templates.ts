import type { TemplateItemType } from "@/types/database";

export interface SeedTemplateItem {
  title: string;
  description: string;
  type: TemplateItemType;
  is_required: boolean;
}

export interface SeedTemplate {
  name: string;
  description: string;
  items: SeedTemplateItem[];
}

/**
 * Realistic Portuguese accounting templates, shown to a brand new
 * organization ("Carregar modelos de exemplo") and used by the seed script.
 * UI labels are in Portuguese by default.
 */
export const DEFAULT_TEMPLATES: SeedTemplate[] = [
  {
    name: "Abertura de Empresa",
    description:
      "Documentação necessária para a constituição e início de atividade de uma nova empresa.",
    items: [
      {
        title: "Documento de identificação dos sócios",
        description: "Cartão de cidadão / BI de todos os sócios (frente e verso).",
        type: "file",
        is_required: true,
      },
      {
        title: "Comprovativo de morada",
        description: "Fatura de eletricidade, água ou contrato de arrendamento recente.",
        type: "file",
        is_required: true,
      },
      {
        title: "NIF dos sócios",
        description:
          "NIF de cada sócio — pode indicar vários (separados por vírgula, espaço ou linha).",
        type: "text",
        is_required: true,
      },
      {
        title: "Capital social",
        description: "Indique o valor do capital social a realizar.",
        type: "number",
        is_required: false,
      },
      {
        title: "Certidão permanente da empresa (se reativação)",
        description: "Apenas para reativação de empresa anteriormente encerrada.",
        type: "file",
        is_required: false,
      },
      {
        title: "Confirmação de leitura do contrato social",
        description: "Confirmo que li o contrato social e concordo com o objeto social.",
        type: "checkbox",
        is_required: true,
      },
    ],
  },
  {
    name: "Fecho de Contas Mensal",
    description:
      "Elementos que devem ser entregues mensalmente para o fecho de contas e apuramento de IVA.",
    items: [
      {
        title: "Faturas emitidas",
        description: "Exportação ou PDF das faturas emitidas no mês (software de faturação).",
        type: "file",
        is_required: true,
      },
      {
        title: "Faturas recebidas e despesas",
        description: "Todas as faturas e recibos de despesas do mês.",
        type: "file",
        is_required: true,
      },
      {
        title: "Extratos bancários",
        description: "Extratos de todas as contas bancárias referentes ao mês.",
        type: "file",
        is_required: true,
      },
      {
        title: "Recibos de vencimento",
        description: "Recibos de vencimento processados no mês, se aplicável.",
        type: "file",
        is_required: false,
      },
      {
        title: "Volume de vendas do mês",
        description: "Valor total de vendas do mês (aproximado é suficiente).",
        type: "number",
        is_required: true,
      },
      {
        title: "Atividade encerrada no software de faturação?",
        description: "Confirme que fechou o mês no programa de faturação.",
        type: "checkbox",
        is_required: true,
      },
    ],
  },
  {
    name: "Declaração de IRS",
    description:
      "Documentos para preparação e entrega da declaração anual de IRS.",
    items: [
      {
        title: "Documento de identificação",
        description: "Cartão de cidadão / BI de todos os titulares do agregado.",
        type: "file",
        is_required: true,
      },
      {
        title: "Comprovativos de rendimentos",
        description:
          "Declarações de rendimentos (categoria A, B, E, F…) e pensões.",
        type: "file",
        is_required: true,
      },
      {
        title: "Despesas de saúde",
        description: "Faturas e recibos de despesas de saúde do ano anterior.",
        type: "file",
        is_required: false,
      },
      {
        title: "Encargos com rendas / habitação",
        description: "Recibos de renda ou comprovativos de crédito à habitação.",
        type: "file",
        is_required: false,
      },
      {
        title: "NIB para reembolso",
        description: "IBAN onde pretende receber o reembolso, se aplicável.",
        type: "text",
        is_required: false,
      },
      {
        title: "Dados do agregado atualizados?",
        description: "Confirme que não houve alterações ao agregado familiar.",
        type: "checkbox",
        is_required: true,
      },
    ],
  },
  {
    name: "Declaração Periódica de IVA",
    description: "Elementos para a entrega da declaração periódica de IVA.",
    items: [
      {
        title: "Mapa de faturas emitidas",
        description: "Exportação do mês em causa do software de faturação.",
        type: "file",
        is_required: true,
      },
      {
        title: "Faturas de compras com IVA dedutível",
        description: "Faturas de aquisições intracomunitárias ou importações, se aplicável.",
        type: "file",
        is_required: false,
      },
      {
        title: "Valor de IVA liquidado",
        description: "Total de IVA liquidado no período, se já o tiver apurado.",
        type: "number",
        is_required: false,
      },
      {
        title: "Confirmo que as faturas estão comunicadas à AT",
        description: "Confirma que o SAF-T / e-fatura está atualizado.",
        type: "checkbox",
        is_required: true,
      },
    ],
  },
  {
    name: "Contratação de Colaborador",
    description:
      "Documentação necessária para o processamento do primeiro vencimento de um colaborador.",
    items: [
      {
        title: "Contrato de trabalho assinado",
        description: "Cópia do contrato de trabalho celebrado.",
        type: "file",
        is_required: true,
      },
      {
        title: "Documento de identificação",
        description: "Cartão de cidadão / BI do colaborador.",
        type: "file",
        is_required: true,
      },
      {
        title: "NIF e NISS",
        description: "NIF e número de segurança social do colaborador.",
        type: "text",
        is_required: true,
      },
      {
        title: "IBAN",
        description: "IBAN da conta onde será processado o vencimento.",
        type: "text",
        is_required: true,
      },
      {
        title: "Comprovativo de morada",
        description: "Comprovativo atual de morada do colaborador.",
        type: "file",
        is_required: false,
      },
    ],
  },
  {
    name: "Processo de Financiamento",
    description:
      "Documentos tipicamente pedidos para a preparação de um pedido de crédito/apoio.",
    items: [
      {
        title: "Demonstrações financeiras",
        description: "Balanço e demonstração de resultados dos últimos 2 exercícios.",
        type: "file",
        is_required: true,
      },
      {
        title: "Declarações de IRS/IRC",
        description: "Últimas declarações entregues à Autoridade Tributária.",
        type: "file",
        is_required: true,
      },
      {
        title: "Plano de negócio / investimento",
        description: "Documento com a descrição do projeto e investimento previsto.",
        type: "file",
        is_required: false,
      },
      {
        title: "Montante pretendido",
        description: "Valor de financiamento que pretende solicitar.",
        type: "number",
        is_required: true,
      },
      {
        title: "Prazo pretendido",
        description: "Prazo (em meses) em que pretende pagar o financiamento.",
        type: "number",
        is_required: false,
      },
    ],
  },
];

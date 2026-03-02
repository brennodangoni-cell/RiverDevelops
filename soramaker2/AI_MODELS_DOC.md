# River Sora Lab - AI Models Architecture & Strategy (v14.1)

Este documento serve como um guia definitivo sobre a arquitetura de Inteligência Artificial utilizada neste projeto. Se você for exportar este código ou passar para outro desenvolvedor/IA no futuro, **leia isto primeiro**.

## 1. Modelos Utilizados (A "Combinação de Ouro")

Para garantir a melhor qualidade possível de roteiros (Prompts para o Sora 2) e Mockups visuais, mantendo o custo viável para escala (aprox. US$ 0,20 a US$ 0,30 por clique), utilizamos a seguinte combinação da API do Google Gemini:

### A. O Cérebro (Análise e Geração de Prompts)
*   **Modelo:** `gemini-1.5-pro`
*   **Função:** Analisar as imagens do produto enviadas pelo usuário (Visão Computacional) e gerar os roteiros altamente estruturados usando o "SORA 2 MASTER SKELETON".
*   **Por que este modelo?** É o modelo mais avançado e inteligente do Google. Ele consegue seguir instruções complexas (como o esqueleto determinístico do Sora 2) sem se perder. Como o custo de processamento de texto é muito baixo, usar o modelo "Pro" aqui traz um ROI (Retorno sobre Investimento) gigantesco na qualidade do prompt final.

### B. O Fotógrafo (Geração de Mockups Visuais)
*   **Modelo:** `imagen-3.0-generate-001`
*   **Configurações:** `aspectRatio: "1:1"`, `imageSize: "1K"`
*   **Função:** Gerar as imagens de referência (mockups) baseadas na análise do produto e no roteiro da cena.
*   **Por que este modelo?** O modelo "3.1 Flash Image" é a versão mais recente e otimizada para imagens. Ele entrega uma qualidade fotorrealista absurda em resolução 1K, mas custa uma fração do preço do modelo "Pro Image" (Imagen 3). É ele que garante que os US$ 300 de crédito durem por milhares de gerações.

## 2. Estrutura do Prompt (Sora 2 Visual Narrative & Physics Director)

O sistema foi atualizado para o **SORA 2 – VISUAL NARRATIVE & PHYSICS DIRECTOR BLUEPRINT (v2.0)**. 

### Princípios da Nova Arquitetura:
1.  **Hierarquia de Prioridade:** O modelo agora prioriza Movement > Subject > Lighting > Environment.
2.  **Visual vs. Conceitual:** O motor traduz conceitos abstratos (ex: "confortável") em descrições físicas (ex: "soft compression of the sole").
3.  **Micro-Física (Micro-Physics):** Agora incluímos detalhes de interação material, como a reação de superfícies ao peso e toque, aumentando drasticamente o realismo percebido.
4.  **Reforço Cromático:** Cores são sempre acompanhadas de seus códigos HEX para garantir fidelidade visual absoluta.

Isso garante que o vídeo final no Sora 2 não seja apenas um "mockup", mas uma direção de arte cinematográfica de alto nível com comportamento físico realista.

## 3. Variáveis de Ambiente Necessárias
Para rodar este projeto em qualquer servidor (Vercel, Netlify, AWS), você precisará configurar a seguinte variável de ambiente:
*   `GEMINI_API_KEY`: Chave de API do Google AI Studio com faturamento ativado (necessário para acessar os modelos 3.1).

---
*Documento gerado para manter o histórico de decisões arquiteturais do projeto.*

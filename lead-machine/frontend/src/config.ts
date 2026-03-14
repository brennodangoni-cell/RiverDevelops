// Configuração de API para Hostinger
// Se o frontend e backend estiverem no mesmo domínio, use o caminho relativo.
// Se estiverem em domínios diferentes, coloque a URL completa.

export const API_URL = import.meta.env.VITE_API_URL || '';
// Se deixar vazio, ele assume o mesmo domínio (ex: /api/scraper/maps)

-- Tabelas para o Lead Machine
-- Execute no Editor SQL do Supabase

-- 1. Buscas Realizadas
CREATE TABLE IF NOT EXISTS searches (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Leads Extraídos (com prevenção de duplicata pelo WhatsApp)
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    name TEXT,
    phone TEXT,
    whatsapp TEXT UNIQUE,
    instagram TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Mensagens Enviadas
CREATE TABLE IF NOT EXISTS sent_messages (
    id SERIAL PRIMARY KEY,
    name TEXT,
    number TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON leads(whatsapp);
CREATE INDEX IF NOT EXISTS idx_sent_whatsapp ON sent_messages(number);

-- Rode no Supabase SQL Editor
-- Tabela para materiais de apoio das demandas (fotos, vídeos, textos)

CREATE TABLE IF NOT EXISTS demand_materials (
    id SERIAL PRIMARY KEY,
    demand_id INTEGER NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'text')),
    media_url TEXT,
    content TEXT,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demand_materials_demand_id ON demand_materials(demand_id);

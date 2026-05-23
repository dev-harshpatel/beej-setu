-- ═══════════════════════════════════════════════════════════════
-- Beej Setu — Seed 003: Crops + Seed Products
-- Run AFTER migration 004_seed_products.sql
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  c_pearlmillet   UUID;
  c_maize         UUID;
  c_castor        UUID;
  c_greengram     UUID;
  c_blackgram     UUID;
  c_sesamum       UUID;
  c_mustard       UUID;
  c_cumin         UUID;
  c_fennel        UUID;
  c_fodder_bajra  UUID;
  c_cowpea        UUID;
  c_clusterbean   UUID;
  c_okra          UUID;
  c_coriander     UUID;
  c_fodder_jowar  UUID;
  c_mothbean      UUID;
  c_ajwain        UUID;
  c_pigeon_pea    UUID;
  c_kasani        UUID;
  c_chickpea      UUID;
BEGIN

  -- ── Insert crops ─────────────────────────────────────────────
  INSERT INTO public.crops (name) VALUES
    ('Pearlmillet'),
    ('Maize'),
    ('Castor'),
    ('Greengram'),
    ('Blackgram'),
    ('Sesamum'),
    ('Mustard'),
    ('Cumin'),
    ('Fennel'),
    ('Fodder Bajra'),
    ('Cowpea'),
    ('Clusterbean / Guwar'),
    ('Hy. Okra'),
    ('Coriander'),
    ('Fodder Jowar'),
    ('Mothbean'),
    ('Ajwain'),
    ('Pigeon Pea'),
    ('Kasani'),
    ('Chickpea')
  ON CONFLICT (name) DO NOTHING;

  -- ── Fetch IDs ────────────────────────────────────────────────
  SELECT id INTO c_pearlmillet  FROM public.crops WHERE name = 'Pearlmillet';
  SELECT id INTO c_maize        FROM public.crops WHERE name = 'Maize';
  SELECT id INTO c_castor       FROM public.crops WHERE name = 'Castor';
  SELECT id INTO c_greengram    FROM public.crops WHERE name = 'Greengram';
  SELECT id INTO c_blackgram    FROM public.crops WHERE name = 'Blackgram';
  SELECT id INTO c_sesamum      FROM public.crops WHERE name = 'Sesamum';
  SELECT id INTO c_mustard      FROM public.crops WHERE name = 'Mustard';
  SELECT id INTO c_cumin        FROM public.crops WHERE name = 'Cumin';
  SELECT id INTO c_fennel       FROM public.crops WHERE name = 'Fennel';
  SELECT id INTO c_fodder_bajra FROM public.crops WHERE name = 'Fodder Bajra';
  SELECT id INTO c_cowpea       FROM public.crops WHERE name = 'Cowpea';
  SELECT id INTO c_clusterbean  FROM public.crops WHERE name = 'Clusterbean / Guwar';
  SELECT id INTO c_okra         FROM public.crops WHERE name = 'Hy. Okra';
  SELECT id INTO c_coriander    FROM public.crops WHERE name = 'Coriander';
  SELECT id INTO c_fodder_jowar FROM public.crops WHERE name = 'Fodder Jowar';
  SELECT id INTO c_mothbean     FROM public.crops WHERE name = 'Mothbean';
  SELECT id INTO c_ajwain       FROM public.crops WHERE name = 'Ajwain';
  SELECT id INTO c_pigeon_pea   FROM public.crops WHERE name = 'Pigeon Pea';
  SELECT id INTO c_kasani       FROM public.crops WHERE name = 'Kasani';
  SELECT id INTO c_chickpea     FROM public.crops WHERE name = 'Chickpea';

  -- ── Insert seed products ──────────────────────────────────────
  INSERT INTO public.seed_products (crop_id, variety, pack_size, packets_per_bag) VALUES

    -- Pearlmillet
    (c_pearlmillet,  'Fycus Devi',              '1.5 kg', 30),
    (c_pearlmillet,  'Fycus Devika',            '1.5 kg', 30),

    -- Maize
    (c_maize,        'Fycus Mandira',           '4 kg',   10),
    (c_maize,        'Fycus Mandira',           '1 kg',   30),
    (c_maize,        'Fycus Achal',             '4 kg',   10),
    (c_maize,        'Fycus Achal',             '1 kg',   30),
    (c_maize,        'Fycus Tara',              '4 kg',   10),
    (c_maize,        'Fycus Tara',              '1 kg',   30),

    -- Castor
    (c_castor,       'Fycus Pradhan',           '1 kg',   40),
    (c_castor,       'Fycus Mahavir',           '1 kg',   40),
    (c_castor,       'Fycus Jena',              '1 kg',   40),
    (c_castor,       'GCH-7',                   '1 kg',   40),

    -- Greengram
    (c_greengram,    'Fycus Aabha',             '1 kg',   40),

    -- Blackgram
    (c_blackgram,    'Fycus Asit',              '1 kg',   40),

    -- Sesamum
    (c_sesamum,      'Fycus Divyam',            '500 g',  50),

    -- Mustard
    (c_mustard,      'Fycus Bindra',            '1 kg',   40),

    -- Cumin
    (c_cumin,        'Fycus 06',                '1 kg',   30),

    -- Fennel
    (c_fennel,       'Fycus Breyona',           '1 kg',   50),

    -- Fodder Bajra
    (c_fodder_bajra, 'Fycus Charvi',            '1 kg',   40),
    (c_fodder_bajra, 'Fycus Rajvi',             '1 kg',   40),

    -- Cowpea
    (c_cowpea,       'Fycus Sunanda',           '500 g',  50),

    -- Clusterbean / Guwar
    (c_clusterbean,  'Fycus Simran',            '500 g',  50),

    -- Hy. Okra
    (c_okra,         'Fycus Ayan',              '250 g',  50),

    -- Coriander
    (c_coriander,    'Fycus Manohar',           '5 kg',   10),

    -- Fodder Jowar
    (c_fodder_jowar, 'Fycus Jowell',            '500 g',  50),

    -- Mothbean
    (c_mothbean,     'Fycus Kenit',             '1 kg',   40),

    -- Ajwain
    (c_ajwain,       'Fycus Ami',               '500 g',  50),

    -- Pigeon Pea
    (c_pigeon_pea,   'Fycus Saloni',            '1 kg',   40),
    (c_pigeon_pea,   'Fycus Vijeta',            '1 kg',   40),
    (c_pigeon_pea,   'Fycus Vaishali',          '1 kg',   40),

    -- Kasani
    (c_kasani,       'Fycus Mastani',           '1 kg',   40),

    -- Chickpea
    (c_chickpea,     '121',                     '1 kg',    5)

  ON CONFLICT (crop_id, variety, pack_size) DO NOTHING;

  RAISE NOTICE 'Seed 003: 20 crops and 32 seed products inserted successfully.';

END $$;

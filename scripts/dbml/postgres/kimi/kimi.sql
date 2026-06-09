-- PostgreSQL to DBML Generator
-- Returns a single JSON object: {"dbml": "...", "metadata": {...}}
-- Compatible with PostgreSQL 11+

-- Helper: safely quote notes/strings for DBML syntax
CREATE OR REPLACE FUNCTION pg_temp.quote_dbml_note(note text)
RETURNS text AS $$
BEGIN
  IF note IS NULL THEN RETURN NULL; END IF;
  -- Use multiline triple quotes for long text or text with newlines
  IF note LIKE E'%\n%' OR length(note) > 80 THEN
    RETURN '''''''''' || replace(note, '''', '\''') || '''''''''';
  ELSE
    RETURN '''' || replace(note, '''', '\''') || '''';
  END IF;
END;
$$ LANGUAGE plpgsql;

WITH 
-- ========================================================================
-- 1. USER TABLES (exclude system schemas)
-- ========================================================================
selected_tables AS (
  SELECT
    c.oid AS table_oid,
    n.nspname AS schema_name,
    c.relname AS table_name,
    obj_description(c.oid, 'pg_class') AS table_note
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r'
    AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    AND n.nspname !~ '^pg_toast'
  ORDER BY n.nspname, c.relname
),

-- ========================================================================
-- 2. ENUM DEFINITIONS
-- ========================================================================
enum_defs AS (
  SELECT 
    format(E'enum %s%s {\n  %s\n}',
      CASE WHEN n.nspname = 'public' THEN '' ELSE format('%I', n.nspname) || '.' END,
      format('%I', t.typname),
      string_agg(format('%I', e.enumlabel), E'\n  ' ORDER BY e.enumsortorder)
    ) AS dbml_part
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE t.typtype = 'e'
    AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    AND n.nspname !~ '^pg_toast'
  GROUP BY n.nspname, t.typname
),

-- ========================================================================
-- 3. COLUMNS with types, defaults, constraints, comments
-- ========================================================================
selected_columns AS (
  SELECT
    a.attrelid AS table_oid,
    a.attname AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
    a.attnotnull AS is_not_null,
    pg_get_expr(d.adbin, d.adrelid) AS default_expr,
    a.attidentity,
    col_description(a.attrelid, a.attnum) AS column_note,
    a.attnum,
    EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = a.attrelid AND contype = 'p' 
      AND conkey = ARRAY[a.attnum]
    ) AS is_pk,
    EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = a.attrelid AND contype = 'u' 
      AND conkey = ARRAY[a.attnum]
    ) AS is_unique
  FROM pg_attribute a
  LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
  WHERE a.attnum > 0 
    AND NOT a.attisdropped
    AND a.attrelid IN (SELECT table_oid FROM selected_tables)
),

column_dbml AS (
  SELECT
    table_oid,
    string_agg(
      CASE 
        WHEN col_settings = '' THEN
          format('%I %s', column_name, formatted_type)
        ELSE
          format('%I %s [%s]', column_name, formatted_type, col_settings)
      END,
      E'\n  '
      ORDER BY attnum
    ) AS columns_dbml
  FROM (
    SELECT
      table_oid,
      column_name,
      CASE WHEN data_type LIKE '% %' THEN format('%I', data_type) ELSE data_type END AS formatted_type,
      attnum,
      concat_ws(', ',
        CASE WHEN is_pk THEN 'pk' END,
        CASE WHEN is_not_null THEN 'not null' ELSE 'null' END,
        CASE WHEN is_unique THEN 'unique' END,
        CASE WHEN attidentity IN ('a', 'd') OR default_expr LIKE 'nextval%' THEN 'increment' END,
        CASE WHEN default_expr IS NOT NULL 
              AND NOT (attidentity IN ('a', 'd') OR default_expr LIKE 'nextval%') 
            THEN format('default: `%s`', default_expr) 
        END,
        CASE WHEN column_note IS NOT NULL 
            THEN format('note: %s', pg_temp.quote_dbml_note(column_note)) 
        END
      ) AS col_settings
    FROM selected_columns
  ) sub
  GROUP BY table_oid
),

-- ========================================================================
-- 4. INDEXES (skip single-col PKs; skip expression indexes)
-- ========================================================================
selected_indexes AS (
  SELECT
    t.table_oid,
    ix.indisprimary,
    ix.indisunique,
    format('%s [%s]',
      CASE
        WHEN count(CASE WHEN ap < ix.indnkeyatts THEN 1 END) = 1
        THEN string_agg(CASE WHEN ap < ix.indnkeyatts THEN a.attname END, '' ORDER BY ap)
        ELSE '(' || string_agg(CASE WHEN ap < ix.indnkeyatts THEN a.attname END, ', ' ORDER BY ap) || ')'
      END,
      concat_ws(', ',
        format('name: %s', pg_temp.quote_dbml_note(i.relname)),
        CASE WHEN ix.indisprimary THEN 'pk' WHEN ix.indisunique THEN 'unique' END,
        CASE WHEN m.amname <> 'btree' THEN format('type: %s', pg_temp.quote_dbml_note(m.amname)) END,
        CASE WHEN count(CASE WHEN ap >= ix.indnkeyatts THEN 1 END) > 0
          THEN format('note: %s', pg_temp.quote_dbml_note('INCLUDE (' || 
               string_agg(CASE WHEN ap >= ix.indnkeyatts THEN a.attname END, ',' ORDER BY ap) || ')'))
        END
      )
    ) AS index_dbml
  FROM selected_tables t
  JOIN pg_index ix ON ix.indrelid = t.table_oid
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_am m ON m.oid = i.relam
  JOIN pg_attribute a ON a.attrelid = t.table_oid AND a.attnum = ANY(ix.indkey)
  CROSS JOIN LATERAL (SELECT array_position(ix.indkey::smallint[], a.attnum) AS ap) apos
  WHERE (ix.indisprimary = false OR ix.indnkeyatts > 1)
    AND NOT (0 = ANY(ix.indkey))
  GROUP BY t.table_oid, i.relname, m.amname, ix.indisunique, ix.indisprimary, ix.indnkeyatts
),

index_blocks AS (
  SELECT
    table_oid,
    format(E'\n  indexes {\n    %s\n  }', 
      string_agg(index_dbml, E'\n    ' ORDER BY indisprimary DESC, indisunique DESC)
    ) AS indexes_dbml
  FROM selected_indexes
  GROUP BY table_oid
  HAVING count(*) > 0
),

-- ========================================================================
-- 5. CHECK CONSTRAINTS
-- ========================================================================
check_blocks AS (
  SELECT
    con.conrelid AS table_oid,
    format(E'\n  checks {\n    %s\n  }',
      string_agg(
        format('`%s` [name: %s]', 
          trim(both from left(substr(pg_get_constraintdef(con.oid, true), 7), 
            length(substr(pg_get_constraintdef(con.oid, true), 7)) - 1)),
          pg_temp.quote_dbml_note(con.conname)
        ),
        E'\n    '
      )
    ) AS checks_dbml
  FROM pg_constraint con
  WHERE con.contype = 'c'
    AND con.conrelid IN (SELECT table_oid FROM selected_tables)
  GROUP BY con.conrelid
  HAVING count(*) > 0
),

-- ========================================================================
-- 6. TABLE ASSEMBLY
-- ========================================================================
table_blocks AS (
  SELECT
    string_agg(
      format(E'Table %s {%s%s%s%s}',
        CASE WHEN t.schema_name = 'public' 
          THEN format('%I', t.table_name)
          ELSE format('%I.%I', t.schema_name, t.table_name) 
        END,
        E'\n  ' || c.columns_dbml,
        COALESCE(E'\n' || i.indexes_dbml, ''),
        COALESCE(E'\n' || ch.checks_dbml, ''),
        CASE WHEN t.table_note IS NOT NULL 
          THEN E'\n\n  Note: ' || pg_temp.quote_dbml_note(t.table_note)
          ELSE ''
        END
      ),
      E'\n\n'
      ORDER BY t.schema_name, t.table_name
    ) AS tables_dbml
  FROM selected_tables t
  JOIN column_dbml c ON t.table_oid = c.table_oid
  LEFT JOIN index_blocks i ON t.table_oid = i.table_oid
  LEFT JOIN check_blocks ch ON t.table_oid = ch.table_oid
),

-- ========================================================================
-- 7. FOREIGN KEYS (Refs)
-- ========================================================================
fk_blocks AS (
  SELECT
    string_agg(
      format('Ref %s: %s.%s.%s > %s.%s.%s%s',
        pg_temp.quote_dbml_note(fk.conname),
        (SELECT n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.oid = fk.conrelid),
        fk.conrelid::regclass,
        CASE WHEN (SELECT count(*) FROM pg_attribute WHERE attrelid = fk.conrelid AND attnum = ANY(fk.conkey)) = 1
          THEN (SELECT attname FROM pg_attribute WHERE attrelid = fk.conrelid AND attnum = ANY(fk.conkey) LIMIT 1)
          ELSE '(' || (SELECT string_agg(attname, ', ') FROM pg_attribute WHERE attrelid = fk.conrelid AND attnum = ANY(fk.conkey)) || ')'
        END,
        (SELECT n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.oid = fk.confrelid),
        fk.confrelid::regclass,
        CASE WHEN (SELECT count(*) FROM pg_attribute WHERE attrelid = fk.confrelid AND attnum = ANY(fk.confkey)) = 1
          THEN (SELECT attname FROM pg_attribute WHERE attrelid = fk.confrelid AND attnum = ANY(fk.confkey) LIMIT 1)
          ELSE '(' || (SELECT string_agg(attname, ', ') FROM pg_attribute WHERE attrelid = fk.confrelid AND attnum = ANY(fk.confkey)) || ')'
        END,
        CASE WHEN fk.confupdtype <> 'a' OR fk.confdeltype <> 'a' THEN
          ' [' || concat_ws(', ',
            CASE WHEN fk.confupdtype <> 'a' THEN format('update: %s', 
              CASE fk.confupdtype WHEN 'c' THEN 'cascade' WHEN 'r' THEN 'restrict' WHEN 'n' THEN 'set null' WHEN 'd' THEN 'set default' END
            ) END,
            CASE WHEN fk.confdeltype <> 'a' THEN format('delete: %s',
              CASE fk.confdeltype WHEN 'c' THEN 'cascade' WHEN 'r' THEN 'restrict' WHEN 'n' THEN 'set null' WHEN 'd' THEN 'set default' END
            ) END
          ) || ']'
        ELSE '' END
      ),
      E'\n'
      ORDER BY fk.conrelid::regclass, fk.conname
    ) AS refs_dbml
  FROM pg_constraint fk
  WHERE fk.contype = 'f'
    AND EXISTS(SELECT 1 FROM selected_tables t WHERE t.table_oid IN (fk.conrelid, fk.confrelid))
),

-- ========================================================================
-- 8. ENUMS, PROJECT
-- ========================================================================
enum_block AS (
  SELECT string_agg(dbml_part, E'\n\n') AS enums_dbml FROM enum_defs
),

project_block AS (
  SELECT format(E'Project %I {\n  database_type: ''PostgreSQL''\n  Note: ''Generated from %I on %s''\n}',
    current_database(),
    current_database(),
    now()::text
  ) AS project_dbml
)

-- ========================================================================
-- FINAL JSON OUTPUT
-- ========================================================================
SELECT jsonb_build_object(
  'dbml', concat_ws(E'\n\n',
    (SELECT project_dbml FROM project_block),
    (SELECT enums_dbml FROM enum_block),
    (SELECT tables_dbml FROM table_blocks),
    (SELECT refs_dbml FROM fk_blocks)
  ),
  'metadata', jsonb_build_object(
    'generated_at', now(),
    'database', current_database(),
    'postgresql_version', version()
  )
) AS result;
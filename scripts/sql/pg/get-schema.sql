WITH columns AS (
    SELECT 
        c.relname AS table_name,
        n.nspname AS schema_name,
        a.attname AS column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
        CASE WHEN a.attnotnull THEN 'NOT NULL' ELSE '' END AS nullable,
        pg_get_expr(d.adbin, d.adrelid) AS default_value,
        a.attnum AS ordinal_position
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
    WHERE c.relkind = 'r'
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND a.attnum > 0
      AND NOT a.attisdropped
),
pk_info AS (
    SELECT
        c.relname AS table_name,
        n.nspname AS schema_name,
        string_agg(a.attname, ', ' ORDER BY array_position(con.conkey, a.attnum)) AS pk_columns
    FROM pg_constraint con
    JOIN pg_class c ON con.conrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
    WHERE con.contype = 'p'
    GROUP BY c.relname, n.nspname
),
fk_info AS (
    SELECT
        c.relname AS table_name,
        n.nspname AS schema_name,
        con.conname AS fk_name,
        string_agg(a.attname, ', ' ORDER BY array_position(con.conkey, a.attnum)) AS fk_columns,
        ref_c.relname AS ref_table,
        ref_n.nspname AS ref_schema,
        string_agg(ref_a.attname, ', ' ORDER BY array_position(con.confkey, ref_a.attnum)) AS ref_columns
    FROM pg_constraint con
    JOIN pg_class c ON con.conrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
    JOIN pg_class ref_c ON con.confrelid = ref_c.oid
    JOIN pg_namespace ref_n ON ref_c.relnamespace = ref_n.oid
    JOIN pg_attribute ref_a ON ref_a.attrelid = ref_c.oid AND ref_a.attnum = ANY(con.confkey)
    WHERE con.contype = 'f'
    GROUP BY c.relname, n.nspname, con.conname, ref_c.relname, ref_n.nspname
),
table_defs AS (
    SELECT 
        schema_name,
        table_name,
        1 AS sort_order,
        'CREATE TABLE ' || schema_name || '.' || table_name || ' (' || chr(10) ||
        string_agg(
            '    ' || column_name || ' ' || data_type || 
            COALESCE(' DEFAULT ' || default_value, '') ||
            CASE WHEN nullable <> '' THEN ' ' || nullable ELSE '' END,
            ',' || chr(10) ORDER BY ordinal_position
        ) || 
        COALESCE(',' || chr(10) || '    PRIMARY KEY (' || pk_columns || ')', '') ||
        chr(10) || ');' AS ddl
    FROM columns
    LEFT JOIN pk_info USING (schema_name, table_name)
    GROUP BY schema_name, table_name, pk_columns
),
fk_defs AS (
    SELECT 
        schema_name,
        table_name,
        2 AS sort_order,
        'ALTER TABLE ' || schema_name || '.' || table_name || 
        ' ADD CONSTRAINT ' || fk_name || 
        ' FOREIGN KEY (' || fk_columns || ')' ||
        ' REFERENCES ' || ref_schema || '.' || ref_table || 
        ' (' || ref_columns || ');' AS ddl
    FROM fk_info
),
all_defs AS (
    SELECT sort_order, schema_name, table_name, ddl FROM table_defs
    UNION ALL
    SELECT sort_order, schema_name, table_name, ddl FROM fk_defs
)
SELECT string_agg(ddl, chr(10) || chr(10) ORDER BY sort_order, schema_name, table_name) AS full_schema_text
FROM all_defs;
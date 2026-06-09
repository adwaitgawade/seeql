CREATE OR REPLACE FUNCTION pg_temp.quote_note(note_string text)
RETURNS text AS
$$
BEGIN
    IF POSITION('"' IN note_string) > 0 THEN
        IF LENGTH(note_string) > 80 THEN
            RETURN '''''''' || E'\n\t' || note_string || E'\n''''''';
        ELSE
            RETURN '''''''' || note_string || '''''''';
        END IF;
    ELSE
        RETURN '"' || note_string || '"';
    END IF;
END;
$$
LANGUAGE plpgsql;



WITH SelectedTables AS (
    SELECT
        format('"%s"."%s"', t.table_schema, t.table_name)::regclass::oid AS table_oid,
        t.table_catalog,
        t.table_schema,
        t.table_name,
        obj_description(format('"%s"."%s"', t.table_schema, t.table_name)::regclass) AS table_comment
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY
        t.table_catalog,
        t.table_schema,
        t.table_name
), SelectedTableColumns AS (
    SELECT
        t.table_oid,
        c.column_name,
        c.is_nullable = 'YES' AS is_nullable,
        c.udt_name,
        c.column_default,
        c.ordinal_position,
        pg_catalog.col_description(t.table_oid, c.ordinal_position) as column_comment,
        EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = t.table_oid
              AND contype = 'p'
              AND conkey @> ARRAY[c.ordinal_position::smallint]
        ) AS is_part_of_primary_key,
        EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = t.table_oid
              AND contype = 'u'
              AND conkey @> ARRAY[c.ordinal_position::smallint]
              AND array_length(conkey, 1) = 1
        ) AS is_unique
    FROM SelectedTables t
    INNER JOIN information_schema.columns c
        ON
            c.table_catalog = t.table_catalog AND
            c.table_schema = t.table_schema AND
            c.table_name = t.table_name
), SelectedTableColumnsDBML AS (
    SELECT
        table_oid,
        STRING_AGG(FORMAT(
            '%s %s [%s]',
            column_name,
            udt_name,
            CONCAT_WS(
                ', ',
                CASE WHEN is_part_of_primary_key THEN 'pk' END,
                CASE WHEN is_nullable THEN 'null' ELSE 'not null' END,
                CASE WHEN is_unique THEN 'unique' END,
                CASE WHEN column_default IS NOT NULL THEN FORMAT('default: `%s`', column_default) END,
                CASE WHEN column_comment IS NOT NULL THEN FORMAT('note: %s', pg_temp.quote_note(column_comment)) END
            )
        ), E'\n\t' ORDER BY is_part_of_primary_key DESC, ordinal_position) AS columns_dbml
    FROM SelectedTableColumns
    GROUP BY table_oid
), SelectedTableIndexes AS (
    SELECT
        table_oid,
        indisprimary,
        indisunique,
        FORMAT(
            '%s [%s]',
            CASE
                WHEN COUNT(a.attname) FILTER (WHERE array_position(ix.indkey, a.attnum) < indnkeyatts) = 1
                    THEN STRING_AGG(a.attname, '') FILTER (WHERE array_position(ix.indkey, a.attnum) < indnkeyatts)
                ELSE '(' || STRING_AGG(a.attname, ', ') FILTER (WHERE array_position(ix.indkey, a.attnum) < indnkeyatts) || ')'
            END,
            CONCAT_WS(
                ', ',
                FORMAT('name: "%s"', i.relname),
                CASE
                    WHEN indisprimary THEN 'pk'
                    WHEN indisunique THEN 'unique'
                END,
                CASE WHEN m.amname <> 'btree' THEN FORMAT('type: "%s"', m.amname) END,
                CASE
                    WHEN COUNT(a.attname) FILTER (WHERE array_position(ix.indkey, a.attnum) >= indnkeyatts) > 0
                        THEN FORMAT('note: ''''''INCLUDE (%s)''''''',
                             STRING_AGG(a.attname, ',') FILTER (WHERE array_position(ix.indkey, a.attnum) >= indnkeyatts)
                        )
                END
            )
        ) AS index_dbml
    FROM SelectedTables t
    INNER JOIN pg_index ix ON ix.indrelid = t.table_oid
    INNER JOIN pg_class i ON i.oid = ix.indexrelid
    INNER JOIN pg_am m ON m.oid = i.relam
    INNER JOIN pg_attribute a ON a.attrelid = t.table_oid AND a.attnum = ANY(ix.indkey)
    WHERE (ix.indisprimary = false OR indnkeyatts > 1)
    GROUP BY
        t.table_oid,
        i.relname,
        m.amname,
        ix.indisunique,
        ix.indisprimary
), SelectedTableIndexesJoined AS (
    SELECT
        table_oid,
        FORMAT(
            E'\n\tIndexes {\n\t\t%s\n\t}',
            STRING_AGG(index_dbml, E'\n\t\t' ORDER BY indisprimary DESC, indisunique DESC)
        ) AS indexes_dbml
    FROM SelectedTableIndexes
    GROUP BY table_oid
    HAVING COUNT(*) > 0
), SelectedTablesDBML AS (
    SELECT
        STRING_AGG(FORMAT(E'Table %s.%s {\n\t%s\n}',
            table_schema,
            table_name,
            CONCAT_WS(E'\n\t',
                columns_dbml,
                indexes_dbml,
                E'\n\tNote: ''''''\n\t' || table_comment || E'\n\t'''''''
            )
        ), E'\n\n') AS tables_dbml
    FROM SelectedTables t
    INNER JOIN SelectedTableColumnsDBML c
        ON t.table_oid = c.table_oid
    LEFT JOIN SelectedTableIndexesJoined i
        ON t.table_oid = i.table_oid
), AllForeignKeyRelationshipsDBML AS (
    SELECT
        STRING_AGG(FORMAT(
            'Ref %s: %s.%s.%s > %s.%s.%s',
            conname,
            (
                SELECT n.nspname AS schema_name
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.oid = conrelid
            ),
            conrelid::regclass,
            (
                SELECT
                    CASE
                        WHEN COUNT(attname) = 1 THEN MAX(attname)
                        ELSE '(' || STRING_AGG(attname, ', ') || ')'
                    END
                FROM pg_attribute
                WHERE attrelid = conrelid AND attnum = ANY(conkey)
            ),
            (
                SELECT n.nspname AS schema_name
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.oid = confrelid
            ),
            confrelid::regclass,
            (
                SELECT
                    CASE
                        WHEN COUNT(attname) = 1 THEN MAX(attname)
                        ELSE '(' || STRING_AGG(attname, ', ') || ')'
                    END
                FROM pg_attribute
                WHERE attrelid = confrelid AND attnum = ANY(confkey)
            )
        ), E'\n' ORDER BY conrelid::regclass, conname) AS relationships_dbml
    FROM pg_constraint fk
    WHERE fk.contype = 'f'
      AND EXISTS(SELECT 1 FROM SelectedTables t WHERE t.table_oid IN (conrelid, confrelid))
)
SELECT
    (tables_dbml || E'\n\n\n\n' || relationships_dbml) AS full_dbml
FROM SelectedTablesDBML, AllForeignKeyRelationshipsDBML
import {
  Key,
  ChevronsLeftRightEllipsis,
  Calendar,
  Hash,
  Type,
  ToggleLeft,
  Binary,
  Code,
  Database,
  Link,
  Mail,
  Globe,
  FileText,
  Lock,
  MapPin,
  Table,
  Search,
  Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Constraint } from '@/types/viewer';

/**
 * Map of constraint names to their corresponding Lucide icons.
 * Constraints take priority over type-based icons.
 */
export const constraintIcons: Record<string, LucideIcon> = {
  'primary key': Key,
  'foreign key': ChevronsLeftRightEllipsis,
};

/**
 * Map of column type names (lowercase) to their corresponding Lucide icons.
 */
export const typeIcons: Record<string, LucideIcon> = {
  // Integer / Numeric
  'int': Hash,
  'integer': Hash,
  'bigint': Hash,
  'smallint': Hash,
  'serial': Hash,
  'bigserial': Hash,
  'numeric': Hash,
  'decimal': Hash,
  'float': Hash,
  'double': Hash,
  'real': Hash,

  // String
  'varchar': Type,
  'nvarchar': Type,
  'text': FileText,
  'char': Type,
  'string': Type,
  'clob': FileText,

  // Date / Time
  'datetime': Calendar,
  'timestamp': Calendar,
  'date': Calendar,
  'time': Calendar,
  'timestamptz': Calendar,

  // Boolean
  'bool': ToggleLeft,
  'boolean': ToggleLeft,

  // Binary
  'bytea': Binary,
  'blob': Binary,
  'binary': Binary,
  'varbinary': Binary,

  // JSON / Structured
  'json': Code,
  'jsonb': Code,

  // UUID / Identifier
  'uuid': Database,

  // URL / Link
  'url': Link,
  'uri': Link,

  // Email
  'email': Mail,

  // Domain / Web
  'domain': Globe,

  // Geometry / Location
  'point': MapPin,
  'geometry': MapPin,
  'geography': MapPin,

  // Enum / Set
  'enum': Table,
  'set': Table,

  // Search / Fulltext
  'tsvector': Search,
  'fulltext': Search,

  // Rating
  'rating': Star,
};

/**
 * Returns the appropriate Lucide icon for a column based on its constraints and type.
 *
 * Priority:
 * 1. Constraint-based icons (PK → Key, FK → ChevronsLeftRightEllipsis)
 * 2. Type-based icons (int → Hash, datetime → Calendar, etc.)
 * 3. null if no icon matches
 */
/**
 * Returns the appropriate Lucide icon for a column based on its constraints and type.
 * Handles types with size/precision like VARCHAR(255).
 *
 * Priority:
 * 1. Constraint-based icons (PK → Key, FK → ChevronsLeftRightEllipsis)
 * 2. Type-based icons (int → Hash, datetime → Calendar, etc.)
 * 3. null if no icon matches
 */
export function getColumnIcon(
  type: string,
  constraints: Constraint[]
): LucideIcon | null {
  // Constraints take priority
  for (const constraint of constraints) {
    const icon = constraintIcons[constraint];
    if (icon) return icon;
  }

  // Fall back to type-based icon
  return typeIcons[normalizeType(type)] || null;
}

/**
 * Returns the constraint icon only (Key for PK, ChevronsLeftRightEllipsis for FK).
 * Useful when you want to show constraint icons separately from type icons.
 */
export function getConstraintIcon(
  constraints: Constraint[]
): LucideIcon | null {
  for (const constraint of constraints) {
    const icon = constraintIcons[constraint];
    if (icon) return icon;
  }
  return null;
}

/**
 * Strips size/precision from a type string.
 * Examples: "VARCHAR(255)" → "varchar", "DECIMAL(10,2)" → "decimal"
 */
function normalizeType(type: string): string {
  return type.toLowerCase().replace(/\s*\(.*\)$/, '');
}

/**
 * Returns the type-based icon only (no constraint check).
 * Handles types with size/precision like VARCHAR(255).
 */
export function getTypeIcon(type: string): LucideIcon | null {
  return typeIcons[normalizeType(type)] || null;
}

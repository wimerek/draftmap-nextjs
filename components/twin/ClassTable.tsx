/**
 * components/twin/ClassTable.tsx
 *
 * Piece 3 (render) — server-rendered HTML table of the position class.
 * Drafted players in draft order, then a UDFA appendix under its own subheading.
 * Quiet "appendix" styling; NOT behind a tab/accordion. No client-side sorting.
 */

import Link from 'next/link';
import type { TableColumn, TableRow } from '@/lib/classTable';
import { formatDelta } from '@/lib/twinData';

interface Props {
  columns: TableColumn[];
  drafted: TableRow[];
  udfa: TableRow[];
  position: string;
  year: number;
}

function renderCell(col: TableColumn, row: TableRow) {
  switch (col.key) {
    case 'pick':
      return row.pick != null ? row.pick : '—';
    case 'player':
      return row.slug ? (
        <Link href={`/players/${row.slug}`} className="twin-table__player">
          {row.playerName}
        </Link>
      ) : (
        row.playerName
      );
    case 'posRank':
      return row.posRank;
    case 'consensus':
      return row.consensus != null ? `#${row.consensus}` : '—';
    case 'delta':
      return row.delta != null ? formatDelta(row.delta) : '—';
    case 'school':
      return row.school ?? '—';
    case 'team':
      return row.team ?? '—';
    default:
      return '—';
  }
}

function Row({ columns, row }: { columns: TableColumn[]; row: TableRow }) {
  return (
    <tr>
      {columns.map((col) => (
        <td
          key={col.key}
          className={col.key === 'delta' ? 'twin-table__num' : col.key === 'pick' ? 'twin-table__num' : undefined}
        >
          {renderCell(col, row)}
        </td>
      ))}
    </tr>
  );
}

export default function ClassTable({ columns, drafted, udfa, position, year }: Props) {
  const active = columns.filter((c) => c.active);
  return (
    <section className="twin-table-wrap" aria-label={`${year} ${position} class table`}>
      <table className="twin-table">
        <thead>
          <tr>
            {active.map((c) => (
              <th key={c.key} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drafted.map((row, i) => (
            <Row key={`d-${i}`} columns={active} row={row} />
          ))}
          {udfa.length > 0 && (
            <>
              <tr className="twin-table__subhead">
                <td colSpan={active.length}>Undrafted (UDFA)</td>
              </tr>
              {udfa.map((row, i) => (
                <Row key={`u-${i}`} columns={active} row={row} />
              ))}
            </>
          )}
        </tbody>
      </table>
    </section>
  );
}

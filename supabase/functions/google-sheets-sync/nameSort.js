const collator = new Intl.Collator('vi', { sensitivity: 'accent', numeric: true });

export function studentSheetSortPlan(rawRows = [], firstRow = 8, lastRow = 70) {
  const rows = Array.from({length: lastRow - firstRow + 1}, (_, i) => {
    const name = String(rawRows[i]?.[2] ?? '').normalize('NFC').trim().replace(/\s+/gu, ' ');
    return {sheetRow: firstRow + i, name, given: name.split(' ').at(-1)};
  });
  const sorted = [...rows].sort((a, b) =>
    Number(!a.name) - Number(!b.name) || collator.compare(a.given, b.given) ||
    collator.compare(a.name, b.name) || a.sheetRow - b.sheetRow);
  return {rows, sorted, needsSort: sorted.some((row, i) => row !== rows[i])};
}

// Each move uses indices in the grid resulting from all preceding moves.
export function studentRowMoves(plan, sheetId) {
  const order = plan.rows.map(r => r.sheetRow);
  const first = order[0] - 1;
  const requests = [];
  for (const [i, row] of plan.sorted.entries()) {
    const from = order.indexOf(row.sheetRow);
    if (from === i) continue;
    requests.push({moveDimension:{source:{sheetId, dimension:'ROWS',
      startIndex:first + from, endIndex:first + from + 1}, destinationIndex:first + i}});
    order.splice(i, 0, ...order.splice(from, 1));
  }
  return requests;
}

export function matchedStudentBatches(pairs) {
  const ids = [...new Set(pairs.filter(p => p.student && !p.ambiguous).map(p => p.student.id))];
  const batches = [];
  for (let i = 0; i < ids.length; i += 60) batches.push(ids.slice(i, i + 60));
  return batches;
}

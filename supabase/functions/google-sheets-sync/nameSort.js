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

// Google validates every move against the current merges. Unmerge only ranges
// touched by a move and restore each range against its original rows atomically.
export function mergedRowMoves(plan, sheetId, merges) {
  const moves = studentRowMoves(plan, sheetId);
  const positions = new Map(plan.sorted.map((r,i) => [r.sheetRow-1, plan.rows[0].sheetRow-1+i]));
  const before = [], after = [];
  for (const merge of merges) {
    const start = merge.startRowIndex ?? 0, end = merge.endRowIndex;
    if (!moves.some(({moveDimension:m}) => start < m.source.endIndex && end > m.destinationIndex)) continue;
    const target = positions.get(start) ?? start;
    for (let i=start+1; i<end; i++) {
      if ((positions.get(i) ?? i) !== target+i-start)
        return {warning:'Có ô gộp dọc qua nhiều dòng học sinh. Cần kiểm tra vùng gộp ở dòng '+(start+1)+'–'+end+' trước khi xếp tên.'};
    }
    before.push({unmergeCells:{range:merge}});
    after.push({mergeCells:{range:{...merge,startRowIndex:target,endRowIndex:target+end-start},mergeType:'MERGE_ALL'}});
  }
  return {requests:[...before,...moves,...after]};
}

export function verifiedCodeMatch(code, candidates, uniqueOnSheet) {
  const key=String(code ?? '').trim();
  if (!key || !uniqueOnSheet) return null;
  const matches=candidates.filter(s => String(s.student_code ?? '').trim()===key);
  return matches.length===1 ? matches[0] : null;
}

export function canReconcileMissingRows(names, activeByName, mapped, students) {
  const activeIds = new Set(students.map(st => st.id));
  return names.length > 0 && new Set(names).size === names.length &&
    names.every(n => activeByName.get(n)?.length === 1) &&
    Object.keys(mapped).every(id => activeIds.has(id));
}

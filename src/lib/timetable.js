export function validateRows(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 500)
    throw new Error("Cần từ 1 đến 500 buổi học.");
  const cleaned = rows.map((r, i) => {
    const school_name = String(r.school_name || "").trim(),
      class_name = String(r.class_name || "").trim();
    const date = String(r.session_date || ""),
      start = String(r.start_time || ""),
      end = String(r.end_time || "");
    const validDate =
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !isNaN(Date.parse(date)) &&
      new Date(date).toISOString().slice(0, 10) === date;
    const validTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
    const count = Number(r.period_count);
    if (
      !school_name ||
      !class_name ||
      school_name.length > 200 ||
      class_name.length > 200 ||
      !validDate ||
      !validTime(start) ||
      !validTime(end) ||
      end <= start ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 20
    )
      throw new Error(
        `Dòng ${i + 1}: kiểm tra trường, lớp, ngày, giờ và số tiết (1–20).`,
      );
    return {
      school_name,
      class_name,
      session_date: date,
      start_time: start,
      end_time: end,
      period_count: count,
    };
  });
  for (let i = 0; i < cleaned.length; i++)
    for (let j = 0; j < i; j++) {
      const a = cleaned[i],
        b = cleaned[j];
      if (
        a.session_date === b.session_date &&
        a.start_time < b.end_time &&
        a.end_time > b.start_time
      )
        throw new Error(`Dòng ${j + 1} và ${i + 1} bị trùng giờ.`);
    }
  return cleaned;
}
export function repeatRows(rows, weeks) {
  const count = Number(weeks);
  if (!Number.isInteger(count) || count < 1 || count > 16)
    throw new Error("Chọn từ 1 đến 16 tuần.");
  return validateRows(
    Array.from({ length: count }, (_, w) =>
      rows.map((r) => {
        const d = new Date(r.session_date + "T12:00:00Z");
        if (isNaN(d)) throw new Error("Ngày chưa hợp lệ.");
        d.setUTCDate(d.getUTCDate() + 7 * w);
        return { ...r, session_date: d.toISOString().slice(0, 10) };
      }),
    ).flat(),
  );
}

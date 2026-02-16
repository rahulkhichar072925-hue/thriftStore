const parseTimeline = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => ({
      status: String(entry?.status || "").toUpperCase(),
      at: String(entry?.at || ""),
    }))
    .filter((entry) => entry.status && entry.at);
};

export const buildNextOrderTimeline = (currentTimeline, currentStatus, nextStatus) => {
  const timeline = parseTimeline(currentTimeline);
  const normalizedCurrent = String(currentStatus || "").toUpperCase();
  const normalizedNext = String(nextStatus || "").toUpperCase();

  if (!timeline.length && normalizedCurrent) {
    timeline.push({ status: normalizedCurrent, at: new Date().toISOString() });
  }

  const last = timeline[timeline.length - 1];
  if (!last || last.status !== normalizedNext) {
    timeline.push({ status: normalizedNext, at: new Date().toISOString() });
  }

  return timeline;
};


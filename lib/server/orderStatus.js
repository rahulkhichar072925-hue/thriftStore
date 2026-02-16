const ORDER_FLOW = ["ORDER_PLACED", "PROCESSING", "SHIPPED", "DELIVERED"];
const ORDER_FLOW_SET = new Set(ORDER_FLOW);

const normalizeStatus = (value) => String(value || "").trim().toUpperCase();

export const ALLOWED_ORDER_STATUSES = ORDER_FLOW;

export const isValidOrderStatus = (status) =>
  ORDER_FLOW_SET.has(normalizeStatus(status));

export const isValidOrderTransition = (currentStatus, nextStatus) => {
  const current = normalizeStatus(currentStatus);
  const next = normalizeStatus(nextStatus);

  if (!isValidOrderStatus(current) || !isValidOrderStatus(next)) return false;
  if (current === next) return true;

  const currentIndex = ORDER_FLOW.indexOf(current);
  const nextIndex = ORDER_FLOW.indexOf(next);

  return nextIndex === currentIndex + 1;
};

export const buildOrderTransitionErrorMessage = (currentStatus, nextStatus) => {
  const current = normalizeStatus(currentStatus);
  const next = normalizeStatus(nextStatus);

  if (!isValidOrderStatus(next)) {
    return "Invalid order status.";
  }

  if (!isValidOrderStatus(current)) {
    return "Current order status is invalid.";
  }

  if (current === next) {
    return "Order is already in this status.";
  }

  return `Invalid status flow: ${current} can move only to the next stage.`;
};


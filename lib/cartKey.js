const normalize = (value) => (typeof value === "string" ? value.trim() : "");

export const buildVariantKey = ({ productId, size, color }) => {
  const id = normalize(productId);
  const s = normalize(size);
  const c = normalize(color);
  if (!id) return "";
  if (!s && !c) return id;
  return `${id}::${s || "-"}::${c || "-"}`;
};

export const parseVariantKey = (cartKey) => {
  const raw = normalize(cartKey);
  if (!raw) return { productId: "", size: "", color: "" };
  const [productId = "", size = "-", color = "-"] = raw.split("::");
  return {
    productId: normalize(productId),
    size: size === "-" ? "" : normalize(size),
    color: color === "-" ? "" : normalize(color),
  };
};

// Monta a URL de um ícone usando a API pública do Iconify (https://iconify.design)
// nome: "prefixo:icone" (ex: "mdi:food-apple"), cor: hex sem "#" (ex: "6fa981")
export function iconUrl(nome: string, cor?: string): string {
  const base = `https://api.iconify.design/${nome}.svg`;
  return cor ? `${base}?color=%23${cor}` : base;
}

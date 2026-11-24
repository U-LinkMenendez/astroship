export const directLink = {
  href: "https://ulink.direct.vinculo.lat/?entry=direct&branch=general",
  target: "_blank",
  rel: "noopener",
};
export const contactWhatsapp = "https://wa.me/5219996187124";
export const salesWhatsapp = "https://wa.me/5219996690192";

export function whatsappDraft(recipient: string, message: string) {
  const url = new URL(recipient);
  url.searchParams.set("text", message);
  return url.href;
}

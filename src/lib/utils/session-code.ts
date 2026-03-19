/** Genera un código de sesión de 6 dígitos para compartir */
export function generateSessionCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

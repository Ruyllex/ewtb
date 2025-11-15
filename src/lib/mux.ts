import Mux from "@mux/mux-node";

// Validar que las credenciales estén presentes antes de inicializar
const tokenId = process.env.MUX_TOKEN_ID;
const tokenSecret = process.env.MUX_TOKEN_SECRET;

// Logs de depuración (temporal - eliminar después de verificar)
console.log("🔍 [DEBUG] Mux Token ID present:", !!tokenId);
console.log("🔍 [DEBUG] Mux Token Secret present:", !!tokenSecret);
if (tokenId) {
  console.log("🔍 [DEBUG] Mux Token ID length:", tokenId.length);
}
if (tokenSecret) {
  console.log("🔍 [DEBUG] Mux Token Secret length:", tokenSecret.length);
}

if (!tokenId || !tokenSecret) {
  console.warn(
    "⚠️ Mux credentials are missing. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET in your .env.local file."
  );
}

export const mux = new Mux({
  tokenId: tokenId || "",
  tokenSecret: tokenSecret || "",
});

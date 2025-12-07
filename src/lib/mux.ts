import Mux from "@mux/mux-node";

if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  console.error("❌ MUX_TOKEN_ID or MUX_TOKEN_SECRET is not set");
} else {
  console.log("✅ Mux client initialized with provided credentials");
  // Log partial credentials for debugging (never log full secrets)
  console.log(`   Token ID: ${process.env.MUX_TOKEN_ID.substring(0, 4)}...`);
}

export const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "",
});

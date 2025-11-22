import { Livepeer } from "livepeer";

if (!process.env.LIVEPEER_API_KEY) {
  console.warn("LIVEPEER_API_KEY is not set");
}

export const livepeer = new Livepeer({
  apiKey: process.env.LIVEPEER_API_KEY || "",
});

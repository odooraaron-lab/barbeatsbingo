import type { MetadataRoute } from "next";

// Lets customers add the portal to their phone's home screen and open it like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/portal",
    name: "Bar Beats Bingo",
    short_name: "Bar Beats",
    description: "Your Bar Beats Bingo shows: downloads, call lists and the show player.",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#141818",
    theme_color: "#141818",
    categories: ["entertainment", "music"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

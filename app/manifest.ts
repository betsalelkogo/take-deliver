import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "איסוף חבילות כרם רעים",
    short_name: "איסוף חבילות כרם רעים",
    description:
      "פרסמו חבילות שצריך לאסוף, וסמנו את עצמכם כאוספים כשאתם בדרך לשם.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    dir: "rtl",
    lang: "he",
    background_color: "#f8fafc",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

// Everything on the marketing page you'll want to change without touching code.
// Images: drop files into the /public folder in your repo and reference them as "/name.png".

export const site = {
  // Optional: a real share link to one of your finished presentations.
  // Shows a "See a real presentation" button in the hero.
  demoUrl: process.env.NEXT_PUBLIC_DEMO_URL || "",

  // Optional: your email. Turns on the free-sample band and the Contact link.
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",

  // Optional screenshots. Falls back to the built-in mockups when empty.
  heroImage: process.env.NEXT_PUBLIC_HERO_IMAGE || "",      // e.g. "/hero.png"
  mapImage: process.env.NEXT_PUBLIC_MAP_IMAGE || "",        // e.g. "/map.gif" or "/map.png"
  phoneImage: process.env.NEXT_PUBLIC_PHONE_IMAGE || "",    // e.g. "/phone.png"

  // Optional founder note
  founder: {
    name: process.env.NEXT_PUBLIC_FOUNDER_NAME || "",
    photo: process.env.NEXT_PUBLIC_FOUNDER_PHOTO || "",     // e.g. "/me.jpg"
    note: process.env.NEXT_PUBLIC_FOUNDER_NOTE ||
      "I built DeedSheet in San Diego after watching good agents lose listings to prettier presentations. It does the part that should be automatic, so you can spend the appointment talking instead of formatting.",
  },

  // Only shown once you set them — never invent these
  stats: {
    agents: process.env.NEXT_PUBLIC_STAT_AGENTS || "",      // e.g. "12"
    reports: process.env.NEXT_PUBLIC_STAT_REPORTS || "",    // e.g. "300"
  },

  // Add entries as agents give them to you; the section hides itself while empty.
  testimonials: [
    // { quote: "…", name: "…", title: "Broker Associate, Pacific Coast Realty", photo: "/agent1.jpg" },
  ],

  // MLS systems you want named for reassurance
  mlsNames: ["CRMLS", "Sandicor", "Bright MLS", "NWMLS", "and any MLS you can copy from"],
};

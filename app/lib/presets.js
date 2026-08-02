// Presentation types, templates, and visual themes for DeedSheet.

export const TYPES = [
  {
    id: "seller",
    label: "Seller",
    desc: "Assess a home's market value with a traditional CMA.",
    overrides: { position: true, map: true, comps: true, strategy: true, net: true },
  },
  {
    id: "buyer",
    label: "Buyer",
    desc: "Help a buyer decide what to offer on a property.",
    overrides: { position: true, map: true, comps: true, strategy: true, net: false },
  },
  {
    id: "buyertour",
    label: "Buyer Tour",
    desc: "Guide clients from home to home with a tour-day presentation.",
    overrides: { position: false, map: true, comps: true, strategy: false, net: false },
  },
  {
    id: "nonlisting",
    label: "Non-Listing",
    desc: "Newsletters and marketing pieces built from your own slides.",
    overrides: { position: false, map: false, comps: false, strategy: false, net: false },
  },
];

export const TEMPLATES = [
  {
    id: "standard",
    label: "Standard",
    desc: "Fits any property. Every section turned on.",
    sections: { intro: true, position: true, map: true, comps: true, strategy: true, net: true },
  },
  {
    id: "residential",
    label: "Residential",
    desc: "Photo-forward for houses and condos, with seller net proceeds.",
    sections: { intro: true, position: true, map: true, comps: true, strategy: true, net: true },
  },
  {
    id: "commercial",
    label: "Commercial",
    desc: "Numbers-forward. Skips the residential seller net sheet.",
    sections: { intro: true, position: true, map: true, comps: true, strategy: true, net: false },
  },
  {
    id: "blank",
    label: "Blank",
    desc: "Cover and contact only — build the rest with your own slides.",
    sections: { intro: false, position: false, map: false, comps: false, strategy: false, net: false },
  },
];

export const THEMES = {
  classic: {
    id: "classic",
    label: "Deed Classic",
    desc: "Parchment, forest green and brass. The DeedSheet signature.",
    bg: "#F2ECDC", card: "#E7DDC2", primary: "#1F3D2B", accent: "#A8853C",
    alert: "#8E3B2F", ink: "#26221A", mute: "#6B6252",
    frame: "2.5px double #1F3D2B",
    head: "'Fraunces', Georgia, serif", tracking: "-0.01em",
    swatch: ["#F2ECDC", "#1F3D2B", "#A8853C"],
  },
  luxury: {
    id: "luxury",
    label: "Luxury",
    desc: "Deep black with gold. Built for high-end listings.",
    bg: "#12100D", card: "#1E1A15", primary: "#E9DFC7", accent: "#C9A227",
    alert: "#D9B44A", ink: "#F2ECDC", mute: "#A2977F",
    frame: "1px solid #C9A227",
    head: "'Fraunces', Georgia, serif", tracking: "0.01em",
    swatch: ["#12100D", "#C9A227", "#E9DFC7"],
  },
  sleek: {
    id: "sleek",
    label: "Sleek",
    desc: "White, charcoal and a single sharp accent. Modern and minimal.",
    bg: "#FFFFFF", card: "#F3F4F6", primary: "#0F172A", accent: "#2F6F8F",
    alert: "#B4472B", ink: "#111827", mute: "#6B7280",
    frame: "1px solid #E3E6EA",
    head: "'Libre Franklin', Arial, sans-serif", tracking: "-0.02em",
    swatch: ["#FFFFFF", "#0F172A", "#2F6F8F"],
  },
};

export const DEFAULT_META = {
  type: "seller",
  template: "standard",
  theme: "classic",
  sections: { intro: true, position: true, map: true, comps: true, strategy: true, net: true },
};

export const LABELS = {
  seller: {
    coverTitle: "Comparative Market Analysis",
    coverEyebrow: "Prepared exclusively for the property owner",
    position: "Suggested market position",
    positionLead: "Recommended list price",
    map: "Comparable locations",
    comp: "Comparable sale",
    strategy: "Pricing strategy",
  },
  buyer: {
    coverTitle: "Buyer Market Analysis",
    coverEyebrow: "Prepared exclusively for the buyer",
    position: "Suggested offer range",
    positionLead: "Recommended offer",
    map: "Comparable locations",
    comp: "Comparable sale",
    strategy: "Offer strategy",
  },
  buyertour: {
    coverTitle: "Private Home Tour",
    coverEyebrow: "Prepared exclusively for you",
    position: "Price range on tour",
    positionLead: "Midpoint",
    map: "Tour route",
    comp: "Tour stop",
    strategy: "Notes for your tour",
  },
  nonlisting: {
    coverTitle: "Market Update",
    coverEyebrow: "Prepared for you",
    position: "Market position",
    positionLead: "Midpoint",
    map: "Locations",
    comp: "Property",
    strategy: "Notes",
  },
};

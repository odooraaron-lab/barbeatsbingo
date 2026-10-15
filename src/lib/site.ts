// Site-wide content and links.

export const SITE = {
  name: "Bar Beats Bingo",
  tagline: "No balls, just beats",
  url: "https://www.barbeatsbingo.com",
  description:
    "Bar Beats Bingo is a high-energy mix of bingo, music and prizes for pubs, clubs, fundraisers and corporate nights.",
  youtubeTraining: "https://youtu.be/245B7rWTudQ",
  social: [
    { label: "Facebook", href: "https://www.facebook.com/OrangeDoorMusicVideo/" },
    { label: "Instagram", href: "https://www.instagram.com/orangedoormusicvideo" },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/100482817" },
  ],
};

export const NAV = [
  { label: "Home", href: "/" },
  { label: "How it works", href: "/more-information" },
  { label: "FAQ & tips", href: "/faq-tips" },
  { label: "Fundraising & events", href: "/fundraising-events" },
];

export const HOST_GUIDES = [
  { label: "Orange Door customers", href: "/host-instructions-orange-door-customers" },
  { label: "Audio game", href: "/host-instructions-audio-game" },
  { label: "Video game", href: "/host-instructions-video-game" },
  { label: "YouTube training", href: SITE.youtubeTraining, external: true },
];

/**
 * Photos from the original site. They live in public/images/<year>/<month>/…
 * Until they've been copied in (see README → "Bring the photos across"),
 * next.config.ts forwards these paths to the old WordPress uploads folder.
 */
export function img(path: string) {
  return `/images/${path}`;
}

export const IMAGES = {
  phoneControl: img("2025/11/Mask-group-1-2-1024x836.webp"),
  heroComposite: img("2025/11/Mask-group-1-1-copy.webp"),
  triviaHost: img("2025/06/triviahost-bingohost-gameshow-host.webp"),
  testimonialJimmyJacks: img("2025/06/jimmyjacks-bingo-trivia.webp"),
  testimonialGroove: img("2025/06/groove-lounge-bar-beats-bingo.webp"),
  step1: img("2025/06/Step1.webp"),
  step2: img("2025/06/Step2.webp"),
  step3: img("2025/06/Step3-1.webp"),
  step4: img("2025/07/Step-marking.webp"),
  step5: img("2025/06/Step4.webp"),
  step6: img("2025/06/Step6.webp"),
  faq: img("2025/06/faq-question-bar-beats-bingo.webp"),
  fundraising: img("2025/07/guests-playing-bingo-fundraising-event-bingo.webp"),
  socialShare: img("2025/06/BBB-Trial.webp"),
};

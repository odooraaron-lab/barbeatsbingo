// Quick Fire, the game format, as described in the Quick Fire host guide. Shared by the
// public pages so they all say the same thing.

export const GLANCE = [
  { title: "4 games per pack", body: "Run one game, or run all four in a night." },
  { title: "15 to 25 minutes each", body: "Each song clip is 25 seconds, so games move fast." },
  { title: "One fast way to win", body: "One winning pattern per game, then optional Blackout." },
];

export type Pattern = { name: string; hint: string; cells: (row: number, col: number) => boolean };

export const PATTERNS: Pattern[] = [
  { name: "1 line", hint: "Any one full line", cells: (r) => r === 1 },
  { name: "2 or 3 lines", hint: "Two or three full lines", cells: (r) => r % 2 === 0 },
  { name: "The Cross", hint: "Both diagonals, forming an X", cells: (r, c) => r === c || r + c === 4 },
  { name: "Blackout", hint: "The whole card", cells: () => true },
];

export const WHAT_YOU_NEED = [
  "A laptop or Orange Door system, plus speakers",
  "TVs, if you're running the video version",
  "Printed scorecards, with a few spares",
  "The printed track listing",
  "Pens or markers that work",
  "Prizes for your winners",
  "A microphone, and a big smile",
];

export const NIGHT_AT_A_GLANCE = [
  {
    title: "Before",
    items: ["Cards printed and cut", "Track listing on hand", "Sound and TVs tested", "Prizes on show", "Pens on the tables"],
  },
  {
    title: "During",
    items: [
      "Welcome and rules",
      "Name the way to win",
      "Pause, check, award",
      "End or play on to Blackout",
      "Crowd game at the break",
    ],
  },
  {
    title: "After",
    items: [
      "Collect the scorecards",
      "Announce your next night",
      "Hand out come-back vouchers",
      "Winners photo (optional)",
      "Keep the music going",
    ],
  },
];

export const WELCOME =
  "Welcome to Bar Beats Bingo. No balls, just beats. You'll hear a song, and if it's on your card, cross it off. This game we're playing for one line. First to get it yells BINGO as loud as you can. Singing is encouraged, dancing is optional and the prizes are right here. Pens ready? Here we go.";

export const TIPS_BEFORE = [
  "Test the sound and the TVs with the real game files.",
  "Put the prizes where everyone can see them.",
  "Print spare scorecards for latecomers.",
  "Have the track listing on a clipboard, not loose on the bar.",
  "Pick tonight's crowd game prompts.",
];

export const TIPS_DURING = [
  "Offer a clue if the room is stuck. It's about fun, not difficulty.",
  "Walk around, chat to tables and get everyone involved.",
  "Lead the singalongs. You sing, they sing.",
  "Call out near misses. “Table four needs one more song” builds tension.",
  "Remind people the bar and kitchen are open at every break.",
];

export const SITUATIONS = [
  {
    what: "A false Bingo",
    todo: "Have a laugh with them, not at them, then resume. The track listing is always the final word.",
  },
  { what: "Phones and song apps (Shazam)", todo: "The host decides. Say your rule in the welcome so everyone knows." },
  { what: "Latecomers", todo: "Hand them a card and get them playing from the next game." },
  { what: "A flat room", todo: "Turn the music up a touch, run a crowd game and get on the microphone more often." },
  {
    what: "Two Bingos at once",
    todo: "Check both cards. If both are right, split the prize or run a tiebreak: the first of the two to name the next song wins.",
  },
  { what: "A missed song", todo: "Don't replay it. Read the title from the track listing and move on." },
];

export const PRIZES = [
  { prize: "First winner", when: "First to the pattern", ideas: "A drink voucher, a bar tab, lollies, venue merchandise" },
  { prize: "Blackout", when: "Optional, if you play on", ideas: "A bigger bar tab, a meal for two, even a lawnmower" },
  { prize: "Crowd game", when: "Between games", ideas: "A small bonus, or a pick from the mystery prize board" },
];

export const PRIZE_IDEAS = [
  {
    title: "Power prizes",
    body: "Prizes that cost nothing: pick the next break song, get a free extra card next game or have the best table reserved next week.",
  },
  { title: "The crown", body: "A trophy or silly hat the winner wears until the next Bingo." },
  { title: "The unlucky prize", body: "A joke prize for the player who was one song away. A single teabag does the job." },
  { title: "Come-back voucher", body: "Only valid at your next game night." },
];

export const CROWD_GAME_STEPS = [
  { title: "Read the prompt", body: "In the break after a game, read out one prompt and its examples." },
  {
    title: "Give them time to write",
    body: "About 2 to 5 minutes. Players write their answer and their name on the back of their scorecard.",
  },
  {
    title: "Read out the answers",
    body: "Collect the cards and read out your three to five favourites, or everyone's. Don't say who wrote them yet.",
  },
  {
    title: "The cheer decides",
    body: "The biggest cheer wins. If it's close, read the top few again and listen for the loudest.",
  },
  { title: "Bonus prize", body: "Reveal the winner's name and hand over a bonus prize." },
];

/** A taste of the family-friendly prompts. The full sets are in the host guide in the customer portal. */
export const CROWD_PROMPTS = [
  { prompt: "Turn a song title into something on the pub menu", examples: ["Bohemian Schnitzel", "Sweet Chilli O' Mine"] },
  { prompt: "Rename a song to make it about getting older", examples: ["Girls Just Want to Have Naps", "I Want to Hold Your Handrail"] },
  { prompt: "Name a tribute band that isn't quite good enough", examples: ["Oasish", "Nearvana", "AB/CD"] },
  { prompt: "Give an artist a day job and a matching name", examples: ["Floss Springsteen, dentist", "Tax Sheeran, accountant"] },
  { prompt: "What song would you hate to hear your surgeon humming?", examples: ["The First Cut Is the Deepest", "Oops!... I Did It Again"] },
  { prompt: "What's the worst possible lullaby?", examples: ["Enter Sandman", "Welcome to the Jungle"] },
];

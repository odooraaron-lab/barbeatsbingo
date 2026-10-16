import type { CallList } from "./call-list";
import type { CardSet } from "./bingo";

/** What the site has read out of a file, saved with it. */
export type FileMeta = {
  /** Songs read from a call list (track list) PDF. */
  callList?: CallList;
  /** Cards read from a scorecards PDF, for the card checker. */
  cards?: CardSet;
};

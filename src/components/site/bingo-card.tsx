// A printed scorecard, drawn in HTML. The daubed squares stamp in one after another.

const CELLS: (string | null)[] = [
  "Love Not War · Jason Derulo",
  "Heat Waves · Glass Animals",
  "Shake It Off · Taylor Swift",
  "Cover Me In Sunshine · P!nk",
  "Dance Monkey · Tones And I",
  "Dancing Feet · Kygo",
  "Despacito · Luis Fonsi",
  "Better When I'm Dancin' · Meghan Trainor",
  "Kiss My (Uh Oh) · Anne-Marie",
  "Final Song · MØ",
  "Good As Hell · Lizzo",
  "Señorita · Shawn Mendes",
  null,
  "X · Jonas Brothers",
  "BED · Joel Corry",
  "SNAP · Rosa Linn",
  "What A Man Gotta Do · Jonas Brothers",
  "Cold Heart · Elton John, Dua Lipa",
  "Easy On Me · Adele",
  "Ghost · Ella Henderson",
  "Watermelon Sugar · Harry Styles",
  "Just You And I · Tom Walker",
  "I Ain't Worried · OneRepublic",
  "Weekend · Mufasa & Hypeman",
  "Levitating · Dua Lipa",
];

// Order the daubs land in (cell indexes). Row 3 completes a line.
const DAUBED = [2, 11, 17, 10, 13, 14, 5, 23];

export function BingoCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`select-none rounded-[6px] bg-[#fbfaf6] p-2.5 text-[#1b1b1b] shadow-[0_30px_60px_-15px_rgb(0_0_0/0.7)] ${className}`}
      aria-hidden
    >
      <div className="grid grid-cols-5 gap-[3px]">
        {["B", "I", "N", "G", "O"].map((l) => (
          <div key={l} className="display grid h-8 place-items-center bg-[#1b1b1b] text-lg text-red-bright sm:h-9 sm:text-xl">
            {l}
          </div>
        ))}
        {CELLS.map((cell, i) => {
          const order = DAUBED.indexOf(i);
          return (
            <div
              key={i}
              className="relative grid aspect-square place-items-center overflow-hidden border border-[#2a2a2a]/70 p-1 text-center text-[8px] font-semibold leading-[1.15] sm:text-[9.5px]"
            >
              {cell === null ? (
                <span className="display -rotate-6 text-[13px] leading-none text-red sm:text-[15px]">
                  FREE
                  <br />
                  SPACE
                </span>
              ) : (
                <span>{cell}</span>
              )}
              {order >= 0 && (
                <span
                  className="daub absolute inset-[9%] rounded-full bg-red mix-blend-multiply"
                  style={{ animationDelay: `${600 + order * 260}ms` }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

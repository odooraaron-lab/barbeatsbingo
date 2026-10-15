export function PageIntro({
  title,
  children,
  align = "center",
}: {
  title: string;
  children?: React.ReactNode;
  align?: "center" | "left";
}) {
  return (
    <div className={`wrap pb-4 pt-14 md:pt-20 ${align === "center" ? "text-center" : ""}`}>
      <h1 className="text-[clamp(2.5rem,6vw,4.2rem)]">{title}</h1>
      {children && (
        <div className={`mt-4 text-lg text-white/90 ${align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>
          {children}
        </div>
      )}
    </div>
  );
}

const LINE_WIDTHS = ["100%", "92%", "64%"];

export function Skeleton({ lines = LINE_WIDTHS.length }: { lines?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <div class="ghost" key={index} style={{ width: LINE_WIDTHS[index % LINE_WIDTHS.length] ?? "100%" }} />
      ))}
    </div>
  );
}

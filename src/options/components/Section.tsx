import type { ComponentChildren } from "preact";

interface SectionProps {
  id: string;
  folio: string;
  title: string;
  children: ComponentChildren;
}

export function Section({ id, folio, title, children }: SectionProps) {
  const headingId = `${id}-title`;
  return (
    <section class="section" id={id} aria-labelledby={headingId}>
      <p class="folio" aria-hidden="true">
        {folio}
      </p>
      <h2 id={headingId}>{title}</h2>
      {children}
    </section>
  );
}

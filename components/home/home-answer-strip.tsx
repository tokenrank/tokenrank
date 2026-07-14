import type { AppCopy } from "@/src/i18n/copy";

export function HomeAnswerStrip({ copy }: { copy: AppCopy["home"]["answer"] }) {
  return (
    <section
      aria-labelledby="what-is-tokenrank"
      className="tr-reveal grid gap-2 border-x border-b border-[color:var(--tr-line)] bg-[color:var(--tr-surface)] px-4 py-4 sm:px-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-6"
    >
      <h2
        id="what-is-tokenrank"
        className="font-display text-lg font-bold uppercase leading-5 tracking-[-0.02em] text-[color:var(--tr-ivory)] sm:text-xl"
      >
        {copy.title}
      </h2>
      <p className="tr-body max-w-4xl text-sm leading-5">{copy.body}</p>
    </section>
  );
}

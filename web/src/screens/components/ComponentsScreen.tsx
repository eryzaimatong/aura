import { ButtonsSection } from './ButtonsSection';
import { CardsSection } from './CardsSection';
import { ChipsSection } from './ChipsSection';
import { InputsSection } from './InputsSection';
import { MiraSection, NavSection } from './NavMiraSection';

/** Dev-only gallery of every component state (route: /components). */
export function ComponentsScreen() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[390px] flex-col gap-10 px-gutter py-10">
      <header>
        <h1 className="font-display text-h1">Components</h1>
        <p className="font-mira text-h3 text-cocoa-soft">every state, in one place</p>
      </header>
      <ButtonsSection />
      <ChipsSection />
      <InputsSection />
      <CardsSection />
      <NavSection />
      <MiraSection />
    </main>
  );
}

import { WizardClient } from "./wizard-client";

export const metadata = { title: "Nueva rutina — Iron Log" };

export default function NuevaRutinaPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 pb-24">
      <h1 className="text-2xl font-bold text-foreground">Nueva rutina</h1>
      <WizardClient />
    </main>
  );
}

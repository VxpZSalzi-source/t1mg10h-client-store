import { createFileRoute } from "@tanstack/react-router";
import { LegalView } from "@/components/LegalView";
import { LEGAL } from "@/data/legal";

export const Route = createFileRoute("/impressum")({
  head: () => ({ meta: [{ title: `${LEGAL.impressum.title} – T1mg10h Client` }] }),
  component: () => <LegalView page={LEGAL.impressum} />,
});

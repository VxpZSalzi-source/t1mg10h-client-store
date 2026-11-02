import { createFileRoute } from "@tanstack/react-router";
import { LegalView } from "@/components/LegalView";
import { LEGAL } from "@/data/legal";

export const Route = createFileRoute("/datenschutz")({
  head: () => ({ meta: [{ title: `${LEGAL.datenschutz.title} – T1mg10h Client` }] }),
  component: () => <LegalView page={LEGAL.datenschutz} />,
});

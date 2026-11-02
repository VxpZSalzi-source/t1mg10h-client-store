import { createFileRoute } from "@tanstack/react-router";
import { LegalView } from "@/components/LegalView";
import { LEGAL } from "@/data/legal";

export const Route = createFileRoute("/widerruf")({
  head: () => ({ meta: [{ title: `${LEGAL.widerruf.title} – T1mg10h Client` }] }),
  component: () => <LegalView page={LEGAL.widerruf} />,
});

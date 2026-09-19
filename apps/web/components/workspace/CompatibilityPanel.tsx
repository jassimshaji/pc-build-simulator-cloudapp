import type { CompatibilityReport } from "@pcbuilder/compatibility-engine";
import { CompatibilityResults } from "@/components/compatibility-results";
import { Hint, Section } from "@/components/ui/Section";

export function CompatibilityPanel({
  lineCount,
  report,
  isChecking,
}: {
  lineCount: number;
  report: CompatibilityReport | null;
  isChecking: boolean;
}) {
  return (
    <Section title="Compatibility">
      {lineCount === 0 && <Hint>Add components to see compatibility checks.</Hint>}
      {isChecking && <Hint>Checking...</Hint>}
      {report && <CompatibilityResults report={report} />}
    </Section>
  );
}

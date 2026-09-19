import { Button } from "@/components/ui/Button";

// Strip under the 3D view: interaction hint, airflow toggle, reset view.
export function ViewportControls({
  showAirflow,
  onShowAirflowChange,
  onResetView,
}: {
  showAirflow: boolean;
  onShowAirflowChange: (show: boolean) => void;
  onResetView: () => void;
}) {
  return (
    <div className="flex items-center justify-between text-xs text-zinc-500">
      <span>Drag to orbit · Scroll to zoom · Right-click drag to pan</span>
      <label className="ml-auto mr-3 flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={showAirflow}
          onChange={(event) => onShowAirflowChange(event.target.checked)}
        />
        Show airflow
      </label>
      <Button onClick={onResetView}>Reset view</Button>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";

// Top strip of the workspace: build name, save, share and a link to "My builds".
export function SaveBar({
  buildName,
  onBuildNameChange,
  isSaved,
  isSaving,
  onSave,
  shareSlug,
  onSetSharing,
  onCopyShareLink,
  status,
}: {
  buildName: string;
  onBuildNameChange: (name: string) => void;
  isSaved: boolean; // has this build been saved (does it have an id)?
  isSaving: boolean;
  onSave: () => void;
  shareSlug: string | null;
  onSetSharing: (enabled: boolean) => void;
  onCopyShareLink: () => void;
  status: string | null;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-900/40 px-4 py-2 text-xs">
      <TextInput
        type="text"
        value={buildName}
        maxLength={100}
        onChange={(event) => onBuildNameChange(event.target.value)}
        aria-label="Build name"
        className="w-56"
      />
      <Button variant="primary" onClick={onSave} disabled={isSaving || !buildName.trim()}>
        {isSaving ? "Saving..." : isSaved ? "Save" : "Save build"}
      </Button>
      {isSaved &&
        (shareSlug ? (
          <>
            <Button onClick={onCopyShareLink}>Copy share link</Button>
            <Button variant="danger" onClick={() => onSetSharing(false)}>
              Stop sharing
            </Button>
          </>
        ) : (
          <Button onClick={() => onSetSharing(true)}>Share</Button>
        ))}
      <Link href="/builds" className="text-zinc-400 hover:text-zinc-100">
        My builds
      </Link>
      {status && <span className="text-zinc-500">{status}</span>}
    </div>
  );
}

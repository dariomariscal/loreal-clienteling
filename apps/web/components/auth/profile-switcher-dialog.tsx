"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useUser } from "@clerk/nextjs";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { DEMO_PROFILES, type DemoProfile } from "@/lib/auth/demo-profiles";
import { useProfileSwitch } from "@/lib/auth/use-profile-switch";

interface ProfileSwitcherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Streaming-style ("¿Quién está usando?") fullscreen profile picker.
 *
 * Highlights the active session and dims it so the user knows where they
 * are. Picking another profile triggers `useProfileSwitch`, which signs the
 * current session out and signs the picked one in — then routes to the
 * role's home via `homeForRole`.
 *
 * The dialog is locked open during the swap so the opaque overlay hides the
 * brief unauthenticated window between `signOut` and `setActive`. That's the
 * piece that prevents the `/sign-in` flash.
 */
export function ProfileSwitcherDialog({
  open,
  onOpenChange,
}: ProfileSwitcherDialogProps) {
  const { user } = useUser();
  const { switchTo, switchingTo, error, isReady } = useProfileSwitch();

  const activeEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  const isSwitching = switchingTo !== null;
  const switchingProfile = isSwitching
    ? DEMO_PROFILES.find((p) => p.email === switchingTo) ?? null
    : null;

  function handleOpenChange(next: boolean) {
    // Closing mid-swap would unmount the overlay and expose the sign-in flash
    // we are trying to prevent. Lock the dialog open until the swap settles.
    if (isSwitching && !next) return;
    onOpenChange(next);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md duration-300 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 py-12 duration-300 outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0">
          {isSwitching && switchingProfile ? (
            <SwitchingState profile={switchingProfile} />
          ) : (
            <PickerState
              activeEmail={activeEmail}
              disabled={!isReady}
              onSelect={switchTo}
              onCancel={() => onOpenChange(false)}
              error={error}
            />
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

interface PickerStateProps {
  activeEmail: string | null;
  disabled: boolean;
  error: string | null;
  onSelect: (profile: DemoProfile) => void;
  onCancel: () => void;
}

function PickerState({
  activeEmail,
  disabled,
  error,
  onSelect,
  onCancel,
}: PickerStateProps) {
  return (
    <>
      <div className="mb-12 space-y-2 text-center">
        <DialogPrimitive.Title className="text-3xl font-light tracking-tight text-foreground sm:text-4xl">
          ¿Quién está usando?
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="text-sm text-muted-foreground">
          Selecciona un perfil para entrar a su panel
        </DialogPrimitive.Description>
      </div>

      {error ? (
        <p className="mb-6 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
        {DEMO_PROFILES.map((profile) => (
          <li key={profile.email}>
            <ProfileCard
              profile={profile}
              isActive={profile.email === activeEmail}
              disabled={disabled}
              onSelect={() => onSelect(profile)}
            />
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onCancel}
        className="mt-12 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        Cancelar
      </button>
    </>
  );
}

function SwitchingState({ profile }: { profile: DemoProfile }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center" aria-live="polite">
      <DialogPrimitive.Title className="sr-only">
        Cambiando a {profile.fullName}
      </DialogPrimitive.Title>
      <Avatar
        name={profile.fullName}
        size="xl"
        className="size-28 animate-pulse text-2xl ring-2 ring-foreground/40"
      />
      <div className="space-y-1">
        <p className="text-lg font-light text-foreground">
          Entrando como {profile.fullName}
        </p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {profile.roleLabel}
        </p>
      </div>
    </div>
  );
}

interface ProfileCardProps {
  profile: DemoProfile;
  isActive: boolean;
  disabled: boolean;
  onSelect: () => void;
}

function ProfileCard({
  profile,
  isActive,
  disabled,
  onSelect,
}: ProfileCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled || isActive}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "group flex w-full flex-col items-center gap-3 rounded-2xl p-4 text-center transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30",
        isActive
          ? "cursor-default opacity-60"
          : "hover:bg-muted/40 hover:scale-[1.03]",
        disabled && !isActive && "opacity-50",
      )}
    >
      <Avatar
        name={profile.fullName}
        size="xl"
        className={cn(
          "size-24 text-2xl ring-2 ring-transparent transition-all duration-200 sm:size-28",
          !isActive && "group-hover:ring-foreground/40",
        )}
      />
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">
          {profile.fullName}
        </p>
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {profile.roleLabel}
        </p>
        <p className="pt-1 text-[11px] text-muted-foreground/80">
          {profile.blurb}
        </p>
      </div>
    </button>
  );
}

export async function saveMeetupAndRefresh({ update, refresh, collapse, onSuccess, onFailure }: {
  update: () => Promise<void>;
  refresh: () => Promise<void>;
  collapse: () => void;
  onSuccess: () => void;
  onFailure: (message: string) => void;
}) {
  try {
    await update();
    await refresh();
    collapse();
    onSuccess();
    return true;
  } catch (error) {
    onFailure(error && typeof error === "object" && "message" in error ? String(error.message) : "Could not save Meetup.");
    return false;
  }
}

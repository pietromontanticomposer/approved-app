export const PROJECT_OPEN_KEY_PREFIX = "approved-open-project-v2";
export const PROJECT_OPEN_TAB_KEY_PREFIX = "approved-open-project-tab-v2";
export const PROJECT_OPEN_LEGACY_KEY = "open_project";
export const PROJECT_OPEN_TAB_LEGACY_KEY = "open_project_tab";

type ProjectBootScopeInput = {
  userId?: string | null;
  shareId?: string | null;
  shareProjectId?: string | null;
  guestSessionToken?: string | null;
  guestProjectId?: string | null;
};

export function resolveProjectBootScope(input: ProjectBootScopeInput = {}): string {
  if (input.userId) return `user:${input.userId}`;
  if (input.guestSessionToken) return `guest:${input.guestSessionToken}`;
  if (input.guestProjectId) return `guest-project:${input.guestProjectId}`;
  if (input.shareId) return `share:${input.shareId}`;
  if (input.shareProjectId) return `share-project:${input.shareProjectId}`;
  return "anonymous";
}

export function rememberProjectToOpen(
  projectId: string,
  tabName: string,
  input: ProjectBootScopeInput = {}
) {
  if (typeof window === "undefined" || !projectId) return;

  const scope = resolveProjectBootScope(input);
  localStorage.setItem(`${PROJECT_OPEN_KEY_PREFIX}:${scope}`, projectId);

  if (tabName) {
    localStorage.setItem(`${PROJECT_OPEN_TAB_KEY_PREFIX}:${scope}`, tabName);
  } else {
    localStorage.removeItem(`${PROJECT_OPEN_TAB_KEY_PREFIX}:${scope}`);
  }

  localStorage.removeItem(PROJECT_OPEN_LEGACY_KEY);
  localStorage.removeItem(PROJECT_OPEN_TAB_LEGACY_KEY);
}

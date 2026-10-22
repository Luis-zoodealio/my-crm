// Shared by the server query and the Tasks client component (no server-only imports here).
export const TASK_GROUPS = ['overdue', 'today', 'upcoming', 'completed'] as const
export type TaskGroup = (typeof TASK_GROUPS)[number]

/** Rows shown per group before "Show more". */
export const GROUP_PAGE = 25

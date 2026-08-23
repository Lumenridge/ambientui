/**
 * Where a /ds selection lives in the URL.
 *
 * Its own module because a file that exports both components and values loses
 * Fast Refresh for everything importing it — the same reason the icon
 * vocabulary sits apart from the icon component.
 */
export const DS_PARAM = "c"

export const dsHref = (id: string) =>
  `/ds?${DS_PARAM}=${encodeURIComponent(id)}`

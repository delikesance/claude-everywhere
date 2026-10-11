import { useEffect, useState } from "preact/hooks";

const DETAIL_PREFIX = "#/a/";

export const listHref = "#/";
export const detailHref = (id: string) => `${DETAIL_PREFIX}${encodeURIComponent(id)}`;

export function parseArtifactId(hash: string): string | null {
  if (!hash.startsWith(DETAIL_PREFIX)) return null;
  return decodeURIComponent(hash.slice(DETAIL_PREFIX.length));
}

export function useArtifactRoute(): string | null {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onHashChange = () => setHash(location.hash);
    addEventListener("hashchange", onHashChange);
    return () => removeEventListener("hashchange", onHashChange);
  }, []);
  return parseArtifactId(hash);
}

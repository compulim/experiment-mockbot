export default async function fetchJSON(url: string | URL, init?: RequestInit | undefined) {
  const headers = new Headers(init?.headers);

  headers.set('accept', 'application/json');

  const res = await fetch(url, Object.freeze({ ...init, headers }));

  if (!res.ok) {
    throw new Error(`Server returned ${res.status}.`);
  }

  return await res.json();
}

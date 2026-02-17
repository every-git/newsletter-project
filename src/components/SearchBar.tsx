import { useState } from 'preact/hooks';

interface Props {
  initialValue?: string;
  feedType?: string;
  sort?: string;
}

export default function SearchBar({ initialValue = '', feedType, sort }: Props) {
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    if (feedType) params.set('feed', feedType);
    if (sort && sort !== 'latest') params.set('sort', sort);
    window.location.href = `/all${params.toString() ? '?' + params.toString() : ''}`;
  };

  return (
    <form onSubmit={handleSubmit} class="flex gap-2">
      <input
        type="text"
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        placeholder="검색..."
        class="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
      />
      <button type="submit" class="rounded-lg bg-primary px-3 py-1.5 text-sm text-white">
        검색
      </button>
    </form>
  );
}

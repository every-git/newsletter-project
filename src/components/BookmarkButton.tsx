import { useState } from 'preact/hooks';

interface Props {
  articleId: string;
  initialBookmarked: boolean;
}

export default function BookmarkButton({ articleId, initialBookmarked }: Props) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId }),
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarked(data.is_bookmarked);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      class={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
        bookmarked
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-text-secondary hover:border-primary/30'
      } ${loading ? 'opacity-50' : ''}`}
    >
      {bookmarked ? '★ 북마크됨' : '☆ 북마크'}
    </button>
  );
}

import { useState } from 'preact/hooks';

interface Props {
  articleId: string;
  currentStatus: string;
}

export default function ArticleActions({ articleId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const updateStatus = async (newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/article/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
      }
    } finally {
      setLoading(false);
    }
  };

  if (status === 'deleted') {
    return (
      <button
        onClick={() => updateStatus('active')}
        disabled={loading}
        class="rounded border border-accent-world px-2 py-1 text-xs text-accent-world hover:bg-accent-world/10 disabled:opacity-50"
      >
        복구
      </button>
    );
  }

  return (
    <div class="flex gap-2">
      {status === 'archived' ? (
        <button
          onClick={() => updateStatus('active')}
          disabled={loading}
          class="rounded border border-accent-world px-2 py-1 text-xs text-accent-world hover:bg-accent-world/10 disabled:opacity-50"
        >
          복구
        </button>
      ) : (
        <button
          onClick={() => updateStatus('archived')}
          disabled={loading}
          class="rounded border border-border px-2 py-1 text-xs text-text-secondary hover:border-primary/30 disabled:opacity-50"
          title="아카이브"
        >
          🗄️
        </button>
      )}
      <button
        onClick={() => updateStatus('deleted')}
        disabled={loading}
        class="rounded border border-red-300 px-2 py-1 text-xs text-red-400 hover:bg-red-50 disabled:opacity-50"
        title="삭제"
      >
        🗑️
      </button>
    </div>
  );
}

import { useState } from 'preact/hooks';

interface Props {
  categories: string[];
  initialCategory?: string;
}

const catLabels: Record<string, string> = {
  ai: 'AI/ML',
  frontend: 'Web/Frontend',
  backend: 'Backend',
  infra: 'Infra',
  startup: 'Startup',
  security: 'Security',
  mobile: 'Mobile',
  all: '전체',
};

export default function CategoryTabs({ categories, initialCategory }: Props) {
  const [active, setActive] = useState(initialCategory || 'all');

  const handleClick = (cat: string) => {
    setActive(cat);
    const params = new URLSearchParams(window.location.search);
    if (cat === 'all') {
      params.delete('tag');
    } else {
      params.set('tag', cat);
    }
    params.delete('page');
    window.location.href = `/all${params.toString() ? '?' + params.toString() : ''}`;
  };

  return (
    <div class="flex flex-wrap gap-2">
      {['all', ...categories].map((cat) => (
        <button
          key={cat}
          onClick={() => handleClick(cat)}
          class={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            active === cat
              ? 'bg-primary text-white'
              : 'bg-surface-alt text-text-secondary hover:text-text'
          }`}
        >
          {catLabels[cat] || cat}
        </button>
      ))}
    </div>
  );
}

import { useState } from 'preact/hooks';

interface Props {
  currentDate?: string;
}

export default function DatePicker({ currentDate }: Props) {
  const [date, setDate] = useState(currentDate || new Date().toISOString().slice(0, 10));

  const handleChange = (e: Event) => {
    const newDate = (e.target as HTMLInputElement).value;
    setDate(newDate);
    window.location.href = `/archive/${newDate}-pm`;
  };

  return (
    <input
      type="date"
      value={date}
      onChange={handleChange}
      class="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
    />
  );
}

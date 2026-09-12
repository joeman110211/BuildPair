import { useId, type KeyboardEvent } from 'react';
import { HomeIcon } from '@/components/HomeVisuals';

type Option<T extends string> = { value: T; label: string; icon?: string };
export function HomeTabs<T extends string>({ label, options, value, onChange, panelId, dark = false }: { label: string; options: Option<T>[]; value: T; onChange: (value: T) => void; panelId: string; dark?: boolean }) {
  const id = useId();
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = options.findIndex(option => option.value === value);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
    const selected = options[next];
    if (!selected) return;
    onChange(selected.value);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }
  return <div className={`bp-tabs${dark ? ' bp-tabs--dark' : ''}`} role="tablist" aria-label={label} onKeyDown={onKeyDown}>{options.map(option => <button key={option.value} id={`${id}-${option.value}`} type="button" role="tab" aria-selected={value === option.value} aria-controls={panelId} tabIndex={value === option.value ? 0 : -1} onClick={() => onChange(option.value)}>{option.icon ? <HomeIcon name={option.icon} size={18} /> : null}{option.label}</button>)}</div>;
}

import { type ChangeEvent, type ReactNode } from 'react'
import './CustomSelect.css'

interface CustomSelectProps {
  value: string
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Выберите...',
  disabled = false,
  className = '',
}: CustomSelectProps) {
  return (
    <div className={`custom-select-wrapper ${className}`}>
      <select
        className="custom-select"
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <div className="custom-select-arrow">▼</div>
    </div>
  )
}
import { type ChangeEvent } from 'react'
import './CustomSelect.css'

interface CustomMultiSelectProps {
  value: string[]
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void
  options: Array<{ value: string; label: string; disabled?: boolean }>
  size?: number
  disabled?: boolean
  required?: boolean
  className?: string
}

export function CustomMultiSelect({
  value,
  onChange,
  options,
  size = 3,
  disabled = false,
  required = false,
  className = '',
}: CustomMultiSelectProps) {
  return (
    <div className={`custom-select-wrapper ${className}`}>
      <select
        className="custom-select custom-select-multiple"
        multiple
        size={size}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

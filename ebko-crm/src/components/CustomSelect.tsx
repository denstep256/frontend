import { type ChangeEvent } from 'react'
import './CustomSelect.css'

interface CustomSelectProps {
  value: string
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string | null
  showPlaceholder?: boolean
  disabled?: boolean
  required?: boolean
  className?: string
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Выберите...',
  showPlaceholder = true,
  disabled = false,
  required = false,
  className = '',
}: CustomSelectProps) {
  const hasEmptyOption = options.some((option) => option.value === '')
  const shouldRenderPlaceholder = showPlaceholder && placeholder !== null && !hasEmptyOption

  return (
    <div className={`custom-select-wrapper ${className}`}>
      <select
        className="custom-select"
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
      >
        {shouldRenderPlaceholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
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
      <div className="custom-select-arrow">v</div>
    </div>
  )
}


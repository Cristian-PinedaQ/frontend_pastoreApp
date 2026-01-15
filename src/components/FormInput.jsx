// components/FormInput.jsx
// ✨ Componente de input reutilizable que muestra errores por campo

import React from 'react';

/**
 * Componente FormInput reutilizable
 * 
 * Ejemplo de uso:
 * <FormInput
 *   label="Email"
 *   name="email"
 *   type="email"
 *   value={formData.email}
 *   onChange={handleInputChange}
 *   errors={getFieldErrors('email')}
 *   placeholder="correo@ejemplo.com"
 *   required
 * />
 */
export const FormInput = ({
  label,
  name,
  type = 'text',
  value = '',
  onChange = () => {},
  errors = null,
  placeholder = '',
  required = false,
  disabled = false,
  onBlur = () => {},
  maxLength = null,
  min = null,
  max = null,
  pattern = null,
  helperText = null,
}) => {
  const hasError = !!errors;

  return (
    <div className="flex flex-col w-full">
      {/* Etiqueta con indicador de requerido */}
      <label 
        htmlFor={name}
        className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"
      >
        {label}
        {required && <span className="text-red-500 font-bold" title="Campo requerido">*</span>}
      </label>

      {/* Input field */}
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        min={min}
        max={max}
        pattern={pattern}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${name}-error` : undefined}
        className={`
          px-4 py-2.5 border rounded-lg text-sm
          focus:outline-none focus:ring-2 transition duration-200
          ${
            hasError
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50 text-gray-900'
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white'
          }
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'hover:border-gray-400'}
          placeholder:text-gray-400
        `}
      />

      {/* Mensaje de error */}
      {hasError && (
        <div 
          id={`${name}-error`}
          className="mt-2 flex items-start gap-2 p-2 bg-red-50 rounded border border-red-200"
        >
          <span className="text-red-500 text-lg flex-shrink-0 pt-0.5" aria-hidden="true">
            ⚠️
          </span>
          <p className="text-red-700 text-xs font-medium leading-snug flex-1 pt-0.5">
            {errors}
          </p>
        </div>
      )}

      {/* Helper text (cuando no hay error) */}
      {!hasError && helperText && (
        <p className="mt-1.5 text-xs text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default FormInput;
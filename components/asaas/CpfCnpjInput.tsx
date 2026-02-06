'use client';

import { useState, ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';

interface CpfCnpjInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export default function CpfCnpjInput({
  value,
  onChange,
  error,
  required = false,
}: CpfCnpjInputProps) {
  const t = useTranslations('asaas.cpfCnpj');
  const [touched, setTouched] = useState(false);

  // Detectar se é CPF ou CNPJ baseado no tamanho
  const isCnpj = value.replace(/\D/g, '').length > 11;

  // Aplicar máscara
  const applyMask = (val: string) => {
    const numbers = val.replace(/\D/g, '');
    
    if (numbers.length <= 11) {
      // CPF: 000.000.000-00
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // CNPJ: 00.000.000/0000-00
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  // Validar CPF
  const validateCpf = (cpf: string): boolean => {
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(numbers)) return false;
    
    // Validar dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(numbers.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(numbers.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(numbers.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(numbers.charAt(10))) return false;
    
    return true;
  };

  // Validar CNPJ
  const validateCnpj = (cnpj: string): boolean => {
    const numbers = cnpj.replace(/\D/g, '');
    if (numbers.length !== 14) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(numbers)) return false;
    
    // Validar primeiro dígito
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(numbers.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (digit !== parseInt(numbers.charAt(12))) return false;
    
    // Validar segundo dígito
    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(numbers.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (digit !== parseInt(numbers.charAt(13))) return false;
    
    return true;
  };

  // Validar documento
  const isValid = () => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return true; // Vazio é válido se não for required
    if (numbers.length <= 11) {
      return validateCpf(value);
    } else {
      return validateCnpj(value);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const masked = applyMask(e.target.value);
    onChange(masked);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  const showError = touched && !isValid() && value.length > 0;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-300">
        {t('label')} {required && <span className="text-red-400">*</span>}
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={isCnpj ? '00.000.000/0000-00' : '000.000.000-00'}
          maxLength={isCnpj ? 18 : 14}
          className={`w-full bg-zinc-800 border rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 transition-all ${
            showError || error
              ? 'border-red-500 focus:ring-red-500/50'
              : 'border-zinc-700 focus:ring-emerald-500/50'
          }`}
        />
        
        {showError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <AlertCircle className="text-red-400" size={20} />
          </div>
        )}
      </div>

      {showError && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <AlertCircle size={14} />
          {isCnpj ? t('invalidCnpj') : t('invalidCpf')}
        </p>
      )}

      {error && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <AlertCircle size={14} />
          {error}
        </p>
      )}

      <p className="text-zinc-500 text-xs">
        {isCnpj ? t('cnpjDesc') : t('cpfDesc')}
      </p>
    </div>
  );
}

'use client';

import { useState, ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, AlertCircle } from 'lucide-react';
import type { CreditCardData, CreditCardHolderInfo } from '@/lib/asaas';

interface CreditCardFormProps {
  onDataChange: (cardData: CreditCardData, holderInfo: CreditCardHolderInfo) => void;
  cpfCnpj: string;
  userEmail?: string; // Email do usuário logado (opcional, pode preencher manualmente)
}

export default function CreditCardForm({ onDataChange, cpfCnpj, userEmail = '' }: CreditCardFormProps) {
  const t = useTranslations('asaas.creditCard');
  const [cardNumber, setCardNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [ccv, setCcv] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [email, setEmail] = useState(userEmail);

  // Detectar bandeira do cartão
  const detectCardBrand = (number: string): string => {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'VISA';
    if (/^5[1-5]/.test(cleaned)) return 'MASTERCARD';
    if (/^3[47]/.test(cleaned)) return 'AMEX';
    if (/^6(?:011|5)/.test(cleaned)) return 'DISCOVER';
    if (/^35/.test(cleaned)) return 'JCB';
    if (/^(5018|5020|5038|6304|6759|676[1-3])/.test(cleaned)) return 'MAESTRO';
    if (/^(606282|3841)/.test(cleaned)) return 'HIPERCARD';
    if (/^(636368|438935|504175|451416|636297)/.test(cleaned)) return 'ELO';
    return 'VISA';
  };

  // Máscara de cartão
  const maskCardNumber = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{4})(?=\d)/g, '$1 ')
      .trim()
      .substring(0, 19);
  };

  // Máscara de telefone
  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 15);
  };

  // Máscara de CEP
  const maskPostalCode = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 9);
  };

  const handleCardNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const masked = maskCardNumber(e.target.value);
    setCardNumber(masked);
    updateParent(masked, holderName, expiryMonth, expiryYear, ccv, phone, postalCode, email);
  };

  const handleExpiryMonthChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 2);
    setExpiryMonth(value);
    updateParent(cardNumber, holderName, value, expiryYear, ccv, phone, postalCode, email);
  };

  const handleExpiryYearChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 4);
    setExpiryYear(value);
    updateParent(cardNumber, holderName, expiryMonth, value, ccv, phone, postalCode, email);
  };

  const handleCcvChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 4);
    setCcv(value);
    updateParent(cardNumber, holderName, expiryMonth, expiryYear, value, phone, postalCode, email);
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const masked = maskPhone(e.target.value);
    setPhone(masked);
    updateParent(cardNumber, holderName, expiryMonth, expiryYear, ccv, masked, postalCode, email);
  };

  const handlePostalCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const masked = maskPostalCode(e.target.value);
    setPostalCode(masked);
    updateParent(cardNumber, holderName, expiryMonth, expiryYear, ccv, phone, masked, email);
  };

  const handleHolderNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setHolderName(value);
    updateParent(cardNumber, value, expiryMonth, expiryYear, ccv, phone, postalCode, email);
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setEmail(value);
    updateParent(cardNumber, holderName, expiryMonth, expiryYear, ccv, phone, postalCode, value);
  };

  const updateParent = (
    card: string,
    name: string,
    month: string,
    year: string,
    cvv: string,
    tel: string,
    cep: string,
    holderEmail: string
  ) => {
    const cardData: CreditCardData = {
      holderName: name,
      number: card.replace(/\s/g, ''),
      expiryMonth: month,
      expiryYear: year,
      ccv: cvv,
    };

    const holderInfo: CreditCardHolderInfo = {
      name,
      email: holderEmail, // Email do titular do cartão
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      postalCode: cep.replace(/\D/g, ''),
      addressNumber: 'S/N', // S/N = Sem Número (padrão brasileiro quando não há número)
      phone: tel.replace(/\D/g, ''),
    };

    onDataChange(cardData, holderInfo);
  };

  const cardBrand = detectCardBrand(cardNumber);

  return (
    <div className="space-y-4">
      {/* Número do Cartão */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          {t('number')} <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={cardNumber}
            onChange={handleCardNumberChange}
            placeholder="0000 0000 0000 0000"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CreditCard className="text-zinc-500" size={20} />
          </div>
        </div>
        {cardBrand && cardNumber.length > 4 && (
          <p className="text-xs text-zinc-400 mt-1">{t('brand')}: {cardBrand}</p>
        )}
      </div>

      {/* Nome do Titular */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          {t('holderName')} <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={holderName}
          onChange={handleHolderNameChange}
          placeholder={t('holderNamePlaceholder')}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
        />
      </div>

      {/* Email do Titular */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          {t('email')} <span className="text-red-400">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={handleEmailChange}
          placeholder="email@exemplo.com"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
        />
      </div>

      {/* Validade e CVV */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            {t('month')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={expiryMonth}
            onChange={handleExpiryMonthChange}
            placeholder="MM"
            maxLength={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            {t('year')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={expiryYear}
            onChange={handleExpiryYearChange}
            placeholder="AAAA"
            maxLength={4}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            {t('cvv')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={ccv}
            onChange={handleCcvChange}
            placeholder="123"
            maxLength={4}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>
      </div>

      {/* Telefone */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          {t('phone')} <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={phone}
          onChange={handlePhoneChange}
          placeholder="(00) 00000-0000"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
        />
      </div>

      {/* CEP */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          {t('cep')} <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={postalCode}
          onChange={handlePostalCodeChange}
          placeholder="00000-000"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
        />
      </div>

      {/* Aviso de Segurança */}
      <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-3">
        <p className="text-purple-300 text-xs flex items-start gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            {t('securityAviso')}
          </span>
        </p>
      </div>
    </div>
  );
}

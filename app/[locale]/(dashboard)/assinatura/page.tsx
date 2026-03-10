'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  Crown, Zap, Sparkles, CreditCard, Calendar,
  ExternalLink, CheckCircle, XCircle,
  ArrowLeft, AlertTriangle
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import CancellationModal from '@/components/subscription/CancellationModal';
import { useApiKey } from '@/hooks/useApiKey';
import { Cloud, Key } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface UserData {
  plan: string;
  is_paid: boolean;
  subscription_status: string;
  subscription_expires_at: string | null;
  admin_courtesy: boolean;
  asaas_subscription_id: string | null;
  asaas_customer_id: string | null;
  scheduled_to_cancel_at?: string | null;
}

export default function AssinaturaPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { hasKey } = useApiKey();
  const t = useTranslations('subscription');
  const locale = useLocale();

  const localeMap: Record<string, string> = {
    pt: 'pt-BR',
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    it: 'it-IT',
    ja: 'ja-JP',
  };
  const dateLocale = localeMap[locale] || locale;

  const loadUserData = useCallback(async () => {
    try {
      const res = await fetch('/api/user/me');
      if (!res.ok) throw new Error(t('errorLoading'));
      const data = await res.json();
      setUserData(data);
    } catch (error) {
      console.error(t('errorLoading'), error);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
      return;
    }

    if (isLoaded && isSignedIn) {
      loadUserData();
    }
  }, [isLoaded, isSignedIn, router, loadUserData]);

  const handleCancelSubscription = async (reason: string, feedback: string) => {
    setCancelLoading(true);
    try {
      const res = await fetch('/api/asaas/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, feedback }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('errorCancelling'));
      }

      await loadUserData();
      setCancelModalOpen(false);
      alert(t('cancelledSuccess'));
    } catch (error: any) {
      alert(error.message || t('errorProcessingCancellation'));
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner text={t('loading')} />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-400">{t('errorLoading')}</p>
      </div>
    );
  }

  const planKeys = ['free', 'legacy', 'starter', 'pro', 'studio'] as const;
  type PlanKey = typeof planKeys[number];

  const planMeta: Record<PlanKey, { icon: typeof Zap; color: string; storageGB: number }> = {
    free: { icon: Zap, color: 'zinc', storageGB: 0 },
    legacy: { icon: Zap, color: 'zinc', storageGB: 2 },
    starter: { icon: Zap, color: 'indigo', storageGB: 5 },
    pro: { icon: Crown, color: 'indigo', storageGB: 20 },
    studio: { icon: Sparkles, color: 'indigo', storageGB: 100 },
  };

  const planKey = (planKeys.includes(userData.plan as PlanKey) ? userData.plan : 'free') as PlanKey;
  const meta = planMeta[planKey];
  const PlanIcon = meta.icon;
  const planName = planKey.charAt(0).toUpperCase() + planKey.slice(1);
  const planPrice = t(`plans.${planKey}.price`);
  const planFeatures = t.raw(`plans.${planKey}.features`) as string[];

  const isCourtesy = userData.admin_courtesy;
  const hasActiveSubscription = userData.is_paid && userData.subscription_status === 'active';
  const isScheduledToCancel = !!userData.scheduled_to_cancel_at;

  const isAsaasUser = !!userData.asaas_subscription_id;
  const canCancelSubscription = hasActiveSubscription && !isCourtesy;

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="gap-2 mb-4"
          >
            <ArrowLeft size={20} />
            {t('backToDashboard')}
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="text-zinc-400">{t('subtitle')}</p>
        </div>

        {/* Current Plan Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                meta.color === 'indigo' ? 'bg-indigo-600/10 border border-indigo-500/30' :
                'bg-zinc-800 border border-zinc-700'
              }`}>
                <PlanIcon className={
                  meta.color === 'indigo' ? 'text-indigo-400' : 'text-zinc-500'
                } size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{planName}</h2>
                <p className="text-zinc-400">{planPrice}</p>
              </div>
            </div>

            {/* Status Badge */}
            <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              isCourtesy ? 'bg-indigo-900/20 border border-indigo-800' :
              hasActiveSubscription ? 'bg-green-900/20 border border-green-800' :
              'bg-zinc-800 border border-zinc-700'
            }`}>
              {isCourtesy ? (
                <>
                  <Sparkles size={16} className="text-indigo-400" />
                  <span className="text-indigo-400 font-medium">{t('status.courtesy')}</span>
                </>
              ) : hasActiveSubscription && !isScheduledToCancel ? (
                <>
                  <CheckCircle size={16} className="text-green-400" />
                  <span className="text-green-400 font-medium">{t('status.active')}</span>
                </>
              ) : isScheduledToCancel ? (
                 <>
                  <AlertTriangle size={16} className="text-amber-400" />
                  <span className="text-amber-400 font-medium">{t('status.scheduledCancel')}</span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-zinc-500" />
                  <span className="text-zinc-500 font-medium">{t('status.inactive')}</span>
                </>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">{t('featuresIncluded')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {planFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-zinc-300">
                  <CheckCircle size={16} className={meta.color === 'indigo' ? 'text-indigo-400' : 'text-zinc-500'} />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Info */}
          {hasActiveSubscription && userData.subscription_expires_at && (
            <div className={`border rounded-lg p-4 mb-4 ${
              isScheduledToCancel ? 'bg-amber-900/10 border-amber-900/30' : 'bg-zinc-950 border-zinc-800'
            }`}>
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
                <Calendar size={16} className={isScheduledToCancel ? 'text-amber-500' : ''} />
                {isScheduledToCancel ? t('accessUntil') : t('nextBilling')}
              </div>
              <p className={`font-medium ${isScheduledToCancel ? 'text-amber-200' : 'text-white'}`}>
                {new Date(userData.scheduled_to_cancel_at || userData.subscription_expires_at).toLocaleDateString(dateLocale, {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              {isScheduledToCancel && (
                <p className="text-xs text-amber-400 mt-2">
                  {t('noRenewal')}
                </p>
              )}
            </div>
          )}

          {/* Courtesy Notice */}
          {isCourtesy && (
            <div className="bg-indigo-900/20 border border-indigo-800/50 rounded-lg p-4 mb-4">
              <p className="text-indigo-400 text-sm flex items-center gap-2">
                <Sparkles size={16} />
                <strong>{t('courtesyPlan')}</strong>
              </p>
              <p className="text-zinc-400 text-xs mt-1">
                {t('courtesyDescription')}
                {userData.subscription_expires_at && (
                  <span className="block mt-1 text-indigo-300 font-medium">
                    {t('validUntil', { date: new Date(userData.subscription_expires_at).toLocaleDateString(dateLocale) })}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isAsaasUser && hasActiveSubscription && !isCourtesy && (
              <div className="flex-1 px-6 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-center">
                <p className="text-zinc-400 text-sm">
                  {t('paymentInfo')}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {t('changePaymentMethod')}
                </p>
              </div>
            )}

            {canCancelSubscription && !isScheduledToCancel && (
               <Button
                variant="outline"
                onClick={() => setCancelModalOpen(true)}
                className="flex-[0.5] px-6 py-3 rounded-xl hover:bg-red-900/40 hover:text-red-200 hover:border-red-900/50 gap-2"
              >
                {t('cancelButton')}
              </Button>
            )}

            {!hasActiveSubscription && !isCourtesy && (
              <Button
                size="lg"
                onClick={() => router.push('/pricing')}
                className="flex-1 px-6 gap-2"
              >
                <Crown size={20} />
                {t('subscribeNow')}
              </Button>
            )}
          </div>
        </div>


        {/* BYOK + Storage Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-zinc-400 mb-4">{t('geminiAndStorage')}</h3>

          {/* BYOK Status */}
          <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
              hasKey ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-zinc-800 border-zinc-700'
            }`}>
              <Key size={16} className={hasKey ? 'text-indigo-400' : 'text-zinc-500'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">
                {hasKey ? t('geminiConfigured') : t('geminiNotConfigured')}
              </p>
              <p className="text-xs text-zinc-500 truncate">
                {hasKey
                  ? t('geminiActiveDescription')
                  : t('geminiSetupDescription')}
              </p>
            </div>
            {!hasKey && (
              <Button
                variant="link"
                onClick={() => router.push('/editor')}
                className="text-xs whitespace-nowrap"
              >
                {t('configure')}
              </Button>
            )}
          </div>

          {/* Storage Bar */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
              meta.storageGB > 0 ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-zinc-800 border-zinc-700'
            }`}>
              <Cloud size={16} className={meta.storageGB > 0 ? 'text-indigo-400' : 'text-zinc-500'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white">{t('cloudStorage')}</p>
                <span className="text-xs text-zinc-400">
                  {meta.storageGB > 0 ? t('storageIncluded', { amount: meta.storageGB }) : t('storageNotIncluded')}
                </span>
              </div>
              {meta.storageGB > 0 ? (
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '5%' }} />
                </div>
              ) : (
                <p className="text-xs text-zinc-400">{t('upgradeForCloud')}</p>
              )}
            </div>
            {meta.storageGB === 0 && (
              <Button
                variant="link"
                onClick={() => router.push('/pricing')}
                className="text-xs whitespace-nowrap"
              >
                {t('upgrade')}
              </Button>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Payment Info - Asaas */}
          {isAsaasUser && hasActiveSubscription && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-600/10 rounded-lg flex items-center justify-center border border-indigo-500/30">
                  <CreditCard size={20} className="text-indigo-400" />
                </div>
                <h3 className="font-semibold">{t('paymentViaAsaas')}</h3>
              </div>
              <p className="text-sm text-zinc-400 mb-4">
                {t('asaasDescription')}
              </p>
              <p className="text-xs text-zinc-500">
                {t('paymentQuestions')}
              </p>
            </div>
          )}

          {/* My Invoices */}
          {hasActiveSubscription && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-600/10 rounded-lg flex items-center justify-center border border-indigo-500/30">
                  <CreditCard size={20} className="text-indigo-400" />
                </div>
                <h3 className="font-semibold">{t('myInvoices')}</h3>
              </div>
              <p className="text-sm text-zinc-400 mb-4">
                {t('invoicesDescription')}
              </p>
              <Button
                variant="link"
                onClick={() => router.push('/faturas')}
                className="gap-1"
              >
                {t('viewInvoices')}
                <ExternalLink size={14} />
              </Button>
            </div>
          )}

          {/* Support */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                <Sparkles size={20} className="text-zinc-400" />
              </div>
              <h3 className="font-semibold">{t('needHelp')}</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              {t('helpDescription')}
            </p>
            <a
              href="mailto:suporte@blacklinepro.com"
              className="text-sm text-indigo-400 hover:text-indigo-300 transition"
            >
              suporte@blacklinepro.com
            </a>
          </div>
        </div>
      </div>

      <CancellationModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelSubscription}
        isLoading={cancelLoading}
      />
    </div>
  );
}

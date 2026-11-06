import React, { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function AuthFormPage({ register = false }: { register?: boolean }) {
  const { t } = useTranslation();
  const { loginUser, registerUser, loginWithGoogle } = useAuth();
  const location = useLocation();
  const form = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({ username: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const googleEnabled = Boolean(
    import.meta.env.VITE_GOOGLE_CLIENT_ID &&
      import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID'
  );
  const run = async (action: () => Promise<void>, fallback: string) => {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (failure: any) {
      setError(failure.response?.data?.message || t(fallback));
    } finally {
      setBusy(false);
    }
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!values.username.trim()) next.username = t('ui.usernameRequired');
    if (!values.password) next.password = t('ui.passwordRequired');
    if (register && !values.confirmPassword) next.confirmPassword = t('ui.confirmRequired');
    else if (register && values.password !== values.confirmPassword)
      next.confirmPassword = t('ui.passwordMismatch');
    setErrors(next);
    setError('');
    if (Object.keys(next).length) {
      form.current
        ?.querySelector<HTMLInputElement>('[name="' + Object.keys(next)[0] + '"]')
        ?.focus();
      return;
    }
    void run(
      () =>
        register
          ? registerUser(values.username.trim(), values.password)
          : loginUser(values.username.trim(), values.password),
      register ? 'ui.registerFailed' : 'ui.signInFailed'
    );
  };
  return (
    <div className="mx-auto max-w-md py-4 sm:py-10">
      <Link to="/" className="ui-quiet mb-4">
        <ArrowLeft size={16} />
        {t('ui.backToReports')}
      </Link>
      <section className="ui-panel p-6 sm:p-8" aria-labelledby="auth-title">
        <div className="mb-6">
          <div className="mb-4 inline-flex rounded-xl bg-brand-50 p-3 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
            {register ? <UserPlus /> : <LogIn />}
          </div>
          <h1 id="auth-title" className="text-2xl font-bold tracking-tight">
            {t(register ? 'ui.registerTitle' : 'ui.signInTitle')}
          </h1>
          <p className="ui-muted mt-2">
            {t(register ? 'ui.registerDescription' : 'ui.signInDescription')}
          </p>
        </div>
        {location.state?.registered && (
          <p role="status" className="ui-success mb-4 rounded-xl p-3">
            {t('ui.accountCreated')}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
          >
            {error}
          </p>
        )}
        <form ref={form} onSubmit={submit} noValidate aria-busy={busy} className="space-y-5">
          {(register ? ['username', 'password', 'confirmPassword'] : ['username', 'password']).map(
            (name) => (
              <div key={name}>
                <label htmlFor={'auth-' + name} className="ui-label">
                  {t('ui.' + name)}
                </label>
                <input
                  id={'auth-' + name}
                  name={name}
                  required
                  type={name === 'username' ? 'text' : showPassword ? 'text' : 'password'}
                  autoComplete={
                    name === 'username'
                      ? 'username'
                      : register
                        ? 'new-password'
                        : 'current-password'
                  }
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={busy}
                  value={values[name as keyof typeof values]}
                  onChange={(event) => {
                    setValues({ ...values, [name]: event.target.value });
                    setErrors({ ...errors, [name]: '' });
                  }}
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={errors[name] ? 'error-' + name : undefined}
                  className="ui-field"
                />
                {errors[name] && (
                  <p
                    id={'error-' + name}
                    role="alert"
                    className="mt-1 text-sm text-red-700 dark:text-red-300"
                  >
                    {errors[name]}
                  </p>
                )}
              </div>
            )
          )}
          <label className="flex min-h-[44px] items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              className="h-4 w-4"
            />
            {t('ui.showPassword')}
          </label>
          <button disabled={busy} className="ui-primary w-full" type="submit">
            {t(
              busy
                ? register
                  ? 'ui.creatingAccount'
                  : 'ui.signingIn'
                : register
                  ? 'ui.createAccount'
                  : 'ui.signIn'
            )}
          </button>
        </form>
        {googleEnabled && (
          <div className="mt-6">
            <p className="ui-muted mb-4 text-center">{t('ui.orContinue')}</p>
            <div className={busy ? 'pointer-events-none opacity-50' : ''}>
              <GoogleLogin
                onSuccess={(response) => {
                  if (response.credential && !busy)
                    void run(() => loginWithGoogle(response.credential!), 'ui.googleError');
                }}
                onError={() => setError(t('ui.googleError'))}
              />
            </div>
          </div>
        )}
        <p className="ui-muted mt-6 text-center">
          {t(register ? 'ui.haveAccount' : 'ui.noAccount')}{' '}
          <Link
            to={register ? '/login' : '/register'}
            state={{ from: location.state?.from }}
            className="inline-flex min-h-[44px] items-center font-semibold text-brand-700 underline underline-offset-4 dark:text-brand-300"
          >
            {t(register ? 'ui.signIn' : 'ui.createAccount')}
          </Link>
        </p>
      </section>
    </div>
  );
}

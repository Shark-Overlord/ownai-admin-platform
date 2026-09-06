import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/auth/AuthShell";
import { getLoginCaptcha, loginUser, persistLoginUser } from "@/lib/auth";
import { compactButtonBase, compactButtonPrimary } from "@/lib/buttonStyles";
import { usePreferredLocale } from "@/lib/locale";
import { compactBodyText } from "@/lib/textStyles";
import { cn } from "@/lib/utils";

interface LoginPageLocationState {
  redirectTo?: string;
}

const LOGIN_PAGE_COPY = {
  "en-US": {
    switchLabel: "New here?",
    switchCta: "Create account",
    eyebrow: "Sign in",
    title: "Welcome back",
    subtitle: "Use your account and password to continue.",
    accountLabel: "Account",
    accountPlaceholder: "Enter your account",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    captchaLabel: "Verification code",
    captchaPlaceholder: "Enter code",
    captchaRefresh: "Refresh",
    captchaLoading: "Loading...",
    captchaLoadFailed: "Captcha failed to load, click to retry",
    accountPasswordRequired: "Please complete account, password, and verification code",
    success: "Signed in successfully, redirecting",
    loginFailed: "Login failed",
    submitting: "Signing in...",
    submit: "Sign in",
    footerLabel: "Don't have an account?",
    footerCta: "Create one",
  },
  "zh-CN": {
    switchLabel: "还没有账号？",
    switchCta: "去注册",
    eyebrow: "登录",
    title: "欢迎回来",
    subtitle: "使用你的账号和密码继续访问。",
    accountLabel: "账号",
    accountPlaceholder: "请输入账号",
    passwordLabel: "密码",
    passwordPlaceholder: "请输入密码",
    captchaLabel: "验证码",
    captchaPlaceholder: "请输入验证码",
    captchaRefresh: "刷新",
    captchaLoading: "加载中...",
    captchaLoadFailed: "验证码加载失败，点击重试",
    accountPasswordRequired: "请填写账号、密码和验证码",
    success: "登录成功，正在跳转",
    loginFailed: "登录失败",
    submitting: "登录中...",
    submit: "登录",
    footerLabel: "还没有账号？",
    footerCta: "立即注册",
  },
} as const;

export function LoginPage() {
  const loginCaptchaRequired =
    import.meta.env.VITE_LOGIN_CAPTCHA_REQUIRED !== "false";
  const { locale } = usePreferredLocale();
  const copy = LOGIN_PAGE_COPY[locale];
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    captchaCode: "",
    userAccount: "",
    userPassword: "",
  });
  const [captcha, setCaptcha] = useState<{
    captchaId: string;
    imageSrc: string;
  } | null>(null);
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);
  const [captchaError, setCaptchaError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTo =
    (location.state as LoginPageLocationState | null)?.redirectTo || "/";

  const loadCaptcha = async () => {
    setCaptchaError("");
    setIsCaptchaLoading(true);

    try {
      const captchaData = await getLoginCaptcha();
      const imageSrc =
        captchaData.imageUrl ||
        (captchaData.imageBase64?.startsWith("data:")
          ? captchaData.imageBase64
          : captchaData.imageBase64
            ? `data:image/png;base64,${captchaData.imageBase64}`
            : "");

      setCaptcha({
        captchaId: captchaData.captchaId,
        imageSrc,
      });
      setForm((current) => ({
        ...current,
        captchaCode: "",
      }));
    } catch (captchaLoadError) {
      setCaptcha(null);
      setCaptchaError(
        captchaLoadError instanceof Error
          ? captchaLoadError.message
          : copy.captchaLoadFailed,
      );
    } finally {
      setIsCaptchaLoading(false);
    }
  };

  useEffect(() => {
    if (loginCaptchaRequired) {
      void loadCaptcha();
    }
  }, [loginCaptchaRequired]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.userAccount.trim() ||
      !form.userPassword ||
      (loginCaptchaRequired && !form.captchaCode.trim())
    ) {
      setError(copy.accountPasswordRequired);
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await loginUser({
        captchaCode: loginCaptchaRequired
          ? form.captchaCode.trim()
          : undefined,
        captchaId: loginCaptchaRequired ? captcha?.captchaId : undefined,
        userAccount: form.userAccount.trim(),
        userPassword: form.userPassword,
      });
      persistLoginUser({
        ...user,
        userAccount: form.userAccount.trim(),
      });
      setSuccess(copy.success);
      window.setTimeout(() => {
        navigate(redirectTo, { replace: true });
      }, 800);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : copy.loginFailed,
      );
      if (loginCaptchaRequired) {
        void loadCaptcha();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      switchLabel={copy.switchLabel}
      switchCta={copy.switchCta}
      switchTo="/auth/register"
    >
      <div className="mx-auto w-full max-w-[410px] rounded-[22px] border border-[var(--auth-card-border)] bg-[var(--auth-card-bg)] p-5 shadow-[var(--auth-card-shadow)] backdrop-blur-md sm:p-6">
        <div className="text-center">
          <h2 className="text-[22px] font-semibold tracking-[-0.035em] text-[var(--hero-ink)]">
            {copy.title}
          </h2>
          <p className={cn("mt-2", compactBodyText)}>
            {copy.subtitle}
          </p>
        </div>

        <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-[var(--hero-ink)]">
              {copy.accountLabel}
            </span>
            <input
              type="text"
              autoComplete="username"
              value={form.userAccount}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  userAccount: event.target.value,
                }))
              }
              placeholder={copy.accountPlaceholder}
              className="h-10 w-full rounded-[10px] border border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] px-3.5 text-[14px] text-[var(--hero-ink)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-[var(--hero-muted)] focus:border-[var(--hero-border-strong)] focus:ring-2 focus:ring-[var(--hero-ink)]/8"
            />
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-[13px] font-medium text-[var(--hero-ink)]">
                {copy.passwordLabel}
              </span>
              {/*
              <button
                type="button"
                className="text-[13px] text-[var(--hero-muted)] transition-colors hover:text-[var(--hero-ink)]"
              >
                {copy.forgot}
              </button>
              */}
            </div>
            <input
              type="password"
              autoComplete="current-password"
              value={form.userPassword}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  userPassword: event.target.value,
                }))
              }
              placeholder={copy.passwordPlaceholder}
              className="h-10 w-full rounded-[10px] border border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] px-3.5 text-[14px] text-[var(--hero-ink)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-[var(--hero-muted)] focus:border-[var(--hero-border-strong)] focus:ring-2 focus:ring-[var(--hero-ink)]/8"
            />
          </label>

          {loginCaptchaRequired ? <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-[var(--hero-ink)]">
              {copy.captchaLabel}
            </span>
            <div className="grid grid-cols-[minmax(0,1fr)_118px] gap-2.5">
              <input
                type="text"
                autoComplete="one-time-code"
                value={form.captchaCode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    captchaCode: event.target.value,
                  }))
                }
                placeholder={copy.captchaPlaceholder}
                className="h-10 w-full rounded-[10px] border border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] px-3.5 text-[14px] text-[var(--hero-ink)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-[var(--hero-muted)] focus:border-[var(--hero-border-strong)] focus:ring-2 focus:ring-[var(--hero-ink)]/8"
              />
              <button
                type="button"
                onClick={loadCaptcha}
                disabled={isCaptchaLoading}
                className="flex h-10 items-center justify-center overflow-hidden rounded-[10px] border border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] text-[12px] font-medium text-[var(--hero-muted)] transition-colors hover:border-[var(--hero-border-strong)] hover:text-[var(--hero-ink)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {captcha?.imageSrc ? (
                  <img
                    src={captcha.imageSrc}
                    alt={copy.captchaRefresh}
                    className="h-full w-full object-cover"
                  />
                ) : isCaptchaLoading ? (
                  copy.captchaLoading
                ) : (
                  copy.captchaRefresh
                )}
              </button>
            </div>
            {captchaError ? (
              <button
                type="button"
                onClick={loadCaptcha}
                className="mt-1.5 text-left text-[12px] text-[var(--auth-error-text)]"
              >
                {copy.captchaLoadFailed}
              </button>
            ) : null}
          </label> : null}

          {error ? (
            <p className="rounded-[10px] border border-[var(--auth-error-border)] bg-[var(--auth-error-bg)] px-3.5 py-2.5 text-[13px] leading-5 text-[var(--auth-error-text)]">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-[10px] border border-[var(--auth-success-border)] bg-[var(--auth-success-bg)] px-3.5 py-2.5 text-[13px] leading-5 text-[var(--auth-success-text)]">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(compactButtonBase, compactButtonPrimary, "h-10 w-full rounded-[10px] text-[14px]")}
          >
            {isSubmitting ? copy.submitting : copy.submit}
          </button>
        </form>

        <p className="mt-4 text-center text-[13px] text-[var(--hero-muted)]">
          {copy.footerLabel}{" "}
          <Link
            to="/auth/register"
            className="font-medium text-[var(--hero-ink)] underline underline-offset-4 transition-opacity hover:opacity-80"
          >
            {copy.footerCta}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

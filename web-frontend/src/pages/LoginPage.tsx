import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/auth/AuthShell";
import { getLoginCaptcha, loginUser, persistLoginUser } from "@/lib/auth";
import { usePreferredLocale } from "@/lib/locale";

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
      <div className="w-full max-w-[400px] mx-auto">
        <div className="mb-8 space-y-2 text-left">
          <h2 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.04em] text-white leading-[1.2]">
            {copy.title}
          </h2>
          <p className="text-[13px] sm:text-[14px] text-zinc-400 leading-relaxed">
            {copy.subtitle}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-zinc-200">
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
              className="h-11 w-full rounded-[10px] border border-white/12 bg-white/[0.04] px-3.5 text-[14px] text-white outline-none transition-all duration-150 placeholder:text-zinc-500 focus:border-white/35 focus:bg-white/[0.06] focus:ring-2 focus:ring-white/10"
            />
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-[13px] font-medium text-zinc-200">
                {copy.passwordLabel}
              </span>
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
              className="h-11 w-full rounded-[10px] border border-white/12 bg-white/[0.04] px-3.5 text-[14px] text-white outline-none transition-all duration-150 placeholder:text-zinc-500 focus:border-white/35 focus:bg-white/[0.06] focus:ring-2 focus:ring-white/10"
            />
          </label>

          {loginCaptchaRequired ? (
            <label className="block">
              <span className="mb-2 block text-[13px] font-medium text-zinc-200">
                {copy.captchaLabel}
              </span>
              <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2.5">
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
                  className="h-11 w-full rounded-[10px] border border-white/12 bg-white/[0.04] px-3.5 text-[14px] text-white outline-none transition-all duration-150 placeholder:text-zinc-500 focus:border-white/35 focus:bg-white/[0.06] focus:ring-2 focus:ring-white/10"
                />
                <button
                  type="button"
                  onClick={loadCaptcha}
                  disabled={isCaptchaLoading}
                  className="flex h-11 items-center justify-center overflow-hidden rounded-[10px] border border-white/12 bg-white/[0.04] text-[12px] font-medium text-zinc-300 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="mt-1.5 text-left text-[12px] text-rose-400"
                >
                  {copy.captchaLoadFailed}
                </button>
              ) : null}
            </label>
          ) : null}

          {error ? (
            <p className="rounded-[10px] border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-[13px] leading-5 text-rose-300">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-[10px] border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-[13px] leading-5 text-emerald-300">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded-[10px] bg-white text-black text-[14px] font-semibold tracking-tight transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 shadow-md"
          >
            {isSubmitting ? copy.submitting : copy.submit}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-zinc-400">
          {copy.footerLabel}{" "}
          <Link
            to="/auth/register"
            className="font-medium text-white underline underline-offset-4 transition-opacity hover:opacity-80"
          >
            {copy.footerCta}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

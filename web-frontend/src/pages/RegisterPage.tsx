import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/auth/AuthShell";
import { registerUserByEmail, sendRegisterEmailCode } from "@/lib/auth";
import { compactButtonBase, compactButtonPrimary } from "@/lib/buttonStyles";
import { usePreferredLocale } from "@/lib/locale";
import { compactBodyText } from "@/lib/textStyles";
import { cn } from "@/lib/utils";

const REGISTER_PAGE_COPY = {
  "en-US": {
    switchLabel: "Already registered?",
    switchCta: "Sign in",
    eyebrow: "Sign up",
    title: "Create account",
    subtitle: "Register with your email and verification code.",
    emailLabel: "Email",
    emailPlaceholder: "Enter your email",
    emailCodeLabel: "Email code",
    emailCodePlaceholder: "Enter code",
    sendCode: "Send code",
    sendingCode: "Sending...",
    resendCode: "Resend in {seconds}s",
    passwordLabel: "Password",
    passwordPlaceholder: "Create a password",
    confirmPasswordLabel: "Confirm password",
    confirmPasswordPlaceholder: "Repeat your password",
    emailRequired: "Please enter a valid email",
    emailCodeRequired: "Please enter the email verification code",
    passwordsRequired: "Please complete both password fields",
    passwordsMismatch: "Passwords do not match",
    codeSent: "Verification code sent, please check your inbox",
    success: "Account created, redirecting to sign in",
    registerFailed: "Registration failed",
    submitting: "Creating account...",
    submit: "Create account",
    footerLabel: "Already have an account?",
    footerCta: "Sign in",
    legalDialogTitle: "Confirm platform rules",
    legalDialogDescription:
      "By registering, you confirm that you have read and agree to the User Agreement, Privacy Policy, and Service Use Rules. This platform provides technical access and auxiliary production services only. You must not use this platform to generate or distribute illegal content. The platform may run safety checks and restrict or terminate service for suspected violations.",
    legalAgreeLabel:
      "I have read and agree to the User Agreement, Privacy Policy, and Service Use Rules.",
    legalCancel: "Cancel",
    legalConfirm: "Agree and create account",
    legalRules: [
      "This platform provides technical access and auxiliary production services only. Assisted results do not represent this platform's views or commitments.",
      "You may not generate or distribute politically sensitive content, rumors, violent or terrorist content, sexual content, gambling content, fraud, intellectual property infringement, or illegal collection of personal information.",
      "Assisted content is for reference only. You are responsible for judging its truthfulness, accuracy, and legality, and should not use it directly for medical, legal, financial, or other high-risk decisions.",
      "The platform may run safety checks on requests and results. To protect service security and handle disputes, it may record necessary account information, IP address, service logs, and usage records within a reasonable scope.",
    ],
  },
  "zh-CN": {
    switchLabel: "已经有账号了？",
    switchCta: "去登录",
    eyebrow: "注册",
    title: "创建账号",
    subtitle: "使用邮箱和验证码完成注册。",
    emailLabel: "邮箱",
    emailPlaceholder: "请输入邮箱",
    emailCodeLabel: "邮箱验证码",
    emailCodePlaceholder: "请输入验证码",
    sendCode: "发送验证码",
    sendingCode: "发送中...",
    resendCode: "{seconds}s 后重发",
    passwordLabel: "密码",
    passwordPlaceholder: "请设置密码",
    confirmPasswordLabel: "确认密码",
    confirmPasswordPlaceholder: "请再次输入密码",
    emailRequired: "请输入正确的邮箱",
    emailCodeRequired: "请输入邮箱验证码",
    passwordsRequired: "请填写两次密码",
    passwordsMismatch: "两次输入的密码不一致",
    codeSent: "验证码已发送，请检查邮箱",
    success: "注册成功，正在前往登录页",
    registerFailed: "注册失败",
    submitting: "注册中...",
    submit: "注册",
    footerLabel: "已经有账号了？",
    footerCta: "立即登录",
    legalDialogTitle: "确认平台服务规则",
    legalDialogDescription:
      "注册即表示您已阅读并同意《用户协议》《隐私政策》及《服务使用规范》。本平台仅提供技术接入与辅助制作服务。禁止利用本平台生成、传播违法违规内容。平台有权对涉嫌违规的请求进行安全检测、限制或终止服务。",
    legalAgreeLabel:
      "我已阅读并同意《用户协议》《隐私政策》及《服务使用规范》。",
    legalCancel: "取消",
    legalConfirm: "同意并注册",
    legalRules: [
      "本平台仅提供技术接入与辅助制作服务，辅助生成结果不代表本平台观点或承诺。",
      "禁止利用平台生成或传播政治敏感内容、谣言、暴力恐怖内容、色情内容、赌博内容、诈骗内容、侵犯知识产权内容、违法收集个人信息内容。",
      "辅助生成内容仅供参考，用户应自行判断内容真实性、准确性及合法性，不应直接用于医疗、法律、金融等高风险决策。",
      "平台可能对请求内容及生成结果进行安全检测。为保障平台安全与处理争议，平台可能在合理范围内记录必要的账号信息、IP 地址、服务日志及使用记录。",
    ],
  },
} as const;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function RegisterPage() {
  const { locale } = usePreferredLocale();
  const copy = REGISTER_PAGE_COPY[locale];
  const navigate = useNavigate();
  const [form, setForm] = useState({
    checkPassword: "",
    emailCode: "",
    userEmail: "",
    userPassword: "",
  });
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [emailCodeCountdown, setEmailCodeCountdown] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLegalDialogOpen, setIsLegalDialogOpen] = useState(false);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);

  useEffect(() => {
    if (emailCodeCountdown <= 0) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setEmailCodeCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [emailCodeCountdown]);

  const handleSendEmailCode = async () => {
    setError("");
    setSuccess("");

    if (!isValidEmail(form.userEmail)) {
      setError(copy.emailRequired);
      return;
    }

    try {
      setIsSendingCode(true);
      await sendRegisterEmailCode(form.userEmail.trim());
      setSuccess(copy.codeSent);
      setEmailCodeCountdown(60);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : copy.registerFailed);
    } finally {
      setIsSendingCode(false);
    }
  };

  const validateForm = () => {
    setError("");
    setSuccess("");

    if (!isValidEmail(form.userEmail)) {
      setError(copy.emailRequired);
      return false;
    }

    if (!form.emailCode.trim()) {
      setError(copy.emailCodeRequired);
      return false;
    }

    if (!form.userPassword || !form.checkPassword) {
      setError(copy.passwordsRequired);
      return false;
    }

    if (form.userPassword !== form.checkPassword) {
      setError(copy.passwordsMismatch);
      return false;
    }

    return true;
  };

  const submitRegistration = async () => {
    try {
      setIsSubmitting(true);
      await registerUserByEmail({
        checkPassword: form.checkPassword,
        emailCode: form.emailCode.trim(),
        userEmail: form.userEmail.trim(),
        userPassword: form.userPassword,
      });
      setSuccess(copy.success);
      window.setTimeout(() => {
        navigate("/auth/login", { replace: true });
      }, 900);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : copy.registerFailed,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setHasAcceptedLegal(false);
    setIsLegalDialogOpen(true);
  };

  const handleLegalConfirm = () => {
    if (!hasAcceptedLegal || isSubmitting) {
      return;
    }

    setIsLegalDialogOpen(false);
    void submitRegistration();
  };

  return (
    <AuthShell
      switchLabel={copy.switchLabel}
      switchCta={copy.switchCta}
      switchTo="/auth/login"
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
              {copy.emailLabel}
            </span>
            <input
              type="email"
              autoComplete="email"
              value={form.userEmail}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  userEmail: event.target.value,
                }))
              }
              placeholder={copy.emailPlaceholder}
              className="h-10 w-full rounded-[10px] border border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] px-3.5 text-[14px] text-[var(--hero-ink)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-[var(--hero-muted)] focus:border-[var(--hero-border-strong)] focus:ring-2 focus:ring-[var(--hero-ink)]/8"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-[var(--hero-ink)]">
              {copy.emailCodeLabel}
            </span>
            <div className="grid grid-cols-[minmax(0,1fr)_116px] gap-2.5">
              <input
                type="text"
                autoComplete="one-time-code"
                value={form.emailCode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    emailCode: event.target.value,
                  }))
                }
                placeholder={copy.emailCodePlaceholder}
                className="h-10 w-full rounded-[10px] border border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] px-3.5 text-[14px] text-[var(--hero-ink)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-[var(--hero-muted)] focus:border-[var(--hero-border-strong)] focus:ring-2 focus:ring-[var(--hero-ink)]/8"
              />
              <button
                type="button"
                onClick={handleSendEmailCode}
                disabled={isSendingCode || emailCodeCountdown > 0}
                className="h-10 rounded-[10px] border border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] px-3 text-[12px] font-medium text-[var(--hero-ink)] transition-colors hover:border-[var(--hero-border-strong)] hover:bg-[var(--hero-ink)]/5 disabled:cursor-not-allowed disabled:text-[var(--hero-muted)]"
              >
                {isSendingCode
                  ? copy.sendingCode
                  : emailCodeCountdown > 0
                    ? copy.resendCode.replace("{seconds}", String(emailCodeCountdown))
                    : copy.sendCode}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-[var(--hero-ink)]">
              {copy.passwordLabel}
            </span>
            <input
              type="password"
              autoComplete="new-password"
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

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-[var(--hero-ink)]">
              {copy.confirmPasswordLabel}
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.checkPassword}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  checkPassword: event.target.value,
                }))
              }
              placeholder={copy.confirmPasswordPlaceholder}
              className="h-10 w-full rounded-[10px] border border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] px-3.5 text-[14px] text-[var(--hero-ink)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-[var(--hero-muted)] focus:border-[var(--hero-border-strong)] focus:ring-2 focus:ring-[var(--hero-ink)]/8"
            />
          </label>

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
            to="/auth/login"
            className="font-medium text-[var(--hero-ink)] underline underline-offset-4 transition-opacity hover:opacity-80"
          >
            {copy.footerCta}
          </Link>
        </p>
      </div>

      <DialogPrimitive.Root
        open={isLegalDialogOpen}
        onOpenChange={(open) => {
          setIsLegalDialogOpen(open);

          if (!open) {
            setHasAcceptedLegal(false);
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--hero-bg)]/72 backdrop-blur-[3px]" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[20px] border border-[var(--auth-card-border)] bg-[var(--hero-surface)] text-[var(--hero-ink)] shadow-[0_24px_64px_-36px_rgba(17,17,17,0.48)] outline-none">
            <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-5">
              <div className="min-w-0">
                <DialogPrimitive.Title className="text-[16px] font-medium leading-6 text-[var(--hero-ink)]">
                  {copy.legalDialogTitle}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-2 text-[13px] leading-6 text-[var(--hero-muted)]">
                  {copy.legalDialogDescription}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                aria-label={copy.legalCancel}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--hero-border)] bg-[var(--hero-surface)] text-[var(--hero-muted)] transition-colors hover:border-[var(--hero-border-strong)] hover:text-[var(--hero-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
              <div className="rounded-[14px] border border-[var(--hero-border)] bg-[var(--hero-ink)]/[0.025] px-4 py-4">
                <ol className="space-y-3">
                  {copy.legalRules.map((rule, index) => (
                    <li key={rule} className="flex items-start gap-1.5">
                      <span className="shrink-0 text-[13px] font-medium leading-6 text-[var(--hero-ink)]">
                        {index + 1}、
                      </span>
                      <p className="text-[13px] leading-6 text-[var(--hero-muted)]">
                        {rule}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="shrink-0 px-5 pb-5 pt-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[var(--hero-border)] bg-[var(--hero-ink)]/[0.025] px-3.5 py-3">
                <input
                  type="checkbox"
                  checked={hasAcceptedLegal}
                  onChange={(event) => setHasAcceptedLegal(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--hero-ink)]"
                />
                <span className="text-[13px] leading-6 text-[var(--hero-ink)]">
                  {copy.legalAgreeLabel}
                </span>
              </label>

              <div className="mt-3 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <DialogPrimitive.Close className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[var(--hero-border)] bg-[var(--hero-surface)] px-4 text-[13px] font-medium text-[var(--hero-ink)] transition-colors hover:bg-[var(--hero-ink)]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15">
                  {copy.legalCancel}
                </DialogPrimitive.Close>
                <button
                  type="button"
                  disabled={!hasAcceptedLegal || isSubmitting}
                  onClick={handleLegalConfirm}
                  className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[var(--hero-ink)] px-4 text-[13px] font-medium text-[var(--hero-bg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
                >
                  {isSubmitting ? copy.submitting : copy.legalConfirm}
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </AuthShell>
  );
}

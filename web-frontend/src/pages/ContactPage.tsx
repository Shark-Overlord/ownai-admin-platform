import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navbar } from "@/components/home/Navbar";
import { contactPageCopy } from "@/data/contact";
import { compactButtonBase, compactButtonPrimary } from "@/lib/buttonStyles";
import { usePreferredLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

type ContactField = "name" | "email" | "message";

type ContactFormState = Record<ContactField, string>;
type ContactFormErrors = Partial<Record<ContactField, string>>;

interface ContactFeedback {
  message: string;
}

const INITIAL_FORM_STATE: ContactFormState = {
  name: "",
  email: "",
  message: "",
};

const DEMO_SUBMIT_DELAY_MS = 650;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(
  form: ContactFormState,
  copy: (typeof contactPageCopy)["en-US"],
) {
  const nextErrors: ContactFormErrors = {};

  if (!form.name.trim()) {
    nextErrors.name = copy.nameRequired;
  }

  if (!form.email.trim()) {
    nextErrors.email = copy.emailRequired;
  } else if (!EMAIL_PATTERN.test(form.email.trim())) {
    nextErrors.email = copy.emailInvalid;
  }

  if (!form.message.trim()) {
    nextErrors.message = copy.messageRequired;
  }

  return nextErrors;
}

export function ContactPage() {
  const { locale } = usePreferredLocale();
  const copy = contactPageCopy[locale];
  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [feedback, setFeedback] = useState<ContactFeedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });

    return () => {
      if (submitTimeoutRef.current !== null) {
        window.clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  const updateField = (field: ContactField, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });

    if (feedback) {
      setFeedback(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateForm(form, copy);
    setErrors(nextErrors);
    setFeedback(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    await new Promise<void>((resolve) => {
      submitTimeoutRef.current = window.setTimeout(() => {
        submitTimeoutRef.current = null;
        resolve();
      }, DEMO_SUBMIT_DELAY_MS);
    });

    setForm(INITIAL_FORM_STATE);
    setIsSubmitting(false);
    setFeedback({
      message: copy.successMessage,
    });
  };

  const getFieldClassName = (field: ContactField) =>
    cn(
      "mt-1.5 w-full rounded-[16px] border border-[var(--hero-ink)]/8 bg-[var(--hero-surface)] px-4 text-[13px] text-[var(--hero-ink)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--hero-muted)] focus:border-[var(--hero-ink)]/14 focus:ring-2 focus:ring-[var(--hero-ink)]/8",
      field === "message"
        ? "min-h-[132px] resize-none py-3"
        : "h-[42px]",
      errors[field]
        ? "border-red-200 bg-red-50/60 focus:border-red-300 focus:ring-red-100"
        : "",
    );

  return (
    <div className="page-surface relative min-h-screen bg-[var(--hero-bg)] text-[var(--hero-ink)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-[-6%] top-[-2%] h-[220px] w-[220px] rounded-full bg-[var(--hero-surface)]/85 blur-3xl" />
        <div className="absolute right-[-4%] top-[8%] h-[280px] w-[280px] rounded-full bg-[var(--hero-panel)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(24,28,36,0.016)_1px,transparent_1px),linear-gradient(90deg,rgba(24,28,36,0.016)_1px,transparent_1px)] bg-[size:92px_92px] opacity-20" />
      </div>

      <Navbar />

      <main className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 pb-4 pt-3 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-[600px]">
          <div className="text-center">
            <h1 className="font-display text-[2rem] font-medium tracking-[-0.045em] text-[var(--hero-ink)] sm:text-[2.35rem]">
              {copy.title}
            </h1>
            <p className="mt-1.5 text-[13px] leading-5 text-[var(--hero-muted)]">
              {copy.subtitle}
            </p>
          </div>

          <form className="mt-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2.5">
              <div>
                <label
                  htmlFor="contact-name"
                  className="mb-1 block text-[13px] font-medium text-[var(--hero-ink)]"
                >
                  {copy.nameLabel}
                </label>
                <input
                  id="contact-name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder={copy.namePlaceholder}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "contact-name-error" : undefined}
                  className={getFieldClassName("name")}
                />
                {errors.name ? (
                  <p
                    id="contact-name-error"
                    className="mt-2 text-sm leading-6 text-red-600"
                  >
                    {errors.name}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="mb-1 block text-[13px] font-medium text-[var(--hero-ink)]"
                >
                  {copy.emailLabel}
                </label>
                <input
                  id="contact-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder={copy.emailPlaceholder}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "contact-email-error" : undefined}
                  className={getFieldClassName("email")}
                />
                {errors.email ? (
                  <p
                    id="contact-email-error"
                    className="mt-2 text-sm leading-6 text-red-600"
                  >
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="mb-1 block text-[13px] font-medium text-[var(--hero-ink)]"
                >
                  {copy.messageLabel}
                </label>
                <textarea
                  id="contact-message"
                  value={form.message}
                  onChange={(event) => updateField("message", event.target.value)}
                  placeholder={copy.messagePlaceholder}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={
                    errors.message ? "contact-message-error" : undefined
                  }
                  className={getFieldClassName("message")}
                />
                {errors.message ? (
                  <p
                    id="contact-message-error"
                    className="mt-2 text-sm leading-6 text-red-600"
                  >
                    {errors.message}
                  </p>
                ) : null}
              </div>
            </div>

            {feedback ? (
              <p className="mt-3 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] leading-5 text-emerald-700">
                {feedback.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(compactButtonBase, compactButtonPrimary, "mt-3 w-full")}
            >
              {isSubmitting ? copy.submittingLabel : copy.submitLabel}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

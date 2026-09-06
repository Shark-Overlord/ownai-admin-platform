import { startTransition, useRef, useState } from "react";
import { ArrowLeft, FolderOpen, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/home/Navbar";
import { cn } from "@/lib/utils";

interface ProjectItem {
  id: string;
  name: string;
  meta: string;
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  const hasProjects = projects.length > 0;
  const createdCount = projects.length;

  const handleCreateProject = (fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }

    const nextProjects = Array.from(fileList).map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      name: file.name.replace(/\.[^.]+$/, ""),
      meta: `${formatFileSize(file.size)} uploaded just now`,
    }));

    startTransition(() => {
      setProjects((current) => [...nextProjects, ...current]);
    });
  };

  return (
    <div className="min-h-screen bg-[var(--hero-bg)] text-[var(--hero-ink)]">
      <Navbar />

      <main className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-[1040px]">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hero-muted)] transition-colors hover:text-[var(--hero-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>

          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => handleCreateProject(event.target.files)}
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--hero-ink)]/5 pb-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--hero-ink)]">
                Projects
              </h1>
              <p className="mt-1 text-sm text-[var(--hero-muted)]">
                {hasProjects
                  ? `${createdCount} project${createdCount > 1 ? "s" : ""} ready in your workspace`
                  : "Create your first project to get started"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[var(--hero-ink)] px-4 text-sm font-medium text-[var(--hero-bg)] shadow-sm transition-[transform,box-shadow,background-color] duration-150 hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </div>

          <section
            className={cn(
              "mt-8 grid gap-6",
              hasProjects ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "lg:grid-cols-[280px_1fr]",
            )}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="group flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--hero-ink)]/15 bg-transparent px-6 text-center transition-colors hover:border-[var(--hero-ink)]/30 hover:bg-[var(--hero-ink)]/[0.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#f1f3f6] text-[var(--hero-muted)] transition-colors group-hover:bg-[#e9edf2] group-hover:text-[var(--hero-ink)]">
                <Plus className="h-5 w-5" />
              </span>
              <span className="mt-3 text-sm font-medium text-[var(--hero-ink)]">
                New Project
              </span>
              <span className="mt-1 max-w-[180px] text-xs leading-5 text-[var(--hero-muted)]">
                Upload files and create a fresh project workspace.
              </span>
            </button>

            {hasProjects ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 xl:col-span-3">
                {projects.map((project) => (
                  <article
                    key={project.id}
                    className="flex flex-col items-start justify-center rounded-xl border border-[var(--hero-ink)]/5 bg-[var(--hero-surface)] p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4f6f9] text-[var(--hero-muted)]">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <h2 className="mt-3 text-sm font-medium text-[var(--hero-ink)]">
                      {project.name}
                    </h2>
                    <p className="mt-1 w-full truncate text-xs text-[var(--hero-muted)]">
                      {project.meta}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl bg-transparent">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#f5f5f7] text-[#9ea3ad]">
                  <FolderOpen className="h-6 w-6" />
                </span>
                <h2 className="mt-3 text-sm font-medium text-[var(--hero-ink)]">
                  No projects yet
                </h2>
                <p className="mt-1 max-w-[280px] text-center text-sm leading-6 text-[var(--hero-muted)]">
                  Start creating by uploading files for the project you want to build.
                </p>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

import { getJson } from "@/lib/request";

export interface HomeVideoItem {
  id: string;
  videoUrl?: string;
  posterUrl: string;
  alt: string;
  sort: number;
}

export interface HomeHeroContent {
  eyebrow: string;
  title: string;
  description: string;
  videoList: HomeVideoItem[];
}

export interface HomeDesignContent {
  title: string;
  description: string;
  ctaText: string;
  ctaPath: string;
  demoVideoUrl: string;
  demoVideoPosterUrl?: string;
}

export interface HomeCourseItem {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  coverAlt: string;
  statusText: string;
  targetPath: string;
  sort: number;
}

export interface HomeCourseContent {
  eyebrow: string;
  title: string;
  description: string;
  ctaText: string;
  ctaPath: string;
  footerTitle: string;
  footerDescription: string;
  itemList: HomeCourseItem[];
}

export interface HomeContentVO {
  hero: HomeHeroContent;
  design: HomeDesignContent;
  course: HomeCourseContent;
  updateTime?: string;
}

export const DEFAULT_HOME_CONTENT: HomeContentVO = {
  hero: {
    eyebrow: "制作 · 收集 · 整理",
    title: "500+ 精美前端提示词与源码",
    description: "覆盖页面、组件与交互场景，为界面复刻与产品开发提供可直接使用的创作起点",
    videoList: [],
  },
  design: {
    title: "一键复制，任意网站UI设计",
    description: "从完整页面到单个交互组件，通过真实演示了解 OwnAI Design 拆解为可复刻结构并还原细节的前端提示词。",
    ctaText: "了解 OwnAI Design",
    ctaPath: "/ownai-design",
    demoVideoUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/video_background_source/1/pRbkiu98-8%E6%9C%8822%E6%97%A5%20(2)(1).mp4",
  },
  course: {
    eyebrow: "SYSTEM COURSES",
    title: "从想法到应用，建立完整开发能力",
    description: "系统将持续开设面向真实项目的开发课程，帮助你理解方法、完成实践，并逐步构建自己的应用。",
    ctaText: "查看现有教程",
    ctaPath: "/tutorials",
    footerTitle: "课程将围绕真实项目持续更新",
    footerDescription: "学习路径、源码示例与实践过程会逐步补全",
    itemList: [
      {
        id: "frontend-course",
        title: "前端开发",
        description: "掌握现代界面工程、组件设计、交互实现与工程化实践",
        coverUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/blog_image/1/PFcczSHL-frontend.png",
        coverAlt: "前端开发课程封面",
        statusText: "已上线",
        targetPath: "/tutorials",
        sort: 1,
      },
      {
        id: "agent-course",
        title: "Agent 开发",
        description: "学习工具调用、上下文管理与智能体应用的落地方法",
        coverUrl: "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/blog_image/1/yFhRmHx0-agent.png",
        coverAlt: "Agent 开发课程封面",
        statusText: "已上线",
        targetPath: "/tutorials",
        sort: 2,
      },
    ],
  },
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const VIDEO_MEDIA_EXTENSION_PATTERN = /\.(?:mp4|webm|mov|m4v|avi|mkv)(?:$|[?#])/i;

function isStaticImageUrl(value: unknown): value is string {
  return isNonEmptyString(value) && !VIDEO_MEDIA_EXTENSION_PATTERN.test(value.trim());
}

function normalizeVideoList(videoList: HomeVideoItem[] | undefined) {
  if (!Array.isArray(videoList)) {
    return DEFAULT_HOME_CONTENT.hero.videoList;
  }

  const normalized = videoList
    .filter((item) => item && isNonEmptyString(item.id) && isStaticImageUrl(item.posterUrl))
    .map((item, index) => ({
      ...item,
      videoUrl: isNonEmptyString(item.videoUrl) ? item.videoUrl.trim() : undefined,
      posterUrl: item.posterUrl.trim(),
      alt: isNonEmptyString(item.alt) ? item.alt : `前端界面演示 ${index + 1}`,
      sort: Number.isFinite(item.sort) ? item.sort : index + 1,
    }))
    .sort((left, right) => left.sort - right.sort);

  return normalized.length > 0 ? normalized : DEFAULT_HOME_CONTENT.hero.videoList;
}

function normalizeCourseList(itemList: HomeCourseItem[] | undefined) {
  if (!Array.isArray(itemList)) {
    return DEFAULT_HOME_CONTENT.course.itemList;
  }

  const normalized = itemList
    .filter(
      (item) =>
        item &&
        isNonEmptyString(item.id) &&
        isNonEmptyString(item.title) &&
        isNonEmptyString(item.coverUrl),
    )
    .map((item, index) => ({
      ...item,
      description: item.description ?? "",
      coverAlt: isNonEmptyString(item.coverAlt) ? item.coverAlt : `${item.title}课程封面`,
      statusText: item.statusText ?? "",
      targetPath: isNonEmptyString(item.targetPath) ? item.targetPath : "/tutorials",
      sort: Number.isFinite(item.sort) ? item.sort : index + 1,
    }))
    .sort((left, right) => left.sort - right.sort);

  return normalized.length > 0 ? normalized : DEFAULT_HOME_CONTENT.course.itemList;
}

export function normalizeHomeContent(content: HomeContentVO): HomeContentVO {
  return {
    hero: {
      ...DEFAULT_HOME_CONTENT.hero,
      ...content.hero,
      videoList: normalizeVideoList(content.hero?.videoList),
    },
    design: {
      ...DEFAULT_HOME_CONTENT.design,
      ...content.design,
      demoVideoPosterUrl: isStaticImageUrl(content.design?.demoVideoPosterUrl)
        ? content.design.demoVideoPosterUrl.trim()
        : undefined,
    },
    course: {
      ...DEFAULT_HOME_CONTENT.course,
      ...content.course,
      itemList: normalizeCourseList(content.course?.itemList),
    },
    updateTime: content.updateTime,
  };
}

export async function getHomeContent(signal?: AbortSignal) {
  const result = await getJson<HomeContentVO>("/home/content", {
    includeAuthToken: false,
    signal,
  });

  if (result.code !== 0 || !result.data) {
    throw new Error(result.message || "Failed to load home content");
  }

  return normalizeHomeContent(result.data);
}

import { useEffect } from 'react';
import { postJson } from '@/lib/request';
import { getOrCreateVisitorId } from '@/lib/site-analytics';

export type ResourceType = 'artwork' | 'video_background' | 'image_prompt';
export async function trackResource(resourceType: ResourceType, resourceId: string, action: 'view' | 'copy') {
  try {
    await postJson('/resource-analytics/track', {
      resourceType, resourceId, action, visitorId: getOrCreateVisitorId(), eventKey: crypto.randomUUID(),
    });
  } catch { /* Collection failures must not interrupt browsing or successful clipboard operations. */ }
}
export function useResourceView(resourceType: ResourceType, resourceId?: string) {
  useEffect(() => { if (resourceId) void trackResource(resourceType, resourceId, 'view'); }, [resourceType, resourceId]);
}

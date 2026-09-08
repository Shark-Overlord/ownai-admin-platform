package com.yupi.springbootinit.model.vo;

/** Marker contract used only by administrator views for replacement drafts. */
public interface NativeDraftAwareVO {
    Long getId();

    void setHasUnpublishedChanges(Boolean hasUnpublishedChanges);

    void setUnpublishedDraftId(Long unpublishedDraftId);

    void setReplacesResourceId(Long replacesResourceId);
}

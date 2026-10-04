package com.yupi.springbootinit.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import org.junit.jupiter.api.Test;

class PromptAssetSceneTagReplacementTest {

    @Test
    void replacesOnlyCategoryTagsAndPreservesAssetTags() {
        assertEquals(Arrays.asList(201L, 202L, 9001L, 9002L),
                PromptAssetServiceImpl.mergeSceneAndAssetTagIds(
                        Arrays.asList(101L, 9001L, 102L, 9002L),
                        new LinkedHashSet<>(Arrays.asList(101L, 102L, 201L, 202L)),
                        Arrays.asList(201L, 202L)));
    }

    @Test
    void emptySceneTagsClearOnlyCategoryTags() {
        assertEquals(Collections.singletonList(9001L),
                PromptAssetServiceImpl.mergeSceneAndAssetTagIds(
                        Arrays.asList(101L, 9001L),
                        new LinkedHashSet<>(Arrays.asList(101L, 102L)),
                        Collections.emptyList()));
    }
}

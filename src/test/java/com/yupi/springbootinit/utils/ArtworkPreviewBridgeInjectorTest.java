package com.yupi.springbootinit.utils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ArtworkPreviewBridgeInjectorTest {

    @Test
    void injectsBridgeBeforeClosingBody() {
        String source = "<!doctype html><html><body><main id=\"hero\"></main></body></html>";

        String result = ArtworkPreviewBridgeInjector.inject(source);

        assertTrue(result.contains(ArtworkPreviewBridgeInjector.MARKER));
        assertTrue(result.contains("HIGHLIGHT_PART"));
        assertTrue(result.contains("CLEAR_HIGHLIGHTS"));
        assertTrue(result.indexOf(ArtworkPreviewBridgeInjector.MARKER) < result.indexOf("</body>"));
        assertTrue(result.contains("<main id=\"hero\"></main>"));
    }

    @Test
    void injectionIsIdempotent() {
        String once = ArtworkPreviewBridgeInjector.inject("<body>Preview</body>");

        assertEquals(once, ArtworkPreviewBridgeInjector.inject(once));
        assertEquals(1, countOccurrences(once, ArtworkPreviewBridgeInjector.MARKER));
    }

    @Test
    void supportsFragmentsAndEmptyInput() {
        String fragment = "<main data-part-target=\"hero\">Preview</main>";

        assertTrue(ArtworkPreviewBridgeInjector.inject(fragment).startsWith(fragment));
        assertEquals("", ArtworkPreviewBridgeInjector.inject(""));
        assertEquals(null, ArtworkPreviewBridgeInjector.inject(null));
    }

    private int countOccurrences(String value, String needle) {
        int count = 0;
        int offset = 0;
        while ((offset = value.indexOf(needle, offset)) >= 0) {
            count++;
            offset += needle.length();
        }
        return count;
    }
}

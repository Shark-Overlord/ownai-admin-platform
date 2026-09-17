package com.yupi.springbootinit.utils;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Injects the isolated postMessage bridge used by artwork preview iframes. */
public final class ArtworkPreviewBridgeInjector {

    static final String MARKER = "data-ownai-preview-bridge";

    private static final Pattern BODY_CLOSE = Pattern.compile("</body\\s*>", Pattern.CASE_INSENSITIVE);

    private static final String BRIDGE_SCRIPT =
            "<script " + MARKER + ">(function(){"
                    + "if(window.__ownaiPreviewBridgeInstalled)return;window.__ownaiPreviewBridgeInstalled=true;"
                    + "var style=document.getElementById('ownai-part-highlight');"
                    + "if(!style){style=document.createElement('style');style.id='ownai-part-highlight';"
                    + "style.textContent='.part-highlight-active{outline:2.5px solid #3b82f6!important;outline-offset:-3px!important;box-shadow:inset 0 0 50px rgba(59,130,246,.35)!important}';"
                    + "(document.head||document.documentElement).appendChild(style);}"
                    + "function clear(){var nodes=document.querySelectorAll('.part-highlight-active');"
                    + "for(var i=0;i<nodes.length;i++)nodes[i].classList.remove('part-highlight-active');}"
                    + "function find(id){if(!id)return null;var direct=document.getElementById(id);if(direct)return direct;"
                    + "var nodes=document.querySelectorAll('[data-part-target]');for(var i=0;i<nodes.length;i++){"
                    + "if(nodes[i].getAttribute('data-part-target')===id)return nodes[i];}return null;}"
                    + "window.addEventListener('message',function(event){if(event.source!==window.parent)return;"
                    + "var data=event.data||{};if(data.type==='CLEAR_HIGHLIGHTS'){clear();return;}"
                    + "if(data.type!=='HIGHLIGHT_PART')return;clear();var target=find(data.targetId)||find(data.partId);"
                    + "if(target){target.classList.add('part-highlight-active');target.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});}});"
                    + "if(window.lucide&&typeof window.lucide.createIcons==='function')window.lucide.createIcons();"
                    + "window.parent.postMessage({type:'OWNAI_PREVIEW_READY'},'*');"
                    + "})();</script>";

    private ArtworkPreviewBridgeInjector() {
    }

    public static String inject(String html) {
        if (html == null || html.trim().isEmpty() || html.contains(MARKER)) {
            return html;
        }
        Matcher matcher = BODY_CLOSE.matcher(html);
        if (!matcher.find()) {
            return html + BRIDGE_SCRIPT;
        }
        return html.substring(0, matcher.start()) + BRIDGE_SCRIPT + html.substring(matcher.start());
    }
}

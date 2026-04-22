/* =============================================================
   Blauw Films — Rich Text Before/After Compare Slider
   ------------------------------------------------------------
   Pairs two Rich Text images into an interactive slider.

   Usage:
     Upload both images normally in Webflow Rich Text, then set
     their alt text using this pattern:

       compare:groupId:before   Optional real alt caption
       compare:groupId:after    Optional real alt caption

     The script finds matching pairs, replaces them with a
     slider, and preserves the remaining alt text for
     accessibility (the "compare:groupId:side" prefix is stripped).

   Coexistence with Blauw Zoom:
     The slider's <img> tags get `pointer-events: none` via CSS.
     Any click listeners Blauw Zoom attaches simply never fire,
     so the two systems don't interfere.
   ============================================================= */

(function () {
  "use strict";

  var CFG = {
    RICH_TEXT_SEL: ".w-richtext, .rich-text, [class*='rich-text']",
    ALT_PREFIX:    "compare:",
    START_POS:     50,     // initial divider position (%)
    KEY_STEP:      2,      // arrow-key step (%)
    KEY_STEP_BIG:  10      // shift + arrow-key step (%)
  };

  // Alt-text grammar:
  //   compare:<groupId>:<side>[<whitespace><remaining alt text>]
  //   groupId may not contain whitespace or colons.
  var ALT_RE = /^compare:([^:\s]+):(before|after)(?:\s+([\s\S]*))?$/;

  // ----------------------------------------------------------------
  // Initial scan + MutationObserver for dynamic (CMS) content.
  // ----------------------------------------------------------------

  function init() {
    scanAll();

    // Watch for newly injected rich-text content (CMS pagination,
    // tab reveals, etc.) — mirrors blauw-zoom's behaviour.
    var observer = new MutationObserver(function (mutations) {
      var relevant = false;
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.matches && n.matches("img[alt^='" + CFG.ALT_PREFIX + "']")) {
            relevant = true; break;
          }
          if (n.querySelector && n.querySelector("img[alt^='" + CFG.ALT_PREFIX + "']")) {
            relevant = true; break;
          }
        }
        if (relevant) break;
      }
      if (relevant) scanAll();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function scanAll() {
    var containers = document.querySelectorAll(CFG.RICH_TEXT_SEL);
    for (var i = 0; i < containers.length; i++) {
      processContainer(containers[i]);
    }
  }

  function processContainer(container) {
    // Only grab imgs that still carry the compare: alt prefix.
    // Already-processed imgs have their alt rewritten, so they
    // won't match again.
    var imgs = container.querySelectorAll("img[alt^='" + CFG.ALT_PREFIX + "']");
    if (!imgs.length) return;

    var groups = {};
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var m = (img.getAttribute("alt") || "").match(ALT_RE);
      if (!m) continue;
      var groupId = m[1], side = m[2], caption = m[3] || "";
      if (!groups[groupId]) groups[groupId] = {};
      // If duplicates exist, first one wins; warn the editor.
      if (groups[groupId][side]) {
        console.warn("[bf-compare] duplicate '" + side + "' image for group '" + groupId + "' — ignoring extra.");
        continue;
      }
      groups[groupId][side] = { img: img, caption: caption };
    }

    for (var id in groups) {
      if (!Object.prototype.hasOwnProperty.call(groups, id)) continue;
      var pair = groups[id];
      if (pair.before && pair.after) {
        buildSlider(container, id, pair.before, pair.after);
      } else {
        var missing = pair.before ? "after" : "before";
        console.warn("[bf-compare] group '" + id + "' is missing its '" + missing + "' image. Skipping.");
      }
    }
  }

  // ----------------------------------------------------------------
  // Find the top-level block for an image within the rich-text
  // container. This is typically Webflow's <figure> wrapper.
  // ----------------------------------------------------------------

  function topLevelBlock(img, richTextContainer) {
    var el = img;
    while (el.parentElement && el.parentElement !== richTextContainer) {
      el = el.parentElement;
    }
    return el;
  }

  // ----------------------------------------------------------------
  // Build the slider DOM and replace the original image blocks.
  // ----------------------------------------------------------------

  function buildSlider(container, groupId, before, after) {
    var beforeBlock = topLevelBlock(before.img, container);
    var afterBlock  = topLevelBlock(after.img,  container);

    var slider = document.createElement("div");
    slider.className = "bf-compare";
    slider.setAttribute("data-bf-compare-id", groupId);
    slider.setAttribute("role", "region");
    slider.setAttribute("aria-label", "Before and after image comparison");

    // Preserve Webflow alignment classes (w-richtext-align-fullwidth etc.)
    // and any inline styles like max-width from the original "before" block.
    if (beforeBlock.className && beforeBlock !== before.img) {
      slider.className += " " + beforeBlock.className;
    }
    if (beforeBlock.getAttribute && beforeBlock.getAttribute("style")) {
      slider.setAttribute("style", beforeBlock.getAttribute("style"));
    }

    var beforeImg = document.createElement("img");
    beforeImg.src = before.img.src;
    if (before.img.srcset) beforeImg.srcset = before.img.srcset;
    if (before.img.sizes)  beforeImg.sizes  = before.img.sizes;
    beforeImg.alt = before.caption;
    beforeImg.className = "bf-compare-before";
    beforeImg.draggable = false;
    beforeImg.setAttribute("loading", before.img.getAttribute("loading") || "lazy");

    var afterImg = document.createElement("img");
    afterImg.src = after.img.src;
    if (after.img.srcset) afterImg.srcset = after.img.srcset;
    if (after.img.sizes)  afterImg.sizes  = after.img.sizes;
    afterImg.alt = after.caption;
    afterImg.className = "bf-compare-after";
    afterImg.draggable = false;
    afterImg.setAttribute("loading", after.img.getAttribute("loading") || "lazy");

    var divider = document.createElement("div");
    divider.className = "bf-compare-divider";
    divider.setAttribute("role", "slider");
    divider.setAttribute("tabindex", "0");
    divider.setAttribute("aria-label", "Before and after comparison slider");
    divider.setAttribute("aria-orientation", "horizontal");
    divider.setAttribute("aria-valuemin", "0");
    divider.setAttribute("aria-valuemax", "100");
    divider.setAttribute("aria-valuenow", String(CFG.START_POS));

    var handle = document.createElement("div");
    handle.className = "bf-compare-handle";
    divider.appendChild(handle);

    slider.appendChild(beforeImg);
    slider.appendChild(afterImg);
    slider.appendChild(divider);

    // Swap into place.
    beforeBlock.parentNode.replaceChild(slider, beforeBlock);
    // If "before" and "after" somehow shared a block, afterBlock
    // may already be gone — guard accordingly.
    if (afterBlock !== beforeBlock && afterBlock.parentNode) {
      afterBlock.parentNode.removeChild(afterBlock);
    }

    attachHandlers(slider, afterImg, divider);
  }

  // ----------------------------------------------------------------
  // Pointer + keyboard interaction.
  // Pointer events cover mouse, touch, and pen with one API.
  // ----------------------------------------------------------------

  function attachHandlers(slider, afterImg, divider) {
    var position = CFG.START_POS;
    var dragging = false;
    var activePointerId = null;

    function setPosition(pct) {
      if (pct < 0)   pct = 0;
      if (pct > 100) pct = 100;
      position = pct;
      afterImg.style.clipPath = "inset(0 0 0 " + pct + "%)";
      divider.style.left = pct + "%";
      divider.setAttribute("aria-valuenow", String(Math.round(pct)));
    }

    function pctFromClientX(clientX) {
      var rect = slider.getBoundingClientRect();
      if (rect.width === 0) return position;
      return ((clientX - rect.left) / rect.width) * 100;
    }

    slider.addEventListener("pointerdown", function (e) {
      dragging = true;
      activePointerId = e.pointerId;
      try { slider.setPointerCapture(e.pointerId); } catch (_) {}
      setPosition(pctFromClientX(e.clientX));
      // Focus the divider so keyboard users can continue from here.
      divider.focus({ preventScroll: true });
      e.preventDefault();
    });

    slider.addEventListener("pointermove", function (e) {
      if (!dragging || e.pointerId !== activePointerId) return;
      setPosition(pctFromClientX(e.clientX));
      e.preventDefault();
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { slider.releasePointerCapture(activePointerId); } catch (_) {}
      activePointerId = null;
    }
    slider.addEventListener("pointerup",     endDrag);
    slider.addEventListener("pointercancel", endDrag);
    slider.addEventListener("lostpointercapture", endDrag);

    divider.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? CFG.KEY_STEP_BIG : CFG.KEY_STEP;
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          setPosition(position - step); e.preventDefault(); break;
        case "ArrowRight":
        case "ArrowUp":
          setPosition(position + step); e.preventDefault(); break;
        case "Home":
          setPosition(0);   e.preventDefault(); break;
        case "End":
          setPosition(100); e.preventDefault(); break;
        case "PageDown":
          setPosition(position - CFG.KEY_STEP_BIG); e.preventDefault(); break;
        case "PageUp":
          setPosition(position + CFG.KEY_STEP_BIG); e.preventDefault(); break;
      }
    });

    // Initialize at the configured starting position.
    setPosition(CFG.START_POS);
  }

  // ----------------------------------------------------------------
  // Boot.
  // ----------------------------------------------------------------

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

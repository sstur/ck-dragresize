/**
 * CKEditor plugin: Dragable image resizing
 * - Shows semi-transparent overlay while resizing
 * - Enforces Aspect Ratio (unless holding shift)
 * - Snap to size of other images in editor
 * - Escape while dragging cancels resize
 *
 */
(function() {
  "use strict";

  var PLUGIN_NAME = 'dragresize';

  var IMAGE_SNAP_TO_SIZE = 7;

  /**
   * Initializes the plugin
   */
  CKEDITOR.plugins.add(PLUGIN_NAME, {
    onLoad: function() {
      // This plugin only applies to Webkit and Opera
      if (!CKEDITOR.env.webkit && !CKEDITOR.env.opera) {
        return;
      }

      // CSS is added in a compressed form
      CKEDITOR.addCss('img::selection{color:rgba(0,0,0,0)}img.cke-resize{outline:1px dashed #000}#ckimgrsz{position:absolute;width:0;height:0;cursor:default;z-index:10001}#ckimgrsz .preview{position:absolute;top:0;left:0;width:0;height:0;background-size:100% 100%;opacity:.65;outline:1px dashed #000}#ckimgrsz span{position:absolute;width:5px;height:5px;background:#fff;border:1px solid #000}#ckimgrsz span:hover,#ckimgrsz span.active{background:#000}#ckimgrsz span.tl,#ckimgrsz span.br{cursor:nwse-resize}#ckimgrsz span.tm,#ckimgrsz span.bm{cursor:ns-resize}#ckimgrsz span.tr,#ckimgrsz span.bl{cursor:nesw-resize}#ckimgrsz span.lm,#ckimgrsz span.rm{cursor:ew-resize}body.dragging-tl,body.dragging-tl *,body.dragging-br,body.dragging-br *{cursor:nwse-resize!important}body.dragging-tm,body.dragging-tm *,body.dragging-bm,body.dragging-bm *{cursor:ns-resize!important}body.dragging-tr,body.dragging-tr *,body.dragging-bl,body.dragging-bl *{cursor:nesw-resize!important}body.dragging-lm,body.dragging-lm *,body.dragging-rm,body.dragging-rm *{cursor:ew-resize!important}');
    },
    init: function(editor) {
      // This plugin only applies to Webkit and Opera
      if (!CKEDITOR.env.webkit && !CKEDITOR.env.opera) {
        return;
      }
      //onDomReady handler
      editor.on('contentDom', function(evt) {
        init(editor);
      });
    }
  });

  function init(editor) {
    var window = editor.window.$, document = editor.document.$, body = document.body;
    var snapToSize = (typeof IMAGE_SNAP_TO_SIZE == 'undefined') ? null : IMAGE_SNAP_TO_SIZE;

    // This will represent the singleton instance of Resizer. There should
    //  be at most one instance per editor content dom
    var resizer;

    function DragDetails(e) {
      this.target = e.target;
      this.attr = e.target.className;
      this.startPos = {x: e.screenX, y: e.screenY};
      this.update(e);
    }

    DragDetails.prototype = {
      update: function(e) {
        //this.currentPos = {x: e.screenX, y: e.screenY};
        this.delta = {x: e.screenX - this.startPos.x, y: e.screenY - this.startPos.y};
        this.keys = {shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey};
      }
    };

    function Resizer() {
      this.init();
    }

    Resizer.prototype = {
      init: function() {
        var container = this.container = document.createElement('div');
        container.id = 'ckimgrsz';
        var preview = this.preview = document.createElement('div');
        preview.className = 'preview';
        container.appendChild(preview);
        var handles = this.handles = {
          tl: this.createSpan('tl'),
          tm: this.createSpan('tm'),
          tr: this.createSpan('tr'),
          lm: this.createSpan('lm'),
          rm: this.createSpan('rm'),
          bl: this.createSpan('bl'),
          bm: this.createSpan('bm'),
          br: this.createSpan('br')
        };
        forEach(handles, function(n, handle) {
          container.appendChild(handle);
        });
        //create a transparent image for drag icon
        var img = document.createElement('img');
        img.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==');
        this.dragIcon = img;
      },
      createSpan: function(className) {
        var el = document.createElement('span');
        el.className = className;
        return el;
      },
      show: function(element) {
        if (this.isShown) {
          //avoid showing without hiding first
          this.hide();
        }
        this.el = element;
        var box = this.originalBox = getBoundingBox(window, element);
        positionElement(this.container, box.left, box.top);
        body.appendChild(this.container);
        this.showHandles();
        this.isShown = true;
      },
      hide: function() {
        if (this.isShown) {
          this.hideHandles();
          this.container.parentNode.removeChild(this.container);
          this.isShown = false;
        }
      },
      makeDraggable: function(elements) {
        var resizer = this;
        var details;
        var events = {
          dragstart: function(e) {
            e.dataTransfer.setDragImage(resizer.dragIcon, 0, 0);
            details = new DragDetails(e);
            addClass(body, 'dragging-' + details.attr);
            resizer.showPreview();
            editor.getSelection().lock();
            resizer.calculateOtherImageSizes();
          },
          drag: function(e) {
            details.update(e);
            resizer.calculateBox(details);
            resizer.updatePreview();
            var box = resizer.calculatedBox;
            resizer.updateHandles(box, box.left, box.top);
          },
          dragend: function(e) {
            removeClass(body, 'dragging-' + details.attr);
            resizer.hidePreview();
            resizer.hide();
            editor.getSelection().unlock();
            // Save an undo snapshot before the image is permanently changed
            editor.fire('saveSnapshot');
            resizer.resizeComplete();
            // Save another snapshot after the image is changed
            editor.fire('saveSnapshot');
          }
        };
        forEach(elements, function(n, el) {
          el.setAttribute('draggable', 'true');
          addEvents(el, events);
        });
        return events;
      },
      calculateOtherImageSizes: function() {
        if (snapToSize) return;
        var others = toArray(document.getElementsByTagName('img'));
        others.splice(others.indexOf(this.el), 1);
        for (var i = 0; i < others.length; i++) {
          others[i] = getBoundingBox(window, others[i]);
        }
        this.otherImageSizes = others;
      },
      updateHandles: function(box, left, top) {
        left = left || 0;
        top = top || 0;
        var handles = this.handles;
        positionElement(handles.tl, -3 + left, -3 + top);
        positionElement(handles.tm, Math.round(box.width / 2) - 3 + left, -3 + top);
        positionElement(handles.tr, box.width - 4 + left, -3 + top);
        positionElement(handles.lm, -3 + left, Math.round(box.height / 2) - 3 + top);
        positionElement(handles.rm, box.width - 4 + left, Math.round(box.height / 2) - 3 + top);
        positionElement(handles.bl, -3 + left, box.height - 4 + top);
        positionElement(handles.bm, Math.round(box.width / 2) - 3 + left, box.height - 4 + top);
        positionElement(handles.br, box.width - 4 + left, box.height - 4 + top);
      },
      showHandles: function() {
        var handles = this.handles;
        this.updateHandles(this.originalBox);
        forEach(handles, function(n, handle) {
          handle.style.display = 'block';
        });
        this.dragEvents = this.makeDraggable(handles);
        addClass(this.el, 'cke-resize');
      },
      hideHandles: function() {
        var handles = this.handles, events = this.dragEvents;
        forEach(handles, function(n, handle) {
          removeEvents(handle, events);
          handle.style.display = 'none';
        });
        removeClass(this.el, 'cke-resize');
      },
      showPreview: function() {
        this.preview.style.backgroundImage = 'url("' + this.el.src + '")';
        this.calculateBox();
        this.updatePreview();
        this.preview.style.display = 'block';
      },
      updatePreview: function() {
        var box = this.calculatedBox;
        positionElement(this.preview, box.left, box.top);
        resizeElement(this.preview, box.width, box.height);
      },
      hidePreview: function() {
        this.preview.style.display = 'none';
      },
      calculateBox: function(data) {
        var lastCalculated = this.calculatedBox;
        var original = this.originalBox;
        var calculated = this.calculatedBox = {top: 0, left: 0, width: original.width, height: original.height};
        if (!data) return;
        var attr = data.attr;
        if (~attr.indexOf('r')) {
          calculated.width = Math.max(32, original.width + data.delta.x);
        }
        if (~attr.indexOf('b')) {
          calculated.height = Math.max(32, original.height + data.delta.y);
        }
        if (~attr.indexOf('l')) {
          calculated.width = Math.max(32, original.width - data.delta.x);
        }
        if (~attr.indexOf('t')) {
          calculated.height = Math.max(32, original.height - data.delta.y);
        }
        //if dragging corner, enforce aspect ratio (unless shift key is being held)
        if (attr.indexOf('m') < 0 && !data.keys.shift) {
          var ratio = original.width / original.height;
          if (calculated.width / calculated.height > ratio) {
            calculated.height = Math.round(calculated.width / ratio);
          } else {
            calculated.width = Math.round(calculated.height * ratio);
          }
        }
        var others = this.otherImageSizes;
        if (others && others.length && snapToSize) {
          for (var i = 0; i < others.length; i++) {
            var other = others[i];
            if (Math.abs(calculated.width - other.width) <= snapToSize && Math.abs(calculated.height - other.height) <= snapToSize) {
              calculated.width = other.width;
              calculated.height = other.height;
              break;
            }
          }
        }
        //recalculate left or top position
        if (~attr.indexOf('l')) {
          calculated.left = original.width - calculated.width;
        }
        if (~attr.indexOf('t')) {
          calculated.top = original.height - calculated.height;
        }
        if (Math.abs(lastCalculated.width - calculated.width) > Math.min(lastCalculated.width, calculated.width)) {
          //we have jumped more than double in size; abort
          this.calculatedBox = lastCalculated;
        }
      },
      resizeComplete: function() {
        var result = this.calculatedBox || {};
        if (result.width > 0 && result.height > 0) {
          resizeElement(this.el, result.width, result.height);
        }
      }
    };

    function selectionChange() {
      var selection = editor.getSelection();
      // If an element is selected and that element is an IMG
      if (selection.getType() != CKEDITOR.SELECTION_NONE && selection.getStartElement().is('img')) {
        // And we're not right or middle clicking on the image
        if (!window.event || !window.event.button || window.event.button === 0) {
          resizer || (resizer = new Resizer());
          resizer.show(selection.getStartElement().$)
        }
      } else {
        resizer && resizer.hide();
      }
    }

    editor.on('selectionChange', selectionChange);

    editor.on('beforeUndoImage', function() {
      // Remove the handles before undo images are saved
      resizer && resizer.hide();
    });

    editor.on('afterUndoImage', function() {
      // Restore the handles after undo images are saved
      selectionChange();
    });

    editor.on('blur', function() {
      // Remove the handles when editor loses focus
      resizer && resizer.hide();
    });

    editor.on('beforeModeUnload', function self() {
      editor.removeListener('beforeModeUnload', self);
      resizer && resizer.hide();
    });

    // Update the selection when the browser window is resized
    var resizeTimeout;
    editor.window.on('resize', function() {
      // Cancel any resize waiting to happen
      clearTimeout(resizeTimeout);
      // Delay resize for 10ms
      resizeTimeout = setTimeout(selectionChange, 50);
    });
  }

  //helper functions
  function toArray(obj) {
    var len = obj.length, arr = new Array(len);
    for (var i = 0; i < len; i++) {
      arr[i] = obj[i];
    }
    return arr;
  }

  function forEach(obj, fn) {
    var i, len, keys;
    if (Array.isArray(obj)) {
      len = obj.length;
      for (i = 0; i < len; i++) fn(i, obj[i]);
    } else {
      keys = Object.keys(obj);
      len = keys.length;
      for (i = 0; i < len; i++) fn(keys[i], obj[keys[i]]);
    }
  }

  function addClass(el, cls) {
    var className = el.className;
    el.className = (className) ? className + ' ' + cls : cls;
  }

  function removeClass(el, cls) {
    var classNames = el.className.trim().split(/\s+/);
    var i = classNames.indexOf(cls);
    if (i >= 0) classNames.splice(i, 1);
    el.className = classNames.join(' ');
  }

  function addEvents(el, events) {
    forEach(events, function(n, event) {
      el.addEventListener(n, event, false);
    });
  }

  function removeEvents(el, events) {
    forEach(events, function(n, event) {
      el.removeEventListener(n, event, false);
    });
  }

  function positionElement(el, left, top) {
    el.style.left = String(left) + 'px';
    el.style.top = String(top) + 'px';
  }

  function resizeElement(el, width, height) {
    el.style.width = String(width) + 'px';
    el.style.height = String(height) + 'px';
  }

  function getBoundingBox(window, el) {
    var rect = el.getBoundingClientRect();
    return {
      left: rect.left + window.pageXOffset,
      top: rect.top + window.pageYOffset,
      width: rect.width,
      height: rect.height
    };
  }
})();

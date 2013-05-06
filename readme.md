#CKEditor plugin: Dragable image resizing

This plugin implements draggable image resizing, currently just for Webkit-based browsers (Chrome/Safari). The feature
already exists in Firefox and Internet Explorer (9 and below) as a built-in browser capability but not in Webkit. So
if you or your users are used to seeing the small drag-to-resize handles at the corner of images, but use Chrome or
Safari, install this plugin to get it back (with a few bonus features).

##Features:
 * Shows semi-transparent overlay while resizing
 * Enforces Aspect Ratio (unless holding shift)
 * Snap to size of other images in editor (optional)
 * Escape while dragging cancels resize
 * Undo and Redo support
 * Image dragging and Right-click still work

I have implemented this feature in pure JavaScript with no external dependencies. It only activates if a supported
browser is detected (Webkit, possibly Opera). It has been tested in most recent versions of Chrome and Safari on PC
and Mac.

##Browser Support
 * Chrome and Safari are currently supported
 * Firefox has this feature built-in, so this plugin does not activate in FF
 * Opera support is not yet fully tested
 * Support for Internet Explorer 10 coming soon

##Contributers:
  * [Simon Sturmer] (https://github.com/sstur)
  * [Nathan Haug] (https://github.com/quicksketch)

Please, if you notice any bugs, open an issue in the [issue tracker](ck-dragresize/issues).

This plugin is licensed under the MIT license. See [LICENSE](ck-dragresize/blob/master/LICENSE) for further details.

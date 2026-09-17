export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface Size {
    width: number;
    height: number;
}
export interface CropRegion {
    /** Source rectangle, in pixels of the captured image. */
    sx: number;
    sy: number;
    sWidth: number;
    sHeight: number;
    /** Output size, which is the source size — cropping never rescales. */
    width: number;
    height: number;
    /**
     * The element extended past the captured area and only part of it is here.
     * A screenshot host cannot fix this by cropping harder, so it reports it.
     */
    clipped: boolean;
}
/**
 * Work out which part of a viewport screenshot holds a given element.
 *
 * `chrome.tabs.captureVisibleTab` can only ever return the visible viewport, at
 * whatever pixel density the display uses — and that density is not always
 * `devicePixelRatio`, because the capture is capped on some platforms. Deriving
 * the scale from the returned image instead of assuming it keeps the crop
 * correct on a Retina display, on a 100% display and on a capped one alike.
 *
 * @param element  Element rectangle in CSS pixels, relative to the viewport.
 * @param image    Size of the captured screenshot, in image pixels.
 * @param scale    Image pixels per CSS pixel, i.e. `image.width / innerWidth`.
 */
export declare function cropRegion(element: Rect, image: Size, scale: number): CropRegion | null;
//# sourceMappingURL=crop.d.ts.map
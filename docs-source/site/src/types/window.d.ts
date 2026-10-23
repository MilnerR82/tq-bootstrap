export declare global {
  export const StackBlitzSDK: typeof import('@stackblitz/sdk').default

  /**
   * The `bootstrap` object is exposed to the global scope and also to the `window` object in the browser.
   * We rely on the DefinitelyTyped community types for this object to get proper type checking for part of the
   * documentation using the Bootstrap API and avoid any misuse of the API.
   * To temporarily or permanently disable this feature (e.g. when modifying the Bootstrap API used in the
   * documentation), the 2 lines containing `typeof import('bootstrap')` can be commented and replaced by the commented
   * lines containing `any`.
   *
   * The documentation is currently using the following APIs from Bootstrap:
   *
   *  - `bootstrap.Tooltip.getOrCreateInstance`
   *  - `bootstrap.Tooltip.getInstance`
   *
   */
  export const bootstrap: typeof import('bootstrap')
  // export const bootstrap: any

  interface Window {
    bootstrap: typeof import('bootstrap')
    TQAccessibility: {
      version: string
      init(root?: Document | Element, options?: { bootstrap?: typeof import('bootstrap') }): unknown
      dispose(root?: Document | Element): void
      createTooltip(element: Element, config?: object, options?: object): import('bootstrap').Tooltip
      createPopover(element: Element, config?: object, options?: object): import('bootstrap').Popover
      enhanceCarousel(element: Element, config?: object, options?: object): import('bootstrap').Carousel
      enhanceValidation(form: HTMLFormElement, options?: object): unknown
    }
    // bootstrap: any
  }
}

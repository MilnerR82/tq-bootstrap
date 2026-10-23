/*!
 * TQ Bootstrap accessibility companion, version 1.0.0.
 * MIT licensed. Bootstrap's original JavaScript is not modified.
 * Import its named exports, or load the compiled classic companion after
 * Bootstrap and call TQAccessibility.init().
 */
;(function (scope) {
  'use strict'

  if (scope.TQAccessibility) return
  const tooltipStates = new Map()
  const carouselStates = new Map()
  const validationStates = new Map()
  const tableStates = new Map()
  const documents = new Map()
  let sequence = 0
  const uid = (doc, prefix) => {
    let id
    do { id = `tq-${prefix}-${++sequence}` } while (doc.getElementById(id))
    return id
  }
  const tokens = value => (value || '').split(/\s+/).filter(Boolean)
  const owned = (element, attribute) => {
    try { return JSON.parse(element.getAttribute(attribute) || 'null') } catch { return null }
  }
  const restoreAttribute = (element, name, value) => value === null ? element.removeAttribute(name) : element.setAttribute(name, value)
  const within = (root, element) => root === element || Boolean(root.contains?.(element))
  const find = (root, selector) => [ ...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector) ]
  const language = doc => (doc.documentElement.lang || '').toLowerCase().startsWith('ar') ? {
    play: 'تشغيل الشرائح', pause: 'إيقاف الشرائح مؤقتًا', previous: 'الشريحة السابقة', next: 'الشريحة التالية', motion: 'تدوير الشرائح متوقف لتقليل الحركة',
    errors: count => `يرجى تصحيح الأخطاء التالية (${count}).`, field: 'حقل'
  } : {
    play: 'Play slides', pause: 'Pause slides', previous: 'Previous slide', next: 'Next slide', motion: 'Slide rotation off (reduced motion)',
    errors: count => `Please correct the following ${count === 1 ? 'error' : `${count} errors`}.`, field: 'Field'
  }
  const addDescription = (element, id) => element.setAttribute('aria-describedby', [...new Set([...tokens(element.getAttribute('aria-describedby')), id])].join(' '))
  const removeDescription = (element, id) => {
    const remaining = tokens(element.getAttribute('aria-describedby')).filter(token => token !== id)
    if (remaining.length) element.setAttribute('aria-describedby', remaining.join(' '))
    else element.removeAttribute('aria-describedby')
  }
  const nativeLibrary = options => options?.bootstrap || scope.bootstrap
  const ensureDocument = doc => {
    if (documents.has(doc)) return
    const escape = event => {
      if (event.key !== 'Escape') return
      const visible = [...tooltipStates.values()].filter(state => state.element.ownerDocument === doc && state.tip?.classList.contains('show'))
      if (!visible.length) return
      for (const state of visible) {
        state.dismissed = true
        state.clicked = false
        state.clearTimers()
        state.instance.hide()
      }
      event.preventDefault()
      event.stopPropagation()
    }
    doc.addEventListener('keydown', escape, true)
    documents.set(doc, () => doc.removeEventListener('keydown', escape, true))
  }
  const releaseDocument = doc => {
    if ([...tooltipStates.values()].some(state => state.element.ownerDocument === doc)) return
    documents.get(doc)?.()
    documents.delete(doc)
  }
  const dataConfig = (element, name, fallback) => {
    const direct = element.getAttribute(`data-bs-${name}`)
    let config = {}
    try { config = JSON.parse(element.getAttribute('data-bs-config') || '{}') || {} } catch { /* Bootstrap reports malformed configuration itself. */ }
    const value = direct ?? config[name] ?? fallback
    if (typeof value !== 'string') return value
    try { return JSON.parse(value) } catch { return value }
  }

  function createFloatingDescription(element, config, options, kind) {
    const existing = tooltipStates.get(element)
    if (existing) return existing.instance
    const bootstrap = nativeLibrary(options)
    const Component = bootstrap?.[kind === 'popover' ? 'Popover' : 'Tooltip']
    if (!Component) return null
    if (Component.getInstance(element)) {
      throw new Error(`Initialise the TQ ${kind} before another instance; dispose the previous instance first and pass its original configuration to the TQ factory.`)
    }
    const selector = config.selector ?? dataConfig(element, 'selector', false)
    if (selector) {
      const doc = element.ownerDocument
      const trigger = config.trigger ?? dataConfig(element, 'trigger', Component.Default.trigger)
      const delay = config.delay ?? dataConfig(element, 'delay', 0)
      const instance = new Component(element, { ...config, selector, trigger: 'manual', delay: 0 })
      const controller = new doc.defaultView.AbortController()
      const children = new Map()
      const originalDispose = instance.dispose
      const state = { element, instance, children }
      // Resolve inherited options exactly as the pinned native delegated API
      // does. Its manual parent creates no native hover/focus/click listeners.
      const initialise = event => {
        const child = event.target.closest?.(selector)
        if (!child || child === element || !element.contains(child)) return
        const previous = tooltipStates.get(child)
        const childInstance = createFloatingDescription(child, { ...instance._getDelegateConfig(), selector: false, trigger, delay }, options, kind)
        if (!previous) children.set(child, childInstance)
      }
      const triggers = tokens(trigger)
      for (const [type, enabled] of [['pointerover', triggers.includes('hover')], ['focusin', triggers.includes('focus')], ['click', triggers.includes('click')]]) {
        if (enabled) element.addEventListener(type, initialise, { capture: true, signal: controller.signal })
      }
      instance.dispose = function () {
        controller.abort()
        for (const [child, childInstance] of children) if (tooltipStates.get(child)?.instance === childInstance) childInstance.dispose()
        children.clear()
        tooltipStates.delete(element)
        releaseDocument(doc)
        return originalDispose.call(this)
      }
      tooltipStates.set(element, state)
      return instance
    }
    const doc = element.ownerDocument
    const sourceAttribute = `data-tq-${kind}-source`
    const exportedState = owned(element, sourceAttribute)
    if (exportedState) {
      restoreAttribute(element, 'aria-describedby', exportedState.describedby)
      restoreAttribute(element, 'tabindex', exportedState.tabindex)
    }
    element.setAttribute(sourceAttribute, JSON.stringify({ describedby: element.getAttribute('aria-describedby'), tabindex: element.getAttribute('tabindex') }))
    ensureDocument(doc)
    const trigger = tokens(config.trigger ?? dataConfig(element, 'trigger', Component.Default.trigger))
    const delayValue = config.delay ?? dataConfig(element, 'delay', 0)
    const delay = typeof delayValue === 'number' ? { show: delayValue, hide: delayValue } : delayValue || {}
    const instance = new Component(element, { ...config, trigger: 'manual', delay: 0 })
    let disposed = false
    const originalQueueCallback = instance._queueCallback
    // Native transition timeouts can finish after public dispose() has nulled
    // its element/config. Leave active native callbacks intact, but do not run
    // a disposed instance's completion against a newly initialised child.
    instance._queueCallback = function (callback, ...args) {
      return originalQueueCallback.call(this, () => { if (!disposed) callback() }, ...args)
    }
    const originalShow = instance.show
    // Bootstrap 5.3.8 leaves this manual-trigger bookkeeping flag false after
    // shown. A later public setContent()/show() would then schedule _leave().
    // Reset that pinned per-instance flag before delegating; native prototypes,
    // content rendering, cancellable events and all public APIs stay intact.
    instance.show = function () {
      if (Object.prototype.hasOwnProperty.call(this, '_isHovered')) this._isHovered = null
      return originalShow.call(this)
    }
    const controller = new doc.defaultView.AbortController()
    const state = { element, instance, tip: null, hovered: false, focused: false, tipHovered: false, clicked: false, dismissed: false, showTimer: 0, hideTimer: 0, tipController: null }
    const originalDispose = instance.dispose
    const originalTabindex = element.getAttribute('tabindex')
    let addedTabindex = false
    let descriptions = tokens(element.getAttribute('aria-describedby'))
    const on = (target, type, handler, signal = controller.signal) => target.addEventListener(type, handler, { signal })
    const held = () => state.hovered || state.focused || state.tipHovered || state.clicked
    state.clearTimers = () => {
      scope.clearTimeout(state.showTimer)
      scope.clearTimeout(state.hideTimer)
    }
    const restoreDescriptions = () => {
      const current = tokens(element.getAttribute('aria-describedby')).filter(id => id !== state.tip?.id)
      const all = [...new Set([...descriptions, ...current])]
      if (all.length) element.setAttribute('aria-describedby', all.join(' '))
      else element.removeAttribute('aria-describedby')
    }
    const open = () => {
      state.clearTimers()
      if (state.dismissed) return
      state.showTimer = scope.setTimeout(() => {
        if (held() && !state.dismissed && element.isConnected && !state.tip?.classList.contains('show')) instance.show()
      }, Math.max(0, Number(delay.show) || 0))
    }
    const close = () => {
      scope.clearTimeout(state.showTimer)
      scope.clearTimeout(state.hideTimer)
      // The small native Popper offset must be crossable without hiding the text.
      state.hideTimer = scope.setTimeout(() => {
        if (held()) return
        instance.hide()
        state.dismissed = false
      }, Math.max(250, Number(delay.hide) || 0))
    }
    if (trigger.includes('hover')) {
      on(element, 'pointerenter', () => { state.hovered = true; open() })
      on(element, 'pointerleave', () => { state.hovered = false; close() })
    }
    if (trigger.includes('focus')) {
      if (!element.matches('a[href],area[href],button,input,select,textarea,iframe,[tabindex],[contenteditable="true"]') && !element.closest('[inert],[aria-hidden="true"]')) {
        element.setAttribute('tabindex', '0')
        addedTabindex = true
      }
      on(element, 'focusin', () => { state.focused = true; open() })
      on(element, 'focusout', event => { state.focused = element.contains(event.relatedTarget); close() })
    }
    if (trigger.includes('click')) on(element, 'click', () => {
      state.clicked = !state.clicked
      state.dismissed = false
      if (held()) open()
      else { state.clearTimers(); instance.hide() }
    })
    on(element, `show.bs.${kind}`, () => {
      descriptions = tokens(element.getAttribute('aria-describedby')).filter(id => id !== state.tip?.id)
    })
    on(element, `inserted.bs.${kind}`, () => {
      state.tipController?.abort()
      state.tipHovered = false
      state.tipController = new doc.defaultView.AbortController()
      state.tip = tokens(element.getAttribute('aria-describedby')).map(id => doc.getElementById(id)).find(node => node?.matches(`.${kind}`))
      if (!state.tip) return
      for (const id of descriptions) addDescription(element, id)
      const tip = state.tip
      on(tip, 'pointerenter', () => { state.tipHovered = true; state.clearTimers() }, state.tipController.signal)
      on(tip, 'pointerleave', () => { state.tipHovered = false; close() }, state.tipController.signal)
      // Tooltip content is descriptive. Interactive help must use a named dialog or link.
      if (tip.querySelector('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]')) {
        state.dismissed = true
        scope.queueMicrotask(() => {
          if (tooltipStates.get(element) === state) instance.hide()
        })
        element.dispatchEvent(new doc.defaultView.CustomEvent(`interactive.tq.${kind}`, { bubbles: true, detail: { message: 'Use a link, button or managed dialog for interactive help content.' } }))
      }
    })
    on(element, `shown.bs.${kind}`, () => {
      // setContent() may replace the tip during an earlier show transition.
      // Every native completion must retain manual-trigger bookkeeping, even
      // when callbacks from both transitions complete in the same frame.
      if (Object.prototype.hasOwnProperty.call(instance, '_isHovered')) instance._isHovered = null
    })
    on(element, `hidden.bs.${kind}`, () => {
      restoreDescriptions()
      state.tipController?.abort()
      state.tipHovered = false
      state.clicked = false
      if (!state.hovered && !state.focused) state.dismissed = false
      state.tip = null
    })
    instance.dispose = function () {
      if (disposed) return
      disposed = true
      state.clearTimers()
      controller.abort()
      state.tipController?.abort()
      restoreDescriptions()
      if (addedTabindex && element.getAttribute('tabindex') === '0') {
        if (originalTabindex === null) element.removeAttribute('tabindex')
        else element.setAttribute('tabindex', originalTabindex)
      }
      tooltipStates.delete(element)
      element.removeAttribute(sourceAttribute)
      releaseDocument(doc)
      const result = originalDispose.call(this)
      restoreDescriptions()
      return result
    }
    tooltipStates.set(element, state)
    return instance
  }

  function createTooltip(element, config = {}, options = {}) {
    return createFloatingDescription(element, config, options, 'tooltip')
  }

  function createPopover(element, config = {}, options = {}) {
    const bootstrap = nativeLibrary(options)
    if (!bootstrap?.Popover) return null
    const triggers = tokens(config.trigger ?? dataConfig(element, 'trigger', bootstrap.Popover.Default.trigger))
    // Click-only popovers retain their complete native implementation. Only
    // hover/focus descriptions need this WCAG 1.4.13 persistence/dismissal layer.
    if (!triggers.some(trigger => trigger === 'hover' || trigger === 'focus')) return bootstrap.Popover.getOrCreateInstance(element, config)
    return createFloatingDescription(element, config, options, 'popover')
  }

  function enhanceCarousel(element, config = {}, options = {}) {
    const existing = carouselStates.get(element)
    if (existing) return existing.instance
    const bootstrap = nativeLibrary(options)
    if (!bootstrap?.Carousel) return null
    if (bootstrap.Carousel.getInstance(element)) {
      throw new Error('Initialise the TQ carousel before another Carousel instance; dispose the previous instance first. Pass the original configuration to enhanceCarousel().')
    }
    const doc = element.ownerDocument
    const controller = new doc.defaultView.AbortController()
    const motion = doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)')
    const strings = { ...language(doc), ...options.strings }
    const exportedState = owned(element, 'data-tq-carousel-source')
    const originalId = exportedState ? exportedState.id : element.getAttribute('id')
    const originalLive = exportedState ? exportedState.live : element.getAttribute('aria-live')
    // A copied live example may already contain the companion control. Rebuild it once.
    for (const control of doc.querySelectorAll('[data-tq-carousel-controls]')) {
      if (control.getAttribute('data-tq-carousel-controls') === element.id) control.remove()
    }
    element.setAttribute('data-tq-carousel-source', JSON.stringify({ id: originalId, live: originalLive }))
    if (!element.id) element.id = uid(doc, 'carousel')
    const id = element.id
    const controls = doc.createElement('div')
    controls.className = 'd-flex flex-wrap gap-2 my-2'
    controls.setAttribute('data-tq-carousel-controls', id)
    const button = doc.createElement('button')
    button.type = 'button'
    button.className = 'btn btn-secondary btn-sm'
    button.setAttribute('aria-controls', id)
    button.setAttribute('data-tq-carousel-rotation', '')
    controls.append(button)
    element.after(controls)
    // Keeping ride false also prevents native mouseleave/data controls from restarting rotation.
    // Original data-bs-* markup is retained; previous/next, touch, methods and events stay native.
    const instance = new bootstrap.Carousel(element, { ...config, ride: false })
    const originalCycle = instance.cycle
    const originalPause = instance.pause
    const originalDispose = instance.dispose
    const state = { element, instance, rotating: false, button, controls }
    const hasNativeControls = [...doc.querySelectorAll('[data-bs-slide],[data-bs-slide-to]')].some(control => {
      const target = control.getAttribute('data-bs-target') || control.getAttribute('href') || ''
      return control.closest('.carousel') === element || target.slice(target.lastIndexOf('#')) === `#${id}`
    })
    // Slides-only variants must stay navigable when optional rotation is paused
    // or disabled by reduced motion. Existing native controls are preserved.
    if (!hasNativeControls) for (const direction of ['prev', 'next']) {
      const step = doc.createElement('button')
      step.type = 'button'
      step.className = 'btn btn-secondary btn-sm'
      step.textContent = direction === 'prev' ? strings.previous : strings.next
      step.setAttribute('aria-controls', id)
      step.setAttribute('data-tq-carousel-step', direction)
      step.addEventListener('click', () => { instance.pause(); instance[direction]() }, { signal: controller.signal })
      if (direction === 'prev') controls.prepend(step)
      else controls.append(step)
    }
    const render = () => {
      button.disabled = motion.matches
      button.textContent = motion.matches ? strings.motion : state.rotating ? strings.pause : strings.play
      element.setAttribute('aria-live', state.rotating ? 'off' : 'polite')
    }
    instance.cycle = function () {
      if (motion.matches || element.contains(doc.activeElement) || doc.hidden) {
        state.rotating = false
        originalPause.call(this)
        render()
        return
      }
      state.rotating = true
      render()
      return originalCycle.call(this)
    }
    instance.pause = function () {
      state.rotating = false
      render()
      return originalPause.call(this)
    }
    button.addEventListener('click', () => state.rotating ? instance.pause() : instance.cycle(), { signal: controller.signal })
    element.addEventListener('focusin', () => instance.pause(), { signal: controller.signal })
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) instance.pause() }, { signal: controller.signal })
    const onMotionChange = () => { if (motion.matches) instance.pause(); render() }
    motion.addEventListener('change', onMotionChange)
    instance.dispose = function () {
      originalPause.call(this)
      controller.abort()
      motion.removeEventListener('change', onMotionChange)
      controls.remove()
      if (originalLive === null) element.removeAttribute('aria-live')
      else element.setAttribute('aria-live', originalLive)
      if (originalId === null && element.id === id) element.removeAttribute('id')
      element.removeAttribute('data-tq-carousel-source')
      carouselStates.delete(element)
      return originalDispose.call(this)
    }
    carouselStates.set(element, state)
    instance.pause()
    return instance
  }

  function enhanceOverflowTable(element) {
    if (tableStates.has(element)) { const state=tableStates.get(element);state.update();return state }
    const doc=element.ownerDocument, view=doc.defaultView, marker='data-tq-overflow-table-source'
    const attributes=['tabindex','role','aria-label','aria-labelledby']
    const exported=owned(element,marker)
    if(exported?.original&&exported?.assigned)for(const attribute of attributes){
      if(Object.prototype.hasOwnProperty.call(exported.assigned,attribute)&&element.getAttribute(attribute)===exported.assigned[attribute])restoreAttribute(element,attribute,exported.original[attribute]??null)
    }
    const original=Object.fromEntries(attributes.map(attribute=>[attribute,element.getAttribute(attribute)])),assigned={}
    const controller=new view.AbortController(),observed=new Set()
    let disposed=false,resizeObserver,mutationObserver
    const save=()=>element.setAttribute(marker,JSON.stringify({original,assigned}))
    const clear=()=>{
      for(const [attribute,value]of Object.entries(assigned)){
        if(element.getAttribute(attribute)===value)restoreAttribute(element,attribute,original[attribute])
        delete assigned[attribute]
      }
    }
    const assign=(attribute,value)=>{
      const current=element.getAttribute(attribute)
      if(Object.prototype.hasOwnProperty.call(assigned,attribute)&&current!==assigned[attribute]){original[attribute]=current;delete assigned[attribute]}
      if(original[attribute]!==null||(!Object.prototype.hasOwnProperty.call(assigned,attribute)&&current!==null))return
      element.setAttribute(attribute,value);assigned[attribute]=value
    }
    const text=node=>(node?.textContent||'').trim().replace(/\s+/g,' ')
    const name=()=>{
      const table=element.querySelector('table')
      let context=text(table?.querySelector('caption'))||table?.getAttribute('aria-label')||tokens(table?.getAttribute('aria-labelledby')).map(id=>text(doc.getElementById(id))).join(' ')
      if(!context){
        const scope=element.closest('main,article,[role="main"]')||doc.body
        context=text([...scope.querySelectorAll('h1,h2,h3,h4,h5,h6')].reverse().find(heading=>Boolean(element.compareDocumentPosition(heading)&view.Node.DOCUMENT_POSITION_PRECEDING)))
      }
      const prefix=(doc.documentElement.lang||'').toLowerCase().startsWith('ar')?'جدول قابل للتمرير':'Scrollable table'
      return context?`${prefix}: ${context.slice(0,200)}`:prefix
    }
    const update=()=>{
      if(disposed)return
      if(resizeObserver){
        const tables=new Set(element.querySelectorAll('table'))
        for(const table of observed)if(!tables.has(table)){resizeObserver.unobserve(table);observed.delete(table)}
        for(const table of tables)if(!observed.has(table)){resizeObserver.observe(table);observed.add(table)}
      }
      const overflow=element.clientWidth>0&&element.scrollWidth>element.clientWidth+1&&['auto','scroll'].includes(view.getComputedStyle(element).overflowX)
      if(overflow){
        assign('tabindex','0');assign('role','region')
        if(!element.hasAttribute('aria-labelledby')&&(!element.hasAttribute('aria-label')||Object.prototype.hasOwnProperty.call(assigned,'aria-label')))assign('aria-label',name())
      }else clear()
      save()
    }
    if(view.ResizeObserver){resizeObserver=new view.ResizeObserver(update);resizeObserver.observe(element)}
    if(view.MutationObserver){
      mutationObserver=new view.MutationObserver(update)
      mutationObserver.observe(element,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','style','hidden']})
      mutationObserver.observe(doc.documentElement,{attributes:true,attributeFilter:['class','style','lang','dir']})
      if(doc.body)mutationObserver.observe(doc.body,{attributes:true,attributeFilter:['class','style']})
      if(doc.head)mutationObserver.observe(doc.head,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['href','media','disabled']})
    }
    view.addEventListener('resize',update,{signal:controller.signal})
    // CSSOM changes need not resize a fixed-layout table or create a DOM mutation.
    // Refresh before the browser computes the next native sequential focus target.
    doc.addEventListener('keydown',event=>{if(event.key==='Tab')update()},{capture:true,signal:controller.signal})
    doc.fonts?.addEventListener?.('loadingdone',update,{signal:controller.signal})
    doc.fonts?.ready?.then(()=>{if(!disposed)update()})
    const state={element,update,dispose(){if(disposed)return;disposed=true;controller.abort();resizeObserver?.disconnect();mutationObserver?.disconnect();clear();element.removeAttribute(marker);tableStates.delete(element)}}
    tableStates.set(element,state)
    update()
    return state
  }

  function enhanceValidation(form, options = {}) {
    if (validationStates.has(form)) return validationStates.get(form).api
    const doc = form.ownerDocument
    const controller = new doc.defaultView.AbortController()
    const strings = { ...language(doc), ...options.strings }
    const exportedState = owned(form, 'data-tq-validation-source')
    const noValidate = exportedState ? exportedState.noValidate : form.noValidate
    const hadValidated = exportedState ? exportedState.validated : form.classList.contains('was-validated')
    // Exporting a live demo must not export generated summaries or transient errors twice.
    // Original author/server ARIA, IDs and validation classes remain intact.
    for (const oldSummary of form.querySelectorAll('[data-tq-validation-summary]')) oldSummary.remove()
    for (const field of form.querySelectorAll('[data-tq-validation-field]')) {
      const previous = owned(field, 'data-tq-validation-field')
      if (!previous) continue
      restoreAttribute(field, 'aria-invalid', previous.invalid)
      if (!tokens(previous.describedby).includes(previous.feedback)) removeDescription(field, previous.feedback)
      for (const id of tokens(previous.describedby)) addDescription(field, id)
      restoreAttribute(field, 'id', previous.id)
      field.removeAttribute('data-tq-validation-field')
    }
    for (const feedback of form.querySelectorAll('[data-tq-validation-feedback]')) {
      const previous = owned(feedback, 'data-tq-validation-feedback')
      if (!previous) continue
      if (previous.generated) { feedback.remove(); continue }
      restoreAttribute(feedback, 'id', previous.id)
      feedback.classList.toggle('d-block', previous.block)
      feedback.classList.toggle('invalid-tooltip', previous.tooltip)
      feedback.classList.toggle('invalid-feedback', previous.feedback)
      feedback.removeAttribute('data-tq-validation-feedback')
    }
    form.classList.toggle('was-validated', hadValidated)
    form.setAttribute('data-tq-validation-source', JSON.stringify({ noValidate, validated: hadValidated }))
    const fields = new Map()
    const summary = doc.createElement('div')
    summary.className = 'alert alert-danger'
    summary.hidden = true
    summary.tabIndex = -1
    summary.setAttribute('role', 'region')
    summary.setAttribute('aria-live', 'polite')
    summary.setAttribute('aria-atomic', 'true')
    summary.setAttribute('data-tq-validation-summary', '')
    const heading = doc.createElement('h2')
    heading.className = 'h5'
    heading.id = uid(doc, 'errors')
    summary.setAttribute('aria-labelledby', heading.id)
    const list = doc.createElement('ul')
    list.className = 'mb-0'
    summary.append(heading, list)
    form.prepend(summary)
    form.noValidate = true
    let attempted = false
    const eligible = () => [...form.elements].filter(field => field.matches?.('input,select,textarea') && field.willValidate)
    const fieldRecord = field => {
      if (fields.has(field)) return fields.get(field)
      const record = { field, invalid: field.getAttribute('aria-invalid'), originalId: field.getAttribute('id'), describedby: field.getAttribute('aria-describedby'), feedback: null, generated: false, addedId: false, descriptionAdded: false, hadBlock: false, tooltip: false, hadFeedback: false }
      if (!field.id) field.id = uid(doc, 'field')
      // A feedback message belongs to the nearest field wrapper, never an unrelated form error.
      let wrapper = field.parentElement
      while (wrapper && wrapper !== form) {
        const candidates = [...wrapper.querySelectorAll('.invalid-feedback,.invalid-tooltip')].filter(node => node.closest('form') === form)
        const controls = [...wrapper.querySelectorAll('input,select,textarea')].filter(node => node.willValidate)
        if (candidates.length && (controls.length === 1 || controls.every(node => node.type === 'radio' && node.name === field.name))) {
          record.feedback = candidates[0]
          break
        }
        wrapper = wrapper.parentElement
      }
      if (!record.feedback) {
        record.feedback = doc.createElement('div')
        record.feedback.className = 'invalid-feedback'
        record.generated = true
        field.after(record.feedback)
      }
      const feedbackSource = owned(record.feedback, 'data-tq-validation-feedback')
      record.hadBlock = feedbackSource ? feedbackSource.block : record.feedback.classList.contains('d-block')
      record.tooltip = feedbackSource ? feedbackSource.tooltip : record.feedback.classList.contains('invalid-tooltip')
      record.hadFeedback = feedbackSource ? feedbackSource.feedback : record.feedback.classList.contains('invalid-feedback')
      if (feedbackSource?.generated) record.generated = true
      if (!record.feedback.hasAttribute('data-tq-validation-feedback')) record.feedback.setAttribute('data-tq-validation-feedback', JSON.stringify({ generated: record.generated, id: record.feedback.getAttribute('id'), block: record.hadBlock, tooltip: record.tooltip, feedback: record.hadFeedback }))
      if (record.tooltip) {
        record.feedback.classList.remove('invalid-tooltip')
        record.feedback.classList.add('invalid-feedback')
      }
      if (!record.feedback.id) {
        record.feedback.id = uid(doc, 'feedback')
        record.addedId = true
      }
      field.setAttribute('data-tq-validation-field', JSON.stringify({ id: record.originalId, invalid: record.invalid, describedby: record.describedby, feedback: record.feedback.id }))
      fields.set(field, record)
      return record
    }
    const clearField = record => {
      if (record.descriptionAdded) removeDescription(record.field, record.feedback.id)
      record.descriptionAdded = false
      if (record.invalid === null) record.field.removeAttribute('aria-invalid')
      else record.field.setAttribute('aria-invalid', record.invalid)
      if (!record.hadBlock) record.feedback.classList.remove('d-block')
    }
    const label = field => (field.labels?.[0]?.textContent || field.getAttribute('aria-label') || field.name || strings.field).trim().replace(/\s+/g, ' ')
    const update = (focus = false) => {
      const errors = []
      for (const field of eligible()) {
        const record = fieldRecord(field)
        if (field.validity.valid) { clearField(record); continue }
        if (record.generated) record.feedback.textContent = field.validationMessage
        field.setAttribute('aria-invalid', 'true')
        if (!tokens(field.getAttribute('aria-describedby')).includes(record.feedback.id)) {
          addDescription(field, record.feedback.id)
          record.descriptionAdded = true
        }
        record.feedback.classList.add('d-block')
        errors.push(record)
      }
      list.replaceChildren()
      for (const { field, feedback } of errors) {
        const item = doc.createElement('li')
        const link = doc.createElement('a')
        link.href = `#${encodeURIComponent(field.id)}`
        link.textContent = `${label(field)}: ${feedback.textContent.trim()}`
        link.addEventListener('click', event => { event.preventDefault(); field.focus(); field.scrollIntoView({ block: 'nearest', behavior: 'instant' }) })
        item.append(link)
        list.append(item)
      }
      heading.textContent = errors.length ? strings.errors(errors.length) : ''
      summary.hidden = errors.length === 0
      if (focus && errors.length) summary.focus()
      return errors.length === 0
    }
    const submit = event => {
      attempted = true
      form.classList.add('was-validated')
      if (!update(true)) { event.preventDefault(); event.stopPropagation() }
    }
    const change = () => { if (attempted) update() }
    const reset = () => {
      attempted = false
      if (!hadValidated) form.classList.remove('was-validated')
      for (const record of fields.values()) clearField(record)
      summary.hidden = true
      list.replaceChildren()
      heading.textContent = ''
    }
    form.addEventListener('submit', submit, { signal: controller.signal })
    form.addEventListener('input', change, { signal: controller.signal })
    form.addEventListener('change', change, { signal: controller.signal })
    form.addEventListener('reset', reset, { signal: controller.signal })
    const api = {
      validate: () => { attempted = true; form.classList.add('was-validated'); return update(true) },
      reset,
      dispose: () => {
        controller.abort()
        reset()
        form.noValidate = noValidate
        form.removeAttribute('data-tq-validation-source')
        summary.remove()
        for (const record of fields.values()) {
          if (record.generated) record.feedback.remove()
          else {
            if (record.addedId) record.feedback.removeAttribute('id')
            record.feedback.classList.toggle('invalid-feedback', record.hadFeedback)
            record.feedback.classList.toggle('invalid-tooltip', record.tooltip)
            record.feedback.removeAttribute('data-tq-validation-feedback')
          }
          if (record.originalId === null) record.field.removeAttribute('id')
          record.field.removeAttribute('data-tq-validation-field')
        }
        validationStates.delete(form)
      }
    }
    validationStates.set(form, { element: form, api })
    return api
  }

  function init(root = scope.document, options = {}) {
    if (!root?.querySelectorAll) return
    const bootstrap = nativeLibrary(options)
    if (bootstrap?.Tooltip) for (const element of find(root, '[data-bs-toggle="tooltip"]')) createTooltip(element, {}, options)
    if (bootstrap?.Popover) for (const element of find(root, '[data-bs-toggle="popover"]')) createPopover(element, {}, options)
    if (bootstrap?.Carousel) for (const element of find(root, '.carousel')) enhanceCarousel(element, {}, options)
    for(const element of find(root,'[class*="table-responsive"]'))if([...element.classList].some(name=>/^table-responsive(?:-(sm|md|lg|xl|xxl))?$/.test(name)))enhanceOverflowTable(element)
    for (const form of find(root, 'form.needs-validation')) enhanceValidation(form, options)
    return api
  }
  function dispose(root = scope.document) {
    for (const state of [...tooltipStates.values()]) if (tooltipStates.get(state.element) === state && within(root, state.element)) state.instance.dispose()
    for (const state of [...carouselStates.values()]) if (within(root, state.element)) state.instance.dispose()
    for (const state of [...validationStates.values()]) if (within(root, state.element)) state.api.dispose()
    for(const state of [...tableStates.values()])if(within(root,state.element))state.dispose()
  }
  const api = Object.freeze({ version: '1.0.0', init, dispose, createTooltip, createPopover, enhanceCarousel, enhanceValidation })
  scope.TQAccessibility = api
})(typeof globalThis === 'object' ? globalThis : window)

const { version, init, dispose, createTooltip, createPopover, enhanceCarousel, enhanceValidation } = globalThis.TQAccessibility
export { version, init, dispose, createTooltip, createPopover, enhanceCarousel, enhanceValidation }
export default globalThis.TQAccessibility

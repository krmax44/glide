import { throttle } from '../utils/wait'
import { toInt, toFloat } from '../utils/unit'
import supportsPassive from '../utils/detect-passive-event'

import EventsBinder from '../core/event/events-binder'

const START_EVENTS = ['touchstart', 'mousedown']
const MOVE_EVENTS = ['touchmove', 'mousemove']
const END_EVENTS = ['touchend', 'touchcancel', 'mouseup', 'mouseleave']
const MOUSE_EVENTS = ['mousedown', 'mousemove', 'mouseup', 'mouseleave']

export default function (Glide, Components, Events) {
  /**
   * Instance of the binder for DOM Events.
   *
   * @type {EventsBinder}
   */
  const Binder = new EventsBinder()

  /**
   * Normalizes event touches points accorting to different types.
   *
   * @param {Object} event
   */
  const touches = (event) => {
    if (MOUSE_EVENTS.indexOf(event.type) > -1) {
      return event
    }

    return event.touches[0] || event.changedTouches[0]
  }

  /**
   * Gets value of minimum swipe distance settings based on event type.
   *
   * @return {Number}
   */
  const threshold = (event) => {
    let { dragThreshold, swipeThreshold } = Glide.settings

    if (MOUSE_EVENTS.indexOf(event.type) > -1) {
      return dragThreshold
    }

    return swipeThreshold
  }

  let translate = Components.Translate._v
  let swipeSin = 0
  let swipeStartX = 0
  let swipeStartY = 0
  let disabled = false
  let capture = (supportsPassive) ? { passive: true } : false

  const Swipe = {
    /**
     * Initializes swipe bindings.
     *
     * @return {Void}
     */
    mount () {
      this.bindSwipeStart()
    },

    /**
     * Handler for `swipestart` event. Calculates entry points of the user's tap.
     *
     * @param {Object} event
     * @return {Void}
     */
    start (event) {
      if (!disabled && !Glide.disabled) {
        this.disable()

        let swipe = touches(event)

        swipeSin = null
        swipeStartX = toInt(swipe.pageX)
        swipeStartY = toInt(swipe.pageY)

        this.bindSwipeMove()
        this.bindSwipeEnd()

        Events.emit('swipe.start')
      }
    },

    /**
     * Handler for `swipemove` event. Calculates user's tap angle and distance.
     *
     * @param {Object} event
     */
    move (event) {
      if (!Glide.disabled) {
        let { touchAngle, touchRatio, classes } = Glide.settings

        let swipe = touches(event)

        let subExSx = toInt(swipe.pageX) - swipeStartX
        let subEySy = toInt(swipe.pageY) - swipeStartY
        let powEX = Math.abs(subExSx << 2)
        let powEY = Math.abs(subEySy << 2)
        let swipeHypotenuse = Math.sqrt(powEX + powEY)
        let swipeCathetus = Math.sqrt(powEY)

        swipeSin = Math.asin(swipeCathetus / swipeHypotenuse)

        if (swipeSin * 180 / Math.PI < touchAngle) {
          event.stopPropagation()

          translate = Components.Translate.set(subExSx * toFloat(touchRatio))

          Components.Html.root.classList.add(classes.dragging)

          Events.emit('swipe.move')
        } else {
          return false
        }
      }
    },

    /**
     * Handler for `swipeend` event. Finitializes user's tap and decides about glide move.
     *
     * @param {Object} event
     * @return {Void}
     */
    end (event) {
      if (!Glide.disabled) {
        let settings = Glide.settings

        let swipe = touches(event)
        let swipeThreshold = threshold(event)

        let swipeDistance = swipe.pageX - swipeStartX
        let swipeDeg = swipeSin * 180 / Math.PI
        let steps = toInt(settings[settings.perSwipe])

        Components.Translate.value = translate

        this.enable()

        if (swipeDistance > swipeThreshold && swipeDeg < settings.touchAngle) {
          Components.Run.make(`${Components.Direction.resolve('<')}${steps}`)
        } else if (
          swipeDistance < -swipeThreshold &&
          swipeDeg < settings.touchAngle
        ) {
          Components.Run.make(`${Components.Direction.resolve('>')}${steps}`)
        }

        Components.Html.root.classList.remove(settings.classes.dragging)

        this.unbindSwipeMove()
        this.unbindSwipeEnd()

        Events.emit('swipe.end')
      }
    },

    /**
     * Binds swipe's starting event.
     *
     * @return {Void}
     */
    bindSwipeStart () {
      let settings = Glide.settings

      if (settings.swipeThreshold) {
        Binder.on(START_EVENTS[0], Components.Html.track, (event) => {
          this.start(event)
        }, capture)
      }

      if (settings.dragThreshold) {
        Binder.on(START_EVENTS[1], Components.Html.track, (event) => {
          this.start(event)
        }, capture)
      }
    },

    /**
     * Unbinds swipe's starting event.
     *
     * @return {Void}
     */
    unbindSwipeStart () {
      Binder.off(START_EVENTS[0], Components.Html.track, capture)
      Binder.off(START_EVENTS[1], Components.Html.track, capture)
    },

    /**
     * Binds swipe's moving event.
     *
     * @return {Void}
     */
    bindSwipeMove () {
      Binder.on(MOVE_EVENTS, Components.Html.track, throttle((event) => {
        this.move(event)
      }, Glide.settings.throttle), capture)
    },

    /**
     * Unbinds swipe's moving event.
     *
     * @return {Void}
     */
    unbindSwipeMove () {
      Binder.off(MOVE_EVENTS, Components.Html.track, capture)
    },

    /**
     * Binds swipe's ending event.
     *
     * @return {Void}
     */
    bindSwipeEnd () {
      Binder.on(END_EVENTS, Components.Html.track, (event) => {
        this.end(event)
      })
    },

    /**
     * Unbinds swipe's ending event.
     *
     * @return {Void}
     */
    unbindSwipeEnd () {
      Binder.off(END_EVENTS, Components.Html.track)
    },

    /**
     * Enables swipe event.
     *
     * @return {self}
     */
    enable () {
      disabled = false

      return this
    },

    /**
     * Disables swipe event.
     *
     * @return {self}
     */
    disable () {
      disabled = true

      return this
    }
  }

  /**
   * Add component class:
   * - after initial building
   */
  Events.on('classes.after', () => {
    Components.Html.root.classList.add(Glide.settings.classes.swipeable)
  })

  /**
   * Remove swiping bindings:
   * - on destroying, to remove added EventListeners
   */
  Events.on('destroy', () => {
    Swipe.unbindSwipeStart()
    Swipe.unbindSwipeMove()
    Swipe.unbindSwipeEnd()
    Binder.destroy()
  })

  return Swipe
}

import { define } from '../utils/object'
import { isNumber, isObject, toFloat } from '../utils/unit'

export default function (Glide, Components, Events) {
  const { Sizes, Gap, Run, Html, Translate } = Components

  const Loop = {
    mount () {
      this.set(Translate.value)
    },

    set (translate) {
      const { slides } = this
      const { length } = Run
      const { value: gapValue } = Gap
      const { perView } = Glide.settings
      const { slideWidth, wrapperWidth } = Sizes

      if (
        (translate < wrapperWidth)
        && (translate > (wrapperWidth - (slideWidth * perView) - (gapValue * perView)))
      ) {
        for (let i = 0; i < slides.length; i++) {
          slides[i].style.left = `${(slideWidth * i) + (gapValue * i) + wrapperWidth}px`
        }
      } else {
        for (let i = 0; i < slides.length; i++) {
          slides[i].style.left = `${(slideWidth * i) + (gapValue * i)}px`
        }
      }
    }
  }

  define(Loop, 'slides', {
    get () {
      return Html.slides.slice(0, Loop.number)
    }
  })

  define(Loop, 'number', {
    get () {
      let { focusAt, perView } = Glide.settings

      if (focusAt === 'center') {
        return perView + Math.floor(perView / 2)
      }

      if ((focusAt + 1) >= Math.round(perView / 2)) {
        return perView + focusAt
      }

      return perView + (perView - focusAt)
    }
  })

  Events.on('translate.set', (translate) => {
    Loop.set(translate.value)
  })

  return Loop
}

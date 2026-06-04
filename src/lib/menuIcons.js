import { Image } from '@tauri-apps/api/image'

import penIconUrl from '../assets/menu-pen.png?url'

let penIconPromise = null

export const loadPenMenuIcon = async () => {
  if (!penIconPromise) {
    penIconPromise = (async () => {
      const response = await fetch(penIconUrl)
      const bytes = await response.arrayBuffer()
      return Image.fromBytes(new Uint8Array(bytes))
    })()
  }

  return penIconPromise
}

import { IconMenuItem, MenuItem } from '@tauri-apps/api/menu'

export const createMenuItem = async ({ icon = null, ...options }) => {
  if (icon) {
    try {
      return await IconMenuItem.new({ ...options, icon })
    } catch (error) {
      console.warn('アイコン付きメニュー項目の作成に失敗しました', error)
    }
  }

  return MenuItem.new(options)
}

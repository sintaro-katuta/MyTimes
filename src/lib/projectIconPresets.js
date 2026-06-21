import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Folder,
  Heart,
  Lightbulb,
  PenLine,
  Star,
} from '@lucide/vue'

export const PROJECT_ICON_PRESET_PREFIX = 'preset:'

export const PROJECT_ICON_PRESETS = [
  { id: 'note', label: 'ノート', icon: PenLine },
  { id: 'book', label: '本', icon: BookOpen },
  { id: 'work', label: '仕事', icon: BriefcaseBusiness },
  { id: 'calendar', label: '予定', icon: CalendarDays },
  { id: 'clock', label: '時間', icon: Clock3 },
  { id: 'check', label: '確認', icon: CheckCircle2 },
  { id: 'star', label: '星', icon: Star },
  { id: 'heart', label: 'ハート', icon: Heart },
  { id: 'idea', label: 'アイデア', icon: Lightbulb },
  { id: 'folder', label: 'フォルダー', icon: Folder },
]

export const projectIconPresetValue = (id) => `${PROJECT_ICON_PRESET_PREFIX}${id}`

export const projectIconPresetId = (value) => {
  const iconValue = String(value ?? '')

  return iconValue.startsWith(PROJECT_ICON_PRESET_PREFIX)
    ? iconValue.slice(PROJECT_ICON_PRESET_PREFIX.length)
    : ''
}

export const projectIconPresetFromValue = (value) => {
  const presetId = projectIconPresetId(value)

  return PROJECT_ICON_PRESETS.find((preset) => preset.id === presetId) ?? null
}

export const isProjectIconPreset = (value) => Boolean(projectIconPresetFromValue(value))

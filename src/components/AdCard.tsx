import type { Ad } from '../lib/schemas'
import { updateAdFn, regenerateAdFn } from '../server/functions'
import { useState } from 'react'

interface AdCardProps {
  ad: Ad
  projectId: string
  companyName: string
  imageCandidates: string[]
  onUpdate: (updated: Ad) => void
}

function EditableField({
  value,
  onSave,
  multiline = false,
  className = '',
}: {
  value: string
  onSave: (val: string) => void
  multiline?: boolean
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function handleBlur() {
    setEditing(false)
    if (draft.trim() !== value) onSave(draft.trim())
  }

  if (editing) {
    const shared = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: handleBlur,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) handleBlur()
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
      },
      autoFocus: true,
      className: `w-full border-b border-blue-400 bg-transparent outline-none ${className}`,
    }
    return multiline
      ? <textarea {...shared} rows={3} />
      : <input {...shared} />
  }

  return (
    <span
      className={`group/edit relative cursor-pointer ${className}`}
      onClick={() => { setDraft(value); setEditing(true) }}
    >
      {value}
      <span className="hidden group-hover/edit:inline ml-1.5 text-[10px] text-blue-400 font-medium align-middle">
        редактируемо
      </span>
    </span>
  )
}

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
      {initials || '?'}
    </div>
  )
}

export function AdCard({ ad, projectId, companyName, imageCandidates, onUpdate }: AdCardProps) {
  const [loading, setLoading] = useState(false)
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [customImageUrl, setCustomImageUrl] = useState('')

  async function saveField(
    field: 'primary_text' | 'headline' | 'description' | 'cta' | 'image_url',
    val: string | null,
  ) {
    const result = await updateAdFn({ data: { adId: ad.id, fields: { [field]: val } } })
    onUpdate(result.ad)
  }

  async function handleRegenerate() {
    setLoading(true)
    try {
      const result = await regenerateAdFn({ data: { adId: ad.id, projectId } })
      onUpdate(result.ad)
    } finally {
      setLoading(false)
    }
  }

  async function setImage(url: string) {
    await saveField('image_url', url)
    setShowImagePicker(false)
    setCustomImageUrl('')
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden w-72 flex flex-col">
      {/* Facebook-style header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <InitialsAvatar name={companyName} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight">{companyName}</p>
          <p className="text-[11px] text-gray-400 leading-tight">Sponsored</p>
        </div>
      </div>

      {/* Primary text */}
      <div className="px-3 pb-2 text-[13px] text-gray-800 leading-snug">
        <EditableField
          value={ad.primary_text}
          onSave={(v) => saveField('primary_text', v)}
          multiline
        />
      </div>

      {/* Image */}
      <div
        className="relative bg-gray-100 cursor-pointer group"
        style={{ aspectRatio: '1.91/1' }}
        onClick={() => setShowImagePicker(!showImagePicker)}
      >
        {ad.image_url ? (
          <img src={ad.image_url} alt="Ad creative" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs gap-2">
            <span className="text-gray-300 text-lg">□</span>
            картинка со страницы
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">Сменить</span>
        </div>
      </div>

      {/* Image picker */}
      {showImagePicker && (
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-[11px] text-gray-400 mb-2">Выбери картинку:</p>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {imageCandidates.map((url) => (
              <img
                key={url}
                src={url}
                alt=""
                className={`w-12 h-12 object-cover rounded cursor-pointer border-2 transition-all ${ad.image_url === url ? 'border-blue-500' : 'border-transparent hover:border-blue-300'}`}
                onClick={() => setImage(url)}
              />
            ))}
            {imageCandidates.length === 0 && (
              <p className="text-[11px] text-gray-400">Картинки не найдены на странице</p>
            )}
          </div>
          <div className="flex gap-1.5">
            <input
              type="url"
              placeholder="Или вставь URL картинки"
              value={customImageUrl}
              onChange={(e) => setCustomImageUrl(e.target.value)}
              className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              onClick={() => customImageUrl && setImage(customImageUrl)}
              disabled={!customImageUrl}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-40"
            >
              ОК
            </button>
          </div>
        </div>
      )}

      {/* Headline + description + CTA */}
      <div className="px-3 py-2 border-t border-gray-100 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-gray-900 leading-tight">
            <EditableField value={ad.headline} onSave={(v) => saveField('headline', v)} />
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
            <EditableField value={ad.description} onSave={(v) => saveField('description', v)} />
          </p>
        </div>
        <button className="shrink-0 border border-gray-300 text-gray-700 text-[12px] font-medium px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
          <EditableField value={ad.cta} onSave={(v) => saveField('cta', v)} />
        </button>
      </div>

      {/* Action buttons */}
      <div className="px-3 pb-3 flex gap-2 border-t border-gray-100 pt-2">
        <button
          onClick={() => setShowImagePicker(!showImagePicker)}
          className="flex-1 flex items-center justify-center gap-1.5 text-[12px] text-gray-600 border border-gray-200 rounded py-1.5 hover:bg-gray-50 transition-colors"
        >
          <span className="text-gray-400">□</span> Сменить фото
        </button>
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 text-[12px] text-gray-600 border border-gray-200 rounded py-1.5 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {loading
            ? <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            : <span className="text-gray-400">□</span>
          }
          Regenerate
        </button>
      </div>
    </div>
  )
}

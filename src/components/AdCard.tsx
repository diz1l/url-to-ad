import type { Ad } from '../lib/schemas'
import { updateAdFn, regenerateAdFn } from '../server/functions'
import { useState, useRef } from 'react'

interface AdCardProps {
  ad: Ad
  projectId: string
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
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  function handleBlur() {
    setEditing(false)
    if (draft.trim() !== value) onSave(draft.trim())
  }

  if (editing) {
    const props = {
      ref,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: handleBlur,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !multiline) handleBlur()
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
      },
      autoFocus: true,
      className: `w-full border border-blue-400 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400 ${className}`,
    }
    return multiline
      ? <textarea {...props} rows={3} />
      : <input {...props} />
  }

  return (
    <span
      className={`cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1 transition-colors ${className}`}
      onClick={() => { setDraft(value); setEditing(true) }}
      title="Click to edit"
    >
      {value}
    </span>
  )
}

export function AdCard({ ad, projectId, imageCandidates, onUpdate }: AdCardProps) {
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
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden max-w-sm w-full">
      {/* Primary text */}
      <div className="px-4 pt-4 pb-2 text-sm text-gray-800">
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
          <img
            src={ad.image_url}
            alt="Ad creative"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No image — click to pick
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">
            Change image
          </span>
        </div>
      </div>

      {/* Image picker */}
      {showImagePicker && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 mb-2 font-medium">Pick an image:</p>
          <div className="flex gap-2 flex-wrap mb-2">
            {imageCandidates.map((url) => (
              <img
                key={url}
                src={url}
                alt=""
                className={`w-14 h-14 object-cover rounded cursor-pointer border-2 transition-all ${ad.image_url === url ? 'border-blue-500' : 'border-transparent hover:border-blue-300'}`}
                onClick={() => setImage(url)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Or paste image URL"
              value={customImageUrl}
              onChange={(e) => setCustomImageUrl(e.target.value)}
              className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={() => customImageUrl && setImage(customImageUrl)}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={!customImageUrl}
            >
              Set
            </button>
          </div>
        </div>
      )}

      {/* Headline + description */}
      <div className="px-4 py-3">
        <div className="font-semibold text-sm text-gray-900 leading-snug">
          <EditableField value={ad.headline} onSave={(v) => saveField('headline', v)} />
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          <EditableField value={ad.description} onSave={(v) => saveField('description', v)} />
        </div>
      </div>

      {/* CTA + actions */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <button className="bg-blue-600 text-white text-xs font-medium px-4 py-1.5 rounded hover:bg-blue-700 transition-colors">
          <EditableField
            value={ad.cta}
            onSave={(v) => saveField('cta', v)}
            className="text-white"
          />
        </button>
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-blue-600 disabled:opacity-50 flex items-center gap-1 transition-colors"
        >
          {loading ? (
            <span className="animate-spin">↻</span>
          ) : (
            '↻'
          )}{' '}
          Regenerate
        </button>
      </div>
    </div>
  )
}

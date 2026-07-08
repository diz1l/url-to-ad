import type { BrandProfile } from '../lib/schemas'

interface BrandProfilePanelProps {
  profile: BrandProfile
  partial?: boolean
  partialReason?: string | null
}

export function BrandProfilePanel({ profile, partial, partialReason }: BrandProfilePanelProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Brand Profile</h2>

      {partial && (
        <div className="mb-4 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          ⚠️ Partial extraction: {partialReason ?? 'Some content could not be loaded.'}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="What they do" value={profile.what_they_do} />
        <Field label="Target audience" value={profile.target_audience} />
        <Field label="Value proposition" value={profile.value_proposition} />
        <Field label="Tone of voice" value={profile.tone_of_voice} />
      </div>

      {profile.color_palette.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Color palette
            {profile.palette_source === 'llm_suggested' && (
              <span className="ml-2 normal-case text-gray-400">(AI suggested)</span>
            )}
          </p>
          <div className="flex gap-2 flex-wrap">
            {profile.color_palette.map((hex) => (
              <div key={hex} className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-full border border-black/10 shadow-sm"
                  style={{ backgroundColor: hex }}
                />
                <span className="text-xs text-gray-500 font-mono">{hex}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  const notFound = value === 'not found'
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm mt-0.5 ${notFound ? 'text-gray-400 italic' : 'text-gray-800'}`}>
        {notFound ? 'not found' : value}
      </p>
    </div>
  )
}

import type { BrandProfile } from '../lib/schemas'

interface BrandProfilePanelProps {
  profile: BrandProfile
  partial?: boolean
  partialReason?: string | null
}

export function BrandProfilePanel({ profile, partial, partialReason }: BrandProfilePanelProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Шаг 2 — извлечённый бренд-профиль
      </p>

      {partial && (
        <div className="mb-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          ⚠️ {partialReason ?? 'Частичная выгрузка контента.'}
        </div>
      )}

      <table className="w-full text-sm border-collapse">
        <tbody>
          <Row label="Что делают" value={profile.what_they_do} />
          <Row label="Аудитория" value={profile.target_audience} />
          <Row label="Тон бренда" value={profile.tone_of_voice} />
          <Row label="Value proposition" value={profile.value_proposition} />
        </tbody>
      </table>

      {profile.color_palette.length > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-sm text-gray-500 w-36 shrink-0">Палитра</span>
          <div className="flex gap-2 items-center">
            {profile.color_palette.map((hex) => (
              <div
                key={hex}
                className="w-6 h-6 rounded-sm border border-black/10 shadow-sm"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
            {profile.palette_source === 'llm_suggested' && (
              <span className="text-xs text-gray-400 ml-1">(AI suggested)</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const notFound = value === 'not found'
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="py-1.5 pr-4 text-gray-500 w-36 align-top shrink-0">{label}</td>
      <td className={`py-1.5 ${notFound ? 'text-gray-400 italic' : 'text-gray-800'}`}>
        {value}
      </td>
    </tr>
  )
}

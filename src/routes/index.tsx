import { createFileRoute } from '@tanstack/react-router'
import { UrlForm } from '../components/UrlForm'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">url-to-ad</h1>
          <p className="mt-1.5 text-gray-500 text-sm">
            Вставь URL сайта → получи Facebook-рекламу за ~5 секунд
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Шаг 1 — пользователь вставляет ссылку
          </p>
          <UrlForm />
        </div>

        <div className="text-xs text-gray-400 text-center space-y-0.5">
          <p>Шаг 2 — извлечённый бренд-профиль</p>
          <p>Шаг 3 — сгенерированные объявления (Facebook-style, редактируемые)</p>
        </div>
      </div>
    </main>
  )
}

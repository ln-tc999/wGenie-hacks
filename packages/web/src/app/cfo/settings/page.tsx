import { Send } from 'lucide-react';
import { TelegramSettingsForm } from '@/wgenie-cfo/components/dashboard/telegram-settings-form';

export default function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <p className="mt-1 text-sm text-[#8E8E8E]">
            Configure notifications and integrations for your treasury.
          </p>
        </div>

        {/* Telegram section */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Send className="size-4 text-[#C5FF4A]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Telegram Integration
            </h3>
          </div>
          <TelegramSettingsForm />
        </section>
      </div>
    </div>
  );
}

// Shared types imported by multiple agents

export interface KeyMetric {
  label: string;
  value: string;
  note?: string;
}

export interface MorningBrief {
  whatsapp_text: string;        // max ~450 chars; sent as WhatsApp message body
  headline: string;             // one-sentence verdict
  verdict_tone: 'green' | 'yellow' | 'red';
  state_summary: string;        // 2-3 sentences on current biometric state
  priority_focus: string;       // the single most important thing today
  data_signals: KeyMetric[];    // 3-6 key numbers
  action_today: string;         // one concrete action
  watch_for: string;            // what might matter tomorrow
  data_sources: string[];       // tool names used
  educational_disclaimer?: string;
}

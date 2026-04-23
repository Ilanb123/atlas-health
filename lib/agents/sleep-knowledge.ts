export interface KnowledgeEntry {
  category: string;
  fact: string;
}

export const SLEEP_KNOWLEDGE: KnowledgeEntry[] = [
  // Sleep Architecture
  {
    category: 'sleep_architecture',
    fact: 'A healthy sleep cycle lasts 90 minutes and repeats 4-6 times per night. Adults need 7-9 full cycles for optimal recovery.',
  },
  {
    category: 'sleep_architecture',
    fact: 'Deep (slow-wave) sleep is most concentrated in the first half of the night and is critical for physical repair, immune function, and metabolic waste clearance via the glymphatic system.',
  },
  {
    category: 'sleep_architecture',
    fact: 'REM sleep is concentrated in the second half of the night and is critical for emotional processing, memory consolidation, and creativity.',
  },
  {
    category: 'sleep_architecture',
    fact: 'Losing even 90 minutes of sleep—one full cycle—reduces daytime alertness by up to 32% (Walker, 2017, Why We Sleep).',
  },
  {
    category: 'sleep_architecture',
    fact: 'Sleep efficiency below 85% is a clinical threshold for poor sleep quality. WHOOP measures efficiency as time asleep divided by time in bed.',
  },
  {
    category: 'sleep_architecture',
    fact: 'Finance professionals averaging fewer than 6 hours show measurably worse risk assessment and impulse control, comparable to mild alcohol intoxication (Killgore, 2010).',
  },

  // HRV and Recovery
  {
    category: 'hrv_recovery',
    fact: 'HRV (heart rate variability) is the gold-standard biomarker for autonomic nervous system balance. Higher HRV reflects stronger parasympathetic dominance and better recovery capacity.',
  },
  {
    category: 'hrv_recovery',
    fact: 'HRV is highly individual. The most meaningful metric is your personal trend, not absolute values. A 10% drop below your 30-day baseline is a meaningful signal of accumulated stress.',
  },
  {
    category: 'hrv_recovery',
    fact: 'WHOOP measures HRV using rMSSD (root mean square of successive differences) during the final 5 minutes of sleep, when parasympathetic activity is highest.',
  },
  {
    category: 'hrv_recovery',
    fact: 'Alcohol reduces HRV by 15-25% even when you feel fine the next day. The effect persists for 48+ hours after drinking (Sauvet et al., 2012).',
  },
  {
    category: 'hrv_recovery',
    fact: 'Resting heart rate (RHR) elevated more than 5 bpm above your baseline indicates incomplete recovery, illness onset, or acute stress.',
  },
  {
    category: 'hrv_recovery',
    fact: 'A WHOOP recovery score of 33% or below (red zone) is a strong signal to reduce training intensity and prioritize sleep hygiene that night.',
  },
  {
    category: 'hrv_recovery',
    fact: 'SpO2 below 95% during sleep suggests potential sleep apnea or altitude effects and warrants medical evaluation.',
  },

  // Sleep Hygiene
  {
    category: 'sleep_hygiene',
    fact: 'Body temperature must drop 1-3°F to initiate sleep. Keep the bedroom at 65-68°F (18-20°C) for optimal sleep onset and deep sleep depth.',
  },
  {
    category: 'sleep_hygiene',
    fact: 'Light exposure suppresses melatonin. Blue light (480 nm) from screens is particularly potent — use blue light filters after 9 PM or wear blue-blocking glasses.',
  },
  {
    category: 'sleep_hygiene',
    fact: 'Consistent wake time is the single most powerful sleep hygiene intervention. The circadian clock anchors to wake time more than sleep time.',
  },
  {
    category: 'sleep_hygiene',
    fact: 'Caffeine has a half-life of 5-7 hours. A 3 PM coffee at 200 mg leaves 100 mg active at 9 PM, measurably reducing deep sleep by 20% even if you fall asleep normally (Landolt et al., 1995).',
  },
  {
    category: 'sleep_hygiene',
    fact: 'A 10-20 minute nap before 3 PM can restore alertness and motor performance without disrupting nighttime sleep pressure. Longer naps cause grogginess (sleep inertia).',
  },
  {
    category: 'sleep_hygiene',
    fact: 'The 4-7-8 breathing technique (inhale 4s, hold 7s, exhale 8s) activates the parasympathetic nervous system and can reduce sleep onset latency by 10-15 minutes.',
  },
  {
    category: 'sleep_hygiene',
    fact: 'A hot shower or bath 1-2 hours before bed triggers peripheral vasodilation, which cools the body core and accelerates sleep onset.',
  },

  // Nutrition and Supplementation
  {
    category: 'nutrition_supplements',
    fact: 'Magnesium glycinate (200-400 mg) taken 30-60 minutes before bed promotes GABA activity, supports NREM sleep depth, and is generally safe for long-term use.',
  },
  {
    category: 'nutrition_supplements',
    fact: 'Melatonin is most effective at low doses (0.5-1 mg) for circadian phase-shifting (jet lag, shift work) rather than as a sleep-duration supplement.',
  },
  {
    category: 'nutrition_supplements',
    fact: 'Eating a large meal within 3 hours of bed disrupts sleep architecture by raising core body temperature and triggering digestive insulin response.',
  },
  {
    category: 'nutrition_supplements',
    fact: 'L-theanine (200 mg) in combination with caffeine (100 mg) improves cognitive performance without the jitteriness of caffeine alone — useful for early-morning trading preparation.',
  },
  {
    category: 'nutrition_supplements',
    fact: 'Tart cherry juice (Montmorency) contains naturally occurring melatonin precursors and has been shown in RCTs to extend sleep time by 34 minutes and improve efficiency.',
  },
  {
    category: 'nutrition_supplements',
    fact: 'Ashwagandha (KSM-66 extract, 600 mg/day) significantly reduces cortisol and improves sleep quality and recovery in high-stress professionals after 8 weeks.',
  },

  // Exercise and Performance
  {
    category: 'exercise_performance',
    fact: 'Vigorous exercise within 3 hours of bed delays sleep onset and reduces deep sleep due to elevated core temperature and sympathetic arousal.',
  },
  {
    category: 'exercise_performance',
    fact: 'Morning exercise (6-8 AM) anchors circadian rhythm and improves nighttime sleep quality. Bright light exposure during morning workouts amplifies this effect.',
  },
  {
    category: 'exercise_performance',
    fact: 'WHOOP strain measures cardiovascular load on a 0-21 scale. A day strain above 18 typically requires 2 recovery days to restore full HRV baseline.',
  },
  {
    category: 'exercise_performance',
    fact: 'Zone 2 aerobic exercise (60-70% max HR, 45+ min, 3x/week) is the most effective long-term intervention for improving HRV and sleep quality.',
  },
  {
    category: 'exercise_performance',
    fact: 'Sleep deprivation reduces maximal strength by 7-11% and aerobic capacity by 3-7% (Reilly & Piercy, 1994). Performance deficits appear before subjective fatigue.',
  },

  // Stress and Mental Performance
  {
    category: 'stress_cognitive',
    fact: 'Cognitive tasks requiring risk assessment, delayed gratification, and probability judgment are most sensitive to sleep deprivation — the exact skills needed for finance.',
  },
  {
    category: 'stress_cognitive',
    fact: 'The prefrontal cortex (PFC), responsible for executive function and impulse control, is the first brain region impaired by sleep loss.',
  },
  {
    category: 'stress_cognitive',
    fact: 'Cortisol follows a diurnal curve: highest in the first hour after waking (cortisol awakening response), lowest at midnight. High-stress days flatten this curve, disrupting the sleep-wake cycle.',
  },
  {
    category: 'stress_cognitive',
    fact: "Journaling for 5 minutes before bed — writing tomorrow's task list — reduces sleep onset latency by offloading rumination to paper (Scullin et al., 2018, AJES).",
  },
  {
    category: 'stress_cognitive',
    fact: 'NSDR (Non-Sleep Deep Rest) / yoga nidra protocols lasting 20-30 minutes restore alertness and dopamine levels comparably to a full night of sleep after acute deprivation.',
  },

  // Finance Professional Context
  {
    category: 'finance_context',
    fact: 'Traders operating on fewer than 6 hours of sleep show increased risk-seeking behavior (not just impaired risk assessment) — they become overconfident, not merely inaccurate.',
  },
  {
    category: 'finance_context',
    fact: 'The optimal pre-market routine for finance professionals includes: consistent 6-6:30 AM wake, 10 min sunlight, cold water face wash (activates the dive reflex), and no screens for 15 minutes.',
  },
  {
    category: 'finance_context',
    fact: 'Early market hours (9:30-11 AM) require peak attentional vigilance. Aligning deep work with your natural cortisol peak (typically 8-10 AM) maximizes decision quality.',
  },
  {
    category: 'finance_context',
    fact: 'HRV below your 30-day average by 10%+ before a major trading day is a quantifiable risk signal. Consider reducing position sizes or deferring high-stakes decisions.',
  },
  {
    category: 'finance_context',
    fact: 'Back-to-back red recovery days (two consecutive days of recovery score < 33%) are predictive of cognitive performance decrement that self-report fatigue ratings underestimate.',
  },
];

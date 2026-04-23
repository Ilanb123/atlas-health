export interface KnowledgeEntry {
  category: string;
  fact: string;
}

export const RECOVERY_KNOWLEDGE: KnowledgeEntry[] = [
  // Recovery fundamentals
  {
    category: 'recovery_fundamentals',
    fact: "WHOOP recovery score is a 0-100 composite of four overnight biometrics: HRV, resting heart rate, sleep performance, and SpO2. It is computed each morning from the most recent sleep bout.",
  },
  {
    category: 'recovery_fundamentals',
    fact: "Green recovery (≥67%) means your autonomic nervous system is primed for high output. Your body is signaling readiness to absorb training stress or cognitive load.",
  },
  {
    category: 'recovery_fundamentals',
    fact: "Yellow recovery (34-66%) is the normal operating range for most adults most of the time. Moderate output is appropriate; avoid deliberately seeking peak-intensity work.",
  },
  {
    category: 'recovery_fundamentals',
    fact: "Red recovery (≤33%) means your autonomic nervous system has not adequately recovered. Pushing through red days accumulates stress faster than it is absorbed — the physiological debt compounds.",
  },
  {
    category: 'recovery_fundamentals',
    fact: "Recovery is not laziness avoidance — it is supercompensation timing. Adaptation to stress only occurs during recovery, not during the stressor itself. Red days that are ignored postpone adaptation.",
  },

  // HRV deep dive
  {
    category: 'hrv_deep_dive',
    fact: "rMSSD (root mean square of successive RR-interval differences) is the validated gold standard for vagal tone assessment in short-term recordings (Shaffer & Ginsberg, 2017, Frontiers in Public Health). WHOOP uses rMSSD.",
  },
  {
    category: 'hrv_deep_dive',
    fact: "HRV is the most individually variable biometric measured by consumer wearables. Population ranges span 20-200+ ms rMSSD. Comparing your HRV to someone else's is clinically meaningless — only compare to your own baseline (Plews et al., 2013, IJSPP).",
  },
  {
    category: 'hrv_deep_dive',
    fact: "Day-to-day HRV fluctuation of 10-15% is physiologically normal noise. Meaningful signal requires a 7-day rolling average or a sustained directional trend over 5+ days (Plews et al., 2013).",
  },
  {
    category: 'hrv_deep_dive',
    fact: "A 20% sustained drop in HRV below personal baseline — sustained meaning 5+ consecutive days — is a validated threshold for meaningful autonomic stress requiring intervention (Plews et al., 2013, IJSPP).",
  },
  {
    category: 'hrv_deep_dive',
    fact: "HRV coefficient of variation (CV = std_dev / mean) captures stability over time. A stable HRV — even if low in absolute terms — is a better recovery signal than a high but erratic HRV (Buchheit, 2014, SJMSS).",
  },
  {
    category: 'hrv_deep_dive',
    fact: "Morning resting HRV measured supine (lying flat) is the gold standard measurement condition. WHOOP captures this during the deepest portion of sleep, which approximates supine resting conditions well (Buchheit, 2014).",
  },

  // Overtraining and undertraining
  {
    category: 'overtraining',
    fact: "Nonfunctional overreaching (NFO) — the stage before full overtraining syndrome — is characterized by chronically suppressed HRV (>2 weeks below baseline), elevated RHR, and declining performance despite maintaining training volume (Meeusen et al., 2013, MSSE).",
  },
  {
    category: 'overtraining',
    fact: "Functional overreaching (short-term HRV dip after a hard training block) is intentional and resolves within 3-7 days with adequate recovery. It precedes supercompensation. NFO does not resolve quickly and requires weeks of reduced load.",
  },
  {
    category: 'overtraining',
    fact: "Three or more consecutive red recovery days is a strong empirical signal of accumulated non-functional overreaching. The appropriate response is active rest (Zone 1 movement, sleep prioritization) — not continued high output.",
  },
  {
    category: 'overtraining',
    fact: "Sympathetic overtraining — less common than parasympathetic — paradoxically presents with elevated HRV and elevated RHR simultaneously, reflecting a dysregulated autonomic system rather than a healthy one. Context (training load, subjective feel) is essential.",
  },
  {
    category: 'overtraining',
    fact: "HRV-guided training — adjusting daily session intensity based on morning HRV — reduces injury incidence and produces equivalent or superior fitness gains vs fixed periodization in 6-week RCTs (Kiviniemi et al., 2007, SJMSS).",
  },

  // Autonomic recovery interventions
  {
    category: 'recovery_interventions',
    fact: "Zone 2 aerobic training (60-70% max HR, 45+ min, 3x/week sustained over 8+ weeks) produces the largest long-term gains in parasympathetic tone and resting HRV of any intervention studied (Buchheit & Laursen, 2013, Sports Medicine).",
  },
  {
    category: 'recovery_interventions',
    fact: "Sauna bathing (20 min at 80°C, 2-3x/week) is associated with significant next-morning HRV elevation in trained athletes, likely via plasma volume expansion and heat shock protein upregulation (Laukkanen et al., 2018, Mayo Clinic Proceedings).",
  },
  {
    category: 'recovery_interventions',
    fact: "Cold water immersion (CWI) post-exercise (10-15 min at 10-15°C) accelerates parasympathetic reactivation vs passive rest, measurably improving next-day HRV in team sport athletes (Buchheit et al., 2009, EJAP).",
  },
  {
    category: 'recovery_interventions',
    fact: "Resonance frequency breathing — approximately 6 breaths per minute (5s inhale, 5s exhale) — maximally stimulates the baroreflex and produces the largest acute HRV increase of any breathing protocol studied (Lehrer & Gevirtz, 2014, Frontiers in Psychology).",
  },
  {
    category: 'recovery_interventions',
    fact: "Alcohol suppresses HRV dose-dependently. Even moderate intake (2-3 drinks) reduces next-morning HRV by 15-25% and the effect persists 48+ hours post-consumption (Sauvet et al., 2012, European Journal of Applied Physiology).",
  },
  {
    category: 'recovery_interventions',
    fact: "Pre-sleep protein (20-40g casein) combined with carbohydrate (low GI) 90 min before bed improves overnight muscle protein synthesis and blunts cortisol awakening response — resulting in measurably improved morning HRV in strength-training populations.",
  },

  // Recovery and decision-making
  {
    category: 'finance_decision_making',
    fact: "HRV directly predicts prefrontal cortex activation and executive function performance. Low vagal tone correlates with worse performance on Stroop, working memory, and go/no-go tasks — the core cognitive tools of finance work (Thayer et al., 2009, Neuroscience & Biobehavioral Reviews).",
  },
  {
    category: 'finance_decision_making',
    fact: "A red recovery day is not merely a physical signal — it reflects reduced prefrontal regulatory capacity. Finance professionals on red recovery days show elevated impulsive decision-making and reduced ability to override fast, intuitive judgments with slow deliberate ones.",
  },
  {
    category: 'finance_decision_making',
    fact: "HRV predicts cognitive performance on complex tasks better than subjective fatigue ratings — people systematically underestimate their cognitive impairment when sleep-deprived or autonomically stressed (Van Dongen et al., 2003, Sleep).",
  },
  {
    category: 'finance_decision_making',
    fact: "A pragmatic protocol for finance professionals: HRV >10% below personal 30-day baseline = reduce discretionary position size by 20-30%, defer irreversible high-stakes decisions if possible, increase checklist usage that session.",
  },
  {
    category: 'finance_decision_making',
    fact: "Chronic HRV suppression (HRV below baseline for 14+ consecutive days) warrants a lifestyle audit — likely causes include non-training stressors: alcohol, sleep debt, chronic work stress, or subclinical illness. Training load alone rarely explains 2-week suppression.",
  },

  // Illness, stress, and life events
  {
    category: 'illness_stress',
    fact: "HRV drops measurably 1-3 days before subjective illness symptoms appear, making WHOOP recovery data a leading indicator of immune challenge. A sudden HRV drop with no clear training or lifestyle cause warrants rest even if you feel fine (Flatt et al., 2017, IJSPP).",
  },
  {
    category: 'illness_stress',
    fact: "Transmeridian travel (jet lag, time zone crossings of 3+ hours) suppresses HRV for 2-5 days post-travel, independent of sleep quantity. Schedule high-stakes work accordingly — do not plan peak-performance events within 48 hours of long-haul travel.",
  },
  {
    category: 'illness_stress',
    fact: "Psychological stress (work pressure, conflict, deadlines) suppresses HRV independent of training load. The autonomic nervous system does not distinguish between physical and psychological stressors — both draw from the same recovery budget (Gisselman et al., 2016, JSCR).",
  },
];

export type DeliveryTemplateKey = 'adv' | 'film_tv' | 'social';

export const DELIVERY_TEMPLATES: Record<DeliveryTemplateKey, { name: string; checklist: string[]; naming: string[] }> = {
  adv: {
    name: 'ADV / Advertising',
    checklist: [
      'Full mix (print master)',
      'Instrumental mix',
      'Stems (drums, bass, music, vocals)',
      'Alt 30s / 15s / 6s cutdowns',
      'Loopable tail'
    ],
    naming: [
      '<Project>_<Cue>_FullMix.wav',
      '<Project>_<Cue>_Instrumental.wav',
      '<Project>_<Cue>_Stems.zip',
      '<Project>_<Cue>_30s.wav',
      '<Project>_<Cue>_15s.wav'
    ]
  },
  film_tv: {
    name: 'Film / TV',
    checklist: [
      'Full mix (print master)',
      'Stems (DX/MX/FX or music stems)',
      'Alt mixes (no drums, no lead)',
      'Cutdowns (if required)',
      'Track sheet / cue sheet'
    ],
    naming: [
      '<Show>_<Episode>_<Cue>_FullMix.wav',
      '<Show>_<Episode>_<Cue>_Stems.zip',
      '<Show>_<Episode>_<Cue>_AltMix.wav'
    ]
  },
  social: {
    name: 'Social / Short-form',
    checklist: [
      'Full mix (print master)',
      'Short loop (5-10s)',
      'Alt mix (no vocals)',
      'Stems (if required)'
    ],
    naming: [
      '<Brand>_<Cue>_FullMix.wav',
      '<Brand>_<Cue>_Loop10s.wav',
      '<Brand>_<Cue>_AltMix.wav'
    ]
  }
};

import io
u3 = io.open('js/unit3_render.js', encoding='utf-8-sig').read()
app = io.open('js/app.js', encoding='utf-8-sig').read()

# Module-scoped identifiers in app.js that unit3_render.js might use
module_manifest = {
  'feedback': 'const feedback = ',
  'state': 'const state = {',
  'activityWorkspace': 'const activityWorkspace = ',
  'activityTitle': 'const activityTitle = ',
  'activityPrompt': 'const activityPrompt = ',
  'completeSubActivity': 'function completeSubActivity',
  'playTone': 'function playTone',
  'celebrateConfetti': 'function celebrateConfetti',
  'animateActivitySuccess': 'function animateActivitySuccess',
  'playCorrectThenFeedback': 'function playCorrectThenFeedback',
  'openActivity': 'function openActivity',
  'escapeHtml': 'function escapeHtml',
  'speak': 'function speak',
  'playOptionSound': 'function playOptionSound',
  'stopAllAudio': 'function stopAllAudio',
  'safePlayAudio': 'function safePlayAudio',
  'normalize': 'function normalize',
  'isSubActivityCompleted': 'function isSubActivityCompleted',
  'playUnitSound': 'function playUnitSound',
}

print("=== identifiers used by unit3_render.js that are module-scoped in app.js ===")
for name, sig in module_manifest.items():
    in_u3 = name in u3
    in_app = sig in app or (name + ' ' in app)
    print(f"{name:24} used_in_u3={in_u3}  defined_in_app={in_app}")

print("\n=== does app.js reference unit3 render fns? (should NOT be importable) ===")
for t in ['cuento','teatro','libro']:
    print(t, 'render'+t.capitalize()+'Activity' in app)

import io

app = io.open('js/app.js', encoding='utf-8-sig').read()

print("=== key markers in app.js ===")
markers = [
    'function completeUnit3Activity',
    'function renderCuentoActivity',
    'function renderTeatroActivity',
    'function renderLibroActivity',
    'function renderCapitulosActivity',
    'function renderKaraokeActivity',
    'function renderPersonajesActivity',
    'function renderQuienActivity',
    'function renderMapaActivity',
    'function renderGaleriaActivity',
    'function renderEscenarioActivity',
    'function renderOrdenarActivity',
    'function renderLineaActivity',
    'function renderDominoActivity',
    'function renderCintaActivity',
    'function renderAntesActivity',
    'function completeSubActivity',
    'const state = {',
    'function animateActivitySuccess',
    'function closeActivity',
    'function playCorrectThenFeedback',
    'function escapeHtml',
    'function speak',
    'function playTone',
    'function celebrateConfetti',
    'function openActivity',
    'function popButton',
    'const activityWorkspace',
    'const feedback',
]
for m in markers:
    print(f"{m:45} {'OK' if m in app else 'MISSING'}")

print("\nexact-match count for completeUnit3Activity:", app.count('function completeUnit3Activity'))
print("renderCuentoActivity count:", app.count('renderCuentoActivity'))

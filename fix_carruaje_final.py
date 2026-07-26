import re

with open('js/app.js', 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Fix 1: The openSubActivity function is missing the switch statement
# The broken area has the else block followed directly by orphaned case statements
old_broken = """  } else {
    $("#checkAnswer").hidden = sub.type === "escudo"; // Escudo is auto-checked by keypress
    $("#listenPrompt").hidden = false;
    $("#pronunciationBtn").hidden = true;
  }


      break;
    case "escalera":
      renderEscaleraActivity(sub);
      break;
    default:
      feedback.textContent = "Actividad no disponible.";
  }
}



  sub.positions.forEach((pos, i) => {"""

new_fixed = """  } else {
    $("#checkAnswer").hidden = sub.type === "escudo"; // Escudo is auto-checked by keypress
    $("#listenPrompt").hidden = false;
    $("#pronunciationBtn").hidden = true;
  }

  switch (sub.type) {
    case "globo":
      renderGloboActivity(sub);
      break;
    case "balcon":
      renderBalconActivity(sub);
      break;
    case "intruso":
      renderIntrusoActivity(sub);
      break;
    case "escudo":
      renderEscudoActivity(sub, alreadyCompleted);
      break;
    case "cofre":
      renderCofreActivity(sub, alreadyCompleted);
      break;
    case "caldero":
      renderCalderoActivity(sub);
      break;
    case "carruaje":
      renderCarruajeActivity(sub);
      break;
    case "bingo":
      renderBingoActivity(sub);
      break;
    case "escalera":
      renderEscaleraActivity(sub);
      break;
    default:
      feedback.textContent = "Actividad no disponible.";
  }
}

/* =============================================
   GLOBO ACTIVITY
   ============================================= */"""

if old_broken in content:
    content = content.replace(old_broken, new_fixed)
    print("Fix applied successfully!")
else:
    print("Pattern not found. Searching for alternatives...")
    # Try with different line endings or spacing
    # Find the position of "escalera" after the broken switch
    idx = content.find('      break;\n    case "escalera":')
    if idx >= 0:
        print(f"Found orphaned cases at position {idx}")
        # Look backwards from idx to find the else block ending
        before = content[:idx]
        else_end = before.rfind('    $("#pronunciationBtn").hidden = true;\n  }')
        if else_end >= 0:
            print(f"Found else block ending at position {else_end}")
            # Look after the orphaned switch close to find orphaned balcon code
            after_switch = content[content.find('  }\n}', idx):]
            switch_close_end = content.find('  }\n}', idx) + len('  }\n}')
            
            # Find the orphaned balcon code after the function close
            orphaned_start = content.find('\n\n\n  sub.positions.forEach', switch_close_end)
            if orphaned_start >= 0:
                orphaned_end = content.find('\n/* =============================================', orphaned_start)
                if orphaned_end < 0:
                    orphaned_end = content.find('\nfunction renderIntrusoActivity', orphaned_start)
                print(f"Orphaned balcon code from {orphaned_start} to {orphaned_end}")
                
                # Remove orphaned code
                content = content[:orphaned_start] + content[orphaned_end:]
                print("Removed orphaned balcon code")

with open('js/app.js', 'w', encoding='utf-8-sig') as f:
    f.write(content)
print("Done!")

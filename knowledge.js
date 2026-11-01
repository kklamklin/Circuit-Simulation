// Explanations shown in the menu pages "อุปกรณ์" (devices) and "วงจร" (circuits), in Thai and English.
// The part after "const KNOWLEDGE = " is plain JSON: edit it, or paste a new JSON file there, keeping the same fields.
// It is a .js file (not .json) so that index.html also works when opened straight from disk.
const KNOWLEDGE = {
 "meta": {
  "title": {
   "th": "ข้อมูลอธิบายอุปกรณ์ วงจรลัด และโหนด สำหรับ Circuit Simulation",
   "en": "Explanations of devices, short circuits and nodes for Circuit Simulation"
  },
  "languages": [
   "th",
   "en"
  ],
  "device_count": 15,
  "concept_count": 8,
  "circuit_count": 13,
  "code_format": "CIRCUIT v1",
  "reading_fields": {
   "source": {
    "th": "meter = อ่านจากมิเตอร์ในโค้ดวงจร, card = อ่านจากการ์ดอุปกรณ์ใต้แผง (ไม่มีมิเตอร์ในโค้ด), calculated = ต้องคำนวณเอง ไม่มีบนแผง",
    "en": "meter = read from a meter in the circuit code, card = read on the device card under the board (no meter in the code), calculated = work it out yourself, not shown on the board"
   },
   "t_s": {
    "th": "เวลาเป็นวินาทีนับจากเริ่มจำลอง (ตัวเลข) หรือช่วงเวลา [เริ่ม, จบ] หรือ null ถ้าเป็นค่าคงตัวหรือเหตุการณ์ วงจร AC สมมติเฟสเริ่มต้นเป็น 0 ที่ t = 0",
    "en": "Time in seconds from the start of the simulation (a number), a range [start, end], or null for a steady value or an event. For AC circuits the phase is assumed to be 0 at t = 0"
   },
   "check": {
    "th": "dc = ค่าทุกตัวเทียบกับตัวแก้สมการอิสระแล้ว, theory = ค่าจากสูตร ยังไม่ได้ทดสอบในแอปจริง",
    "en": "dc = every value was compared with an independent circuit solver, theory = values from formulas, not yet tested in the real app"
   }
  }
 },
 "devices": [
  {
   "id": "dc",
   "code": "DC",
   "name": {
    "th": "แหล่งจ่ายไฟตรง (ถ่าน)",
    "en": "DC source (battery)"
   },
   "group": {
    "th": "แหล่งจ่าย",
    "en": "Sources"
   },
   "what": {
    "th": "แหล่งจ่ายที่ให้แรงดันคงที่ ทำหน้าที่ดันประจุให้ไหลวนในวงจร ขั้วไม่เปลี่ยนตามเวลา",
    "en": "A source that gives a constant voltage. It pushes charge around the circuit and its polarity never changes with time."
   },
   "behavior": [
    {
     "th": "ขา b เป็นขั้วบวก กระแสไหลออกจากขั้วบวก ผ่านวงจรภายนอก แล้วกลับเข้าขั้วลบ (ขา a)",
     "en": "Leg b is the positive terminal. Current leaves the positive terminal, goes through the external circuit and returns to the negative terminal (leg a)."
    },
    {
     "th": "ของจริงมีความต้านทานภายใน r แรงดันที่ขั้วจึงลดลงเมื่อดึงกระแสมาก",
     "en": "A real battery has an internal resistance r, so its terminal voltage drops when it supplies a large current."
    },
    {
     "th": "ถ้าลัดขั้วด้วยสาย กระแสถูกจำกัดด้วย r เท่านั้น จึงสูงมาก และความร้อนที่ r ทำให้ถ่านพังได้",
     "en": "If the terminals are joined by a wire, the current is limited only by r, so it is very large and the heat in r can destroy the battery."
    }
   ],
   "formulas": [
    {
     "th": "V_ขั้ว = E − I·r",
     "en": "V_terminal = E − I·r"
    },
    {
     "th": "P_ที่แหล่งจ่ายให้ = E·I",
     "en": "P_supplied = E·I"
    },
    {
     "th": "กระแสลัดวงจร I = E / r",
     "en": "Short-circuit current I = E / r"
    },
    {
     "th": "ความร้อนที่ความต้านทานภายใน P_r = I²·r",
     "en": "Heat in the internal resistance P_r = I²·r"
    }
   ],
   "params": [
    {
     "key": "E",
     "default": 9,
     "unit": "V",
     "meaning": {
      "th": "แรงดันไฟฟ้ากระแสตรงของแหล่งจ่าย",
      "en": "DC voltage of the source"
     }
    },
    {
     "key": "r",
     "default": 0.5,
     "unit": "Ω",
     "meaning": {
      "th": "ความต้านทานภายใน (มีผลเฉพาะโหมดจริง)",
      "en": "Internal resistance (real mode only)"
     }
    },
    {
     "key": "Pmax",
     "default": 20,
     "unit": "W",
     "meaning": {
      "th": "กำลังสูญเสียสูงสุดก่อนพัง (เฉพาะโหมดจริง)",
      "en": "Maximum power loss before failure (real mode only)"
     }
    }
   ],
   "ideal_mode": {
    "th": "ไม่มีความต้านทานภายใน (แอปใช้ 0.0001 Ω เพียงให้การลัดวงจรยังได้ตัวเลข) ไม่ร้อน ไม่ไหม้",
    "en": "No internal resistance (the app uses 0.0001 Ω only so that a short circuit still gives a number). No heat, nothing burns."
   },
   "real_mode": {
    "th": "มี r ร้อนตาม I²r ถ้าอุณหภูมิถึง 200 °C ถ่านไหม้และระเบิด",
    "en": "Has r and heats as I²r. At 200 °C the battery burns and explodes."
   },
   "watch_out": [
    {
     "th": "ต่อขั้วผิดด้านเป็นเรื่องที่พบบ่อยที่สุด: ขา b คือบวก",
     "en": "Connecting the polarity backwards is the most common mistake: leg b is positive."
    },
    {
     "th": "โจทย์ที่ให้ r มาด้วยให้ใช้โหมดจริง (ideal=0) และตั้ง r ตามโจทย์",
     "en": "If a problem gives an internal resistance, use real mode (ideal=0) and set r from the problem."
    }
   ],
   "try_it": {
    "th": "ต่อถ่าน 12 V, r = 1 Ω กับ R = 5 Ω ในโหมดจริง ทายก่อนว่ากระแสและแรงดันขั้วเป็นเท่าไร (เฉลย 2 A และ 10 V)",
    "en": "In real mode connect a 12 V battery with r = 1 Ω to R = 5 Ω. Predict the current and the terminal voltage first (answer: 2 A and 10 V)."
   }
  },
  {
   "id": "ac",
   "code": "AC",
   "name": {
    "th": "แหล่งจ่ายไฟสลับ",
    "en": "AC source"
   },
   "group": {
    "th": "แหล่งจ่าย",
    "en": "Sources"
   },
   "what": {
    "th": "แหล่งจ่ายที่แรงดันกลับทิศไปมาเป็นรูปไซน์ตามเวลา",
    "en": "A source whose voltage reverses back and forth as a sine wave over time."
   },
   "behavior": [
    {
     "th": "แรงดันที่ขา b เทียบกับขา a เป็น v(t) = E·sin(2πft)",
     "en": "The voltage at leg b relative to leg a is v(t) = E·sin(2πft)."
    },
    {
     "th": "ช่วงครึ่งรอบบวก ขา b สูงกว่า a ช่วงครึ่งรอบลบ ขา a สูงกว่า b",
     "en": "In the positive half cycle leg b is higher than leg a; in the negative half cycle leg a is higher."
    },
    {
     "th": "กระแสในตัวต้านทานเปลี่ยนทิศตามแรงดัน ส่วนตัวเก็บประจุและตัวเหนี่ยวนำทำให้กระแสกับแรงดันเฟสต่างกัน",
     "en": "Current in a resistor reverses with the voltage, while capacitors and inductors shift the phase between current and voltage."
    }
   ],
   "formulas": [
    {
     "th": "V_rms = E / √2 ≈ 0.707·E",
     "en": "V_rms = E / √2 ≈ 0.707·E"
    },
    {
     "th": "E = V_rms × 1.414",
     "en": "E = V_rms × 1.414"
    },
    {
     "th": "คาบ T = 1 / f",
     "en": "Period T = 1 / f"
    },
    {
     "th": "ω = 2πf",
     "en": "ω = 2πf"
    }
   ],
   "params": [
    {
     "key": "E",
     "default": 10,
     "unit": "V",
     "meaning": {
      "th": "แรงดันสูงสุด (peak) ไม่ใช่ rms",
      "en": "Peak voltage (not rms)"
     }
    },
    {
     "key": "f",
     "default": 1,
     "unit": "Hz",
     "meaning": {
      "th": "ความถี่",
      "en": "Frequency"
     }
    },
    {
     "key": "r",
     "default": 0.5,
     "unit": "Ω",
     "meaning": {
      "th": "ความต้านทานภายใน (เฉพาะโหมดจริง)",
      "en": "Internal resistance (real mode only)"
     }
    },
    {
     "key": "Pmax",
     "default": 20,
     "unit": "W",
     "meaning": {
      "th": "กำลังสูญเสียสูงสุด (เฉพาะโหมดจริง)",
      "en": "Maximum power loss (real mode only)"
     }
    }
   ],
   "ideal_mode": {
    "th": "แหล่งจ่ายอุดมคติ ไม่มีความต้านทานภายใน",
    "en": "Ideal source with no internal resistance."
   },
   "real_mode": {
    "th": "มี r และความร้อนเหมือนถ่าน",
    "en": "Has r and heat, like the battery."
   },
   "watch_out": [
    {
     "th": "E เป็นค่า peak ถ้าโจทย์ให้ 220 V (rms) ต้องใส่ E ≈ 311",
     "en": "E is the peak value. If a problem gives 220 V (rms), enter E ≈ 311."
    },
    {
     "th": "มิเตอร์บนแผงอ่านค่าชั่วขณะ ไม่ใช่ rms จึงเห็นเลขวิ่งขึ้นลง",
     "en": "The meters on the board show instantaneous values, not rms, so the numbers swing up and down."
    },
    {
     "th": "ถ้าตั้ง f สูง ตัวเลขเปลี่ยนเร็วจนอ่านไม่ทัน ใช้ f ต่ำ (1–5 Hz) เพื่อดูภาพ",
     "en": "At high f the numbers change too fast to read. Use a low f (1–5 Hz) to see what happens."
    }
   ],
   "try_it": {
    "th": "ต่อ AC E = 10, f = 1 กับ R = 100 Ω ทายก่อนว่ากระแสสูงสุดกี่แอมแปร์ แล้วดูว่ามิเตอร์ติดลบเมื่อไร",
    "en": "Connect AC with E = 10, f = 1 to R = 100 Ω. Predict the peak current first, then watch when the meter goes negative."
   }
  },
  {
   "id": "res",
   "code": "R",
   "name": {
    "th": "ตัวต้านทาน",
    "en": "Resistor"
   },
   "group": {
    "th": "โหลด",
    "en": "Loads"
   },
   "what": {
    "th": "อุปกรณ์ที่ต้านการไหลของกระแส พลังงานไฟฟ้าที่ผ่านตัวมันเปลี่ยนเป็นความร้อน",
    "en": "A device that opposes current. The electrical energy passing through it becomes heat."
   },
   "behavior": [
    {
     "th": "ไม่มีขั้ว ต่อกลับด้านได้ผลเหมือนเดิม",
     "en": "It has no polarity; connecting it the other way round gives the same result."
    },
    {
     "th": "แรงดันคร่อมเป็นสัดส่วนกับกระแส (กฎของโอห์ม)",
     "en": "The voltage across it is proportional to the current (Ohm's law)."
    },
    {
     "th": "ต่ออนุกรมกระแสเท่ากันทุกตัว แรงดันแบ่งกัน ต่อขนานแรงดันเท่ากันทุกตัว กระแสแบ่งกัน",
     "en": "In series every resistor carries the same current and the voltage is shared. In parallel every resistor has the same voltage and the current is shared."
    }
   ],
   "formulas": [
    {
     "th": "V = I·R",
     "en": "V = I·R"
    },
    {
     "th": "P = I²R = V²/R = V·I",
     "en": "P = I²R = V²/R = V·I"
    },
    {
     "th": "อนุกรม R_รวม = R₁ + R₂ + …",
     "en": "Series R_total = R₁ + R₂ + …"
    },
    {
     "th": "ขนาน 1/R_รวม = 1/R₁ + 1/R₂ + …  (สองตัว R_รวม = R₁R₂/(R₁+R₂))",
     "en": "Parallel 1/R_total = 1/R₁ + 1/R₂ + …  (two resistors: R_total = R₁R₂/(R₁+R₂))"
    }
   ],
   "params": [
    {
     "key": "R",
     "default": 100,
     "unit": "Ω",
     "meaning": {
      "th": "ความต้านทาน",
      "en": "Resistance"
     }
    },
    {
     "key": "Pmax",
     "default": 2,
     "unit": "W",
     "meaning": {
      "th": "กำลังสูงสุดที่ทนได้ (เฉพาะโหมดจริง)",
      "en": "Maximum power it can withstand (real mode only)"
     }
    }
   ],
   "ideal_mode": {
    "th": "ไม่ร้อน ไม่ไหม้ ทำตามกฎของโอห์มล้วนๆ",
    "en": "No heat, nothing burns. It follows Ohm's law exactly."
   },
   "real_mode": {
    "th": "ร้อนตาม P ถ้าเกิน Pmax จนถึง 200 °C จะไหม้",
    "en": "Heats according to P. Above Pmax it reaches 200 °C and burns."
   },
   "watch_out": [
    {
     "th": "พิมพ์ค่าเป็นตัวเลขล้วน เช่น R=4700 ไม่ใช่ 4.7k",
     "en": "Write values as plain numbers, e.g. R=4700, not 4.7k."
    },
    {
     "th": "ตัวต้านทานที่ถูกลัดด้วยสาย (ขนานกับสายเปล่า) จะไม่มีกระแสผ่านเลย",
     "en": "A resistor in parallel with a bare wire carries no current at all (it is shorted)."
    }
   ],
   "try_it": {
    "th": "ต่อ R 100 Ω กับ 200 Ω อนุกรมกับถ่าน 9 V ทายก่อนว่าแรงดันคร่อมตัวไหนมากกว่ากี่เท่า (ตามอัตราส่วนความต้านทาน)",
    "en": "Connect 100 Ω and 200 Ω in series with a 9 V battery. Predict which one has more voltage and by what ratio (the ratio of the resistances)."
   }
  },
  {
   "id": "bulb",
   "code": "B",
   "name": {
    "th": "หลอดไฟ",
    "en": "Bulb"
   },
   "group": {
    "th": "โหลด",
    "en": "Loads"
   },
   "what": {
    "th": "โหลดที่เปลี่ยนพลังงานไฟฟ้าเป็นแสงและความร้อน ความสว่างขึ้นกับกำลังที่ตกคร่อมมัน",
    "en": "A load that turns electrical energy into light and heat. The brightness depends on the power dissipated in it."
   },
   "behavior": [
    {
     "th": "ในแบบจำลองหลอดไฟทำตัวเหมือนตัวต้านทานค่า R ที่ตั้งไว้ และสว่างตามกำลัง P = I²R",
     "en": "In the model the bulb acts like a resistor of the set value R and is as bright as P = I²R."
    },
    {
     "th": "หลอดอนุกรมกัน กระแสเท่ากัน หลอดที่ R มากกว่ากินกำลังมากกว่าจึงสว่างกว่า",
     "en": "Bulbs in series carry the same current; the one with larger R dissipates more power and is brighter."
    },
    {
     "th": "หลอดขนานกัน แรงดันเท่ากัน หลอดที่ R น้อยกว่ากินกำลังมากกว่าจึงสว่างกว่า",
     "en": "Bulbs in parallel have the same voltage; the one with smaller R dissipates more power and is brighter."
    }
   ],
   "formulas": [
    {
     "th": "P = I²R = V²/R",
     "en": "P = I²R = V²/R"
    },
    {
     "th": "หลอดขนานกับแหล่งจ่าย V ที่คงที่: เพิ่มหลอดไม่ทำให้หลอดเดิมสว่างน้อยลง",
     "en": "Bulbs in parallel with a fixed source V: adding a bulb does not dim the others"
    }
   ],
   "params": [
    {
     "key": "R",
     "default": 20,
     "unit": "Ω",
     "meaning": {
      "th": "ความต้านทานของไส้หลอด",
      "en": "Resistance of the filament"
     }
    },
    {
     "key": "Pmax",
     "default": 10,
     "unit": "W",
     "meaning": {
      "th": "กำลังสูงสุดก่อนหลอดขาด (เฉพาะโหมดจริง)",
      "en": "Maximum power before the bulb fails (real mode only)"
     }
    }
   ],
   "ideal_mode": {
    "th": "สว่างตามกำลัง ไม่ขาด",
    "en": "Glows according to power, never fails."
   },
   "real_mode": {
    "th": "เกินพิกัดแล้วหลอดแตก เศษแก้วกระเด็น",
    "en": "Over the rating the bulb shatters and glass flies off."
   },
   "watch_out": [
    {
     "th": "ของจริงไส้หลอดร้อนแล้ว R เพิ่มขึ้น แต่ในโจทย์ให้ถือ R คงที่ตามที่กำหนด",
     "en": "A real filament's R rises as it heats, but in problems treat R as constant at the given value."
    }
   ],
   "try_it": {
    "th": "ต่อหลอด 20 Ω กับ 40 Ω อนุกรมแล้วขนาน เปรียบเทียบว่าตัวไหนสว่างกว่าในแต่ละแบบ แล้วอธิบายด้วย P = I²R และ P = V²/R",
    "en": "Connect 20 Ω and 40 Ω bulbs in series, then in parallel. Compare which is brighter in each case and explain with P = I²R and P = V²/R."
   }
  },
  {
   "id": "sw",
   "code": "S",
   "name": {
    "th": "สวิตช์",
    "en": "Switch"
   },
   "group": {
    "th": "ควบคุม/ป้องกัน",
    "en": "Control / protection"
   },
   "what": {
    "th": "อุปกรณ์เปิดปิดทางเดินของกระแส ปิด (on) คือเป็นสายตัวนำ เปิด (off) คือขาดวงจร",
    "en": "A device that opens or closes the path of current. Closed (on) it acts as a conducting wire; open (off) it breaks the circuit."
   },
   "behavior": [
    {
     "th": "ปิดสวิตช์: ไม่มีแรงดันคร่อม กระแสผ่านได้ (ในโหมดอุดมคติความต้านทานเป็นศูนย์)",
     "en": "Closed switch: no voltage across it and current flows (zero resistance in ideal mode)."
    },
    {
     "th": "เปิดสวิตช์: กระแสเป็นศูนย์พอดี และแรงดันคร่อมสวิตช์เท่ากับแรงดันที่เหลือในวงจรนั้น",
     "en": "Open switch: the current is exactly zero, and the voltage across the switch equals the voltage left over in that loop."
    },
    {
     "th": "ถ้าสวิตช์เป็นอุปกรณ์เดียวที่ทำให้วงจรขาด แรงดันคร่อมสวิตช์เท่าแรงดันของแหล่งจ่าย",
     "en": "If the switch is the only break in the loop, the voltage across it equals the source voltage."
    },
    {
     "th": "สวิตช์ที่ปิดขนานกับตัวต้านทาน ลัดตัวต้านทานนั้นทิ้ง",
     "en": "A closed switch in parallel with a resistor shorts that resistor out."
    }
   ],
   "formulas": [
    {
     "th": "สวิตช์ปิด: V = 0",
     "en": "Closed switch: V = 0"
    },
    {
     "th": "สวิตช์เปิด: I = 0",
     "en": "Open switch: I = 0"
    }
   ],
   "params": [
    {
     "key": "on",
     "default": 1,
     "unit": "",
     "meaning": {
      "th": "1 = ปิด (นำไฟ), 0 = เปิด",
      "en": "1 = closed (conducting), 0 = open"
     }
    },
    {
     "key": "Pmax",
     "default": 10,
     "unit": "W",
     "meaning": {
      "th": "กำลังสูงสุด (เฉพาะโหมดจริง)",
      "en": "Maximum power (real mode only)"
     }
    }
   ],
   "ideal_mode": {
    "th": "ปิดแล้วความต้านทาน 0 พอดี เปิดแล้วไม่ใส่ในสมการเลย",
    "en": "Closed means exactly 0 Ω. Open means it is left out of the equations entirely."
   },
   "real_mode": {
    "th": "ปิดแล้วมีความต้านทานเล็กมาก 1 mΩ",
    "en": "Closed has a very small resistance, 1 mΩ."
   },
   "watch_out": [
    {
     "th": "บนแผงแตะที่สวิตช์เพื่อสลับเปิดปิดได้ขณะวงจรทำงาน",
     "en": "On the board, tap the switch to toggle it while the circuit runs."
    },
    {
     "th": "ในโค้ดวงจร on=1 คือปิด (นำไฟ) อย่าสับสนกับคำว่า เปิดสวิตช์ในภาษาพูด",
     "en": "In circuit code on=1 means closed (conducting). Do not confuse it with 'turn on the switch' wording in speech."
    }
   ],
   "try_it": {
    "th": "ต่อสวิตช์ในวงจรที่มีหลอดสองดวงอนุกรม แล้วต่อสวิตช์ขนานกับหลอดดวงหนึ่ง ทายก่อนว่าปิดสวิตช์แล้วอีกดวงสว่างขึ้นหรือดับ",
    "en": "Put a switch in a circuit with two series bulbs, then connect the switch in parallel with one bulb. Predict whether closing it brightens or darkens the other bulb."
   }
  },
  {
   "id": "fuse",
   "code": "F",
   "name": {
    "th": "ฟิวส์",
    "en": "Fuse"
   },
   "group": {
    "th": "ควบคุม/ป้องกัน",
    "en": "Control / protection"
   },
   "what": {
    "th": "เส้นลวดที่ยอมให้กระแสผ่านได้ถึงพิกัด ถ้าเกินจะหลอมขาด ตัดวงจรเพื่อป้องกันอุปกรณ์อื่น",
    "en": "A wire that passes current up to its rating and melts if the current is greater, cutting the circuit to protect other devices."
   },
   "behavior": [
    {
     "th": "ต้องต่ออนุกรมกับสิ่งที่ต้องการป้องกัน",
     "en": "It must be in series with whatever it protects."
    },
    {
     "th": "ขาดแล้วเป็นวงจรเปิด กระแสเป็นศูนย์",
     "en": "Once blown it is an open circuit and the current is zero."
    },
    {
     "th": "ขาดเพราะกระแสเกิน Imax ไม่ใช่เพราะแรงดัน",
     "en": "It blows because of too much current, not too much voltage."
    }
   ],
   "formulas": [
    {
     "th": "ขาดเมื่อ I > Imax",
     "en": "Blows when I > Imax"
    }
   ],
   "params": [
    {
     "key": "Imax",
     "default": 2,
     "unit": "A",
     "meaning": {
      "th": "กระแสสูงสุดที่ทนได้",
      "en": "Maximum current it can carry"
     }
    }
   ],
   "ideal_mode": {
    "th": "ไม่มีความต้านทาน และไม่ขาด (โหมดอุดมคติไม่มีการไหม้)",
    "en": "No resistance and it never blows (ideal mode has no burning)."
   },
   "real_mode": {
    "th": "ความต้านทาน 0.05 Ω ขาดเมื่อกระแสเกินพิกัด",
    "en": "0.05 Ω resistance; blows when the current exceeds the rating."
   },
   "watch_out": [
    {
     "th": "ถ้าอยากให้ฟิวส์ขาดจริง ต้องใช้ ideal=0",
     "en": "To see a fuse actually blow you must use ideal=0."
    },
    {
     "th": "ตั้ง Imax ของฟิวส์ให้ต่ำกว่าพิกัดของอุปกรณ์ที่ต้องการป้องกัน ฟิวส์จึงขาดก่อน",
     "en": "Set the fuse Imax below the rating of the device it protects so the fuse goes first."
    }
   ],
   "try_it": {
    "th": "ในโหมดจริง ต่อฟิวส์ Imax = 0.5 A กับ R = 10 Ω และถ่าน 9 V ดูว่าฟิวส์ขาดไหม แล้วลองเปลี่ยน R เป็น 50 Ω",
    "en": "In real mode connect a fuse with Imax = 0.5 A to R = 10 Ω and a 9 V battery and see whether it blows, then change R to 50 Ω."
   }
  },
  {
   "id": "cap",
   "code": "C",
   "name": {
    "th": "ตัวเก็บประจุ",
    "en": "Capacitor"
   },
   "group": {
    "th": "เก็บพลังงาน",
    "en": "Energy storage"
   },
   "what": {
    "th": "อุปกรณ์เก็บประจุและพลังงานไฟฟ้าในสนามไฟฟ้าระหว่างแผ่นตัวนำสองแผ่น",
    "en": "A device that stores charge and energy in the electric field between two conducting plates."
   },
   "behavior": [
    {
     "th": "ตอนเริ่มชาร์จ ตัวเก็บประจุว่างเหมือนสาย (แรงดันคร่อม 0) กระแสสูงสุด",
     "en": "At the start of charging it acts like a wire (0 V across it) and the current is at its maximum."
    },
    {
     "th": "แรงดันคร่อมค่อยๆ เพิ่มจนเท่าแหล่งจ่าย กระแสลดเหลือ 0 เหมือนวงจรเปิด",
     "en": "The voltage across it rises gradually until it equals the source, and the current falls to 0, like an open circuit."
    },
    {
     "th": "แรงดันคร่อมตัวเก็บประจุเปลี่ยนทันทีไม่ได้",
     "en": "The voltage across a capacitor cannot change instantly."
    },
    {
     "th": "กับไฟสลับ กระแสนำหน้าแรงดัน 90° และยิ่ง f หรือ C มาก ยิ่งผ่านกระแสได้ง่าย",
     "en": "With AC the current leads the voltage by 90°, and a larger f or C lets more current through."
    }
   ],
   "formulas": [
    {
     "th": "Q = C·V",
     "en": "Q = C·V"
    },
    {
     "th": "i = C·dv/dt",
     "en": "i = C·dv/dt"
    },
    {
     "th": "พลังงานที่เก็บ U = ½CV²",
     "en": "Stored energy U = ½CV²"
    },
    {
     "th": "ชาร์จผ่าน R: V(t) = E(1 − e^(−t/RC)), ค่าคงตัวเวลา τ = RC",
     "en": "Charging through R: V(t) = E(1 − e^(−t/RC)), time constant τ = RC"
    },
    {
     "th": "รีแอกแตนซ์ X_C = 1/(2πfC)",
     "en": "Reactance X_C = 1/(2πfC)"
    },
    {
     "th": "ขนาน C_รวม = C₁ + C₂ ,  อนุกรม 1/C_รวม = 1/C₁ + 1/C₂",
     "en": "Parallel C_total = C₁ + C₂ ,  series 1/C_total = 1/C₁ + 1/C₂"
    }
   ],
   "params": [
    {
     "key": "C",
     "default": 4700,
     "unit": "µF",
     "meaning": {
      "th": "ความจุ เป็นไมโครฟารัด (0.05 F = 50000)",
      "en": "Capacitance in microfarads (0.05 F = 50000)"
     }
    },
    {
     "key": "Vmax",
     "default": 25,
     "unit": "V",
     "meaning": {
      "th": "แรงดันสูงสุดที่ทนได้ (เฉพาะโหมดจริง)",
      "en": "Maximum voltage it can withstand (real mode only)"
     }
    }
   ],
   "ideal_mode": {
    "th": "เก็บและคายประจุตามสมการ ไม่ระเบิด",
    "en": "Charges and discharges by the equations and never explodes."
   },
   "real_mode": {
    "th": "แรงดันเกิน Vmax ตัวเก็บประจุระเบิด ฝาปลิว",
    "en": "Above Vmax the capacitor explodes and its cap flies off."
   },
   "watch_out": [
    {
     "th": "หน่วย C เป็นไมโครฟารัด ไม่ใช่ฟารัด",
     "en": "The unit of C is the microfarad, not the farad."
    },
    {
     "th": "ไฟตรงสภาวะคงตัว ตัวเก็บประจุเป็นวงจรเปิด มิเตอร์กระแสอ่านศูนย์",
     "en": "In DC steady state a capacitor is an open circuit, so a current meter reads zero."
    },
    {
     "th": "ตัวเก็บประจุที่ชาร์จแล้ว เมื่อถูกต่อกับโหลดจะคายประจุเอง",
     "en": "A charged capacitor connected to a load discharges by itself."
    }
   ],
   "try_it": {
    "th": "ต่อ R = 1000 Ω กับ C = 1000 µF และถ่าน 9 V ทายก่อนว่าที่เวลา 1 วินาที แรงดันคร่อม C เป็นเท่าไร (ประมาณ 5.69 V)",
    "en": "Connect R = 1000 Ω, C = 1000 µF and a 9 V battery. Predict the capacitor voltage at 1 s (about 5.69 V)."
   }
  },
  {
   "id": "ind",
   "code": "L",
   "name": {
    "th": "ตัวเหนี่ยวนำ",
    "en": "Inductor"
   },
   "group": {
    "th": "เก็บพลังงาน",
    "en": "Energy storage"
   },
   "what": {
    "th": "ขดลวดที่เก็บพลังงานในสนามแม่เหล็ก และต้านการเปลี่ยนแปลงของกระแส",
    "en": "A coil that stores energy in a magnetic field and opposes changes in current."
   },
   "behavior": [
    {
     "th": "ตอนเริ่มต่อไฟตรง ตัวเหนี่ยวนำเป็นเหมือนวงจรเปิด (กระแส 0) แรงดันคร่อมเท่าแหล่งจ่าย",
     "en": "When DC is first applied an inductor acts like an open circuit (current 0) and has the full source voltage across it."
    },
    {
     "th": "กระแสค่อยๆ เพิ่ม แรงดันคร่อมค่อยๆ ลด จนสภาวะคงตัวเหมือนสาย (แรงดัน 0)",
     "en": "The current gradually rises and the voltage across it falls until, in steady state, it acts like a wire (0 V)."
    },
    {
     "th": "กระแสในตัวเหนี่ยวนำเปลี่ยนทันทีไม่ได้",
     "en": "The current in an inductor cannot change instantly."
    },
    {
     "th": "กับไฟสลับ กระแสตามหลังแรงดัน 90° และยิ่ง f หรือ L มาก ยิ่งผ่านกระแสได้ยาก",
     "en": "With AC the current lags the voltage by 90°, and a larger f or L makes it harder for current to pass."
    }
   ],
   "formulas": [
    {
     "th": "v = L·di/dt",
     "en": "v = L·di/dt"
    },
    {
     "th": "พลังงานที่เก็บ U = ½LI²",
     "en": "Stored energy U = ½LI²"
    },
    {
     "th": "ต่อกับ R: I(t) = (E/R)(1 − e^(−t/τ)), τ = L/R",
     "en": "With R: I(t) = (E/R)(1 − e^(−t/τ)), τ = L/R"
    },
    {
     "th": "X_L = 2πfL",
     "en": "X_L = 2πfL"
    },
    {
     "th": "อนุกรม L_รวม = L₁ + L₂ (เมื่อไม่มีการเหนี่ยวนำร่วม)",
     "en": "Series L_total = L₁ + L₂ (no mutual inductance)"
    }
   ],
   "params": [
    {
     "key": "L",
     "default": 2,
     "unit": "H",
     "meaning": {
      "th": "ความเหนี่ยวนำ",
      "en": "Inductance"
     }
    },
    {
     "key": "Imax",
     "default": 2,
     "unit": "A",
     "meaning": {
      "th": "กระแสสูงสุดที่ทนได้ (เฉพาะโหมดจริง)",
      "en": "Maximum current it can withstand (real mode only)"
     }
    }
   ],
   "ideal_mode": {
    "th": "ไม่มีความต้านทานขดลวด",
    "en": "No coil resistance."
   },
   "real_mode": {
    "th": "กระแสเกิน Imax ตัวเหนี่ยวนำไหม้",
    "en": "Current above Imax burns the inductor."
   },
   "watch_out": [
    {
     "th": "ต่อไฟตรงกับ L เพียวๆ กระแสไต่ขึ้นเรื่อยๆ ไม่มีที่สิ้นสุด ควรมี R อนุกรมเสมอ",
     "en": "A pure inductor on DC makes the current climb without limit, so always put a resistor in series."
    }
   ],
   "try_it": {
    "th": "ต่อ R = 10 Ω กับ L = 1 H และถ่าน 9 V ทายก่อนว่ากระแสที่ท้ายสุดเป็นเท่าไร (0.9 A) และใช้เวลาประมาณกี่วินาทีถึงจะเกือบเต็ม (ประมาณ 5τ = 0.5 s)",
    "en": "Connect R = 10 Ω, L = 1 H and a 9 V battery. Predict the final current (0.9 A) and roughly how long it takes to nearly reach it (about 5τ = 0.5 s)."
   }
  },
  {
   "id": "tp",
   "code": "TP",
   "name": {
    "th": "หม้อแปลง: ขดปฐมภูมิ (TP)",
    "en": "Transformer: primary coil (TP)"
   },
   "group": {
    "th": "หม้อแปลง",
    "en": "Transformer"
   },
   "what": {
    "th": "ขดที่รับไฟสลับเข้า ของหม้อแปลงหนึ่งตัว หม้อแปลงเปลี่ยนระดับแรงดันไฟสลับด้วยขดลวดสองขดที่ร่วมสนามแม่เหล็กกัน (ปุ่มเดียวในแถบอุปกรณ์วางให้ทั้งคู่)",
    "en": "The coil that takes the AC input of a transformer. A transformer changes the level of an AC voltage using two coils that share a magnetic field (one button in the device bar places both)."
   },
   "behavior": [
    {
     "th": "TP กับ TS ที่มี grp เดียวกันเป็นหม้อแปลงหนึ่งตัว ค่า n, L, k ตั้งที่ TP เท่านั้น",
     "en": "A TP and a TS with the same grp form one transformer. n, L and k are set on the TP only."
    },
    {
     "th": "จุดขั้ว (dot) อยู่ที่ขา a ของทั้งสองขด แรงดัน V(c)−V(d) ที่ขดทุติยภูมิเป็นเฟสเดียวกับ V(a)−V(b) ที่ปฐมภูมิ",
     "en": "The dots are at leg a of both coils: the secondary voltage V(c)−V(d) is in phase with V(a)−V(b) of the primary."
    },
    {
     "th": "แบบอุดมคติ: V₂ = n·V₁ และกำลังเข้าเท่ากำลังออก",
     "en": "Ideal: V₂ = n·V₁ and input power equals output power."
    },
    {
     "th": "โหลด R ที่ทุติยภูมิสะท้อนกลับมาปฐมภูมิเหมือน R/n²",
     "en": "A load R on the secondary looks like R/n² from the primary."
    },
    {
     "th": "ใช้ได้เฉพาะไฟสลับ ถ้าต่อไฟตรง กระแสปฐมภูมิจะไต่ขึ้นเรื่อยๆ",
     "en": "AC only. With a DC source the primary current just ramps up."
    }
   ],
   "formulas": [
    {
     "th": "n = N₂ / N₁  (n > 1 เพิ่มแรงดัน, n < 1 ลดแรงดัน)",
     "en": "n = N₂ / N₁  (n > 1 steps up, n < 1 steps down)"
    },
    {
     "th": "V₂ = n·V₁",
     "en": "V₂ = n·V₁"
    },
    {
     "th": "I₁ = n·I₂ (ขนาด)",
     "en": "I₁ = n·I₂ (magnitude)"
    },
    {
     "th": "P₁ = P₂ (อุดมคติ)",
     "en": "P₁ = P₂ (ideal)"
    },
    {
     "th": "R ที่เห็นจากปฐมภูมิ = R_load / n²",
     "en": "R seen from the primary = R_load / n²"
    }
   ],
   "params": [
    {
     "key": "grp",
     "default": 1,
     "unit": "",
     "meaning": {
      "th": "เลขคู่ที่จับ TP กับ TS",
      "en": "Pair number linking a TP with a TS"
     }
    },
    {
     "key": "L",
     "default": 100,
     "unit": "H",
     "meaning": {
      "th": "ความเหนี่ยวนำปฐมภูมิ (เฉพาะโหมดจริง)",
      "en": "Primary inductance (real mode only)"
     }
    },
    {
     "key": "n",
     "default": 2,
     "unit": "",
     "meaning": {
      "th": "อัตราส่วนรอบ N₂/N₁",
      "en": "Turns ratio N₂/N₁"
     }
    },
    {
     "key": "k",
     "default": 0.99,
     "unit": "",
     "meaning": {
      "th": "ค่าคัปปลิง (เฉพาะโหมดจริง)",
      "en": "Coupling coefficient (real mode only)"
     }
    },
    {
     "key": "Imax",
     "default": 2,
     "unit": "A",
     "meaning": {
      "th": "กระแสสูงสุดแต่ละขด",
      "en": "Maximum current of each coil"
     }
    }
   ],
   "ideal_mode": {
    "th": "หม้อแปลงอุดมคติ V₂ = n·V₁ ไม่สนใจ L และ k",
    "en": "Ideal transformer V₂ = n·V₁; L and k are ignored."
   },
   "real_mode": {
    "th": "ขดลวดคู่ควบคู่กัน L₂ = n²L₁, M = k·n·L₁",
    "en": "Two coupled coils: L₂ = n²L₁, M = k·n·L₁."
   },
   "watch_out": [
    {
     "th": "วาง TP แถวบน TS แถวล่างติดกัน (เช่น y=5 กับ y=6) แผงวาดสัญลักษณ์มาตรฐานให้",
     "en": "Put TP in the upper row and TS in the row right below (e.g. y=5 and y=6) and the board draws the standard symbol."
    },
    {
     "th": "สายปฐมภูมิออกทางด้านบน สายทุติยภูมิออกทางด้านล่าง ห้ามลากสายผ่านขา a ทั้งสองขดพร้อมกัน",
     "en": "Run the primary wires up and the secondary wires down; never run one wire through both leg a points."
    },
    {
     "th": "ขดที่ไม่มีคู่: TP ทำตัวเป็นตัวเหนี่ยวนำ, TS เป็นวงจรเปิด",
     "en": "An unpaired coil: TP acts as an inductor, TS is an open circuit."
    }
   ],
   "try_it": {
    "th": "ต่อ AC 10 V (peak) เข้า TP, n = 2 โหลด R = 100 Ω ที่ TS ทายก่อนว่า V₂ และกระแสปฐมภูมิสูงสุดเท่าไร (20 V และ 0.4 A)",
    "en": "Feed AC 10 V (peak) into TP with n = 2 and R = 100 Ω on TS. Predict V₂ and the peak primary current (20 V and 0.4 A)."
   }
  },
  {
   "id": "ts",
   "code": "TS",
   "name": {
    "th": "หม้อแปลง: ขดทุติยภูมิ (TS)",
    "en": "Transformer: secondary coil (TS)"
   },
   "group": {
    "th": "หม้อแปลง",
    "en": "Transformer"
   },
   "what": {
    "th": "ขดที่จ่ายไฟสลับออกไปยังโหลด ของหม้อแปลงหนึ่งตัว แรงดันที่ได้เป็น n เท่าของปฐมภูมิ",
    "en": "The coil that delivers AC to the load. Its voltage is n times that of the primary."
   },
   "behavior": [
    {
     "th": "ต้องมี grp เท่ากับ TP จึงจับเป็นคู่ ค่า n, L, k ไม่ต้องตั้งที่ TS",
     "en": "It needs the same grp as the TP to be paired. n, L and k do not need to be set on the TS."
    },
    {
     "th": "แรงดัน V(c)−V(d) ที่ขา a และ b ของ TS เป็นเฟสเดียวกับ V(a)−V(b) ของ TP (จุด dot อยู่ที่ขา a ทั้งสองขด)",
     "en": "The voltage V(c)−V(d) across the legs of the TS is in phase with V(a)−V(b) of the TP (dots at leg a of both coils)."
    },
    {
     "th": "ขด TS ที่ไม่มี TP จับคู่ ทำตัวเป็นวงจรเปิด",
     "en": "A TS with no matching TP acts as an open circuit."
    },
    {
     "th": "ถ้าลัดขด TS ด้วยสาย กระแสปฐมภูมิจะสูงมาก (ปฐมภูมิเห็นโหลดเป็นศูนย์)",
     "en": "If the TS is shorted by a wire, the primary current becomes very large (the primary sees a load of zero)."
    }
   ],
   "formulas": [
    {
     "th": "V₂ = n·V₁",
     "en": "V₂ = n·V₁"
    },
    {
     "th": "I₂ = V₂ / R_load",
     "en": "I₂ = V₂ / R_load"
    },
    {
     "th": "I₁ = n·I₂ (ขนาด)",
     "en": "I₁ = n·I₂ (magnitude)"
    }
   ],
   "params": [
    {
     "key": "grp",
     "default": 1,
     "unit": "",
     "meaning": {
      "th": "เลขคู่ ต้องตรงกับ TP",
      "en": "Pair number, must match the TP"
     }
    },
    {
     "key": "Imax",
     "default": 2,
     "unit": "A",
     "meaning": {
      "th": "กระแสสูงสุดของขด (เฉพาะโหมดจริง)",
      "en": "Maximum coil current (real mode only)"
     }
    }
   ],
   "ideal_mode": {
    "th": "ทุติยภูมิของหม้อแปลงอุดมคติ V₂ = n·V₁",
    "en": "Secondary of an ideal transformer, V₂ = n·V₁."
   },
   "real_mode": {
    "th": "ขดลวดที่คัปปลิงกับ TP ด้วย k กระแสเกิน Imax ขดไหม้",
    "en": "A coil coupled to the TP with k; current above Imax burns the coil."
   },
   "watch_out": [
    {
     "th": "วาง TS แถวล่างของ TP ติดกัน (เช่น TP y=5, TS y=6) และเดินสายทุติยภูมิลงด้านล่าง",
     "en": "Put the TS in the row just below the TP and run the secondary wires downward."
    }
   ],
   "try_it": {
    "th": "ลัดขด TS ด้วยสายในโหมดอุดมคติ แล้วทายก่อนว่ากระแสปฐมภูมิเป็นอย่างไร (สูงมาก เพราะโหลดที่ปฐมภูมิเห็นเข้าใกล้ศูนย์)",
    "en": "In ideal mode short the TS with a wire and predict what happens to the primary current (very large, since the load seen by the primary approaches zero)."
   }
  },
  {
   "id": "diode",
   "code": "D",
   "name": {
    "th": "ไดโอด",
    "en": "Diode"
   },
   "group": {
    "th": "สารกึ่งตัวนำ",
    "en": "Semiconductors"
   },
   "what": {
    "th": "อุปกรณ์ที่ให้กระแสไหลทางเดียว จากขา a (แอโนด) ไปขา b (แคโทด)",
    "en": "A device that lets current flow one way only, from leg a (anode) to leg b (cathode)."
   },
   "behavior": [
    {
     "th": "ไบแอสไปข้างหน้า (V(a) > V(b)): นำไฟ",
     "en": "Forward biased (V(a) > V(b)): it conducts."
    },
    {
     "th": "ไบแอสย้อนกลับ: ไม่นำไฟ กระแสเป็นศูนย์ และแรงดันคร่อมไดโอดเท่ากับแรงดันที่เหลือ",
     "en": "Reverse biased: it does not conduct, the current is zero and the voltage across it equals the voltage left over in the loop."
    },
    {
     "th": "ใช้ตัดไฟสลับให้เหลือครึ่งคลื่น (วงจรเรียงกระแส)",
     "en": "Used to cut AC to half waves (a rectifier circuit)."
    }
   ],
   "formulas": [
    {
     "th": "อุดมคติ: V_D = 0 เมื่อนำ, I = 0 เมื่อไม่นำ",
     "en": "Ideal: V_D = 0 when conducting, I = 0 when blocking"
    },
    {
     "th": "จริง: V_D ≈ 0.7 V เมื่อนำ",
     "en": "Real: V_D ≈ 0.7 V when conducting"
    }
   ],
   "params": [
    {
     "key": "Pmax",
     "default": 1,
     "unit": "W",
     "meaning": {
      "th": "กำลังสูงสุด (เฉพาะโหมดจริง)",
      "en": "Maximum power (real mode only)"
     }
    }
   ],
   "ideal_mode": {
    "th": "เป็นสวิตช์ทางเดียวสมบูรณ์ ไม่มีแรงดันตก ไม่รั่ว",
    "en": "A perfect one-way switch: no voltage drop, no leakage."
   },
   "real_mode": {
    "th": "แรงดันตกประมาณ 0.7 V",
    "en": "Voltage drop of about 0.7 V."
   },
   "watch_out": [
    {
     "th": "ทิศการนำคือ a ไป b ต่อกลับด้านแล้ววงจรจะไม่มีกระแส",
     "en": "The conducting direction is a to b. Connected backwards, the circuit has no current."
    }
   ],
   "try_it": {
    "th": "ต่อ AC 10 V กับ D อนุกรมกับ R ดูว่าแรงดันคร่อม R เหลือเฉพาะครึ่งบวก แล้วทายค่าเฉลี่ย (Vp/π ≈ 3.18 V)",
    "en": "Connect AC 10 V and a diode in series with R and see that only the positive half appears across R. Predict its average (Vp/π ≈ 3.18 V)."
   }
  },
  {
   "id": "led",
   "code": "LED",
   "name": {
    "th": "ไดโอดเปล่งแสง (LED)",
    "en": "Light-emitting diode (LED)"
   },
   "group": {
    "th": "สารกึ่งตัวนำ",
    "en": "Semiconductors"
   },
   "what": {
    "th": "ไดโอดที่เปล่งแสงเมื่อมีกระแสไหลไปข้างหน้า สีขึ้นกับชนิดสารกึ่งตัวนำ",
    "en": "A diode that emits light when current flows forward. The colour depends on the semiconductor."
   },
   "behavior": [
    {
     "th": "นำไฟจาก a ไป b เหมือนไดโอด แต่แรงดันตกคร่อมสูงกว่า และขึ้นกับสี",
     "en": "It conducts from a to b like a diode but with a larger voltage drop that depends on the colour."
    },
    {
     "th": "ต้องมีตัวต้านทานอนุกรมจำกัดกระแสเสมอ ไม่เช่นนั้นกระแสสูงเกินจนไหม้",
     "en": "A series resistor to limit the current is always needed, otherwise the current is so large that the LED burns."
    },
    {
     "th": "ความสว่างขึ้นกับกระแสที่ผ่าน",
     "en": "Brightness depends on the current through it."
    }
   ],
   "formulas": [
    {
     "th": "I = (E − V_LED) / R",
     "en": "I = (E − V_LED) / R"
    },
    {
     "th": "แรงดันตกโดยประมาณ: แดง/ส้ม ≈ 2 V, เหลือง 2.1 V, เขียว 2.2 V, น้ำเงิน 3 V, ขาว 3.1 V",
     "en": "Approximate drop: red/orange ≈ 2 V, yellow 2.1 V, green 2.2 V, blue 3 V, white 3.1 V"
    }
   ],
   "params": [
    {
     "key": "color",
     "default": "red",
     "unit": "",
     "meaning": {
      "th": "red, orange, yellow, green, blue หรือ white",
      "en": "red, orange, yellow, green, blue or white"
     }
    },
    {
     "key": "Pmax",
     "default": 0.1,
     "unit": "W",
     "meaning": {
      "th": "กำลังสูงสุด (เฉพาะโหมดจริง)",
      "en": "Maximum power (real mode only)"
     }
    }
   ],
   "ideal_mode": {
    "th": "ยังใช้สมการเอกซ์โพเนนเชียลเหมือนโหมดจริง จึงมีแรงดันตกตามสี (ต่างจากไดโอดธรรมดา)",
    "en": "Still uses the exponential equation like real mode, so it has a colour-dependent drop (unlike the ideal diode)."
   },
   "real_mode": {
    "th": "เกินกำลังแล้ว LED ไหม้",
    "en": "Over its power rating the LED burns."
   },
   "watch_out": [
    {
     "th": "ค่าแรงดันตกเป็นค่าประมาณ ค่าจริงเปลี่ยนเล็กน้อยตามกระแส",
     "en": "The drops are approximate; the real value changes slightly with current."
    },
    {
     "th": "LED สีน้ำเงินกับขาวต้องใช้ถ่านสูงกว่า 3.1 V ถึงจะติด",
     "en": "Blue and white LEDs need a battery above 3.1 V to light."
    }
   ],
   "try_it": {
    "th": "ต่อถ่าน 9 V, R = 330 Ω กับ LED เขียว ทายก่อนว่ากระแสประมาณกี่มิลลิแอมแปร์ แล้วเปลี่ยนเป็นสีน้ำเงินแล้วทายซ้ำ",
    "en": "Connect a 9 V battery, R = 330 Ω and a green LED. Predict the current in mA, then change to blue and predict again."
   }
  },
  {
   "id": "vm",
   "code": "VM",
   "name": {
    "th": "โวลต์มิเตอร์",
    "en": "Voltmeter"
   },
   "group": {
    "th": "มิเตอร์",
    "en": "Meters"
   },
   "what": {
    "th": "มิเตอร์วัดความต่างศักย์ระหว่างสองจุด อ่านค่า V(a) − V(b)",
    "en": "A meter that measures the potential difference between two points. It reads V(a) − V(b)."
   },
   "behavior": [
    {
     "th": "ต้องต่อขนานกับสิ่งที่ต้องการวัด",
     "en": "Connect it in parallel with what you want to measure."
    },
    {
     "th": "โวลต์มิเตอร์อุดมคติมีความต้านทานอนันต์ ไม่ดึงกระแสและไม่รบกวนวงจร",
     "en": "An ideal voltmeter has infinite resistance, so it draws no current and does not disturb the circuit."
    },
    {
     "th": "ค่าอาจติดลบ ถ้า b มีศักย์สูงกว่า a",
     "en": "The reading can be negative if b is at a higher potential than a."
    }
   ],
   "formulas": [
    {
     "th": "อ่านค่า V(a) − V(b)",
     "en": "Reads V(a) − V(b)"
    }
   ],
   "params": [],
   "ideal_mode": {
    "th": "ไม่ดึงกระแสเลย (ไม่ใส่ในสมการ)",
    "en": "Draws no current (left out of the equations)."
   },
   "real_mode": {
    "th": "ความต้านทาน 1 MΩ ดึงกระแสเล็กน้อย",
    "en": "1 MΩ resistance draws a small current."
   },
   "watch_out": [
    {
     "th": "ต่ออนุกรมโดยผิดที่จะทำให้วงจรขาด กระแสเป็นศูนย์",
     "en": "Connected in series by mistake it breaks the circuit and the current is zero."
    },
    {
     "th": "ต่อขนานกับสวิตช์ที่เปิดอยู่จะอ่านแรงดันของแหล่งจ่ายเต็มๆ",
     "en": "Across an open switch it reads the full source voltage."
    }
   ],
   "try_it": {
    "th": "ต่อ VM คร่อมสวิตช์ที่เปิดอยู่ ทายก่อนว่าอ่านได้กี่โวลต์",
    "en": "Connect a voltmeter across an open switch and predict its reading first."
   }
  },
  {
   "id": "am",
   "code": "AM",
   "name": {
    "th": "แอมมิเตอร์",
    "en": "Ammeter"
   },
   "group": {
    "th": "มิเตอร์",
    "en": "Meters"
   },
   "what": {
    "th": "มิเตอร์วัดกระแสไฟฟ้าที่ไหลผ่านตัวมันจากขา a ไปขา b",
    "en": "A meter that measures the current passing through it from leg a to leg b."
   },
   "behavior": [
    {
     "th": "ต้องต่ออนุกรมในสาขาที่ต้องการวัด",
     "en": "Connect it in series in the branch you want to measure."
    },
    {
     "th": "แอมมิเตอร์อุดมคติมีความต้านทานเป็นศูนย์ จึงไม่ทำให้กระแสในวงจรเปลี่ยน",
     "en": "An ideal ammeter has zero resistance, so it does not change the current in the circuit."
    },
    {
     "th": "กระแสอ่านเป็นบวกเมื่อไหลจาก a ไป b",
     "en": "The reading is positive when the current flows from a to b."
    }
   ],
   "formulas": [
    {
     "th": "อ่านกระแสจาก a ไป b",
     "en": "Reads the current from a to b"
    }
   ],
   "params": [
    {
     "key": "Pmax",
     "default": 2,
     "unit": "W",
     "meaning": {
      "th": "กำลังสูงสุด (เฉพาะโหมดจริง)",
      "en": "Maximum power (real mode only)"
     }
    }
   ],
   "ideal_mode": {
    "th": "ความต้านทาน 0 พอดี เป็นตัวลัดอุดมคติ",
    "en": "Exactly 0 Ω; it acts as an ideal short."
   },
   "real_mode": {
    "th": "ความต้านทาน 0.1 Ω",
    "en": "0.1 Ω resistance."
   },
   "watch_out": [
    {
     "th": "ต่อขนานกับชิ้นใดจะลัดชิ้นนั้นทันที",
     "en": "Connected in parallel with any part it shorts that part at once."
    },
    {
     "th": "แอมมิเตอร์ที่ถูกลัดด้วยสายจะอ่านศูนย์พอดี",
     "en": "An ammeter shorted by a wire reads exactly zero."
    }
   ],
   "try_it": {
    "th": "ใส่แอมมิเตอร์ในสาขาของตัวต้านทานที่มีสายลัดคร่อมอยู่ ทายก่อนว่าอ่านได้เท่าไร (0 A)",
    "en": "Put an ammeter in the branch of a resistor that has a wire across it and predict the reading (0 A)."
   }
  },
  {
   "id": "gnd",
   "code": "GND",
   "name": {
    "th": "จุดกราว",
    "en": "Ground"
   },
   "group": {
    "th": "อ้างอิง",
    "en": "Reference"
   },
   "what": {
    "th": "จุดอ้างอิงศักย์ 0 V ของวงจร ศักย์ของจุดอื่นวัดเทียบกับจุดนี้",
    "en": "The 0 V reference point of the circuit. The potential of every other point is measured relative to it."
   },
   "behavior": [
    {
     "th": "ขา a ต่อกับโหนดที่ต้องการให้เป็น 0 V ขา b เป็นแค่ส่วนของรูปวาดและต้องไม่ต่ออะไร",
     "en": "Leg a connects to the node that should be 0 V. Leg b is only part of the drawing and must stay unconnected."
    },
    {
     "th": "วางหลายจุดในวงจรเดียวกันได้ ทุกจุดนั้นเป็น 0 V",
     "en": "Several grounds in the same circuit are all 0 V."
    },
    {
     "th": "ไม่วางก็ได้ แผงเลือกจุดอ้างอิงให้เอง",
     "en": "It is optional; without it the board picks a reference itself."
    },
    {
     "th": "การเลือกกราวไม่เปลี่ยนกระแสและแรงดันคร่อมอุปกรณ์ เปลี่ยนเฉพาะศักย์ของแต่ละโหนด",
     "en": "Choosing the ground does not change currents or the voltage across devices, only the potential of each node."
    }
   ],
   "formulas": [
    {
     "th": "ศักย์ φ ของโหนด = V(โหนด) − V(กราว)",
     "en": "Potential φ of a node = V(node) − V(ground)"
    }
   ],
   "params": [],
   "ideal_mode": {
    "th": "ทำหน้าที่เหมือนกัน",
    "en": "Works the same."
   },
   "real_mode": {
    "th": "ทำหน้าที่เหมือนกัน",
    "en": "Works the same."
   },
   "watch_out": [
    {
     "th": "ห้ามต่อสายเข้าขา b ของ GND",
     "en": "Never connect a wire to leg b of the ground."
    }
   ],
   "try_it": {
    "th": "ต่อกราวที่ขั้วบวกของถ่านแทนขั้วลบ ดูว่าศักย์ของโหนดอื่นกลายเป็นลบ แต่แรงดันคร่อมแต่ละตัวไม่เปลี่ยน",
    "en": "Place the ground at the positive terminal of the battery instead of the negative one. Other nodes become negative, but the voltage across each device does not change."
   }
  }
 ],
 "concepts": [
  {
   "id": "node",
   "title": {
    "th": "โหนด (node)",
    "en": "Node"
   },
   "text": {
    "th": "โหนดคือจุดหรือกลุ่มจุดที่ต่อถึงกันด้วยสายตัวนำ ทุกจุดในโหนดเดียวกันมีศักย์ไฟฟ้าเท่ากัน บนแผงนี้สายหนึ่งเส้นเชื่อมทุกจุดกริดที่มันวิ่งผ่าน และสายที่ตัดกันบนจุดกริดถือเป็นโหนดเดียวกันเสมอ ขาของอุปกรณ์ที่อยู่บนจุดเดียวกันจึงเป็นโหนดเดียวกัน",
    "en": "A node is a point, or group of points, joined by conducting wire. Every point in one node is at the same potential. On this board one wire connects every grid point it passes through, and wires that cross on a grid point are always one node. Device legs on the same point are therefore the same node."
   },
   "points": [
    {
     "th": "อุปกรณ์สองขา อยู่ระหว่างสองโหนด และเป็นสิ่งที่ทำให้สองโหนดนั้นมีศักย์ต่างกัน",
     "en": "A two-leg device sits between two nodes and is what makes those two nodes differ in potential."
    },
    {
     "th": "สายไฟอุดมคติไม่มีความต้านทาน จึงไม่มีแรงดันตกคร่อมสาย",
     "en": "An ideal wire has no resistance, so there is no voltage drop along it."
    },
    {
     "th": "ขาของอุปกรณ์ที่ไม่ต่ออะไรเลยคือโหนดลอย ไม่มีกระแสผ่าน",
     "en": "A device leg connected to nothing is a floating node with no current through it."
    }
   ]
  },
  {
   "id": "ground",
   "title": {
    "th": "ศักย์ไฟฟ้าและจุดอ้างอิง",
    "en": "Potential and the reference point"
   },
   "text": {
    "th": "แรงดัน (ความต่างศักย์) เป็นค่าระหว่างสองจุด ส่วนศักย์ของโหนดเดียวต้องบอกเทียบกับจุดอ้างอิงที่เลือกให้เป็น 0 V ปกติเลือกขั้วลบของแหล่งจ่าย",
    "en": "Voltage (potential difference) is a quantity between two points. The potential of a single node must be stated relative to a chosen 0 V reference, normally the negative terminal of the source."
   },
   "points": [
    {
     "th": "V(a) − V(b) ที่โวลต์มิเตอร์อ่าน ไม่ขึ้นกับว่าเลือกกราวตรงไหน",
     "en": "V(a) − V(b), as read by a voltmeter, does not depend on where the ground is."
    },
    {
     "th": "กระแสไหลจากศักย์สูงไปศักย์ต่ำผ่านตัวต้านทาน",
     "en": "Current flows through a resistor from higher to lower potential."
    }
   ]
  },
  {
   "id": "kcl",
   "title": {
    "th": "กฎกระแสของเคอร์ชอฟฟ์ (KCL) ที่โหนด",
    "en": "Kirchhoff's current law (KCL) at a node"
   },
   "text": {
    "th": "ผลรวมกระแสที่ไหลเข้าโหนดเท่ากับผลรวมกระแสที่ไหลออกจากโหนดนั้น เพราะประจุไม่สะสมที่โหนด ใช้อธิบายว่าทำไมกระแสรวมในวงจรขนานเท่ากับผลบวกกระแสแต่ละสาขา",
    "en": "The total current flowing into a node equals the total current flowing out, because charge does not accumulate at a node. It explains why the total current in a parallel circuit equals the sum of the branch currents."
   },
   "points": [
    {
     "th": "แผงนี้แก้สมการด้วยหลักนี้ทุกก้าวเวลา",
     "en": "The board solves its equations with this law at every time step."
    },
    {
     "th": "ตัวอย่าง: วงจรผสม mixed ที่โหนด A กระแสเข้า 0.6 A แยกออกเป็น 0.4 A และ 0.2 A",
     "en": "Example: in the mixed circuit, at node A the 0.6 A coming in splits into 0.4 A and 0.2 A."
    }
   ]
  },
  {
   "id": "kvl",
   "title": {
    "th": "กฎแรงดันของเคอร์ชอฟฟ์ (KVL) รอบลูป",
    "en": "Kirchhoff's voltage law (KVL) around a loop"
   },
   "text": {
    "th": "ผลรวมของแรงดันที่เพิ่มขึ้นจากแหล่งจ่ายรอบลูปปิด เท่ากับผลรวมของแรงดันที่ตกคร่อมอุปกรณ์ในลูปนั้น ใช้อธิบายตัวแบ่งแรงดันและวงจรอนุกรม",
    "en": "Around a closed loop, the voltage supplied by the sources equals the sum of the voltage drops across the devices in that loop. It explains the voltage divider and series circuits."
   },
   "points": [
    {
     "th": "ตัวอย่าง: วงจรอนุกรม 9 V = 3 V (R1) + 6 V (R2)",
     "en": "Example: in the series circuit, 9 V = 3 V (R1) + 6 V (R2)."
    }
   ]
  },
  {
   "id": "open",
   "title": {
    "th": "วงจรเปิด (open circuit)",
    "en": "Open circuit"
   },
   "text": {
    "th": "วงจรที่ทางเดินของกระแสขาดตอน กระแสเป็นศูนย์ในสาขานั้น เกิดจากสวิตช์เปิด ฟิวส์ขาด ขาลอย หรือมีอุปกรณ์ที่ไม่นำไฟอยู่ในทางเดิน",
    "en": "A circuit in which the path of the current is broken, so the current in that branch is zero. It is caused by an open switch, a blown fuse, a floating leg, or a non-conducting device in the path."
   },
   "points": [
    {
     "th": "กระแสเป็นศูนย์ ดังนั้นแรงดันตกคร่อมตัวต้านทานที่อนุกรมอยู่เป็นศูนย์",
     "en": "The current is zero, so the voltage drop across a series resistor is zero."
    },
    {
     "th": "แรงดันทั้งหมดไปตกคร่อมจุดที่ขาด จึงอ่านได้เท่าแรงดันแหล่งจ่ายเมื่อใช้ VM คร่อมจุดนั้น",
     "en": "All the voltage falls across the break, so a voltmeter across it reads the source voltage."
    }
   ]
  },
  {
   "id": "short",
   "title": {
    "th": "วงจรลัด (short circuit)",
    "en": "Short circuit"
   },
   "text": {
    "th": "วงจรลัดคือการที่กระแสมีเส้นทางลัดที่ความต้านทานต่ำมากหรือเป็นศูนย์ ทำให้กระแสเลือกไหลทางลัดนั้น มีสองแบบที่ต้องแยกให้ออก",
    "en": "A short circuit is an extra path of very low or zero resistance, so the current prefers that path. There are two kinds to tell apart."
   },
   "points": [
    {
     "th": "ลัดคร่อมโหลด: สายต่อขนานกับตัวต้านทานหรือหลอดไฟ กระแสไหลผ่านสายหมด โหลดนั้นไม่มีกระแสและไม่ทำงาน แต่วงจรส่วนที่เหลือยังทำงานปกติ (วงจร short_resistor)",
     "en": "Shorting a load: a wire in parallel with a resistor or bulb. All the current takes the wire, so that load has no current and does not work, but the rest of the circuit still works normally (circuit short_resistor)."
    },
    {
     "th": "ลัดแหล่งจ่าย: สายต่อตรงระหว่างขั้วบวกกับขั้วลบ ไม่มีโหลดจำกัดกระแส กระแสเท่ากับ E/r สูงมาก ความร้อนที่ความต้านทานภายในทำให้ถ่านพังหรือระเบิด (วงจร short_source)",
     "en": "Shorting the source: a wire straight between the positive and negative terminals. Nothing limits the current, so it equals E/r and is very large; the heat in the internal resistance can ruin or explode the battery (circuit short_source)."
    },
    {
     "th": "ในโหมดอุดมคติ ชิ้นที่ลัดคือสวิตช์ที่ปิด แอมมิเตอร์ ฟิวส์ และไดโอดที่นำไฟ สาขาที่ถูกลัดด้วยชิ้นเหล่านี้ได้กระแส 0 พอดี",
     "en": "In ideal mode the parts that act as shorts are a closed switch, an ammeter, a fuse and a conducting diode. A branch shorted by one of them carries exactly 0 A."
    },
    {
     "th": "แอมมิเตอร์ต่อขนานกับชิ้นใดเท่ากับลัดชิ้นนั้น เป็นข้อผิดพลาดที่พบบ่อย",
     "en": "An ammeter connected in parallel with a part shorts that part. This is a common mistake."
    },
    {
     "th": "ฟิวส์มีไว้ป้องกันวงจรลัด: กระแสเกินพิกัดแล้วขาด ตัดวงจรก่อนอุปกรณ์อื่นพัง (วงจร fuse_blow)",
     "en": "A fuse protects against short circuits: when the current exceeds its rating it blows and cuts the circuit before other parts fail (circuit fuse_blow)."
    }
   ]
  },
  {
   "id": "series_parallel",
   "title": {
    "th": "อนุกรมกับขนาน",
    "en": "Series and parallel"
   },
   "text": {
    "th": "อนุกรมคืออุปกรณ์ต่อเรียงกันเป็นทางเดียว กระแสเท่ากัน ขนานคืออุปกรณ์ต่อคร่อมสองโหนดเดียวกัน แรงดันเท่ากัน",
    "en": "Series means devices connected one after another in a single path, with the same current. Parallel means devices connected across the same two nodes, with the same voltage."
   },
   "points": [
    {
     "th": "อนุกรม: แรงดันแบ่งตามความต้านทาน ตัวที่ R มากได้แรงดันมาก",
     "en": "Series: the voltage divides in proportion to resistance; the larger R gets more voltage."
    },
    {
     "th": "ขนาน: กระแสแบ่งตามความนำ ตัวที่ R น้อยได้กระแสมาก",
     "en": "Parallel: the current divides in proportion to conductance; the smaller R gets more current."
    },
    {
     "th": "แอมมิเตอร์ต่ออนุกรม โวลต์มิเตอร์ต่อขนาน",
     "en": "An ammeter goes in series and a voltmeter goes in parallel."
    }
   ]
  },
  {
   "id": "ideal_real",
   "title": {
    "th": "โหมดอุดมคติกับโหมดจริง",
    "en": "Ideal mode and real mode"
   },
   "text": {
    "th": "โหมดอุดมคติ (ideal=1) ใช้เมื่อโจทย์บอกให้ถือว่าอุปกรณ์อุดมคติ ไม่มีความร้อนและไม่ไหม้ โหมดจริง (ideal=0) มีความต้านทานภายในและพิกัดของอุปกรณ์ ทำให้ดูการไหม้ ระเบิด และฟิวส์ขาดได้",
    "en": "Ideal mode (ideal=1) is for when a problem says to treat the devices as ideal: no heat and nothing burns. Real mode (ideal=0) has internal resistance and device ratings, so you can see burning, explosions and a fuse blowing."
   },
   "points": [
    {
     "th": "แหล่งจ่ายอุดมคติไม่มี r แอมมิเตอร์ สวิตช์ ฟิวส์ ความต้านทาน 0 โวลต์มิเตอร์ไม่ดึงกระแส ไดโอดไม่มีแรงดันตก",
     "en": "Ideal: the source has no r; ammeter, switch and fuse have 0 Ω; the voltmeter draws no current; the diode has no voltage drop."
    },
    {
     "th": "โหมดจริง: แอมมิเตอร์ 0.1 Ω, สวิตช์ 1 mΩ, ฟิวส์ 0.05 Ω, โวลต์มิเตอร์ 1 MΩ, ไดโอดตก ≈ 0.7 V",
     "en": "Real: ammeter 0.1 Ω, switch 1 mΩ, fuse 0.05 Ω, voltmeter 1 MΩ, diode drop ≈ 0.7 V."
    },
    {
     "th": "r, Pmax, Imax และ Vmax มีผลเฉพาะโหมดจริง",
     "en": "r, Pmax, Imax and Vmax matter only in real mode."
    }
   ]
  }
 ],
 "circuits": [
  {
   "id": "series",
   "title": {
    "th": "วงจรอนุกรม",
    "en": "Series circuit"
   },
   "topic": {
    "th": "อนุกรม",
    "en": "Series"
   },
   "code": "CIRCUIT v1 ideal=1\nTITLE วงจรอนุกรม R1 R2\nDC  2,10 2,8  E=9\nAM  2,6 2,4   name=I_total\nR   5,3 7,3   R=100 name=R1\nR   9,3 11,3  R=200 name=R2\nVM  5,6 7,6   name=V_R1\nVM  9,6 11,6  name=V_R2\nW   2,8 2,6\nW   2,4 2,3 5,3\nW   5,3 5,6\nW   7,3 9,3\nW   7,3 7,6\nW   9,3 9,6\nW   11,3 15,3 15,15 2,15 2,10\nW   11,3 11,6",
   "check": "dc",
   "why": {
    "th": "ตัวต้านทานสองตัวอยู่ในทางเดินเดียวกันของกระแส ไม่มีทางแยก กระแสจึงเท่ากันทุกจุด ความต้านทานรวมเป็นผลบวก R = 100 + 200 = 300 Ω แรงดัน 9 V แบ่งตามความต้านทาน",
    "en": "The two resistors lie in one path with no branches, so the current is the same everywhere. The total resistance is the sum, R = 100 + 200 = 300 Ω, and the 9 V is shared in proportion to the resistances."
   },
   "readings": [
    {
     "meter": "I_total",
     "quantity": "current",
     "value": 0.03,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "I = 9/300",
      "en": "I = 9/300"
     },
     "t_s": null
    },
    {
     "meter": "V_R1",
     "quantity": "voltage",
     "value": 3,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "I·R1 = 0.03×100",
      "en": "I·R1 = 0.03×100"
     },
     "t_s": null
    },
    {
     "meter": "V_R2",
     "quantity": "voltage",
     "value": 6,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "I·R2 = 0.03×200 และรวมกับ V_R1 ได้ 9 V ตาม KVL",
      "en": "I·R2 = 0.03×200; with V_R1 it makes 9 V, as KVL says"
     },
     "t_s": null
    }
   ],
   "try_it": {
    "th": "เปลี่ยน R2 เป็น 400 Ω ทายก่อนว่า I และ V_R2 เป็นเท่าไร (0.018 A และ 7.2 V)",
    "en": "Change R2 to 400 Ω and predict I and V_R2 (0.018 A and 7.2 V)."
   }
  },
  {
   "id": "parallel",
   "title": {
    "th": "วงจรขนาน",
    "en": "Parallel circuit"
   },
   "topic": {
    "th": "ขนาน",
    "en": "Parallel"
   },
   "code": "CIRCUIT v1 ideal=1\nTITLE วงจรขนาน R1 R2\nDC  2,10 2,8  E=12\nAM  2,6 2,4   name=I_total\nAM  8,5 8,7   name=I_1\nR   8,9 8,11  R=40 name=R1\nAM  13,5 13,7 name=I_2\nR   13,9 13,11 R=60 name=R2\nVM  16,6 16,8 name=V_S\nW   2,8 2,6\nW   2,4 2,3 16,3 16,6\nW   8,3 8,5\nW   8,7 8,9\nW   8,11 8,15\nW   13,3 13,5\nW   13,7 13,9\nW   13,11 13,15\nW   16,8 16,15 2,15 2,10",
   "check": "dc",
   "why": {
    "th": "ตัวต้านทานสองตัวต่อคร่อมโหนดบนและโหนดล่างคู่เดียวกัน แรงดันคร่อมจึงเท่ากันที่ 12 V กระแสแต่ละสาขาหาได้จาก V/R แล้วรวมกันเป็นกระแสทั้งหมดตาม KCL",
    "en": "Both resistors are connected across the same top and bottom nodes, so each has the same 12 V. Each branch current is V/R, and by KCL they add up to the total current."
   },
   "readings": [
    {
     "meter": "V_S",
     "quantity": "voltage",
     "value": 12,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "แรงดันคร่อมทั้งสองสาขาเท่ากัน",
      "en": "Both branches have the same voltage"
     },
     "t_s": null
    },
    {
     "meter": "I_1",
     "quantity": "current",
     "value": 0.3,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "12/40",
      "en": "12/40"
     },
     "t_s": null
    },
    {
     "meter": "I_2",
     "quantity": "current",
     "value": 0.2,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "12/60 ตัวที่ R น้อยกว่าได้กระแสมากกว่า",
      "en": "12/60; the smaller R gets more current"
     },
     "t_s": null
    },
    {
     "meter": "I_total",
     "quantity": "current",
     "value": 0.5,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "0.3 + 0.2 ความต้านทานรวม 24 Ω",
      "en": "0.3 + 0.2; total resistance is 24 Ω"
     },
     "t_s": null
    }
   ],
   "try_it": {
    "th": "เพิ่มสาขาที่สามขนานเข้าไป กระแสทั้งหมดเพิ่มขึ้นแต่ I_1 กับ I_2 เปลี่ยนไหม (ไม่เปลี่ยน)",
    "en": "Add a third branch in parallel. The total current rises, but do I_1 and I_2 change? (No.)"
   }
  },
  {
   "id": "mixed",
   "title": {
    "th": "วงจรผสม (R1 อนุกรมกับ R2 ขนาน R3)",
    "en": "Mixed circuit (R1 in series with R2 parallel R3)"
   },
   "topic": {
    "th": "ผสม/โหนด",
    "en": "Mixed / nodes"
   },
   "code": "CIRCUIT v1 ideal=1\nTITLE วงจรผสม\nDC  2,10 2,8  E=18\nAM  2,6 2,4   name=I_total\nR   5,3 7,3   R=10 name=R1\nAM  10,5 10,7 name=I_2\nR   10,9 10,11 R=30 name=R2\nAM  14,5 14,7 name=I_3\nR   14,9 14,11 R=60 name=R3\nVM  5,6 7,6   name=V_R1\nVM  17,6 17,8 name=V_A\nW   2,8 2,6\nW   2,4 2,3 5,3\nW   5,3 5,6\nW   7,3 7,6\nW   7,3 17,3 17,6\nW   10,3 10,5\nW   10,7 10,9\nW   10,11 10,15\nW   14,3 14,5\nW   14,7 14,9\nW   14,11 14,15\nW   17,8 17,15 2,15 2,10",
   "check": "dc",
   "why": {
    "th": "R2 กับ R3 ขนานกัน มีความต้านทานรวม 30×60/(30+60) = 20 Ω แล้วอนุกรมกับ R1 ได้ทั้งหมด 30 Ω ที่โหนด A (ปลายขวาของ R1 ที่ต่อกับสองสาขา) กระแสทั้งหมดแตกออกเป็นสองทาง",
    "en": "R2 and R3 in parallel give 30×60/(30+60) = 20 Ω, which is in series with R1 for 30 Ω in total. At node A (the right end of R1, joined to both branches) the total current splits into two paths."
   },
   "readings": [
    {
     "meter": "I_total",
     "quantity": "current",
     "value": 0.6,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "18/30",
      "en": "18/30"
     },
     "t_s": null
    },
    {
     "meter": "V_R1",
     "quantity": "voltage",
     "value": 6,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "0.6×10",
      "en": "0.6×10"
     },
     "t_s": null
    },
    {
     "meter": "V_A",
     "quantity": "voltage",
     "value": 12,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "ศักย์โหนด A เทียบกับขั้วลบ = 18 − 6 หรือ 0.6×20 ซึ่งคือแรงดันคร่อม R2 และ R3",
      "en": "Potential of node A relative to the negative terminal = 18 − 6, or 0.6×20; this is the voltage across R2 and R3"
     },
     "t_s": null
    },
    {
     "meter": "I_2",
     "quantity": "current",
     "value": 0.4,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "12/30",
      "en": "12/30"
     },
     "t_s": null
    },
    {
     "meter": "I_3",
     "quantity": "current",
     "value": 0.2,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "12/60 และ I_2 + I_3 = 0.6 ตาม KCL ที่โหนด A",
      "en": "12/60; I_2 + I_3 = 0.6 by KCL at node A"
     },
     "t_s": null
    }
   ],
   "try_it": {
    "th": "ทายก่อนว่าถ้าเอา R3 ออก V_A จะเพิ่มหรือลด (เพิ่มเป็น 13.5 V เพราะส่วนขนานเหลือ R2 ตัวเดียว 30 Ω ได้แรงดัน 18×30/40)",
    "en": "Predict whether V_A rises or falls if R3 is removed (it rises to 13.5 V, since the parallel part is just R2 = 30 Ω: 18×30/40)."
   }
  },
  {
   "id": "divider",
   "title": {
    "th": "ตัวแบ่งแรงดัน",
    "en": "Voltage divider"
   },
   "topic": {
    "th": "อนุกรม",
    "en": "Series"
   },
   "code": "CIRCUIT v1 ideal=1\nTITLE ตัวแบ่งแรงดัน\nDC  2,10 2,8  E=10\nAM  2,6 2,4   name=I\nR   5,3 7,3   R=300 name=R1\nR   12,7 12,9 R=200 name=R2\nVM  5,6 7,6   name=V_R1\nVM  15,7 15,9 name=V_out\nW   2,8 2,6\nW   2,4 2,3 5,3\nW   5,3 5,6\nW   7,3 12,3 12,7\nW   7,3 7,6\nW   12,7 15,7\nW   12,9 15,9\nW   12,9 12,15 2,15 2,10",
   "check": "dc",
   "why": {
    "th": "ตัวต้านทานสองตัวอนุกรมแบ่งแรงดันตามอัตราส่วนความต้านทาน V_out = E·R2/(R1+R2) ใช้ลดแรงดันให้ได้ค่าที่ต้องการ",
    "en": "Two series resistors divide the voltage in proportion to their resistances, V_out = E·R2/(R1+R2). It is used to reduce a voltage to a wanted value."
   },
   "readings": [
    {
     "meter": "I",
     "quantity": "current",
     "value": 0.02,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "10/500",
      "en": "10/500"
     },
     "t_s": null
    },
    {
     "meter": "V_R1",
     "quantity": "voltage",
     "value": 6,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "0.02×300",
      "en": "0.02×300"
     },
     "t_s": null
    },
    {
     "meter": "V_out",
     "quantity": "voltage",
     "value": 4,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "10×200/500",
      "en": "10×200/500"
     },
     "t_s": null
    }
   ],
   "try_it": {
    "th": "ถ้าต่อโหลดขนานกับ R2 แล้ว V_out จะเพิ่มหรือลด (ลด เพราะ R ขนานรวมน้อยลง)",
    "en": "If a load is connected in parallel with R2, does V_out rise or fall? (It falls, because the parallel resistance is smaller.)"
   }
  },
  {
   "id": "short_resistor",
   "title": {
    "th": "วงจรลัดคร่อมตัวต้านทาน",
    "en": "Short circuit across a resistor"
   },
   "topic": {
    "th": "วงจรลัด",
    "en": "Short circuit"
   },
   "code": "CIRCUIT v1 ideal=1\nTITLE ลัดคร่อม R2\nDC  2,10 2,8  E=9\nAM  2,6 2,4   name=I_total\nR   5,3 7,3   R=100 name=R1\nAM  10,5 10,7 name=I_R2\nR   10,9 10,11 R=200 name=R2\nW   2,8 2,6\nW   2,4 2,3 5,3\nW   7,3 14,3 14,15\nW   10,3 10,5\nW   10,7 10,9\nW   10,11 10,15\nW   14,15 2,15 2,10",
   "check": "dc",
   "why": {
    "th": "สายตรงที่ x=14 ต่อจากรางบนลงรางล่าง ขนานกับสาขา R2 สายไม่มีความต้านทาน กระแสทั้งหมดเลือกไหลผ่านสายนี้ ส่วน R2 อยู่ระหว่างสองจุดที่ศักย์เท่ากัน จึงไม่มีแรงดันคร่อมและไม่มีกระแส วงจรทำงานเหมือนมีแค่ R1",
    "en": "The straight wire at x=14 runs from the top rail to the bottom rail, in parallel with the R2 branch. The wire has no resistance, so all the current takes it. R2 sits between two points at equal potential, so it has no voltage across it and no current; the circuit behaves as if only R1 were there."
   },
   "readings": [
    {
     "meter": "I_total",
     "quantity": "current",
     "value": 0.09,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "9/100 เท่ากับกรณีไม่มี R2 เลย",
      "en": "9/100, the same as if R2 were not there"
     },
     "t_s": null
    },
    {
     "meter": "I_R2",
     "quantity": "current",
     "value": 0,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "ถูกลัด ไม่มีกระแสผ่าน",
      "en": "Shorted, so no current passes"
     },
     "t_s": null
    }
   ],
   "try_it": {
    "th": "เอาสายลัดที่ x=14 ออก แล้วดู I_total (0.03 A) และ I_R2 (0.03 A) เปรียบเทียบ",
    "en": "Remove the shorting wire at x=14 and compare I_total (0.03 A) and I_R2 (0.03 A)."
   }
  },
  {
   "id": "short_source",
   "title": {
    "th": "วงจรลัดแหล่งจ่าย (โหมดจริง)",
    "en": "Short circuit across the source (real mode)"
   },
   "topic": {
    "th": "วงจรลัด",
    "en": "Short circuit"
   },
   "code": "CIRCUIT v1 ideal=0\nTITLE ลัดวงจรแหล่งจ่าย\nDC  2,10 2,8  E=9 r=0.5 Pmax=20 name=E1\nW   2,8 5,8 5,10 2,10",
   "check": "dc",
   "why": {
    "th": "สายต่อตรงระหว่างขั้วบวก (ขา b) กับขั้วลบ (ขา a) ไม่มีโหลดใดจำกัดกระแส เหลือแค่ความต้านทานภายใน r = 0.5 Ω กระแสจึงสูงมาก และเกือบทั้งหมดของกำลังกลายเป็นความร้อนในตัวถ่านเอง สายเดินอ้อมไปทางขวา ไม่ผ่านจุดกลางของถ่าน",
    "en": "A wire joins the positive terminal (leg b) straight to the negative terminal (leg a). No load limits the current, only the internal resistance r = 0.5 Ω remains, so the current is very large and almost all the power becomes heat inside the battery itself. The wire goes round to the right and does not pass the middle point of the battery."
   },
   "readings": [
    {
     "meter": "E1",
     "quantity": "current",
     "value": 18,
     "unit": "A",
     "source": "card",
     "note": {
      "th": "I = E/r = 9/0.5 อ่านได้จากการ์ดอุปกรณ์ของแหล่งจ่าย ไม่มีมิเตอร์ในโค้ดนี้",
      "en": "I = E/r = 9/0.5; read it on the source's device card, there is no meter in this code"
     },
     "t_s": null
    },
    {
     "meter": "P_r",
     "quantity": "power",
     "value": 162,
     "unit": "W",
     "source": "calculated",
     "note": {
      "th": "I²r = 18²×0.5 มากกว่า Pmax = 20 W มาก ถ่านร้อนจนไหม้และระเบิด",
      "en": "I²r = 18²×0.5, far above Pmax = 20 W, so the battery overheats, burns and explodes"
     },
     "t_s": null
    }
   ],
   "try_it": {
    "th": "สลับเป็นโหมดอุดมคติ ดูกระแส (ประมาณ 90,000 A เพราะแผงใช้ r = 0.0001 Ω) และสังเกตว่าไม่ไหม้",
    "en": "Switch to ideal mode and look at the current (about 90,000 A, because the board uses r = 0.0001 Ω) and notice that nothing burns."
   }
  },
  {
   "id": "open_switch",
   "title": {
    "th": "วงจรเปิด (สวิตช์เปิด)",
    "en": "Open circuit (open switch)"
   },
   "topic": {
    "th": "วงจรเปิด",
    "en": "Open circuit"
   },
   "code": "CIRCUIT v1 ideal=1\nTITLE สวิตช์เปิด วงจรเปิด\nDC  2,10 2,8  E=9\nR   5,3 7,3   R=100 name=R1\nS   9,3 11,3  on=0 name=S1\nVM  9,6 11,6  name=V_S\nAM  14,6 14,8 name=I\nW   2,8 2,3 5,3\nW   7,3 9,3\nW   9,3 9,6\nW   11,3 11,6\nW   11,3 14,3 14,6\nW   14,8 14,15 2,15 2,10",
   "check": "dc",
   "why": {
    "th": "สวิตช์เปิดทำให้ทางเดินของกระแสขาด กระแสเป็นศูนย์ตลอดวงจร เมื่อไม่มีกระแส R1 ไม่มีแรงดันตก แรงดันทั้ง 9 V จึงไปตกคร่อมสวิตช์ที่เปิดอยู่",
    "en": "The open switch breaks the path of current, so the current is zero everywhere. With no current R1 has no voltage drop, so the whole 9 V falls across the open switch."
   },
   "readings": [
    {
     "meter": "I",
     "quantity": "current",
     "value": 0,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "วงจรเปิด",
      "en": "Open circuit"
     },
     "t_s": null
    },
    {
     "meter": "V_S",
     "quantity": "voltage",
     "value": 9,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "แรงดันคร่อมจุดที่ขาดเท่าแรงดันแหล่งจ่าย",
      "en": "The voltage across the break equals the source voltage"
     },
     "t_s": null
    }
   ],
   "try_it": {
    "th": "แตะสวิตช์ให้ปิด แล้วดู I (0.09 A) และ V_S (0 V) ทายก่อนว่า V_R1 จะเป็นเท่าไร (9 V)",
    "en": "Tap the switch closed and look at I (0.09 A) and V_S (0 V). Predict V_R1 (9 V)."
   }
  },
  {
   "id": "rc",
   "title": {
    "th": "ชาร์จตัวเก็บประจุ (RC)",
    "en": "Charging a capacitor (RC)"
   },
   "topic": {
    "th": "ตัวเก็บประจุ",
    "en": "Capacitor"
   },
   "code": "CIRCUIT v1 ideal=1\nTITLE ชาร์จตัวเก็บประจุ RC\nDC  2,10 2,8  E=9\nAM  2,6 2,4   name=I\nR   5,3 7,3   R=1000 name=R\nC   12,7 12,9 C=1000 name=C1\nVM  15,7 15,9 name=V_C\nW   2,8 2,6\nW   2,4 2,3 5,3\nW   7,3 12,3 12,7\nW   12,7 15,7\nW   12,9 15,9\nW   12,9 12,15 2,15 2,10",
   "check": "theory",
   "why": {
    "th": "ตอนต่อไฟ ตัวเก็บประจุว่าง แรงดันคร่อมเป็น 0 กระแสจึงสูงสุดเท่ากับกรณีมีแต่ R แล้วตัวเก็บประจุค่อยๆ เก็บประจุ แรงดันคร่อมเพิ่มจนเท่า 9 V กระแสลดจนเป็นศูนย์ ค่าคงตัวเวลา τ = RC = 1000 × 1000 µF = 1 วินาที",
    "en": "At the moment of connection the capacitor is empty with 0 V across it, so the current is at its maximum, the same as with R alone. Then it gradually stores charge, the voltage across it rises to 9 V and the current falls to zero. The time constant is τ = RC = 1000 × 1000 µF = 1 second."
   },
   "readings": [
    {
     "meter": "I",
     "quantity": "current",
     "value": 0.009,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "E/R",
      "en": "E/R"
     },
     "when": {
      "th": "t = 0 s",
      "en": "t = 0 s"
     },
     "t_s": 0
    },
    {
     "meter": "V_C",
     "quantity": "voltage",
     "value": 0,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "ยังไม่มีประจุ",
      "en": "No charge yet"
     },
     "when": {
      "th": "t = 0 s",
      "en": "t = 0 s"
     },
     "t_s": 0
    },
    {
     "meter": "V_C",
     "quantity": "voltage",
     "value": 5.689,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "9(1 − e⁻¹) ประมาณ 63% ของ 9 V",
      "en": "9(1 − e⁻¹), about 63% of 9 V"
     },
     "when": {
      "th": "t = 1 s (1τ)",
      "en": "t = 1 s (1τ)"
     },
     "t_s": 1
    },
    {
     "meter": "I",
     "quantity": "current",
     "value": 0.00331,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "0.009×e⁻¹",
      "en": "0.009×e⁻¹"
     },
     "when": {
      "th": "t = 1 s (1τ)",
      "en": "t = 1 s (1τ)"
     },
     "t_s": 1
    },
    {
     "meter": "V_C",
     "quantity": "voltage",
     "value": 8.552,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "9(1 − e⁻³)",
      "en": "9(1 − e⁻³)"
     },
     "when": {
      "th": "t = 3 s (3τ)",
      "en": "t = 3 s (3τ)"
     },
     "t_s": 3
    },
    {
     "meter": "V_C",
     "quantity": "voltage",
     "value": 8.939,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "9(1 − e⁻⁵) เกือบเต็ม 9 V",
      "en": "9(1 − e⁻⁵), almost the full 9 V"
     },
     "when": {
      "th": "t = 5 s (5τ)",
      "en": "t = 5 s (5τ)"
     },
     "t_s": 5
    },
    {
     "meter": "I",
     "quantity": "current",
     "value": 6.06e-05,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "0.009×e⁻⁵ เกือบ 0",
      "en": "0.009×e⁻⁵, almost 0"
     },
     "when": {
      "th": "t = 5 s (5τ)",
      "en": "t = 5 s (5τ)"
     },
     "t_s": 5
    }
   ],
   "try_it": {
    "th": "เปลี่ยน C เป็น 2000 µF ทายก่อนว่าที่ 1 วินาที V_C เป็นมากขึ้นหรือน้อยลง (น้อยลง เพราะ τ = 2 s ได้ 9(1−e^−0.5) = 3.54 V)",
    "en": "Change C to 2000 µF and predict whether V_C at 1 s is larger or smaller (smaller: τ = 2 s gives 9(1−e^−0.5) = 3.54 V)."
   }
  },
  {
   "id": "rl",
   "title": {
    "th": "กระแสในตัวเหนี่ยวนำ (RL)",
    "en": "Current in an inductor (RL)"
   },
   "topic": {
    "th": "ตัวเหนี่ยวนำ",
    "en": "Inductor"
   },
   "code": "CIRCUIT v1 ideal=1\nTITLE กระแสในตัวเหนี่ยวนำ RL\nDC  2,10 2,8  E=9\nAM  2,6 2,4   name=I\nR   5,3 7,3   R=10 name=R\nL   12,7 12,9 L=1 name=L1\nVM  15,7 15,9 name=V_L\nW   2,8 2,6\nW   2,4 2,3 5,3\nW   7,3 12,3 12,7\nW   12,7 15,7\nW   12,9 15,9\nW   12,9 12,15 2,15 2,10",
   "check": "theory",
   "why": {
    "th": "ตัวเหนี่ยวนำต้านการเปลี่ยนแปลงของกระแส ตอนต่อไฟกระแสยังเป็น 0 แรงดัน 9 V จึงตกคร่อม L ทั้งหมด จากนั้นกระแสค่อยๆ เพิ่ม แรงดันคร่อม L ลดลง จนสภาวะคงตัว L เหมือนสาย กระแสเหลือ E/R ค่าคงตัวเวลา τ = L/R = 1/10 = 0.1 วินาที",
    "en": "An inductor opposes changes in current. At connection the current is still 0, so the whole 9 V falls across L. The current then rises and the voltage across L falls until in steady state L acts like a wire and the current is E/R. The time constant is τ = L/R = 1/10 = 0.1 s."
   },
   "readings": [
    {
     "meter": "I",
     "quantity": "current",
     "value": 0,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "กระแสเปลี่ยนทันทีไม่ได้",
      "en": "Current cannot change instantly"
     },
     "when": {
      "th": "t = 0 s",
      "en": "t = 0 s"
     },
     "t_s": 0
    },
    {
     "meter": "V_L",
     "quantity": "voltage",
     "value": 9,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "L ได้แรงดันเต็ม",
      "en": "L has the full voltage"
     },
     "when": {
      "th": "t = 0 s",
      "en": "t = 0 s"
     },
     "t_s": 0
    },
    {
     "meter": "I",
     "quantity": "current",
     "value": 0.569,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "0.9(1 − e⁻¹)",
      "en": "0.9(1 − e⁻¹)"
     },
     "when": {
      "th": "t = 0.1 s (1τ)",
      "en": "t = 0.1 s (1τ)"
     },
     "t_s": 0.1
    },
    {
     "meter": "V_L",
     "quantity": "voltage",
     "value": 3.311,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "9e⁻¹",
      "en": "9e⁻¹"
     },
     "when": {
      "th": "t = 0.1 s (1τ)",
      "en": "t = 0.1 s (1τ)"
     },
     "t_s": 0.1
    },
    {
     "meter": "I",
     "quantity": "current",
     "value": 0.894,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "0.9(1 − e⁻⁵) เกือบ 0.9 A",
      "en": "0.9(1 − e⁻⁵), almost 0.9 A"
     },
     "when": {
      "th": "t = 0.5 s (5τ)",
      "en": "t = 0.5 s (5τ)"
     },
     "t_s": 0.5
    },
    {
     "meter": "V_L",
     "quantity": "voltage",
     "value": 0.0606,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "9e⁻⁵ เกือบ 0",
      "en": "9e⁻⁵, almost 0"
     },
     "when": {
      "th": "t = 0.5 s (5τ)",
      "en": "t = 0.5 s (5τ)"
     },
     "t_s": 0.5
    }
   ],
   "try_it": {
    "th": "เปลี่ยน L เป็น 2 H ทายก่อนว่ากระแสสุดท้ายเปลี่ยนไหม (ไม่เปลี่ยน ยังเป็น 0.9 A แต่ใช้เวลานานขึ้นเป็นสองเท่า)",
    "en": "Change L to 2 H and predict whether the final current changes (no, it stays 0.9 A, but it takes twice as long)."
   }
  },
  {
   "id": "halfwave",
   "title": {
    "th": "ไดโอดเรียงกระแสครึ่งคลื่น",
    "en": "Half-wave rectifier with a diode"
   },
   "topic": {
    "th": "ไดโอด",
    "en": "Diode"
   },
   "code": "CIRCUIT v1 ideal=1\nTITLE เรียงกระแสครึ่งคลื่น\nAC  2,10 2,8  E=10 f=5\nAM  2,6 2,4   name=I\nD   6,3 8,3   name=D1\nR   12,7 12,9 R=100 name=R_L\nVM  15,7 15,9 name=V_R\nW   2,8 2,6\nW   2,4 2,3 6,3\nW   8,3 12,3 12,7\nW   12,7 15,7\nW   12,9 15,9\nW   12,9 12,15 2,15 2,10",
   "check": "theory",
   "why": {
    "th": "ไดโอดนำไฟเฉพาะตอนที่ขา b ของแหล่งจ่าย (ที่ต่อกับขา a ของไดโอด) มีศักย์สูงกว่า คือครึ่งรอบบวก ครึ่งรอบลบไดโอดไม่นำ กระแสเป็น 0 แรงดันคร่อม R จึงมีแต่ครึ่งบวก",
    "en": "The diode conducts only while leg b of the source (joined to leg a of the diode) is at the higher potential, which is the positive half cycle. In the negative half the diode blocks, the current is 0 and the voltage across R is 0, so only the positive half appears across R. With f = 5 Hz the period is 0.2 s."
   },
   "readings": [
    {
     "meter": "V_R",
     "quantity": "voltage",
     "value": 10,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "ค่าสูงสุดเท่า E (ไดโอดอุดมคติไม่มีแรงดันตก)",
      "en": "The peak equals E (an ideal diode has no drop)"
     },
     "when": {
      "th": "t = 0.05 s (ยอดครึ่งรอบบวก, f = 5 Hz)",
      "en": "t = 0.05 s (peak of the positive half, f = 5 Hz)"
     },
     "t_s": 0.05
    },
    {
     "meter": "I",
     "quantity": "current",
     "value": 0.1,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "สูงสุด 10/100",
      "en": "Peak, 10/100"
     },
     "when": {
      "th": "t = 0.05 s (ยอดครึ่งรอบบวก)",
      "en": "t = 0.05 s (peak of the positive half)"
     },
     "t_s": 0.05
    },
    {
     "meter": "V_R",
     "quantity": "voltage",
     "value": 0,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "ไดโอดไม่นำ",
      "en": "The diode blocks"
     },
     "when": {
      "th": "t = 0.15 s (ยอดครึ่งรอบลบ)",
      "en": "t = 0.15 s (peak of the negative half)"
     },
     "t_s": 0.15
    },
    {
     "meter": "I",
     "quantity": "current",
     "value": 0,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "ไดโอดไม่นำ กระแสเป็น 0",
      "en": "The diode blocks, so the current is 0"
     },
     "when": {
      "th": "t = 0.15 s (ยอดครึ่งรอบลบ)",
      "en": "t = 0.15 s (peak of the negative half)"
     },
     "t_s": 0.15
    },
    {
     "meter": "V_R_avg",
     "quantity": "voltage",
     "value": 3.183,
     "unit": "V",
     "source": "calculated",
     "note": {
      "th": "ค่าเฉลี่ย Vp/π ตลอด 1 คาบ มิเตอร์บนแผงอ่านค่าชั่วขณะ ไม่แสดงค่าเฉลี่ย",
      "en": "Average Vp/π over one period; the meter on the board shows instantaneous values, not the average"
     },
     "when": {
      "th": "ค่าเฉลี่ยตลอด 1 คาบ (t = 0–0.2 s)",
      "en": "Average over one period (t = 0–0.2 s)"
     },
     "t_s": [
      0,
      0.2
     ]
    },
    {
     "meter": "V_R_rms",
     "quantity": "voltage",
     "value": 5,
     "unit": "V",
     "source": "calculated",
     "note": {
      "th": "ค่า rms ของครึ่งคลื่น = Vp/2 มิเตอร์บนแผงไม่แสดงค่านี้",
      "en": "rms of a half wave = Vp/2; the meter on the board does not show it"
     },
     "when": {
      "th": "ค่า rms ตลอด 1 คาบ (t = 0–0.2 s)",
      "en": "rms over one period (t = 0–0.2 s)"
     },
     "t_s": [
      0,
      0.2
     ]
    }
   ],
   "try_it": {
    "th": "กลับด้านไดโอด (สลับขา a กับ b) ทายก่อนว่า V_R เหลือครึ่งรอบไหน (ครึ่งรอบลบ มิเตอร์อ่านค่าติดลบได้ถึง −10 V)",
    "en": "Reverse the diode (swap legs a and b) and predict which half cycle remains (the negative half; the meter can read down to −10 V)."
   }
  },
  {
   "id": "transformer",
   "title": {
    "th": "หม้อแปลงเพิ่มแรงดัน 1:2",
    "en": "Step-up transformer 1:2"
   },
   "topic": {
    "th": "หม้อแปลง",
    "en": "Transformer"
   },
   "code": "CIRCUIT v1 ideal=1\nTITLE หม้อแปลงเพิ่มแรงดัน 1:2\nAC  2,10 2,8  E=10 f=5\nAM  2,6 2,4   name=I_P\nTP  7,5 9,5   grp=1 n=2 name=T_P\nTS  7,6 9,6   grp=1 name=T_S\nR   12,10 12,12 R=100 name=R_L\nVM  15,12 15,10 name=V_S\nW   2,8 2,6\nW   2,4 2,3 7,3 7,5\nW   9,5 9,1 1,1 1,10 2,10\nW   7,6 7,12 12,12 15,12\nW   9,6 9,10 12,10 15,10",
   "check": "theory",
   "why": {
    "th": "ปฐมภูมิรับ AC 10 V (peak) ทุติยภูมิมีจำนวนรอบเป็นสองเท่า จึงได้ V₂ = 2×10 = 20 V กระแสทุติยภูมิ I₂ = 20/100 = 0.2 A กำลังเข้าต้องเท่ากำลังออก กระแสปฐมภูมิจึงเป็นสองเท่า 0.4 A (ที่ปฐมภูมิเห็นโหลดเป็น R/n² = 25 Ω)",
    "en": "The primary receives AC 10 V (peak) and the secondary has twice as many turns, so V₂ = 2×10 = 20 V. The secondary current is I₂ = 20/100 = 0.2 A. Input power must equal output power, so the primary current is twice as large, 0.4 A (the primary sees the load as R/n² = 25 Ω)."
   },
   "readings": [
    {
     "meter": "V_S",
     "quantity": "voltage",
     "value": 20,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "n·V₁ เฟสเดียวกับแหล่งจ่าย",
      "en": "n·V₁, in phase with the source"
     },
     "when": {
      "th": "t = 0.05 s (ยอดครึ่งรอบบวก, f = 5 Hz)",
      "en": "t = 0.05 s (positive peak, f = 5 Hz)"
     },
     "t_s": 0.05
    },
    {
     "meter": "I_P",
     "quantity": "current",
     "value": 0.4,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "10/25 หรือ n×I₂",
      "en": "10/25, or n×I₂"
     },
     "when": {
      "th": "t = 0.05 s (ยอดครึ่งรอบบวก)",
      "en": "t = 0.05 s (positive peak)"
     },
     "t_s": 0.05
    },
    {
     "meter": "I_S",
     "quantity": "current",
     "value": 0.2,
     "unit": "A",
     "source": "calculated",
     "note": {
      "th": "20/100 ไม่มีมิเตอร์ตัวนี้ในโค้ดวงจร ใช้เทียบกับที่คำนวณ",
      "en": "20/100; there is no meter for this in the code, so use it to compare with your calculation"
     },
     "when": {
      "th": "t = 0.05 s (ยอดครึ่งรอบบวก)",
      "en": "t = 0.05 s (positive peak)"
     },
     "t_s": 0.05
    },
    {
     "meter": "V_S",
     "quantity": "voltage",
     "value": -20,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "ครึ่งรอบลบ แรงดันกลับทิศ",
      "en": "Negative half cycle, the voltage reverses"
     },
     "when": {
      "th": "t = 0.15 s (ยอดครึ่งรอบลบ)",
      "en": "t = 0.15 s (negative peak)"
     },
     "t_s": 0.15
    },
    {
     "meter": "I_P",
     "quantity": "current",
     "value": -0.4,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "กระแสกลับทิศตามแรงดัน",
      "en": "The current reverses with the voltage"
     },
     "when": {
      "th": "t = 0.15 s (ยอดครึ่งรอบลบ)",
      "en": "t = 0.15 s (negative peak)"
     },
     "t_s": 0.15
    },
    {
     "meter": "P",
     "quantity": "power",
     "value": 2,
     "unit": "W",
     "source": "calculated",
     "note": {
      "th": "V₁rms·I₁rms = 7.07×0.283 เท่ากำลังที่โหลด 14.1×0.141 ไม่มีมิเตอร์กำลังบนแผง",
      "en": "V₁rms·I₁rms = 7.07×0.283, equal to the load's 14.1×0.141; the board has no power meter"
     },
     "when": {
      "th": "กำลังเฉลี่ยตลอด 1 คาบ (t = 0–0.2 s)",
      "en": "Average power over one period (t = 0–0.2 s)"
     },
     "t_s": [
      0,
      0.2
     ]
    }
   ],
   "try_it": {
    "th": "เปลี่ยน n เป็น 0.5 ทายก่อนว่า V_S กับ I_P เป็นเท่าไร (V_S = 5 V, โหลดที่ปฐมภูมิเห็น = 100/0.25 = 400 Ω ได้ I_P = 10/400 = 0.025 A)",
    "en": "Change n to 0.5 and predict V_S and I_P (V_S = 5 V; the primary sees 100/0.25 = 400 Ω, so I_P = 10/400 = 0.025 A)."
   }
  },
  {
   "id": "led",
   "title": {
    "th": "LED กับตัวต้านทานจำกัดกระแส",
    "en": "LED with a current-limiting resistor"
   },
   "topic": {
    "th": "LED",
    "en": "LED"
   },
   "code": "CIRCUIT v1 ideal=1\nTITLE LED กับตัวต้านทานจำกัดกระแส\nDC  2,10 2,8  E=9\nAM  2,6 2,4   name=I\nR   6,3 8,3   R=330 name=R1\nLED 11,3 13,3 color=green name=LED1\nVM  11,6 13,6 name=V_LED\nW   2,8 2,6\nW   2,4 2,3 6,3\nW   8,3 11,3\nW   11,3 11,6\nW   13,3 13,6\nW   13,3 16,3 16,15 2,15 2,10",
   "check": "theory",
   "why": {
    "th": "LED นำไฟจาก a ไป b และมีแรงดันตกคร่อมคงที่ประมาณ 2.2 V (เขียว) แรงดันส่วนที่เหลือไปตกที่ตัวต้านทาน ตัวต้านทานจึงเป็นตัวกำหนดกระแส ถ้าไม่มีตัวต้านทาน กระแสจะสูงจน LED ไหม้",
    "en": "The LED conducts from a to b with a roughly constant voltage drop of about 2.2 V (green). The rest of the voltage falls across the resistor, so the resistor sets the current. Without it the current would be so large that the LED burns."
   },
   "readings": [
    {
     "meter": "V_LED",
     "quantity": "voltage",
     "value": 2.2,
     "unit": "V",
     "source": "meter",
     "note": {
      "th": "ประมาณ ตามสี",
      "en": "Approximate, set by the colour"
     },
     "t_s": null
    },
    {
     "meter": "I",
     "quantity": "current",
     "value": 0.0206,
     "unit": "A",
     "source": "meter",
     "note": {
      "th": "(9 − 2.2)/330 ประมาณ 20.6 mA ค่าบนแผงอาจต่างเล็กน้อย",
      "en": "(9 − 2.2)/330, about 20.6 mA; the board may differ slightly"
     },
     "t_s": null
    },
    {
     "meter": "V_R1",
     "quantity": "voltage",
     "value": 6.8,
     "unit": "V",
     "source": "calculated",
     "note": {
      "th": "9 − 2.2 ไม่มีมิเตอร์ตัวนี้ในโค้ดวงจร",
      "en": "9 − 2.2; there is no meter for this in the code"
     },
     "t_s": null
    }
   ],
   "try_it": {
    "th": "เปลี่ยนเป็น color=blue ทายก่อนว่ากระแสมากขึ้นหรือน้อยลง (น้อยลง ได้ (9−3)/330 ≈ 18.2 mA)",
    "en": "Change to color=blue and predict whether the current rises or falls (it falls, (9−3)/330 ≈ 18.2 mA)."
   }
  },
  {
   "id": "fuse_blow",
   "title": {
    "th": "ฟิวส์ขาดเมื่อกระแสเกิน (โหมดจริง)",
    "en": "A fuse blowing on over-current (real mode)"
   },
   "topic": {
    "th": "ฟิวส์",
    "en": "Fuse"
   },
   "code": "CIRCUIT v1 ideal=0\nTITLE ฟิวส์ขาดเมื่อกระแสเกิน\nDC  2,10 2,8  E=9 r=0.5 Pmax=20 name=E1\nF   5,3 7,3   Imax=0.5 name=F1\nR   10,3 12,3 R=10 Pmax=20 name=R1\nW   2,8 2,3 5,3\nW   7,3 10,3\nW   12,3 15,3 15,15 2,15 2,10",
   "check": "dc",
   "why": {
    "th": "กระแสที่วงจรพยายามดึงคือ 9/(0.5 + 0.05 + 10) ≈ 0.853 A ซึ่งเกินพิกัดฟิวส์ 0.5 A ฟิวส์จึงขาด วงจรเปิด กระแสเป็น 0 และตัวต้านทานรอดจากการร้อนต่อเนื่อง",
    "en": "The current the circuit tries to draw is 9/(0.5 + 0.05 + 10) ≈ 0.853 A, above the fuse rating of 0.5 A. The fuse blows, the circuit opens, the current becomes 0 and the resistor is spared continued heating."
   },
   "readings": [
    {
     "meter": "E1",
     "quantity": "current",
     "value": 0.8531,
     "unit": "A",
     "source": "card",
     "note": {
      "th": "E/(r + R_ฟิวส์ + R) = 9/10.55 อ่านจากการ์ดอุปกรณ์ของแหล่งจ่าย",
      "en": "E/(r + R_fuse + R) = 9/10.55; read it on the source's device card"
     },
     "when": {
      "th": "ก่อนฟิวส์ขาด (เหตุการณ์ ไม่ผูกกับเวลาที่แน่นอน)",
      "en": "Before the fuse blows (an event, not tied to a fixed time)"
     },
     "t_s": null
    },
    {
     "meter": "E1",
     "quantity": "current",
     "value": 0,
     "unit": "A",
     "source": "card",
     "note": {
      "th": "วงจรเปิดหลังฟิวส์ขาด",
      "en": "Open circuit after the fuse blows"
     },
     "when": {
      "th": "หลังฟิวส์ขาด",
      "en": "After the fuse blows"
     },
     "t_s": null,
     "verify": false
    }
   ],
   "try_it": {
    "th": "เปลี่ยน R เป็น 50 Ω กระแส ≈ 0.178 A ต่ำกว่า 0.5 A ฟิวส์จะไม่ขาด",
    "en": "Change R to 50 Ω: the current ≈ 0.178 A is below 0.5 A, so the fuse does not blow."
   }
  }
 ]
};

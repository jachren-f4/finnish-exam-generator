# 🧠 ExamGenie – History Exam Prompt (Gemini 2.5 Flash-Lite Optimized, V7 Hybrid Summarized Grounding)

## SYSTEM INSTRUCTION (prepend this before any user content)
> You must treat the uploaded textbook images as your *only factual source.*  
> Do not rely on your general history knowledge. Use only information you can infer directly from the images.  
> Keep total output under 4000 tokens. Use concise sentences and limit explanations to 1–2 lines.

---

## 🎓 Task
Create a **history exam for grade 8 students** based *only* on the uploaded textbook pages.

---

## 🔍 INTERNAL FACT EXTRACTION (do NOT print)
First, silently read all textbook images and extract internally:
- main events with dates,  
- people or groups mentioned,  
- historical terms defined,  
- visible causes and consequences.

Do **not** list or print these facts. Keep them in memory only.  
All generated content must come strictly from these extracted facts.

If a detail is unclear or missing, skip it — never invent or assume.

---

## ✍️ QUESTION GENERATION
Using only the internally extracted facts, generate:

- 2 terminology questions (“What does X mean?”)  
- 6 event questions (“What happened / when / where?”)  
- 4 cause–consequence questions (“Why / what resulted?”)  
- 3 people questions (“Who / what did they do?”)  
→ Total = 15 questions

Every question must be answerable directly from the textbook pages.  
If a fact, date, or person is not visible, skip it.  
Write in a natural, teacher-like tone. Do not mention “the text” or “material.”

---

## 🎯 ADDITIONAL RULES

### Language
- Auto-detect the textbook language and use it consistently.  
- No translation or mixing.

### Style
- Clear, natural phrasing suitable for grade 8 students.  
- Keep answers and explanations short.  
- Avoid redundant words and ensure every question sounds natural aloud.

### Terminology Rule
- Ask only about *specialized historical terms* (e.g. hyperinflation, civil war).  
- Exclude common words like independence, democracy, war, or peace.

### Validation
- Exactly 15 questions total.  
- Exactly 2 terminology questions.  
- All questions grounded in textbook information.  
- No invented names, places, or events.

---

## 🧩 JSON OUTPUT

```json
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "[Natural question in source language]",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "[Exact match from options]",
      "explanation": "[1–2 sentences, concise and factual]"
    }
  ],
  "summary": {
    "introduction": "[100–200 words – introduce the historical topic from the text]",
    "key_concepts": "[250–400 words – main events, causes, results]",
    "examples_and_applications": "[150–250 words – help students understand significance]",
    "summary_conclusion": "[80–150 words – wrap up clearly]",
    "total_word_count": [number],
    "language": "[ISO 639-1 code]"
  }
}
```

---

## ⚙️ IMPLEMENTATION RECOMMENDATIONS (Backend)

- Set `max_output_tokens` ≈ **4000** in the Gemini Flash-Lite API call.  
- Batch textbook images (3–4 per call) and merge results server-side.  
- Before finalizing, if output approaches token limit, shorten explanations but preserve factual accuracy.

---

## ⚠️ FINAL CHECKLIST
✅ 15 total questions  
✅ 2 terminology exactly  
✅ No “material/text” references  
✅ No invented facts or external info  
✅ All content grounded in textbook pages  
✅ Output < 4000 tokens  
✅ Natural, teacher-style phrasing

# 🧠 ExamGenie – History Exam Prompt (Gemini 2.5 Flash-Lite Optimized, Two-Step Grounded Version)

## SYSTEM INSTRUCTION (prepend this before any user content)
> You must treat the uploaded textbook images as your *only factual source*.  
> Do not rely on your general history knowledge. Use only information explicitly extracted in Step 1.  
> If something is not visible in the textbook pages, skip it.

---

## 🎓 Task
Create a **history exam for grade 8 students** based *only* on the uploaded textbook pages.

---

## 🔍 STEP 1 — EXTRACT FACTS FIRST (no questions yet)
List all the **facts visible** in the textbook images, such as:
- key dates and what happened on each date
- names of people or groups mentioned
- historical terms explicitly defined
- cause–effect or consequence statements

Write them as bullet points.

You must not add information that isn’t clearly visible in the text or timeline.  
If you cannot read a part, skip it.

---

## ✍️ STEP 2 — WRITE QUESTIONS ONLY FROM THOSE FACTS
Use only the facts you listed in Step 1 to create the questions.

Follow this exact structure:
- 2 terminology questions (“What does X mean?”)
- 6 event questions (“What happened / when / where?”)
- 4 cause–consequence questions (“Why / what resulted?”)
- 3 people questions (“Who / what did they do?”)
→ Total = 15 questions

Every question must connect to a fact from Step 1.  
If a person, date, or event wasn’t listed, don’t use it.

---

## 🎯 ADDITIONAL RULES

### Language
- Auto-detect textbook language and use it everywhere.  
- No translation, no mixing.

### Style
- Write like a teacher talking to students.  
- Never mention “the text”, “material”, or “chapter”.  
- Use natural, clear sentences.

### Terminology Rule
- Only ask meanings of *specialized historical terms* (e.g. hyperinflation, civil war).  
- Never ask about common words (independence, democracy, war, peace).

### Validation
- Exactly 2 terminology questions.  
- No generic vocabulary or invented names.  
- All 15 questions grounded, clear, and answerable from the textbook pages.

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
      "explanation": "[1–2 sentences, factual and concise]"
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

## ⚠️ FINAL CHECKLIST
✅ 15 total questions  
✅ 2 terminology exactly  
✅ No “material/text” references  
✅ No invented facts or external info  
✅ All questions linked to Step 1 facts  
✅ Natural, student-friendly phrasing

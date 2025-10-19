# 🧠 ExamGenie – History Exam Prompt (Gemini 2.5 Flash-Lite Optimized)

## SYSTEM INSTRUCTION (prepend this before any user content)
> You must treat the uploaded textbook images as your *only factual source*.  
> Use only facts visible in those images. Do not invent, guess, or rely on external knowledge.  
> If something is missing, omit it. All output must be consistent with the textbook only.

---

## 🎓 Task
Create a **history exam for grade 8 students** based *only* on the uploaded textbook pages.

---

## 🎯 RULES

### 1️⃣ Question Counts (exact)
- 2 terminology questions (“What does X mean?”)  
- 6 event questions (“What happened? When? Where?”)  
- 4 cause/consequence questions (“Why? What resulted?”)  
- 3 people questions (“Who? What did they do?”)  
→ Total = 15 questions

### 2️⃣ Grounding
- Every fact must appear in the textbook.  
- If unsure, skip it — never invent.  
- Timeline dates → ask only about that exact event.

### 3️⃣ Language
- Auto-detect textbook language and use it everywhere.  
- No translation, no mixing.

### 4️⃣ Style
- Write like a teacher talking to students.  
- Never mention “the text”, “material”, or “chapter”.  
- Natural tone, short and clear sentences.

### 5️⃣ Terminology Rule
- Only ask meanings of *specialized historical terms* (e.g. hyperinflation, civil war).  
- Never ask about common words (independence, democracy, war, peace).

### 6️⃣ Validation
- Exactly 2 terminology questions.  
- No generic vocabulary or invented names.  
- All 15 questions grounded, clear, and answerable from the pages.

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
✅ All in one language  
✅ Natural, student-friendly phrasing

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.answers (
  answer_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  exam_id uuid NOT NULL,
  user_id character varying,
  answers_json jsonb NOT NULL,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT answers_pkey PRIMARY KEY (answer_id),
  CONSTRAINT answers_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id)
);
CREATE TABLE public.examgenie_exams (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  grade text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT'::text CHECK (status = ANY (ARRAY['DRAFT'::text, 'PROCESSING'::text, 'READY'::text, 'FAILED'::text])),
  original_images jsonb,
  processed_text text,
  raw_ai_response text,
  final_questions jsonb,
  sharing_url text UNIQUE,
  share_id text DEFAULT SUBSTRING(md5((random())::text) FROM 1 FOR 8) UNIQUE,
  creation_gemini_usage jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at timestamp with time zone,
  diagnostic_image_urls ARRAY,
  ocr_raw_text text,
  diagnostic_enabled boolean DEFAULT false,
  generation_prompt text,
  ai_provider character varying DEFAULT 'gemini'::character varying,
  summary_text text,
  audio_url text,
  audio_metadata jsonb,
  CONSTRAINT examgenie_exams_pkey PRIMARY KEY (id),
  CONSTRAINT examgenie_exams_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.examgenie_questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  exam_id uuid NOT NULL,
  question_number integer NOT NULL,
  question_text text NOT NULL,
  question_type text DEFAULT 'multiple_choice'::text,
  options jsonb,
  correct_answer text,
  explanation text,
  max_points integer DEFAULT 2,
  is_selected boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT examgenie_questions_pkey PRIMARY KEY (id),
  CONSTRAINT examgenie_questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.examgenie_exams(id)
);
CREATE TABLE public.exams (
  exam_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  subject character varying NOT NULL,
  grade character varying NOT NULL,
  exam_json jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  status USER-DEFINED DEFAULT 'created'::exam_status,
  prompt_text text,
  prompt_type character varying DEFAULT 'default'::character varying,
  prompt_length integer,
  gemini_processing_time integer,
  gemini_cost numeric,
  diagnostic_image_urls ARRAY,
  ocr_raw_text text,
  diagnostic_enabled boolean DEFAULT false,
  creation_gemini_usage jsonb,
  CONSTRAINT exams_pkey PRIMARY KEY (exam_id)
);
CREATE TABLE public.grading (
  grading_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  exam_id uuid NOT NULL,
  grade_scale character varying DEFAULT '1-10'::character varying,
  grading_json jsonb NOT NULL,
  final_grade character varying NOT NULL,
  graded_at timestamp with time zone DEFAULT now(),
  grading_prompt text,
  CONSTRAINT grading_pkey PRIMARY KEY (grading_id),
  CONSTRAINT grading_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id)
);
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text,
  grade integer CHECK (grade >= 1 AND grade <= 9),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  language character varying DEFAULT 'en'::character varying,
  language_name character varying DEFAULT 'English'::character varying,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
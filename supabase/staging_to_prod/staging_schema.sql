-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.api_request_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  request_id character varying NOT NULL,
  user_id uuid,
  endpoint character varying NOT NULL,
  method character varying NOT NULL,
  ip_address inet,
  user_agent text,
  image_count integer,
  has_valid_jwt boolean DEFAULT false,
  auth_source character varying,
  request_metadata jsonb,
  response_status integer,
  processing_time_ms integer,
  error_code character varying,
  rate_limit_status character varying,
  rate_limit_remaining integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_request_logs_pkey PRIMARY KEY (id)
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
CREATE TABLE public.examgenie_grading (
  grading_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  exam_id uuid NOT NULL,
  grade_scale text NOT NULL DEFAULT '4-10'::text,
  grading_json jsonb NOT NULL,
  final_grade text NOT NULL,
  graded_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  grading_prompt text,
  attempt_number integer NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  CONSTRAINT examgenie_grading_pkey PRIMARY KEY (grading_id),
  CONSTRAINT examgenie_grading_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.examgenie_exams(id)
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
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text,
  grade integer CHECK (grade >= 1 AND grade <= 9),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
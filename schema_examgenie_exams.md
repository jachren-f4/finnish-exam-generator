## examgenie_exams
create table public.examgenie_exams (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  subject text not null,
  grade text not null,
  status text not null default 'DRAFT'::text,
  original_images jsonb null,
  processed_text text null,
  raw_ai_response text null,
  final_questions jsonb null,
  sharing_url text null,
  share_id text null default SUBSTRING(
    md5((random())::text)
    from
      1 for 8
  ),
  creation_gemini_usage jsonb null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  completed_at timestamp with time zone null,
  diagnostic_image_urls text[] null,
  ocr_raw_text text null,
  diagnostic_enabled boolean null default false,
  constraint examgenie_exams_pkey primary key (id),
  constraint examgenie_exams_share_id_key unique (share_id),
  constraint examgenie_exams_sharing_url_key unique (sharing_url),
  constraint examgenie_exams_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint examgenie_exams_status_check check (
    (
      status = any (
        array[
          'DRAFT'::text,
          'PROCESSING'::text,
          'READY'::text,
          'FAILED'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_examgenie_exams_user_id on public.examgenie_exams using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_examgenie_exams_status on public.examgenie_exams using btree (status) TABLESPACE pg_default;

create index IF not exists idx_examgenie_exams_share_id on public.examgenie_exams using btree (share_id) TABLESPACE pg_default;

create trigger update_examgenie_exams_updated_at BEFORE
update on examgenie_exams for EACH row
execute FUNCTION update_updated_at_column ();

## examgenie_questions
create table public.examgenie_questions (
  id uuid not null default extensions.uuid_generate_v4 (),
  exam_id uuid not null,
  question_number integer not null,
  question_text text not null,
  question_type text null default 'multiple_choice'::text,
  options jsonb null,
  correct_answer text null,
  explanation text null,
  max_points integer null default 2,
  is_selected boolean null default true,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint examgenie_questions_pkey primary key (id),
  constraint unique_exam_question_number unique (exam_id, question_number),
  constraint examgenie_questions_exam_id_fkey foreign KEY (exam_id) references examgenie_exams (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_questions_exam_id on public.examgenie_questions using btree (exam_id) TABLESPACE pg_default;

create index IF not exists idx_questions_selected on public.examgenie_questions using btree (exam_id, is_selected) TABLESPACE pg_default;
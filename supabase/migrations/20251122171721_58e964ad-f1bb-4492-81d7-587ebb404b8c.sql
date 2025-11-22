-- Create rubrics table to store scoring criteria
CREATE TABLE IF NOT EXISTS public.rubrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  criterion_name TEXT NOT NULL,
  criterion_description TEXT NOT NULL,
  keywords TEXT, -- comma-separated keywords
  weight DECIMAL NOT NULL DEFAULT 0.25 CHECK (weight >= 0 AND weight <= 1),
  min_words INTEGER DEFAULT 0,
  max_words INTEGER DEFAULT 9999,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transcripts table to store scoring history
CREATE TABLE IF NOT EXISTS public.transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transcript_text TEXT NOT NULL,
  overall_score DECIMAL,
  word_count INTEGER,
  scoring_data JSONB, -- detailed per-criterion results
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

-- Public read access for rubrics (anyone can view active rubrics)
CREATE POLICY "Anyone can view active rubrics"
ON public.rubrics
FOR SELECT
USING (is_active = true);

-- Public read/write for transcripts (for demo purposes - adjust as needed)
CREATE POLICY "Anyone can view transcripts"
ON public.transcripts
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert transcripts"
ON public.transcripts
FOR INSERT
WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on rubrics
CREATE TRIGGER update_rubrics_updated_at
BEFORE UPDATE ON public.rubrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample rubric data
INSERT INTO public.rubrics (criterion_name, criterion_description, keywords, weight, min_words, max_words) VALUES
('Introduction & Greeting', 'Greet the listener and introduce yourself with name and role.', 'hello,hi,good morning,good afternoon,name,introduce,introduction', 0.2, 10, 80),
('Background / Education', 'Mention your study or professional background and key qualifications.', 'degree,studied,graduated,engineer,computer,education,university,college,major', 0.25, 10, 120),
('Skills / Achievements', 'Talk about your skills, achievements or projects briefly.', 'project,skill,achievement,experience,internship,certified,developed,built,led', 0.3, 10, 150),
('Closing / Call to Action', 'End with a closing statement or what you seek next (opportunity, interview).', 'thank you,thanks,contact,looking forward,opportunity,interested,appreciate', 0.25, 5, 50)
ON CONFLICT DO NOTHING;